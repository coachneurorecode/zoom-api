import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
let cachedData = null;
function loadData() { if (!cachedData) cachedData = JSON.parse(readFileSync(join(__dirname, 'meetings_data.json'), 'utf-8')); return cachedData; }
function dur(s, e) { return s && e ? Math.round(((e - s) / 60000) * 10) / 10 : 0; }
function health(m) {
  let sc = 0; const d = dur(m.meeting_start_time, m.meeting_end_time);
  if (d >= 15 && d <= 90) sc += 25; else if (d > 0 && d < 15) sc += 10; else if (d > 90) sc += 15;
  sc += (m.participant_size||0) >= 2 ? Math.min(25, (m.participant_size||0) * 5) : 5;
  sc += m.summary_content ? 25 : 5;
  if (m.schedule_start_time && m.meeting_start_time) { const dl = Math.abs(m.meeting_start_time - m.schedule_start_time)/60000; sc += dl<=5?25:dl<=15?15:5; } else sc+=15;
  return sc;
}

export default function handler(req, res) {
  const meetings = loadData();
  const recs = meetings.filter(m => m.summary_content).map(m => ({
    meeting_id: m.meeting_id || '', topic: m.meeting_topic || '', date: m.meeting_start_time_display || '',
    duration: dur(m.meeting_start_time, m.meeting_end_time), participants: m.participant_size || 0,
    summary: m.summary_content || '', host: m.owner_name || '', health_score: health(m),
    attendees: (m.attendees || []).map(a => a.user_name || ''),
  }));
  recs.sort((a, b) => b.date.localeCompare(a.date));
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ recordings: recs, total: recs.length });
}
