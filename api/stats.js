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
  const ps = m.participant_size || 0; sc += ps >= 2 ? Math.min(25, ps * 5) : 5;
  sc += m.summary_content ? 25 : 5;
  if (m.schedule_start_time && m.meeting_start_time) { const dl = Math.abs(m.meeting_start_time - m.schedule_start_time)/60000; sc += dl<=5?25:dl<=15?15:5; } else sc+=15;
  return { score: sc, label: sc>=80?'Excellent':sc>=60?'Good':sc>=40?'Fair':'Needs Improvement' };
}

export default function handler(req, res) {
  const meetings = loadData();
  const enriched = meetings.map(m => ({ ...m, duration: dur(m.meeting_start_time, m.meeting_end_time), health: health(m), status: m.is_upcoming_meeting ? 'Upcoming' : (m.meeting_end_time ? 'Completed' : 'In Progress') }));
  const completed = enriched.filter(m => m.status === 'Completed');
  const upcoming = enriched.filter(m => m.status === 'Upcoming');
  const withRec = enriched.filter(m => !!m.summary_content);
  const durations = completed.map(m => m.duration).filter(d => d > 0);
  const avgDur = durations.length ? Math.round((durations.reduce((a,b)=>a+b,0)/durations.length)*10)/10 : 0;
  const totalHrs = Math.round(durations.reduce((a,b)=>a+b,0)/60*10)/10;
  const healthDist = {}; completed.forEach(m => { healthDist[m.health.label] = (healthDist[m.health.label]||0)+1; });
  const scores = completed.map(m => m.health.score);
  const avgHealth = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length*10)/10 : 0;
  const pFreq = {};
  enriched.forEach(m => (m.attendees||[]).forEach(a => { const n = a.user_name||'Unknown'; if(n!=='Coach Neuro Recode') pFreq[n]=(pFreq[n]||0)+1; }));
  const topP = Object.entries(pFreq).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,meetings])=>({name,meetings}));
  const daily = {}; const dailyDur = {};
  completed.forEach(m => { if(m.meeting_start_time_display) { const d=m.meeting_start_time_display.substring(0,10); daily[d]=(daily[d]||0)+1; dailyDur[d]=(dailyDur[d]||0)+m.duration; }});
  const dailyChart = Object.entries(daily).map(([date,meetings])=>({date,meetings,total_duration:Math.round((dailyDur[date]||0)*10)/10})).sort((a,b)=>a.date.localeCompare(b.date)).slice(-30);
  const weekly = {};
  completed.forEach(m => { if(m.meeting_start_time) { const dt=new Date(m.meeting_start_time); const w=dt.getFullYear()+'-W'+String(Math.ceil(((dt-new Date(dt.getFullYear(),0,1))/86400000+1)/7)).padStart(2,'0'); weekly[w]=(weekly[w]||0)+1; }});
  const weeklyChart = Object.entries(weekly).map(([week,meetings])=>({week,meetings})).sort((a,b)=>a.week.localeCompare(b.week)).slice(-12);
  const hourly = {};
  completed.forEach(m => { if(m.meeting_start_time_display) { try { const h=parseInt(m.meeting_start_time_display.split(' ')[1].split(':')[0]); hourly[h]=(hourly[h]||0)+1; } catch(e){} }});
  const hourlyChart = Array.from({length:24},(_,h)=>({hour:h,count:hourly[h]||0}));
  const uniqueP = new Set(); enriched.forEach(m=>(m.attendees||[]).forEach(a=>{ const n=a.user_name||'Unknown'; if(n!=='Coach Neuro Recode') uniqueP.add(n); }));

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ total_meetings: enriched.length, completed_meetings: completed.length, upcoming_meetings: upcoming.length, meetings_with_recordings: withRec.length, total_participants_unique: uniqueP.size, avg_duration_minutes: avgDur, total_hours: totalHrs, avg_health_score: avgHealth, health_distribution: healthDist, top_participants: topP, daily_chart: dailyChart, weekly_chart: weeklyChart, hourly_chart: hourlyChart });
}
