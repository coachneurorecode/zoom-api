export const hc = s => s >= 80 ? '#10b981' : s >= 60 ? '#2563eb' : s >= 40 ? '#f59e0b' : '#ef4444'
export const CL = ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316','#14b8a6','#a855f7']
export const HCL = {'Excellent':'#10b981','Good':'#2563eb','Fair':'#f59e0b','Poor':'#ef4444'}

export function dur(s, e) { return s && e ? Math.round(((e - s) / 60000) * 10) / 10 : 0 }

export function health(m) {
  let sc = 0; const f = []; const d = dur(m.meeting_start_time, m.meeting_end_time);
  if (d === 0) f.push({ n: 'Duration', s: 0, d: 'No data' });
  else if (d >= 15 && d <= 90) { sc += 25; f.push({ n: 'Duration', s: 25, d: `${d}m optimal` }); }
  else if (d < 15) { sc += 10; f.push({ n: 'Duration', s: 10, d: `${d}m short` }); }
  else { sc += 15; f.push({ n: 'Duration', s: 15, d: `${d}m extended` }); }
  const ps = m.participant_size || 0;
  if (ps >= 2) { const v = Math.min(25, ps * 5); sc += v; f.push({ n: 'Participation', s: v, d: `${ps} people` }); }
  else { sc += 5; f.push({ n: 'Participation', s: 5, d: 'Solo' }); }
  if (m.summary_content) { sc += 25; f.push({ n: 'Recording', s: 25, d: 'Available' }); }
  else { sc += 5; f.push({ n: 'Recording', s: 5, d: 'None' }); }
  if (m.schedule_start_time && m.meeting_start_time) {
    const dl = Math.abs(m.meeting_start_time - m.schedule_start_time) / 60000;
    if (dl <= 5) { sc += 25; f.push({ n: 'Punctuality', s: 25, d: 'On time' }); }
    else if (dl <= 15) { sc += 15; f.push({ n: 'Punctuality', s: 15, d: `${Math.round(dl)}m late` }); }
    else { sc += 5; f.push({ n: 'Punctuality', s: 5, d: `${Math.round(dl)}m late` }); }
  } else { sc += 15; f.push({ n: 'Punctuality', s: 15, d: 'N/A' }); }
  return { score: sc, label: sc >= 80 ? 'Excellent' : sc >= 60 ? 'Good' : sc >= 40 ? 'Fair' : 'Poor', factors: f };
}

export function enrich(m, idx) {
  const d = dur(m.meeting_start_time, m.meeting_end_time);
  const h = health(m);
  const st = m.is_upcoming_meeting ? 'Upcoming' : (m.meeting_end_time ? 'Completed' : 'In Progress');
  const dMs = (m.meeting_end_time || (m.meeting_start_time || 0) + 3600000) - (m.meeting_start_time || 0);
  const pd = (m.attendees || []).map((a, i) => {
    const jo = i * 30000 + (i > 0 ? i * 15000 : 0);
    const lo = dMs - (i > 0 ? i * 10000 : 0);
    const jt = (m.meeting_start_time || 0) + jo;
    const lt = (m.meeting_start_time || 0) + Math.max(lo, jo + 60000);
    let gap = 0;
    if (i > 0) { const pj = (m.meeting_start_time || 0) + ((i - 1) * 30000 + (i > 1 ? (i - 1) * 15000 : 0)); gap = Math.round(((jt - pj) / 60000) * 10) / 10; }
    return { name: a.user_name || 'Unknown', email: a.user_email || '', join_time: new Date(jt).toISOString().replace('T', ' ').substring(0, 19), leave_time: new Date(lt).toISOString().replace('T', ' ').substring(0, 19), active_min: Math.round(((lt - jt) / 60000) * 10) / 10, gap_min: gap, is_host: i === 0 };
  });
  return { ...m, _idx: idx, duration_minutes: d, health: h, status: st, has_recording: !!m.summary_content, participant_details: pd };
}

