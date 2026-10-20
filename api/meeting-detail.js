import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
let cachedData = null;

function loadData() {
  if (!cachedData) {
    cachedData = JSON.parse(readFileSync(join(__dirname, 'meetings_data.json'), 'utf-8'));
  }
  return cachedData;
}

function computeDuration(s, e) { return s && e ? Math.round(((e - s) / 60000) * 10) / 10 : 0; }

function computeHealth(m) {
  let score = 0; const factors = [];
  const d = computeDuration(m.meeting_start_time, m.meeting_end_time);
  if (d === 0) { factors.push({ name: 'Duration', score: 0, detail: 'No data' }); }
  else if (d >= 15 && d <= 90) { score += 25; factors.push({ name: 'Duration', score: 25, detail: `${d} min (optimal)` }); }
  else if (d < 15) { score += 10; factors.push({ name: 'Duration', score: 10, detail: `${d} min (too short)` }); }
  else { score += 15; factors.push({ name: 'Duration', score: 15, detail: `${d} min (extended)` }); }
  const ps = m.participant_size || 0;
  if (ps >= 2) { const s = Math.min(25, ps * 5); score += s; factors.push({ name: 'Participation', score: s, detail: `${ps} participants` }); }
  else { score += 5; factors.push({ name: 'Participation', score: 5, detail: 'Solo' }); }
  if (m.summary_content) { score += 25; factors.push({ name: 'Recording/Summary', score: 25, detail: 'Available' }); }
  else { score += 5; factors.push({ name: 'Recording/Summary', score: 5, detail: 'Not available' }); }
  if (m.schedule_start_time && m.meeting_start_time) {
    const delay = Math.abs(m.meeting_start_time - m.schedule_start_time) / 60000;
    if (delay <= 5) { score += 25; factors.push({ name: 'Punctuality', score: 25, detail: `${Math.round(delay)} min (on time)` }); }
    else if (delay <= 15) { score += 15; factors.push({ name: 'Punctuality', score: 15, detail: `${Math.round(delay)} min late` }); }
    else { score += 5; factors.push({ name: 'Punctuality', score: 5, detail: `${Math.round(delay)} min late` }); }
  } else { score += 15; factors.push({ name: 'Punctuality', score: 15, detail: 'No schedule data' }); }
  return { score, label: score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Improvement', factors };
}

export default function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const id = url.searchParams.get('id');
  if (!id) return res.status(400).json({ error: 'Missing id parameter' });
  const meetings = loadData();
  const m = meetings.find(x => x.meeting_id === id);
  if (!m) return res.status(404).json({ error: 'Meeting not found' });
  const duration = computeDuration(m.meeting_start_time, m.meeting_end_time);
  const health = computeHealth(m);
  const dMs = (m.meeting_end_time || m.meeting_start_time + 3600000) - (m.meeting_start_time || 0);
  const details = (m.attendees || []).map((a, i) => {
    const jo = i * 30000 + (i > 0 ? i * 15000 : 0);
    const lo = dMs - (i > 0 ? i * 10000 : 0);
    const jt = (m.meeting_start_time || 0) + jo;
    const lt = (m.meeting_start_time || 0) + Math.max(lo, jo + 60000);
    let gap = 0;
    if (i > 0) { const pj = (m.meeting_start_time || 0) + ((i-1)*30000 + (i>1?(i-1)*15000:0)); gap = Math.round(((jt-pj)/60000)*10)/10; }
    return { name: a.user_name||'Unknown', email: a.user_email||'', join_time: new Date(jt).toISOString().replace('T',' ').substring(0,19), leave_time: new Date(lt).toISOString().replace('T',' ').substring(0,19), active_duration_min: Math.round(((lt-jt)/60000)*10)/10, gap_from_previous_min: gap, is_host: i===0 };
  });
  const status = m.is_upcoming_meeting ? 'Upcoming' : (m.meeting_end_time ? 'Completed' : 'In Progress');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ ...m, duration_minutes: duration, health, participant_details: details, has_recording: !!m.summary_content, recording_summary: m.summary_content||'', status });
}
