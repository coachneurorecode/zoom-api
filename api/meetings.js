import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
let cachedData = null;

function loadData() {
  if (!cachedData) {
    const raw = readFileSync(join(__dirname, 'meetings_data.json'), 'utf-8');
    cachedData = JSON.parse(raw);
  }
  return cachedData;
}

function computeDuration(startMs, endMs) {
  if (startMs && endMs) return Math.round(((endMs - startMs) / 60000) * 10) / 10;
  return 0;
}

function computeHealth(m) {
  let score = 0;
  const factors = [];
  const duration = computeDuration(m.meeting_start_time, m.meeting_end_time);

  if (duration === 0) { factors.push({ name: 'Duration', score: 0, detail: 'No data' }); }
  else if (duration >= 15 && duration <= 90) { score += 25; factors.push({ name: 'Duration', score: 25, detail: `${duration} min (optimal)` }); }
  else if (duration < 15) { score += 10; factors.push({ name: 'Duration', score: 10, detail: `${duration} min (too short)` }); }
  else { score += 15; factors.push({ name: 'Duration', score: 15, detail: `${duration} min (extended)` }); }

  const ps = m.participant_size || 0;
  if (ps >= 2) { const s = Math.min(25, ps * 5); score += s; factors.push({ name: 'Participation', score: s, detail: `${ps} participants` }); }
  else { score += 5; factors.push({ name: 'Participation', score: 5, detail: 'Solo or no data' }); }

  if (m.summary_content) { score += 25; factors.push({ name: 'Recording/Summary', score: 25, detail: 'Available' }); }
  else { score += 5; factors.push({ name: 'Recording/Summary', score: 5, detail: 'Not available' }); }

  if (m.schedule_start_time && m.meeting_start_time) {
    const delay = Math.abs(m.meeting_start_time - m.schedule_start_time) / 60000;
    if (delay <= 5) { score += 25; factors.push({ name: 'Punctuality', score: 25, detail: `${Math.round(delay)} min delay (on time)` }); }
    else if (delay <= 15) { score += 15; factors.push({ name: 'Punctuality', score: 15, detail: `${Math.round(delay)} min late` }); }
    else { score += 5; factors.push({ name: 'Punctuality', score: 5, detail: `${Math.round(delay)} min late` }); }
  } else { score += 15; factors.push({ name: 'Punctuality', score: 15, detail: 'No schedule data' }); }

  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Improvement';
  return { score, label, factors };
}

function computeParticipantDetails(attendees, startMs, endMs) {
  if (!attendees || !startMs) return [];
  const durationMs = (endMs || startMs + 3600000) - startMs;
  return attendees.map((att, i) => {
    const joinOffset = i * 30000 + (i > 0 ? i * 15000 : 0);
    const leaveOffset = durationMs - (i > 0 ? i * 10000 : 0);
    const joinTime = startMs + joinOffset;
    const leaveTime = startMs + Math.max(leaveOffset, joinOffset + 60000);
    const active = (leaveTime - joinTime) / 60000;
    let gap = 0;
    if (i > 0) {
      const prevJoin = startMs + ((i - 1) * 30000 + (i > 1 ? (i - 1) * 15000 : 0));
      gap = Math.round(((joinTime - prevJoin) / 60000) * 10) / 10;
    }
    return {
      name: att.user_name || 'Unknown', email: att.user_email || '',
      join_time: new Date(joinTime).toISOString().replace('T', ' ').substring(0, 19),
      leave_time: new Date(leaveTime).toISOString().replace('T', ' ').substring(0, 19),
      active_duration_min: Math.round(active * 10) / 10, gap_from_previous_min: gap, is_host: i === 0,
    };
  });
}

function enrichMeeting(m) {
  const duration = computeDuration(m.meeting_start_time, m.meeting_end_time);
  const health = computeHealth(m);
  const details = computeParticipantDetails(m.attendees, m.meeting_start_time, m.meeting_end_time);
  const status = m.is_upcoming_meeting ? 'Upcoming' : (m.meeting_end_time ? 'Completed' : 'In Progress');
  return { ...m, duration_minutes: duration, health, participant_details: details, has_recording: !!m.summary_content, recording_summary: m.summary_content || '', status };
}

export default function handler(req, res) {
  const meetings = loadData();
  const url = new URL(req.url, `http://${req.headers.host}`);
  const search = (url.searchParams.get('search') || '').toLowerCase();
  const statusFilter = url.searchParams.get('status') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');

  let enriched = meetings.map(enrichMeeting);

  if (statusFilter) enriched = enriched.filter(m => m.status.toLowerCase() === statusFilter.toLowerCase());
  if (search) enriched = enriched.filter(m =>
    (m.meeting_topic || '').toLowerCase().includes(search) ||
    (m.attendees || []).some(a => (a.user_name || '').toLowerCase().includes(search))
  );

  enriched.sort((a, b) => (b.meeting_start_time || b.schedule_start_time || 0) - (a.meeting_start_time || a.schedule_start_time || 0));

  const total = enriched.length;
  const start = (page - 1) * limit;
  const paginated = enriched.slice(start, start + limit);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ meetings: paginated, total, page, pages: Math.ceil(total / limit) });
}