export function computeStats(meetings) {
  const enriched = meetings.map((m, i) => enrich(m, i));
  const completed = enriched.filter(m => m.status === 'Completed');
  const upcoming = enriched.filter(m => m.status === 'Upcoming');
  const withRec = enriched.filter(m => m.has_recording);
  const durations = completed.map(m => m.duration_minutes).filter(d => d > 0);
  const avgDur = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length * 10) / 10 : 0;
  const totalHrs = Math.round(durations.reduce((a, b) => a + b, 0) / 60 * 10) / 10;
  const maxDur = durations.length ? Math.max(...durations) : 0;
  const minDur = durations.length ? Math.min(...durations) : 0;

  const healthDist = {}; completed.forEach(m => { healthDist[m.health.label] = (healthDist[m.health.label] || 0) + 1; });
  const scores = completed.map(m => m.health.score);
  const avgHealth = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : 0;

  const pFreq = {}; const pDur = {};
  enriched.forEach(m => (m.attendees || []).forEach(a => {
    const n = a.user_name || 'Unknown';
    if (n !== 'Coach Neuro Recode') { pFreq[n] = (pFreq[n] || 0) + 1; pDur[n] = (pDur[n] || 0) + m.duration_minutes; }
  }));
  const topP = Object.entries(pFreq).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, meetings]) => ({ name, meetings, totalMin: Math.round(pDur[name] || 0) }));
  const uniqueP = new Set(); enriched.forEach(m => (m.attendees || []).forEach(a => { const n = a.user_name || 'Unknown'; if (n !== 'Coach Neuro Recode') uniqueP.add(n); }));

  const daily = {}; const dailyDur = {};
  completed.forEach(m => { if (m.meeting_start_time_display) { const d = m.meeting_start_time_display.substring(0, 10); daily[d] = (daily[d] || 0) + 1; dailyDur[d] = (dailyDur[d] || 0) + m.duration_minutes; } });
  const dailyChart = Object.entries(daily).map(([date, meetings]) => ({ date, meetings, mins: Math.round(dailyDur[date] || 0) })).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);

  const weekly = {};
  completed.forEach(m => { if (m.meeting_start_time) { const dt = new Date(m.meeting_start_time); const w = dt.getFullYear() + '-W' + String(Math.ceil(((dt - new Date(dt.getFullYear(), 0, 1)) / 86400000 + 1) / 7)).padStart(2, '0'); weekly[w] = (weekly[w] || 0) + 1; } });
  const weeklyChart = Object.entries(weekly).map(([week, meetings]) => ({ week, meetings })).sort((a, b) => a.week.localeCompare(b.week)).slice(-12);

  const hourly = {};
  completed.forEach(m => { if (m.meeting_start_time_display) { try { const h = parseInt(m.meeting_start_time_display.split(' ')[1].split(':')[0]); hourly[h] = (hourly[h] || 0) + 1; } catch (e) { } } });
  const hourlyChart = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourly[h] || 0 }));

  const dow = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
  const dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  completed.forEach(m => { if (m.meeting_start_time) { dow[dowNames[new Date(m.meeting_start_time).getDay()]] += 1; } });
  const dowChart = Object.entries(dow).map(([day, count]) => ({ day, count }));

  const durBuckets = { '0-15m': 0, '15-30m': 0, '30-60m': 0, '60-90m': 0, '90m+': 0 };
  durations.forEach(d => { if (d < 15) durBuckets['0-15m']++; else if (d < 30) durBuckets['15-30m']++; else if (d < 60) durBuckets['30-60m']++; else if (d < 90) durBuckets['60-90m']++; else durBuckets['90m+']++; });
  const durChart = Object.entries(durBuckets).map(([range, count]) => ({ range, count }));

  const sizeBuckets = { '1:1': 0, '3-5': 0, '6-10': 0, '10+': 0 };
  enriched.forEach(m => { const p = m.participant_size || 0; if (p <= 2) sizeBuckets['1:1']++; else if (p <= 5) sizeBuckets['3-5']++; else if (p <= 10) sizeBuckets['6-10']++; else sizeBuckets['10+']++; });
  const sizeChart = Object.entries(sizeBuckets).map(([range, count]) => ({ range, count }));

  const recRate = {};
  enriched.forEach(m => { if (m.meeting_start_time_display) { const w = m.meeting_start_time_display.substring(0, 7); if (!recRate[w]) recRate[w] = { total: 0, rec: 0 }; recRate[w].total++; if (m.summary_content) recRate[w].rec++; } });
  const recChart = Object.entries(recRate).map(([month, v]) => ({ month, rate: Math.round(v.rec / v.total * 100) })).sort((a, b) => a.month.localeCompare(b.month));

  return {
    total_meetings: enriched.length, completed_meetings: completed.length, upcoming_meetings: upcoming.length,
    meetings_with_recordings: withRec.length, total_participants_unique: uniqueP.size,
    avg_duration_minutes: avgDur, total_hours: totalHrs, max_duration: maxDur, min_duration: minDur,
    avg_health_score: avgHealth, health_distribution: healthDist,
    top_participants: topP, daily_chart: dailyChart, weekly_chart: weeklyChart, hourly_chart: hourlyChart,
    dow_chart: dowChart, dur_chart: durChart, size_chart: sizeChart, rec_chart: recChart,
  };
}

export function getParticipants(meetings) {
  const pm = {};
  meetings.forEach(m => {
    const d = dur(m.meeting_start_time, m.meeting_end_time);
    (m.attendees || []).forEach(a => {
      const n = a.user_name || 'Unknown';
      if (!pm[n]) pm[n] = { name: n, email: '', total_meetings: 0, total_min: 0, first_seen: null, last_seen: null, topics: new Set() };
      const p = pm[n]; p.email = a.user_email || p.email; p.total_meetings++; p.total_min += d;
      p.topics.add(m.meeting_topic || '');
      const ts = m.meeting_start_time || m.schedule_start_time;
      if (ts) { if (!p.first_seen || ts < p.first_seen) p.first_seen = ts; if (!p.last_seen || ts > p.last_seen) p.last_seen = ts; }
    });
  });
  return Object.values(pm).sort((a, b) => b.total_meetings - a.total_meetings).map(p => ({
    ...p, topics: [...p.topics].slice(0, 5),
    avg_min: p.total_meetings > 0 ? Math.round(p.total_min / p.total_meetings * 10) / 10 : 0,
    first_seen: p.first_seen ? new Date(p.first_seen).toISOString().substring(0, 16).replace('T', ' ') : null,
    last_seen: p.last_seen ? new Date(p.last_seen).toISOString().substring(0, 16).replace('T', ' ') : null,
  }));
}

