import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
let cachedData = null;
function loadData() { if (!cachedData) cachedData = JSON.parse(readFileSync(join(__dirname, 'meetings_data.json'), 'utf-8')); return cachedData; }
function dur(s, e) { return s && e ? Math.round(((e - s) / 60000) * 10) / 10 : 0; }

export default function handler(req, res) {
  const meetings = loadData();
  const pMap = {};
  meetings.forEach(m => {
    const d = dur(m.meeting_start_time, m.meeting_end_time);
    (m.attendees || []).forEach(a => {
      const n = a.user_name || 'Unknown';
      if (!pMap[n]) pMap[n] = { name: n, email: '', total_meetings: 0, total_duration_min: 0, meetings_list: [], first_seen: null, last_seen: null };
      const p = pMap[n];
      p.email = a.user_email || p.email;
      p.total_meetings += 1;
      p.total_duration_min += d;
      p.meetings_list.push({ topic: m.meeting_topic || '', date: m.meeting_start_time_display || m.schedule_start_time_display || '', duration: d });
      const ts = m.meeting_start_time || m.schedule_start_time;
      if (ts) { if (!p.first_seen || ts < p.first_seen) p.first_seen = ts; if (!p.last_seen || ts > p.last_seen) p.last_seen = ts; }
    });
  });
  const result = Object.values(pMap).sort((a, b) => b.total_meetings - a.total_meetings);
  result.forEach(p => {
    if (p.first_seen) p.first_seen = new Date(p.first_seen).toISOString().replace('T', ' ').substring(0, 16);
    if (p.last_seen) p.last_seen = new Date(p.last_seen).toISOString().replace('T', ' ').substring(0, 16);
    p.avg_duration = p.total_meetings > 0 ? Math.round((p.total_duration_min / p.total_meetings) * 10) / 10 : 0;
    p.meetings_list = p.meetings_list.slice(-10);
  });
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ participants: result, total: result.length });
}
