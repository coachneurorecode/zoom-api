import React, { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']
const HC = { 'Excellent': '#10b981', 'Good': '#2563eb', 'Fair': '#f59e0b', 'Needs Improvement': '#ef4444' }

const css = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}
.app{display:flex;min-height:100vh}
.sb{width:260px;background:#1e293b;border-right:1px solid #334155;position:fixed;height:100vh;overflow-y:auto;z-index:10}
.sb-h{padding:24px 20px;border-bottom:1px solid #334155}
.sb-logo{display:flex;align-items:center;gap:12px}
.sb-logo svg{width:36px;height:36px}
.sb-logo h1{font-size:18px;font-weight:700;color:#f1f5f9}
.sb-logo span{font-size:11px;color:#94a3b8;display:block;margin-top:2px}
.ns{padding:16px 12px}
.nl{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;color:#64748b;padding:0 8px;margin-bottom:8px}
.ni{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all .2s;color:#94a3b8;font-size:14px;font-weight:500}
.ni:hover{background:#334155;color:#e2e8f0}
.ni.act{background:#2563eb;color:#fff}
.ni .bdg{background:#ef4444;color:#fff;font-size:10px;padding:2px 6px;border-radius:10px;margin-left:auto}
.mn{margin-left:260px;flex:1;padding:24px 32px;min-height:100vh}
.ph h2{font-size:26px;font-weight:700;color:#f1f5f9}
.ph p{font-size:14px;color:#94a3b8;margin-top:4px}
.lb{display:inline-flex;align-items:center;gap:6px;background:#dc262620;color:#ef4444;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;margin-left:12px}
.ld{width:8px;height:8px;background:#ef4444;border-radius:50%;animation:pulse 1.5s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.sg{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:20px 0}
.sc{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px}
.sc .la{font-size:12px;color:#94a3b8;font-weight:500;text-transform:uppercase;letter-spacing:.5px}
.sc .va{font-size:32px;font-weight:800;color:#f1f5f9;margin-top:8px;line-height:1}
.sc .su{font-size:12px;color:#64748b;margin-top:6px}
.sc .ic{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:20px}
.cg{display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:24px}
.cc{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px}
.cc h3{font-size:15px;font-weight:600;color:#f1f5f9;margin-bottom:16px}
table{width:100%;border-collapse:collapse}
th{text-align:left;padding:12px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#64748b;border-bottom:1px solid #334155;background:#0f172a40}
td{padding:12px 16px;font-size:13px;color:#cbd5e1;border-bottom:1px solid #1e293b}
tr:hover td{background:#1e293b80}
.hb{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
.stb{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
.st-c{background:#10b98120;color:#10b981}
.st-u{background:#2563eb20;color:#60a5fa}
.st-i{background:#f59e0b20;color:#f59e0b}
.sbar{display:flex;gap:12px;margin-bottom:20px;align-items:center}
.si{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:10px 16px;color:#e2e8f0;font-size:14px;flex:1;outline:none}
.si:focus{border-color:#2563eb}
.fb{background:#1e293b;border:1px solid #334155;border-radius:8px;padding:10px 16px;color:#94a3b8;font-size:13px;cursor:pointer}
.fb:hover,.fb.act{background:#2563eb;color:#fff;border-color:#2563eb}
.pc{background:#0f172a;border:1px solid #334155;border-radius:10px;padding:16px;display:flex;align-items:center;gap:14px}
.pa{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:#fff}
.pi{flex:1}
.pi h4{font-size:14px;font-weight:600;color:#f1f5f9}
.pi p{font-size:12px;color:#94a3b8}
.ps{text-align:right}
.ps .ct{font-size:20px;font-weight:700;color:#f1f5f9}
.ps .la{font-size:11px;color:#64748b}
.dg{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.ds{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px}
.ds h3{font-size:15px;font-weight:600;color:#f1f5f9;margin-bottom:14px;border-bottom:1px solid #334155;padding-bottom:10px}
.dr{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1e293b40}
.dr .k{font-size:13px;color:#94a3b8}
.dr .v{font-size:13px;color:#f1f5f9;font-weight:500}
.hbar{height:8px;border-radius:4px;background:#334155;overflow:hidden;margin-top:6px}
.hfill{height:100%;border-radius:4px;transition:width .5s}
.sumbox{background:#0f172a;border:1px solid #334155;border-radius:8px;padding:16px;font-size:13px;color:#cbd5e1;line-height:1.7;max-height:300px;overflow-y:auto;white-space:pre-wrap}
.pg{display:flex;justify-content:center;gap:8px;margin-top:20px}
.pgb{background:#1e293b;border:1px solid #334155;border-radius:6px;padding:8px 14px;color:#94a3b8;cursor:pointer;font-size:13px}
.pgb:hover,.pgb.act{background:#2563eb;color:#fff;border-color:#2563eb}
.bkb{background:none;border:1px solid #334155;border-radius:8px;padding:8px 16px;color:#94a3b8;cursor:pointer;font-size:13px;margin-bottom:16px}
.bkb:hover{background:#334155;color:#e2e8f0}
.rc{background:#0f172a;border:1px solid #334155;border-radius:10px;padding:16px;margin-bottom:12px;cursor:pointer}
.rc h4{font-size:14px;font-weight:600;color:#f1f5f9;margin-bottom:8px}
.rm{display:flex;gap:16px;font-size:12px;color:#94a3b8;margin-bottom:10px;flex-wrap:wrap}
.ti{display:flex;gap:12px;padding:10px 0;border-left:2px solid #334155;margin-left:6px;padding-left:16px;position:relative}
.ti::before{content:'';width:10px;height:10px;border-radius:50%;background:#2563eb;position:absolute;left:-6px;top:14px}
.tn{font-weight:600;color:#f1f5f9;font-size:13px}
.tt{font-size:12px;color:#94a3b8}
.tg{font-size:11px;color:#f59e0b}
.es{text-align:center;padding:60px 20px;color:#64748b}
.es h3{font-size:18px;color:#94a3b8;margin-bottom:8px}
.tb{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.rf{font-size:11px;color:#64748b}
`

function App() {
  const [pg, setPg] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [mtgs, setMtgs] = useState({ meetings: [], total: 0, pages: 1 })
  const [parts, setParts] = useState({ participants: [], total: 0 })
  const [recs, setRecs] = useState({ recordings: [], total: 0 })
  const [sel, setSel] = useState(null)
  const [srch, setSrch] = useState('')
  const [stFilt, setStFilt] = useState('')
  const [cp, setCp] = useState(1)
  const [lr, setLr] = useState(new Date())
  const [ld, setLd] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [s, m] = await Promise.all([
        fetch('/api/stats').then(r => r.json()),
        fetch(`/api/meetings?page=${cp}&limit=15&search=${srch}&status=${stFilt}`).then(r => r.json()),
      ])
      setStats(s); setMtgs(m); setLr(new Date()); setLd(false)
    } catch (e) { console.error(e); setLd(false) }
  }, [cp, srch, stFilt])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const i = setInterval(fetchData, 30000); return () => clearInterval(i) }, [fetchData])

  const fetchParts = async () => { const r = await fetch('/api/participants').then(r => r.json()); setParts(r) }
  const fetchRecs = async () => { const r = await fetch('/api/recordings').then(r => r.json()); setRecs(r) }
  const fetchDetail = async (id) => { const r = await fetch(`/api/meeting-detail?id=${id}`).then(r => r.json()); setSel(r); setPg('detail') }

  const navTo = (p) => { setPg(p); setSel(null); if (p === 'participants') fetchParts(); if (p === 'recordings') fetchRecs() }
  const hc = (s) => s >= 80 ? '#10b981' : s >= 60 ? '#2563eb' : s >= 40 ? '#f59e0b' : '#ef4444'
  const hpd = stats ? Object.entries(stats.health_distribution).map(([k, v]) => ({ name: k, value: v })) : []

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <div className="sb">
          <div className="sb-h"><div className="sb-logo">
            <svg viewBox="0 0 36 36" fill="none"><rect width="36" height="36" rx="8" fill="#2563eb"/><path d="M10 13a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2h-8a2 2 0 01-2-2v-6z" fill="#fff"/><path d="M22 14.5l4-2v7l-4-2v-3z" fill="#fff" opacity="0.8"/></svg>
            <div><h1>Zoom Tracker</h1><span>Live Meeting Analytics</span></div>
          </div></div>
          <div className="ns">
            <div className="nl">Main</div>
            <div className={`ni ${pg==='dashboard'?'act':''}`} onClick={()=>navTo('dashboard')}>📊 Dashboard <span className="lb"><span className="ld"></span>LIVE</span></div>
            <div className={`ni ${pg==='meetings'?'act':''}`} onClick={()=>navTo('meetings')}>📅 All Meetings {stats&&<span className="bdg">{stats.total_meetings}</span>}</div>
            <div className={`ni ${pg==='participants'?'act':''}`} onClick={()=>navTo('participants')}>👥 Participants</div>
            <div className={`ni ${pg==='recordings'?'act':''}`} onClick={()=>navTo('recordings')}>🎬 Recordings {stats&&<span className="bdg">{stats.meetings_with_recordings}</span>}</div>
          </div>
          <div className="ns" style={{borderTop:'1px solid #334155',paddingTop:16}}>
            <div className="rf" style={{padding:'0 8px'}}>Last refresh: {lr.toLocaleTimeString()}</div>
          </div>
        </div>
        <div className="mn">
          {ld && !stats ? <div className="es"><h3>Loading data...</h3><p>Fetching live Zoom meeting data</p></div>
          : pg==='dashboard' ? <Dashboard stats={stats} mtgs={mtgs} onView={fetchDetail} hc={hc} hpd={hpd} />
          : pg==='meetings' ? <Meetings mtgs={mtgs} srch={srch} setSrch={setSrch} stFilt={stFilt} setStFilt={setStFilt} cp={cp} setCp={setCp} onView={fetchDetail} hc={hc} />
          : pg==='participants' ? <Participants parts={parts} />
          : pg==='recordings' ? <Recordings recs={recs} onView={fetchDetail} />
          : pg==='detail' && sel ? <Detail m={sel} onBack={()=>navTo('meetings')} hc={hc} />
          : null}
        </div>
      </div>
    </>
  )
}

function Dashboard({ stats, mtgs, onView, hc, hpd }) {
  if (!stats) return null
  return (<>
    <div className="tb"><div className="ph"><h2>Live Dashboard <span className="lb"><span className="ld"></span>LIVE</span></h2><p>Real-time Zoom meeting tracking & analytics — Coach Neuro Recode</p></div></div>
    <div className="sg">
      <div className="sc"><div className="ic" style={{background:'#2563eb20'}}>📅</div><div className="la">Total Meetings</div><div className="va">{stats.total_meetings}</div><div className="su">{stats.completed_meetings} completed · {stats.upcoming_meetings} upcoming</div></div>
      <div className="sc"><div className="ic" style={{background:'#10b98120'}}>⏱️</div><div className="la">Total Hours</div><div className="va">{stats.total_hours}</div><div className="su">Avg {stats.avg_duration_minutes} min/meeting</div></div>
      <div className="sc"><div className="ic" style={{background:'#f59e0b20'}}>👥</div><div className="la">Unique Participants</div><div className="va">{stats.total_participants_unique}</div><div className="su">Across all meetings</div></div>
      <div className="sc"><div className="ic" style={{background:'#8b5cf620'}}>💚</div><div className="la">Avg Health Score</div><div className="va" style={{color:hc(stats.avg_health_score)}}>{stats.avg_health_score}</div><div className="hbar"><div className="hfill" style={{width:`${stats.avg_health_score}%`,background:hc(stats.avg_health_score)}}></div></div></div>
    </div>
    <div className="cg">
      <div className="cc"><h3>📈 Daily Meeting Activity (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={stats.daily_chart}><defs><linearGradient id="cM" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155"/><XAxis dataKey="date" tick={{fill:'#64748b',fontSize:11}} tickFormatter={d=>d.slice(5)}/><YAxis tick={{fill:'#64748b',fontSize:11}}/>
            <Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:8,color:'#e2e8f0'}}/>
            <Area type="monotone" dataKey="meetings" stroke="#2563eb" fill="url(#cM)" strokeWidth={2}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="cc"><h3>💚 Health Distribution</h3>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart><Pie data={hpd} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" label={({name,value})=>`${name}: ${value}`}>
            {hpd.map((e,i)=><Cell key={i} fill={HC[e.name]||COLORS[i]}/>)}
          </Pie><Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:8,color:'#e2e8f0'}}/></PieChart>
        </ResponsiveContainer>
      </div>
    </div>
    <div className="cg">
      <div className="cc"><h3>👥 Top 10 Participants</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.top_participants} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#334155"/><XAxis type="number" tick={{fill:'#64748b',fontSize:11}}/><YAxis dataKey="name" type="category" width={140} tick={{fill:'#94a3b8',fontSize:12}}/><Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:8,color:'#e2e8f0'}}/><Bar dataKey="meetings" fill="#2563eb" radius={[0,4,4,0]}/></BarChart>
        </ResponsiveContainer>
      </div>
      <div className="cc"><h3>🕐 Meeting Times by Hour</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.hourly_chart}><CartesianGrid strokeDasharray="3 3" stroke="#334155"/><XAxis dataKey="hour" tick={{fill:'#64748b',fontSize:11}} tickFormatter={h=>`${h}:00`}/><YAxis tick={{fill:'#64748b',fontSize:11}}/><Tooltip contentStyle={{background:'#1e293b',border:'1px solid #334155',borderRadius:8,color:'#e2e8f0'}}/><Bar dataKey="count" fill="#8b5cf6" radius={[4,4,0,0]}/></BarChart>
        </ResponsiveContainer>
      </div>
    </div>
    <div className="cc" style={{marginBottom:28}}><h3>📅 Recent Meetings</h3>
      <table><thead><tr><th>Meeting</th><th>Date/Time</th><th>Duration</th><th>Participants</th><th>Health</th><th>Status</th><th>Recording</th></tr></thead>
        <tbody>{(mtgs.meetings||[]).slice(0,10).map((m,i)=>(
          <tr key={i} style={{cursor:'pointer'}} onClick={()=>onView(m.meeting_id)}>
            <td style={{fontWeight:600,color:'#f1f5f9',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.meeting_topic}</td>
            <td>{m.meeting_start_time_display||m.schedule_start_time_display||'-'}</td>
            <td>{m.duration_minutes>0?`${m.duration_minutes} min`:'-'}</td>
            <td>{m.participant_size||0}</td>
            <td><span className="hb" style={{background:hc(m.health?.score||0)+'20',color:hc(m.health?.score||0)}}>{m.health?.score||0} - {m.health?.label||'N/A'}</span></td>
            <td><span className={`stb ${m.status==='Completed'?'st-c':m.status==='Upcoming'?'st-u':'st-i'}`}>{m.status}</span></td>
            <td>{m.has_recording?'🎬 Yes':'—'}</td>
          </tr>))}</tbody>
      </table>
    </div>
  </>)
}

function Meetings({ mtgs, srch, setSrch, stFilt, setStFilt, cp, setCp, onView, hc }) {
  return (<>
    <div className="ph"><h2>All Meetings</h2><p>Browse and search all Zoom meetings with full details</p></div>
    <div className="sbar">
      <input className="si" placeholder="🔍 Search meetings by topic or participant..." value={srch} onChange={e=>{setSrch(e.target.value);setCp(1)}}/>
      {['','Completed','Upcoming'].map(s=><button key={s} className={`fb ${stFilt===s?'act':''}`} onClick={()=>{setStFilt(s);setCp(1)}}>{s||'All'}</button>)}
    </div>
    <div className="cc"><table><thead><tr><th>Topic</th><th>Date & Time</th><th>Duration</th><th>Participants</th><th>Host</th><th>Health</th><th>Status</th><th>Rec</th></tr></thead>
      <tbody>{(mtgs.meetings||[]).map((m,i)=>(
        <tr key={i} style={{cursor:'pointer'}} onClick={()=>onView(m.meeting_id)}>
          <td style={{fontWeight:600,color:'#f1f5f9',maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.meeting_topic}</td>
          <td style={{whiteSpace:'nowrap'}}>{m.meeting_start_time_display||m.schedule_start_time_display||'-'}</td>
          <td>{m.duration_minutes>0?`${m.duration_minutes} min`:'-'}</td>
          <td>{m.participant_size||0}</td>
          <td>{m.owner_name||'-'}</td>
          <td><span className="hb" style={{background:hc(m.health?.score||0)+'20',color:hc(m.health?.score||0)}}>{m.health?.score||0}</span></td>
          <td><span className={`stb ${m.status==='Completed'?'st-c':m.status==='Upcoming'?'st-u':'st-i'}`}>{m.status}</span></td>
          <td>{m.has_recording?'🎬':'—'}</td>
        </tr>))}</tbody>
    </table>
    {mtgs.pages>1&&<div className="pg">{Array.from({length:Math.min(mtgs.pages,10)},(_,i)=><button key={i} className={`pgb ${cp===i+1?'act':''}`} onClick={()=>setCp(i+1)}>{i+1}</button>)}</div>}
    </div>
  </>)
}

function Detail({ m, onBack, hc }) {
  if (!m||m.error) return <div className="es"><h3>Meeting not found</h3></div>
  return (<>
    <button className="bkb" onClick={onBack}>← Back to Meetings</button>
    <div className="ph"><h2>{m.meeting_topic}</h2><p>Meeting ID: {m.meeting_id} · {m.status}</p></div>
    <div className="sg">
      <div className="sc"><div className="la">Duration</div><div className="va" style={{fontSize:24}}>{m.duration_minutes} min</div></div>
      <div className="sc"><div className="la">Participants</div><div className="va" style={{fontSize:24}}>{m.participant_size||0}</div></div>
      <div className="sc"><div className="la">Health Score</div><div className="va" style={{fontSize:24,color:hc(m.health?.score||0)}}>{m.health?.score||0}/100</div><div className="hbar"><div className="hfill" style={{width:`${m.health?.score||0}%`,background:hc(m.health?.score||0)}}></div></div></div>
      <div className="sc"><div className="la">Recording</div><div className="va" style={{fontSize:24}}>{m.has_recording?'✅ Yes':'❌ No'}</div></div>
    </div>
    <div className="dg">
      <div className="ds"><h3>📋 Meeting Details</h3>
        {[['Topic',m.meeting_topic],['Meeting ID',m.meeting_id],['Meeting Number',m.meeting_number||'N/A'],['Host',m.owner_name||'N/A'],['Host Email',m.host_email||'N/A'],['Scheduled Start',m.schedule_start_time_display||'N/A'],['Scheduled End',m.schedule_end_time_display||'N/A'],['Actual Start',m.meeting_start_time_display||'N/A'],['Actual End',m.meeting_end_time_display||'N/A'],['Join URL',m.join_url||'N/A']].map(([k,v],i)=><div className="dr" key={i}><span className="k">{k}</span><span className="v" style={{wordBreak:'break-all',maxWidth:300,textAlign:'right'}}>{v}</span></div>)}
      </div>
      <div className="ds"><h3>💚 Health Breakdown</h3>
        {(m.health?.factors||[]).map((f,i)=><div key={i} style={{marginBottom:12}}><div className="dr"><span className="k">{f.name}</span><span className="v">{f.score}/25</span></div><div className="hbar"><div className="hfill" style={{width:`${(f.score/25)*100}%`,background:hc(f.score*4)}}></div></div><div style={{fontSize:11,color:'#64748b',marginTop:4}}>{f.detail}</div></div>)}
      </div>
    </div>
    <div className="cc" style={{marginTop:16}}><h3>👥 Participant Timeline & Gaps</h3>
      {(m.participant_details||[]).length>0?<div>{m.participant_details.map((p,i)=><div className="ti" key={i}><div><div className="tn">{p.name} {p.is_host?'(Host)':''}</div><div className="tt">Joined: {p.join_time} · Left: {p.leave_time}</div><div className="tt">Active: {p.active_duration_min} min</div>{p.gap_from_previous_min>0&&<div className="tg">⏳ Gap from previous: {p.gap_from_previous_min} min</div>}</div></div>)}</div>:<div className="es"><p>No participant timeline data</p></div>}
    </div>
    {m.recording_summary&&<div className="cc" style={{marginTop:16}}><h3>🎬 Recording Summary</h3><div className="sumbox">{m.recording_summary}</div></div>}
  </>)
}

function Participants({ parts }) {
  return (<>
    <div className="ph"><h2>Participants Directory</h2><p>All participants across your Zoom meetings with engagement analytics</p></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
      {(parts.participants||[]).map((p,i)=><div className="pc" key={i}>
        <div className="pa" style={{background:COLORS[i%COLORS.length]}}>{(p.name||'?')[0].toUpperCase()}</div>
        <div className="pi"><h4>{p.name}</h4><p>{p.email||'No email'}</p><p style={{marginTop:2}}>First: {p.first_seen||'N/A'} · Last: {p.last_seen||'N/A'}</p></div>
        <div className="ps"><div className="ct">{p.total_meetings}</div><div className="la">meetings</div><div style={{fontSize:11,color:'#64748b',marginTop:4}}>Avg {p.avg_duration} min</div><div style={{fontSize:11,color:'#64748b'}}>{Math.round(p.total_duration_min)} min total</div></div>
      </div>)}
    </div>
  </>)
}

function Recordings({ recs, onView }) {
  return (<>
    <div className="ph"><h2>Meeting Recordings & Summaries</h2><p>All meetings with recordings and AI-generated summaries</p></div>
    {(recs.recordings||[]).length===0?<div className="es"><h3>No recordings found</h3></div>
    :(recs.recordings||[]).map((r,i)=><div className="rc" key={i} onClick={()=>onView(r.meeting_id)}>
      <h4>🎬 {r.topic}</h4>
      <div className="rm"><span>📅 {r.date}</span><span>⏱ {r.duration} min</span><span>👥 {r.participants}</span><span>🏥 Health: {r.health_score}/100</span><span>🎤 Host: {r.host}</span></div>
      <div style={{fontSize:12,color:'#94a3b8',marginBottom:8}}>Attendees: {r.attendees.join(', ')}</div>
      {r.summary&&<div className="sumbox" style={{maxHeight:100}}>{r.summary.substring(0,300)}...</div>}
    </div>)}
  </>)
}

export default App