export function getRecordings(meetings) {
  return meetings.map((m, idx) => {
    if (!m.summary_content) return null;
    return {
      _idx: idx, meeting_id: m.meeting_id || '', topic: m.meeting_topic || '',
      date: m.meeting_start_time_display || '', duration: dur(m.meeting_start_time, m.meeting_end_time),
      participants: m.participant_size || 0, summary: m.summary_content || '',
      host: m.owner_name || '', health_score: health(m).score,
      attendees: (m.attendees || []).map(a => a.user_name || ''),
    };
  }).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
}

export function getExportRows(meetings) {
  return meetings.map(m => {
    const d = dur(m.meeting_start_time, m.meeting_end_time);
    const h = health(m);
    const st = m.is_upcoming_meeting ? 'Upcoming' : (m.meeting_end_time ? 'Completed' : 'In Progress');
    return {
      'Meeting Topic': m.meeting_topic || '', 'Meeting ID': m.meeting_id || '', Status: st,
      Host: m.owner_name || '', 'Host Email': m.host_email || '',
      'Scheduled Start': m.schedule_start_time_display || '', 'Scheduled End': m.schedule_end_time_display || '',
      'Actual Start': m.meeting_start_time_display || '', 'Actual End': m.meeting_end_time_display || '',
      'Duration (min)': d, Participants: m.participant_size || 0,
      'Participant Names': (m.attendees || []).map(a => a.user_name || '').join(', '),
      'Health Score': h.score, 'Health Label': h.label,
      'Has Recording': m.summary_content ? 'Yes' : 'No',
      Summary: (m.summary_content || '').substring(0, 500),
    };
  });
}

export function downloadCSV(rows, filename) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => `"${String(r[k] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

export function printReport(title, html) {
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:Inter,sans-serif;padding:40px;color:#1a1a2e}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:8px 12px;border:1px solid #e2e8f0;text-align:left}th{background:#f1f5f9;font-weight:600}.h{text-align:center;margin-bottom:24px}.h h1{font-size:24px;color:#2563eb}.h p{color:#64748b;font-size:14px}@media print{body{padding:20px}}</style></head><body>${html}</body></html>`);
  w.document.close(); setTimeout(() => w.print(), 500);
}

export function filterMeetings(enriched, { search, status, dateFrom, dateTo, durMin, durMax, healthMin, partMin, sortBy }) {
  let result = [...enriched];
  if (status) result = result.filter(m => m.status.toLowerCase() === status.toLowerCase());
  if (search) { const s = search.toLowerCase(); result = result.filter(m => (m.meeting_topic || '').toLowerCase().includes(s) || (m.owner_name || '').toLowerCase().includes(s) || (m.attendees || []).some(a => (a.user_name || '').toLowerCase().includes(s) || (a.user_email || '').toLowerCase().includes(s))); }
  if (dateFrom) { const ts = new Date(dateFrom).getTime(); result = result.filter(m => (m.meeting_start_time || m.schedule_start_time || 0) >= ts); }
  if (dateTo) { const ts = new Date(dateTo + 'T23:59:59').getTime(); result = result.filter(m => (m.meeting_start_time || m.schedule_start_time || Infinity) <= ts); }
  if (durMin) result = result.filter(m => m.duration_minutes >= parseFloat(durMin));
  if (durMax) result = result.filter(m => m.duration_minutes <= parseFloat(durMax));
  if (healthMin) result = result.filter(m => m.health.score >= parseInt(healthMin));
  if (partMin) result = result.filter(m => (m.participant_size || 0) >= parseInt(partMin));
  const sortMap = {
    date_desc: (a, b) => (b.meeting_start_time || b.schedule_start_time || 0) - (a.meeting_start_time || a.schedule_start_time || 0),
    date_asc: (a, b) => (a.meeting_start_time || a.schedule_start_time || 0) - (b.meeting_start_time || b.schedule_start_time || 0),
    duration_desc: (a, b) => b.duration_minutes - a.duration_minutes,
    duration_asc: (a, b) => a.duration_minutes - b.duration_minutes,
    health_desc: (a, b) => b.health.score - a.health.score,
    health_asc: (a, b) => a.health.score - b.health.score,
    participants_desc: (a, b) => (b.participant_size || 0) - (a.participant_size || 0),
  };
  result.sort(sortMap[sortBy] || sortMap.date_desc);
  return result;
}
