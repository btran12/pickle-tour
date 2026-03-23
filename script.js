// ─── STATE ───────────────────────────────────────────
const S={
  tType:'singles', bMethod:'skill',
  teams:[], groups:[], rrMatches:{}, bracketMatches:[], bracketRounds:[],
  courts:[], schedule:{},  // matchId -> {courtId, time}
  history:[],
  bracketSeedGroups:{},   // teamId -> groupIdx (for group origin badges in bracket)
  curRRGroup:0, scoringCtx:null, assignCtx:null, _editTeamId:null,
  settings:{winScore:11,winBy2:true,rrBestOf:1,advanceCount:2,sfBestOf:3,finalsBestOf:5,thirdBestOf:3,numGroups:2,matchDuration:20},
};
let _tid=1,_mid=1,_cid=1;
let dragTeam=null,dragFromG=null;

const SKILL_LABELS={1:'2.0',2:'2.5–3.0',3:'3.5',4:'4.0',5:'4.5+'};
const S_CONSTRAINTS={numGroups:{min:1,max:8},rrBestOf:{min:1,max:5},advanceCount:{min:1,max:8},sfBestOf:{min:1,max:7},finalsBestOf:{min:1,max:7},thirdBestOf:{min:1,max:7},matchDuration:{min:5,max:120}};
const ODD_ONLY=['rrBestOf','sfBestOf','finalsBestOf','thirdBestOf'];

// ─── NAV ─────────────────────────────────────────────
function navTo(p){
  document.querySelectorAll('.page').forEach(e=>e.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+p).classList.add('active');
  document.querySelector(`nav button[data-page="${p}"]`).classList.add('active');
  const L={setup:'Setup',teams:'Teams',players:'Players',groups:'Groups',schedule:'Courts',roundrobin:'Round Robin',bracket:'Bracket',history:'History'};
  document.getElementById('phaseBadge').textContent=L[p]||p;
  if(p==='teams')renderTeams();
  if(p==='players')renderPlayersPage();
  if(p==='groups')renderGroups();
  if(p==='roundrobin')renderRRPage();
  if(p==='bracket')renderBracketPage();
  if(p==='schedule')renderSchedulePage();
  if(p==='history')renderHistory();
}
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>navTo(b.dataset.page)));

// ─── SETUP ───────────────────────────────────────────
function setTType(t,btn){S.tType=t;tog(btn);}
function setBMethod(m,btn){S.bMethod=m;tog(btn);}
function tog(btn){btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}

// ─── SETTINGS ────────────────────────────────────────
function adj(k,d){
  let v=S.settings[k]+d;
  const c=S_CONSTRAINTS[k]||{min:1,max:99};
  v=Math.max(c.min,Math.min(c.max,v));
  if(ODD_ONLY.includes(k)&&v%2===0)v+=d>0?1:-1;
  v=Math.max(c.min,Math.min(c.max,v));
  S.settings[k]=v;
  const el=document.getElementById('val-'+k);if(el)el.textContent=v;
  syncPv();
}
function setSetting(k,v,btn){S.settings[k]=v;tog(btn);syncPv();}
function setSettingB(k,v,btn){S.settings[k]=v;tog(btn);}
function syncPv(){} // preview elements removed (settings merged into setup)

// ─── TEAMS ───────────────────────────────────────────
function openAddTeamModal(){
  S._editTeamId=null;
  const isD=S.tType==='doubles';
  document.getElementById('addTeamTitle').textContent=isD?'ADD DOUBLES TEAM':'ADD PLAYER';
  document.getElementById('addTeamForm').innerHTML=isD?`
    <div class="form-row"><label>Team Name (optional)</label><input type="text" id="tm-tn" placeholder="Auto-generated if blank"></div>
    <div class="form-row-inline"><div><label>Player 1</label><input type="text" id="tm-p1" placeholder="Player 1"></div><div><label>Skill</label><select id="tm-s1">${skOpts()}</select></div></div>
    <div class="form-row-inline mt8"><div><label>Player 2</label><input type="text" id="tm-p2" placeholder="Player 2"></div><div><label>Skill</label><select id="tm-s2">${skOpts()}</select></div></div>`:`
    <div class="form-row"><label>Player Name</label><input type="text" id="tm-p1" placeholder="Enter name"></div>
    <div class="form-row"><label>Skill Level</label><select id="tm-s1">${skOpts()}</select></div>`;
  const sb=document.getElementById('addTeamSubmitBtn');if(sb)sb.textContent='Add';
  openModal('addTeamModal');
  setTimeout(()=>document.getElementById('tm-p1')?.focus(),50);
}
function openEditTeamModal(id){
  const team=S.teams.find(t=>t.id===id);
  if(!team)return;
  S._editTeamId=id;
  const isD=S.tType==='doubles';
  const p1=team.players[0]||{},p2=team.players[1]||{};
  document.getElementById('addTeamTitle').textContent=isD?'EDIT DOUBLES TEAM':'EDIT PLAYER';
  document.getElementById('addTeamForm').innerHTML=isD?`
    <div class="form-row"><label>Team Name</label><input type="text" id="tm-tn" value="${team.name.replace(/"/g,'&quot;')}"></div>
    <div class="form-row-inline"><div><label>Player 1</label><input type="text" id="tm-p1" value="${(p1.name||'').replace(/"/g,'&quot;')}"></div><div><label>Skill</label><select id="tm-s1">${skOpts()}</select></div></div>
    <div class="form-row-inline mt8"><div><label>Player 2</label><input type="text" id="tm-p2" value="${(p2.name||'').replace(/"/g,'&quot;')}"></div><div><label>Skill</label><select id="tm-s2">${skOpts()}</select></div></div>`:`
    <div class="form-row"><label>Player Name</label><input type="text" id="tm-p1" value="${(p1.name||'').replace(/"/g,'&quot;')}"></div>
    <div class="form-row"><label>Skill Level</label><select id="tm-s1">${skOpts()}</select></div>`;
  const sb=document.getElementById('addTeamSubmitBtn');if(sb)sb.textContent='Save';
  openModal('addTeamModal');
  setTimeout(()=>{
    const s1=document.getElementById('tm-s1');if(s1)s1.value=p1.skill||'';
    const s2=document.getElementById('tm-s2');if(s2)s2.value=p2.skill||'';
    document.getElementById('tm-p1')?.select();
  },30);
}
function skOpts(){return `<option value="">Not specified</option><option value="1">2.0 — Beginner</option><option value="2">2.5–3.0 — Intermediate</option><option value="3">3.5 — Solid</option><option value="4">4.0 — Advanced</option><option value="5">4.5+ — Elite</option>`;}
function submitAddTeam(){
  // Delegate to edit flow if we're in edit mode
  if(S._editTeamId!==null){submitEditTeam();return;}
  const p1=document.getElementById('tm-p1')?.value.trim();
  if(!p1){alert('Enter player name.');return;}
  const s1=parseInt(document.getElementById('tm-s1')?.value)||0;
  let team;
  if(S.tType==='singles'){
    team={id:_tid++,name:p1,players:[{name:p1,skill:s1}],avgSkill:s1};
  } else {
    const p2=document.getElementById('tm-p2')?.value.trim()||'Player 2';
    const s2=parseInt(document.getElementById('tm-s2')?.value)||0;
    const tn=document.getElementById('tm-tn')?.value.trim()||`${p1} / ${p2}`;
    const skills=[s1,s2].filter(s=>s>0);
    const avg=skills.length?skills.reduce((a,b)=>a+b,0)/skills.length:0;
    team={id:_tid++,name:tn,players:[{name:p1,skill:s1},{name:p2,skill:s2}],avgSkill:avg};
  }
  S.teams.push(team);closeModal('addTeamModal');renderTeams();renderPlayersPage();
}
function submitEditTeam(){
  const team=S.teams.find(t=>t.id===S._editTeamId);
  if(!team)return;
  const p1v=document.getElementById('tm-p1')?.value.trim();
  if(!p1v){alert('Enter player name.');return;}
  const s1=parseInt(document.getElementById('tm-s1')?.value)||0;
  if(S.tType==='singles'){
    team.name=p1v;team.players=[{name:p1v,skill:s1}];team.avgSkill=s1;
  } else {
    const p2v=document.getElementById('tm-p2')?.value.trim()||'Player 2';
    const s2=parseInt(document.getElementById('tm-s2')?.value)||0;
    const tn=document.getElementById('tm-tn')?.value.trim()||`${p1v} / ${p2v}`;
    const skills=[s1,s2].filter(s=>s>0);
    const avg=skills.length?skills.reduce((a,b)=>a+b,0)/skills.length:0;
    team.name=tn;team.players=[{name:p1v,skill:s1},{name:p2v,skill:s2}];team.avgSkill=avg;
  }
  S._editTeamId=null;
  closeModal('addTeamModal');renderTeams();renderPlayersPage();
}
function removeTeam(id){S.teams=S.teams.filter(t=>t.id!==id);renderTeams();renderPlayersPage();}
function renderTeams(){
  const sub=document.getElementById('teamsSubtext');
  if(sub)sub.textContent=S.tType==='doubles'?'Adding doubles teams (2 players)':'Adding singles players';
  const list=document.getElementById('teamsList');
  const act=document.getElementById('teamsActions');
  if(!S.teams.length){list.innerHTML=`<div class="empty-state"><div class="ei">🎾</div><strong>No teams yet</strong>Click Add Team</div>`;act.style.display='none';return;}
  act.style.display='block';
  list.innerHTML=S.teams.map(t=>{
    const sk=t.avgSkill?`<span class="skill-badge skill-${Math.round(t.avgSkill)}">${SKILL_LABELS[Math.round(t.avgSkill)]||'?'}</span>`:'';
    const meta=S.tType==='doubles'?t.players.map(p=>p.name+(p.skill?` (${SKILL_LABELS[p.skill]})`:'')).join(' & '):'';
    return `<div class="team-item"><div><div class="team-name">${t.name}${sk}</div><div class="team-meta">${meta}</div></div>
      <div style="display:flex;gap:5px">
        <button class="btn btn-outline btn-sm no-print" onclick="openEditTeamModal(${t.id})" title="Edit">✏</button>
        <button class="btn btn-danger btn-sm no-print" onclick="removeTeam(${t.id})">✕</button>
      </div></div>`;
  }).join('');
}

function loadSampleTeams(){
  if(S.teams.length&&!confirm('This will add sample doubles teams to your current list. Continue?'))return;
  // Switch to doubles mode
  S.tType='doubles';
  document.querySelectorAll('.toggle-group button').forEach(b=>{if(b.textContent.trim()==='Doubles')b.click();});
  const samples=[
    {tn:'The Picklers',    p1:'Alex Rivera',   s1:5, p2:'Sam Torres',    s2:4},
    {tn:'Dink Dynasty',    p1:'Jordan Lee',    s1:4, p2:'Morgan Kim',    s2:4},
    {tn:'Net Dominators',  p1:'Casey Patel',   s1:4, p2:'Riley Chen',    s2:3},
    {tn:'Spin Doctors',    p1:'Drew Martinez', s1:3, p2:'Quinn Nguyen',  s2:3},
    {tn:'Drop Shot Duo',   p1:'Avery Johnson', s1:3, p2:'Sage Williams', s2:3},
    {tn:'Kitchen Kings',   p1:'Blake Thompson',s1:2, p2:'Reese Davis',   s2:3},
    {tn:'Serve & Protect', p1:'Taylor Brown',  s1:2, p2:'Jamie Wilson',  s2:2},
    {tn:'The Bangers',     p1:'Charlie Moore', s1:2, p2:'Finley Taylor', s2:2},
  ];
  samples.forEach(({tn,p1,s1,p2,s2})=>{
    const skills=[s1,s2].filter(s=>s>0);
    const avg=skills.reduce((a,b)=>a+b,0)/skills.length;
    S.teams.push({id:_tid++,name:tn,players:[{name:p1,skill:s1},{name:p2,skill:s2}],avgSkill:avg});
  });
  renderTeams();renderPlayersPage();wsBroadcast();
}

function renderPlayersPage(){
  const content=document.getElementById('playersList');
  if(!content)return;
  const sub=document.getElementById('playersSubtext');
  const isD=S.tType==='doubles';
  const query=(document.getElementById('playerSearch')?.value||'').toLowerCase().trim();

  if(!S.teams.length){
    content.innerHTML=`<div class="empty-state"><div class="ei">🧑</div><strong>No players yet</strong>Add teams on the Teams tab first</div>`;
    if(sub)sub.textContent='No players registered yet';
    return;
  }

  // Build flat player list from all teams
  const all=[];
  S.teams.forEach(t=>{
    t.players.forEach(p=>{
      all.push({name:p.name||'',skill:p.skill||0,teamName:t.name,teamId:t.id});
    });
  });

  const filtered=query?all.filter(p=>p.name.toLowerCase().includes(query)||p.teamName.toLowerCase().includes(query)):all;
  // Sort: skill desc, then name asc
  filtered.sort((a,b)=>(b.skill||0)-(a.skill||0)||a.name.localeCompare(b.name));

  if(sub)sub.textContent=`${all.length} player${all.length!==1?'s':''} across ${S.teams.length} team${S.teams.length!==1?'s':''}`;

  if(!filtered.length){
    content.innerHTML=`<div class="empty-state"><div class="ei">🔍</div><strong>No players match</strong>Try a different search</div>`;
    return;
  }

  // Group by skill tier for readability
  const tiers=[5,4,3,2,1,0];
  const tierLabel={5:'4.5+ — Elite',4:'4.0 — Advanced',3:'3.5 — Solid',2:'2.5–3.0 — Intermediate',1:'2.0 — Beginner',0:'Skill Not Set'};
  const tierClass={5:'skill-5',4:'skill-4',3:'skill-3',2:'skill-2',1:'skill-1',0:''};
  let html='';
  tiers.forEach(sk=>{
    const group=filtered.filter(p=>(p.skill||0)===sk);
    if(!group.length)return;
    html+=`<div class="card mb12">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        ${sk?`<span class="skill-badge ${tierClass[sk]}">${tierLabel[sk]}</span>`:`<span style="font-size:12px;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:1px">Skill Not Set</span>`}
        <span style="font-size:12px;color:var(--text3)">${group.length} player${group.length!==1?'s':''}</span>
      </div>
      <table class="standings-table">
        <thead><tr><th>#</th><th>Player</th>${isD?'<th>Team</th>':''}<th class="no-print" style="text-align:right">Actions</th></tr></thead>
        <tbody>
          ${group.map((p,i)=>`<tr>
            <td><span class="rank-num">${i+1}</span></td>
            <td style="font-weight:500">${p.name}</td>
            ${isD?`<td style="font-size:12px;color:var(--text3)">${p.teamName}</td>`:''}
            <td style="text-align:right" class="no-print">
              <button class="btn btn-outline btn-sm" onclick="openEditTeamModal(${p.teamId})" title="Edit team">✏</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  });
  content.innerHTML=html;
}

// ─── GROUPS + DRAG & DROP ────────────────────────────
function goToGroups(){if(S.teams.length<2){alert('Add at least 2 teams.');return;}assignGroups();navTo('groups');}
function assignGroups(){
  const n=S.settings.numGroups;
  S.groups=Array.from({length:n},(_,i)=>({id:i,name:'Group '+String.fromCharCode(65+i),teams:[]}));
  if(S.bMethod==='skill'){
    const sorted=[...S.teams].sort((a,b)=>(b.avgSkill||0)-(a.avgSkill||0));
    let dir=1,gi=0;
    sorted.forEach(t=>{S.groups[gi].teams.push(t);gi+=dir;if(gi>=n){gi=n-1;dir=-1;}else if(gi<0){gi=0;dir=1;}});
  } else if(S.bMethod==='random'){
    [...S.teams].sort(()=>Math.random()-.5).forEach((t,i)=>S.groups[i%n].teams.push(t));
  } else {
    S.teams.forEach((t,i)=>S.groups[i%n].teams.push(t));
  }
  renderGroups();
}
function renderGroups(){
  const isM=S.bMethod==='manual';
  document.getElementById('groupsSubtext').textContent=isM?'Drag teams between groups to reassign':`${S.teams.length} teams across ${S.groups.length} groups — ${S.bMethod} assignment`;
  const c=document.getElementById('groupsContainer');
  c.innerHTML=S.groups.map(g=>`
    <div class="group-card" id="gc-${g.id}" ondragover="dragOver(event,${g.id})" ondrop="drop(event,${g.id})" ondragleave="dragLeave(event,${g.id})">
      <div class="group-header"><div class="group-label">${g.name}</div><div class="group-count">${g.teams.length} teams</div></div>
      ${g.teams.length===0?`<div style="font-size:12px;color:var(--text3);text-align:center;padding:10px 0">Drop here</div>`:g.teams.map(t=>teamDragEl(t,g.id)).join('')}
    </div>`).join('');
  document.getElementById('unassignedPool').style.display=isM?'block':'none';
}
function teamDragEl(t,gid){
  const sk=t.avgSkill?`<span class="skill-badge skill-${Math.round(t.avgSkill)}">${SKILL_LABELS[Math.round(t.avgSkill)]}</span>`:'';
  return `<div class="group-team" id="dt-${t.id}" draggable="true" ondragstart="dragStart(event,${t.id},${gid})" ondragend="dragEnd(event)">${t.name}${sk}</div>`;
}
function dragStart(e,tid,gid){dragTeam=tid;dragFromG=gid;setTimeout(()=>document.getElementById('dt-'+tid)?.classList.add('dragging'),0);e.dataTransfer.effectAllowed='move';}
function dragEnd(){document.querySelectorAll('.group-team').forEach(el=>el.classList.remove('dragging'));}
function dragOver(e,gid){e.preventDefault();const el=gid!==null?document.getElementById('gc-'+gid):document.getElementById('unassignedDrop');el?.classList.add('drag-over');}
function dragLeave(e,gid){const el=gid!==null?document.getElementById('gc-'+gid):document.getElementById('unassignedDrop');el?.classList.remove('drag-over');}
function drop(e,toGid){
  e.preventDefault();
  document.querySelectorAll('.group-card,.unassigned-pool').forEach(el=>el.classList.remove('drag-over'));
  if(dragTeam===null)return;
  if(dragFromG!==null){const src=S.groups.find(g=>g.id===dragFromG);if(src)src.teams=src.teams.filter(t=>t.id!==dragTeam);}
  const team=S.teams.find(t=>t.id===dragTeam);
  if(team&&toGid!==null){const dest=S.groups.find(g=>g.id===toGid);if(dest&&!dest.teams.find(t=>t.id===dragTeam))dest.teams.push(team);}
  dragTeam=null;dragFromG=null;renderGroups();
}

// ─── COURTS & SCHEDULE ───────────────────────────────
function openAddCourtModal(){document.getElementById('courtNameInput').value='';openModal('addCourtModal');setTimeout(()=>document.getElementById('courtNameInput').focus(),50);}
function submitAddCourt(){
  const nm=document.getElementById('courtNameInput').value.trim();
  if(!nm){alert('Enter a court name.');return;}
  S.courts.push({id:_cid++,name:nm});closeModal('addCourtModal');renderSchedulePage();
}
function removeCourt(id){
  S.courts=S.courts.filter(c=>c.id!==id);
  for(const mid in S.schedule){if(S.schedule[mid].courtId===id)delete S.schedule[mid];}
  renderSchedulePage();
}
function allMatchesFlat(){
  const arr=[];
  for(const gi in S.rrMatches)arr.push(...S.rrMatches[gi]);
  arr.push(...S.bracketMatches.filter(m=>!m.teamA?.isBye&&!m.teamB?.isBye));
  return arr;
}
function autoSchedule(){
  if(!S.courts.length){alert('Add at least one court first.');return;}
  const matches=allMatchesFlat().filter(m=>m.status!=='done');
  const sp=document.getElementById('schedStart').value.split(':');
  let baseMin=parseInt(sp[0])*60+parseInt(sp[1]);
  const dur=S.settings.matchDuration;
  const courtSlots={};
  S.courts.forEach(c=>courtSlots[c.id]=0);
  matches.forEach((m,i)=>{
    const court=S.courts[i%S.courts.length];
    const slot=courtSlots[court.id];
    const t=baseMin+slot*dur;
    const h=Math.floor((t/60)%24).toString().padStart(2,'0');
    const mn=(t%60).toString().padStart(2,'0');
    S.schedule[m.id]={courtId:court.id,time:`${h}:${mn}`};
    courtSlots[court.id]++;
  });
  renderSchedulePage();
}
function fmtTime(t){
  if(!t)return '';const[h,m]=t.split(':');const hr=parseInt(h);return `${hr%12||12}:${m} ${hr>=12?'PM':'AM'}`;
}
function openAssignCourt(mid){
  S.assignCtx=mid;const cur=S.schedule[mid]||{};
  document.getElementById('assignCourtContent').innerHTML=`
    <div class="form-row"><label>Court</label><select id="ac-court">${S.courts.map(c=>`<option value="${c.id}" ${cur.courtId===c.id?'selected':''}>${c.name}</option>`).join('')}</select></div>
    <div class="form-row"><label>Time</label><input type="time" id="ac-time" value="${cur.time||'09:00'}"></div>`;
  openModal('assignCourtModal');
}
function submitAssignCourt(){
  const mid=S.assignCtx;if(!mid)return;
  S.schedule[mid]={courtId:parseInt(document.getElementById('ac-court').value),time:document.getElementById('ac-time').value};
  closeModal('assignCourtModal');renderSchedulePage();
}
function renderCourtSummary(){
  const el=document.getElementById('courtListSummary');if(!el)return;
  if(!S.courts.length){el.innerHTML='<div style="font-size:13px;color:var(--text3)">No courts yet</div>';return;}
  el.innerHTML=S.courts.map(c=>`<div class="flex-row flex-between" style="padding:4px 0;border-bottom:1px solid var(--border);font-size:13px"><span style="color:var(--purple)">${c.name}</span><button class="btn btn-ghost btn-sm" onclick="removeCourt(${c.id})">✕</button></div>`).join('');
}
function renderSchedulePage(){
  renderCourtSummary();
  const content=document.getElementById('scheduleContent');
  if(!S.courts.length){content.innerHTML=`<div class="empty-state"><div class="ei">🏟</div><strong>No courts added</strong>Add courts then click Auto-Schedule</div>`;return;}
  const matches=allMatchesFlat();
  const byCourt={};S.courts.forEach(c=>{byCourt[c.id]=[];});
  matches.forEach(m=>{const sc=S.schedule[m.id];if(sc&&byCourt[sc.courtId])byCourt[sc.courtId].push({m,time:sc.time});});
  content.innerHTML=`<div class="schedule-grid">${S.courts.map(c=>{
    const slots=(byCourt[c.id]||[]).sort((a,b)=>a.time.localeCompare(b.time));
    return `<div class="court-card"><div class="court-header"><div class="court-name">${c.name}</div><span style="font-size:12px;color:var(--text3)">${slots.length} match${slots.length!==1?'es':''}</span></div>
    ${slots.length?slots.map(({m,time})=>{
      const isDone=m.status==='done',ta=m.teamA?.name||'TBD',tb=m.teamB?.name||'TBD';
      return `<div class="court-slot" style="${isDone?'opacity:.6':''}"><div class="court-slot-time">${fmtTime(time)} · ${S.settings.matchDuration} min</div>
        <div class="court-slot-match">${ta} <span style="color:var(--text3)">vs</span> ${tb}</div>
        <div style="display:flex;gap:5px;margin-top:4px;flex-wrap:wrap">
          ${isDone?'<span style="font-size:11px;color:var(--accent)">✓ Done</span>':''}
          <button class="btn btn-ghost btn-sm no-print" style="padding:1px 7px;font-size:11px" onclick="openAssignCourt(${m.id})">✏ Reassign</button>
        </div></div>`;
    }).join(''):`<div class="court-slot empty-slot">No matches assigned</div>`}
    </div>`;
  }).join('')}</div>`;
}

// ─── ROUND ROBIN ─────────────────────────────────────
function startRR(){
  if(!S.groups.length){alert('Assign groups first.');return;}
  S.rrMatches={};
  S.groups.forEach((g,gi)=>{
    const ms=[];
    for(let a=0;a<g.teams.length;a++)for(let b=a+1;b<g.teams.length;b++)
      ms.push({id:_mid++,teamA:g.teams[a],teamB:g.teams[b],games:[],winner:null,status:'pending'});
    S.rrMatches[gi]=ms;
  });
  navTo('roundrobin');
}
function renderRRPage(){
  const tabs=document.getElementById('rrTabs'),content=document.getElementById('rrContent');
  if(!Object.keys(S.rrMatches).length){content.innerHTML=`<div class="empty-state"><div class="ei">🔄</div><strong>Round Robin not started</strong>Go to Groups and click Start Round Robin</div>`;tabs.innerHTML='';return;}
  tabs.innerHTML=S.groups.map((g,i)=>`<button class="btn btn-sm ${i===S.curRRGroup?'btn-primary':'btn-outline'}" onclick="switchRR(${i})">${g.name}</button>`).join('');
  renderRRGroup(S.curRRGroup);
}
function switchRR(gi){S.curRRGroup=gi;renderRRPage();}
function renderRRGroup(gi){
  const content=document.getElementById('rrContent');
  const matches=S.rrMatches[gi]||[],group=S.groups[gi];
  const standings=computeStandings(gi);
  const allDone=matches.length>0&&matches.every(m=>m.status==='done');
  let html=`<div class="card mb12"><div class="card-title">Standings — ${group.name}</div>
    <table class="standings-table"><thead><tr><th>#</th><th>Team</th><th>W</th><th>L</th><th>GW</th><th>GL</th><th>PD</th></tr></thead><tbody>
    ${standings.map((s,i)=>`<tr>
      <td><span class="rank-num rank-${i+1}">${i+1}</span></td>
      <td style="font-weight:500">${s.team.name}${i<S.settings.advanceCount?` <span style="font-size:10px;color:var(--accent)">↑</span>`:''}</td>
      <td style="color:var(--accent)">${s.wins}</td><td style="color:var(--red)">${s.losses}</td>
      <td style="color:var(--text2)">${s.gamesWon}</td><td style="color:var(--text3)">${s.gamesLost}</td>
      <td class="pts-cell">${s.pd>=0?'+':''}${s.pd}</td>
    </tr>`).join('')}</tbody></table></div>`;
  if(allDone)html+=`<div class="alert alert-success">✅ Group complete! <button class="btn btn-sm btn-primary no-print" style="margin-left:9px" onclick="generateBracket()">Generate Bracket →</button></div>`;
  html+=`<div class="card-title mb8">Matches</div>`;
  html+=matches.map(m=>rrMatchCard(m)).join('');
  content.innerHTML=html;
}
function matchScoreDisplay(m,bestOf){
  // For Best-of-1: show raw point score of the single game
  // For Best-of-X: show games-won count + game-by-game pips
  if(!m.games.length) return '';
  const isDone=m.status==='done';
  if(bestOf===1){
    const g=m.games[0];
    const wA=isDone&&m.winner?.id===m.teamA.id,wB=isDone&&m.winner?.id===m.teamB.id;
    return {
      scoreA:`<div class="team-slot-score ${isDone&&!wA?'loser-score':''}">${g.scoreA}</div>`,
      scoreB:`<div class="team-slot-score ${isDone&&!wB?'loser-score':''}">${g.scoreB}</div>`,
      pips:''
    };
  }
  const gwA=gamesWon(m,'A'),gwB=gamesWon(m,'B');
  const wA=isDone&&m.winner?.id===m.teamA.id,wB=isDone&&m.winner?.id===m.teamB.id;
  const pips=m.games.map((g,i)=>`<div style="display:flex;gap:6px;align-items:center;margin-top:6px">
    <span style="font-size:11px;color:var(--text3)">G${i+1}</span>
    <span class="game-pip ${gameWin(g.scoreA,g.scoreB)===0?'win':gameWin(g.scoreA,g.scoreB)===1?'loss':''}">${g.scoreA}</span>
    <span style="font-size:11px;color:var(--text3)">—</span>
    <span class="game-pip ${gameWin(g.scoreA,g.scoreB)===1?'win':gameWin(g.scoreA,g.scoreB)===0?'loss':''}">${g.scoreB}</span>
  </div>`).join('');
  return {
    scoreA:`<div class="team-slot-score ${isDone&&!wA?'loser-score':''}">${gwA}</div>`,
    scoreB:`<div class="team-slot-score ${isDone&&!wB?'loser-score':''}">${gwB}</div>`,
    pips
  };
}
function rrMatchCard(m){
  const isDone=m.status==='done';
  const bestOf=S.settings.rrBestOf;
  const sc=S.schedule[m.id],court=sc?S.courts.find(c=>c.id===sc.courtId):null;
  const sd=matchScoreDisplay(m,bestOf);
  return `<div class="match-card ${m.status==='live'?'active-match':''} ${isDone?'completed':''}">
    <div class="match-header">
      <div class="flex-row" style="gap:5px;flex-wrap:wrap">
        <span class="match-label">Best of ${bestOf}</span>
        ${court?`<span class="court-badge">${court.name}</span>`:''}
        ${sc?.time?`<span class="time-badge">${fmtTime(sc.time)}</span>`:''}
      </div>
      <div class="match-meta">
        ${isDone?`<button class="btn btn-ghost btn-sm no-print" onclick="openScoreModal('rr',${m.id})" title="Edit">✏</button>`:''}
        <span class="match-status-badge status-${m.status==='pending'?'pending':m.status==='done'?'done':'live'}">
          ${m.status==='pending'?'Pending':m.status==='done'?'W: '+m.winner.name:'Live'}
        </span>
      </div>
    </div>
    <div class="teams-row">
      <div class="team-slot ${isDone&&m.winner?.id===m.teamA.id?'winner':''}">
        <div class="team-slot-name">${m.teamA.name}</div>
        ${sd?sd.scoreA:''}
      </div>
      <div class="vs-sep">VS</div>
      <div class="team-slot ${isDone&&m.winner?.id===m.teamB.id?'winner':''}">
        <div class="team-slot-name">${m.teamB.name}</div>
        ${sd?sd.scoreB:''}
      </div>
    </div>
    ${sd?sd.pips:''}
    ${!isDone?`<div class="mt8 no-print"><button class="btn btn-outline btn-sm" onclick="openScoreModal('rr',${m.id})">${m.games.length?'✏ Update':'+ Enter Score'}</button></div>`:''}
  </div>`;
}
function computeStandings(gi){
  const matches=S.rrMatches[gi]||[];
  const map={};
  S.groups[gi].teams.forEach(t=>{map[t.id]={team:t,wins:0,losses:0,gamesWon:0,gamesLost:0,pd:0};});
  matches.forEach(m=>{
    if(m.status!=='done'||!m.winner)return;
    const wId=m.winner.id,lId=wId===m.teamA.id?m.teamB.id:m.teamA.id;
    if(map[wId])map[wId].wins++;if(map[lId])map[lId].losses++;
    m.games.forEach(g=>{
      const w=gameWin(g.scoreA,g.scoreB);
      if(map[m.teamA.id]){map[m.teamA.id].pd+=(g.scoreA-g.scoreB);if(w===0)map[m.teamA.id].gamesWon++;else if(w===1)map[m.teamA.id].gamesLost++;}
      if(map[m.teamB.id]){map[m.teamB.id].pd+=(g.scoreB-g.scoreA);if(w===1)map[m.teamB.id].gamesWon++;else if(w===0)map[m.teamB.id].gamesLost++;}
    });
  });
  return Object.values(map).sort((a,b)=>b.wins-a.wins||b.gamesWon-a.gamesWon||b.pd-a.pd);
}

// ─── SCORE MODAL ─────────────────────────────────────
function openScoreModal(type,matchId){
  let match=null;
  if(type==='rr'){for(const g in S.rrMatches){match=S.rrMatches[g].find(m=>m.id===matchId);if(match)break;}}
  else match=S.bracketMatches.find(m=>m.id===matchId);
  if(!match)return;
  S.scoringCtx={type,matchId};
  const bestOf=type==='rr'?S.settings.rrBestOf:(match.bestOf||S.settings.sfBestOf);
  const wn=Math.ceil(bestOf/2);
  let html=`<div class="alert alert-info mb12">First to ${wn} game${wn>1?'s':''} wins · Score to ${S.settings.winScore}${S.settings.winBy2?', win by 2':''}</div>`;
  for(let i=0;i<bestOf;i++){
    const g=match.games[i]||{};
    html+=`<div class="score-game-block"><div class="score-game-title">Game ${i+1}</div>
      <div class="score-inputs">
        <div><label>${match.teamA.name}</label><input type="number" min="0" max="99" id="sc-a-${i}" value="${g.scoreA!==undefined?g.scoreA:''}" placeholder="0" oninput="liveCheck()"></div>
        <div class="score-sep">—</div>
        <div><label>${match.teamB.name}</label><input type="number" min="0" max="99" id="sc-b-${i}" value="${g.scoreB!==undefined?g.scoreB:''}" placeholder="0" oninput="liveCheck()"></div>
      </div>
      <div id="gv-${i}" style="font-size:11px;color:var(--text3);margin-top:4px;min-height:13px"></div>
    </div>`;
  }
  document.getElementById('scoreModalContent').innerHTML=html;
  openModal('scoreModal');liveCheck();
}
function liveCheck(){
  const ctx=S.scoringCtx;if(!ctx)return;
  let match=null;
  if(ctx.type==='rr'){for(const g in S.rrMatches){match=S.rrMatches[g].find(m=>m.id===ctx.matchId);if(match)break;}}
  else match=S.bracketMatches.find(m=>m.id===ctx.matchId);
  if(!match)return;
  const bestOf=ctx.type==='rr'?S.settings.rrBestOf:(match.bestOf||S.settings.sfBestOf);
  for(let i=0;i<bestOf;i++){
    const aE=document.getElementById(`sc-a-${i}`),bE=document.getElementById(`sc-b-${i}`),vE=document.getElementById(`gv-${i}`);
    if(!aE||!bE||!vE)continue;
    const sa=parseInt(aE.value)||0,sb=parseInt(bE.value)||0;
    if(aE.value===''&&bE.value===''){vE.textContent='';continue;}
    const w=gameWin(sa,sb);
    if(w===0)vE.innerHTML=`<span style="color:var(--accent)">✓ ${match.teamA.name} wins this game</span>`;
    else if(w===1)vE.innerHTML=`<span style="color:var(--accent)">✓ ${match.teamB.name} wins this game</span>`;
    else vE.textContent=`In progress (${sa}–${sb})`;
  }
}
function submitScore(){
  const ctx=S.scoringCtx;if(!ctx)return;
  let match=null,gi=null;
  if(ctx.type==='rr'){for(const g in S.rrMatches){match=S.rrMatches[g].find(m=>m.id===ctx.matchId);if(match){gi=g;break;}}}
  else match=S.bracketMatches.find(m=>m.id===ctx.matchId);
  if(!match)return;
  const snapshot=JSON.stringify({games:match.games,winner:match.winner?{id:match.winner.id}:null,status:match.status});
  const bestOf=ctx.type==='rr'?S.settings.rrBestOf:(match.bestOf||S.settings.sfBestOf);
  const wn=Math.ceil(bestOf/2);
  const games=[];let wA=0,wB=0;
  for(let i=0;i<bestOf;i++){
    const aE=document.getElementById(`sc-a-${i}`),bE=document.getElementById(`sc-b-${i}`);
    if(!aE||!bE||aE.value===''||bE.value==='')continue;
    const sa=parseInt(aE.value)||0,sb=parseInt(bE.value)||0;
    games.push({scoreA:sa,scoreB:sb});
    const w=gameWin(sa,sb);if(w===0)wA++;if(w===1)wB++;
    if(wA>=wn||wB>=wn)break;
  }
  match.games=games;
  if(wA>=wn){match.winner=match.teamA;match.status='done';}
  else if(wB>=wn){match.winner=match.teamB;match.status='done';}
  else{match.status=games.length>0?'live':'pending';match.winner=null;}
  const desc=match.status==='done'
    ?`${match.winner.name} def. ${match.winner.id===match.teamA.id?match.teamB.name:match.teamA.name} (${games.map(g=>g.scoreA+'-'+g.scoreB).join(', ')})`
    :`Score updated: ${match.teamA.name} vs ${match.teamB.name}`;
  logHistory(desc,{type:ctx.type,matchId:ctx.matchId,snapshot});
  closeModal('scoreModal');
  if(ctx.type==='rr')renderRRGroup(S.curRRGroup);
  else{advanceWinner(match);renderBracketPage();}
}
function gameWin(sA,sB){
  const t=S.settings.winScore,b2=S.settings.winBy2;
  if(sA>=t&&(!b2||sA-sB>=2))return 0;
  if(sB>=t&&(!b2||sB-sA>=2))return 1;
  return -1;
}
function gamesWon(match,side){return match.games.filter(g=>{const w=gameWin(g.scoreA,g.scoreB);return side==='A'?w===0:w===1;}).length;}

// ─── HISTORY & UNDO ──────────────────────────────────
function logHistory(desc,ctx){
  S.history.push({ts:Date.now(),desc,ctx});
  const b=document.getElementById('undoBtn');if(b)b.disabled=false;
}
function renderHistory(){
  const list=document.getElementById('historyList');
  const btn=document.getElementById('undoBtn');
  if(btn)btn.disabled=S.history.length===0;
  if(!S.history.length){list.innerHTML=`<div class="empty-state" style="padding:18px 0"><strong>No score history yet</strong></div>`;return;}
  list.innerHTML=[...S.history].reverse().map((h,i)=>`<div class="history-entry">
    <div class="history-time">${fmtTs(h.ts)}</div>
    <div class="history-text"><strong>${h.desc}</strong></div>
    ${i===0?`<button class="btn btn-danger btn-sm no-print" onclick="undoLast()">↩</button>`:''}
  </div>`).join('');
}
function fmtTs(ts){const d=new Date(ts);return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});}
function undoLast(){
  if(!S.history.length)return;
  const last=S.history.pop();
  const{type,matchId,snapshot}=last.ctx;
  let match=null;
  if(type==='rr'){for(const g in S.rrMatches){match=S.rrMatches[g].find(m=>m.id===matchId);if(match)break;}}
  else match=S.bracketMatches.find(m=>m.id===matchId);
  if(match&&snapshot){
    const prev=JSON.parse(snapshot);
    match.games=prev.games;match.status=prev.status;
    match.winner=prev.winner?{id:prev.winner.id,...(match.teamA.id===prev.winner.id?match.teamA:match.teamB)}:null;
    if(type==='bracket'){
      S.bracketMatches.forEach(m=>{
        if(!m.feedFrom)return;
        if(m.feedFrom[0]===matchId)m.teamA=null;
        if(m.feedFrom[1]===matchId)m.teamB=null;
      });
    }
  }
  renderHistory();
  if(type==='rr')renderRRGroup(S.curRRGroup);else renderBracketPage();
}
function clearHistory(){if(!confirm('Clear all history?'))return;S.history=[];renderHistory();}

// ─── BRACKET ─────────────────────────────────────────
function generateBracket(){
  let teams=[];
  S.bracketSeedGroups={};
  S.groups.forEach((g,gi)=>{
    const st=computeStandings(gi);
    st.slice(0,S.settings.advanceCount).forEach(s=>{
      S.bracketSeedGroups[s.team.id]=gi;
      teams.push(s.team);
    });
  });
  if(teams.length<2){alert('Need at least 2 teams to generate bracket.');return;}
  while(!isPow2(teams.length))teams.push(null);
  S._confettiShown=false;
  buildBracket(teams);navTo('bracket');
}
function isPow2(n){return n&&(n&(n-1))===0;}
function buildBracket(seeds){
  S.bracketRounds=[];S.bracketMatches=[];S.thirdPlaceMatch=null;
  const n=seeds.length,total=Math.log2(n);
  const getBO=ri=>{if(ri===total-1)return S.settings.finalsBestOf;if(ri===total-2)return S.settings.sfBestOf;return S.settings.rrBestOf;};
  const pairs=[];for(let i=0;i<n/2;i++)pairs.push([seeds[i],seeds[n-1-i]]);
  let cur=pairs.map(([a,b])=>{
    const m={id:_mid++,teamA:a||{id:-_mid,name:'BYE',isBye:true},teamB:b||{id:-_mid-1,name:'BYE',isBye:true},games:[],winner:null,loser:null,status:'pending',bestOf:getBO(0),roundIdx:0};
    if(!a||a.isBye){m.winner=b;m.loser=a;m.status='done';}if(!b||b.isBye){m.winner=a;m.loser=b;m.status='done';}
    S.bracketMatches.push(m);return m;
  });
  S.bracketRounds.push({title:rndTitle(0,total),matches:cur});
  let ri=1;
  while(cur.length>1){
    const next=[];
    for(let i=0;i<cur.length;i+=2){
      const m={id:_mid++,teamA:null,teamB:null,games:[],winner:null,loser:null,status:'pending',bestOf:getBO(ri),roundIdx:ri,feedFrom:[cur[i].id,cur[i+1]?.id]};
      if(cur[i].status==='done')m.teamA=cur[i].winner;if(cur[i+1]?.status==='done')m.teamB=cur[i+1].winner;
      if(m.teamA?.isBye||m.teamB?.isBye){m.winner=m.teamA?.isBye?m.teamB:m.teamA;m.loser=m.teamA?.isBye?m.teamA:m.teamB;m.status='done';}
      S.bracketMatches.push(m);next.push(m);
    }
    S.bracketRounds.push({title:rndTitle(ri,total),matches:next});cur=next;ri++;
  }
  // 3rd place match: losers of the semi-finals round (second-to-last round if >=2 rounds)
  if(total>=2){
    const sfRound=S.bracketRounds[S.bracketRounds.length-2];
    if(sfRound&&sfRound.matches.length>=2){
      const sf1=sfRound.matches[0],sf2=sfRound.matches[1];
      const m3={id:_mid++,
        teamA:sf1.status==='done'?(sf1.loser?.isBye?null:sf1.loser):null,
        teamB:sf2.status==='done'?(sf2.loser?.isBye?null:sf2.loser):null,
        games:[],winner:null,loser:null,status:'pending',bestOf:S.settings.thirdBestOf||3,
        roundIdx:-1,is3rdPlace:true,feedLoserFrom:[sf1.id,sf2.id]};
      S.thirdPlaceMatch=m3;
      S.bracketMatches.push(m3);
    }
  }
}
function rndTitle(i,t){if(i===t-1)return '🏆 Final';if(i===t-2)return '🥈 Semi-Finals';if(i===t-3)return 'Quarter-Finals';return `Round ${i+1}`;}
function advanceWinner(match){
  if(!match.winner)return;
  // record loser
  match.loser=match.winner.id===match.teamA?.id?match.teamB:match.teamA;
  // advance winner forward
  S.bracketMatches.forEach(m=>{
    if(!m.feedFrom)return;
    if(m.feedFrom[0]===match.id&&!m.teamA)m.teamA=match.winner;
    else if(m.feedFrom[1]===match.id&&!m.teamB)m.teamB=match.winner;
  });
  // feed losers into 3rd place match
  const tp=S.thirdPlaceMatch;
  if(tp&&match.loser&&!match.loser.isBye&&tp.feedLoserFrom){
    if(tp.feedLoserFrom[0]===match.id&&!tp.teamA)tp.teamA=match.loser;
    else if(tp.feedLoserFrom[1]===match.id&&!tp.teamB)tp.teamB=match.loser;
  }
}
function renderBracketPage(){
  const content=document.getElementById('bracketContent');
  if(!S.bracketRounds.length){content.innerHTML=`<div class="empty-state"><div class="ei">🏆</div><strong>Bracket not generated yet</strong>Complete round robin first</div>`;return;}
  const fin=S.bracketRounds[S.bracketRounds.length-1]?.matches[0];
  const champ=fin?.status==='done'?fin.winner:null;
  const tp=S.thirdPlaceMatch;
  const third=tp?.status==='done'?tp.winner:null;
  // Check if entire tournament is done (final + 3rd place if exists)
  const tournamentDone=champ&&(!tp||tp.status==='done');
  let html='';
  if(champ)html+=`<div class="alert alert-success" style="font-size:15px;margin-bottom:18px">
    🏆 <strong>Champion: ${champ.name}</strong>${third?` · 🥉 3rd: ${third.name}`:''}
    ${tournamentDone?`<button class="btn btn-sm btn-primary no-print" style="margin-left:12px" onclick="startConfetti()">🎉 Celebrate!</button>`:''}
  </div>`;
  // Helper: group origin badge for a team in the bracket
  function groupBadge(team){
    if(!team||team.isBye)return '';
    const gi=S.bracketSeedGroups[team.id];
    if(gi===undefined)return '';
    const g=S.groups[gi];
    return g?`<span class="bracket-group-badge">${g.name}</span>`:'';
  }

  // Visual bracket
  html+=`<div class="bracket-wrapper"><div class="bracket">`;
  S.bracketRounds.forEach((round,ri)=>{
    html+=`<div class="bracket-round"><div class="bracket-round-title">${round.title}</div>`;
    round.matches.forEach(m=>{
      const isDone=m.status==='done';
      const sd=matchScoreDisplay(m,m.bestOf);
      const sA=sd?sd.scoreA.match(/>([\d]+)</)?.[1]||'?':'?';
      const sB=sd?sd.scoreB.match(/>([\d]+)</)?.[1]||'?':'?';
      const isWinA=isDone&&m.winner?.id===m.teamA?.id;
      const isWinB=isDone&&m.winner?.id===m.teamB?.id;
      html+=`<div class="bracket-match"><div class="bracket-match-inner ${isDone?'winner-decided':''}">
        <div class="bracket-slot ${isWinA?'winner-slot':''}">${m.teamA?.isBye?'<span style="color:var(--text3);font-style:italic">BYE</span>':(m.teamA?.name||'<span style="color:var(--text3)">TBD</span>')}${groupBadge(m.teamA)}${m.games.length?` <span class="bracket-slot-score">${sA}</span>`:''}</div>
        <div class="bracket-slot ${isWinB?'winner-slot':''}">${m.teamB?.isBye?'<span style="color:var(--text3);font-style:italic">BYE</span>':(m.teamB?.name||'<span style="color:var(--text3)">TBD</span>')}${groupBadge(m.teamB)}${m.games.length?` <span class="bracket-slot-score">${sB}</span>`:''}</div>
      </div>${!isDone&&m.teamA&&m.teamB&&!m.teamA.isBye&&!m.teamB.isBye?`<div style="margin-top:4px;text-align:center" class="no-print"><button class="btn btn-outline btn-sm" onclick="openScoreModal('bracket',${m.id})">Score</button></div>`:''}</div>`;
    });
    html+=`</div>`;
    // Add connector column between rounds (not after the last round)
    if(ri<S.bracketRounds.length-1){
      const nextCount=S.bracketRounds[ri+1].matches.length;
      html+=`<div class="bracket-connector-col">`;
      for(let ci=0;ci<nextCount;ci++){
        html+=`<div class="bc-group"><div class="bc-top-half"></div><div class="bc-bottom-half"></div></div>`;
      }
      html+=`</div>`;
    }
  });
  // 3rd place in bracket vis (separate from main bracket flow)
  if(tp){
    html+=`<div class="bracket-round" style="margin-left:16px;border-left:2px dashed var(--border);padding-left:16px"><div class="bracket-round-title" style="color:var(--gold)">🥉 3rd Place</div>
      <div class="bracket-match" style="margin-top:20px"><div class="bracket-match-inner ${tp.status==='done'?'winner-decided':''}" style="border-color:rgba(var(--gold),.5)">
        <div class="bracket-slot ${tp.status==='done'&&tp.winner?.id===tp.teamA?.id?'winner-slot':''}">${tp.teamA?.name||'<span style="color:var(--text3)">TBD</span>'}${groupBadge(tp.teamA)}${tp.games.length?` <span class="bracket-slot-score">${matchScoreDisplay(tp,tp.bestOf)?.scoreA?.match(/>([\d]+)</)?.[1]||'?'}</span>`:''}</div>
        <div class="bracket-slot ${tp.status==='done'&&tp.winner?.id===tp.teamB?.id?'winner-slot':''}">${tp.teamB?.name||'<span style="color:var(--text3)">TBD</span>'}${groupBadge(tp.teamB)}${tp.games.length?` <span class="bracket-slot-score">${matchScoreDisplay(tp,tp.bestOf)?.scoreB?.match(/>([\d]+)</)?.[1]||'?'}</span>`:''}</div>
      </div>${tp.teamA&&tp.teamB&&tp.status!=='done'?`<div style="margin-top:4px;text-align:center" class="no-print"><button class="btn btn-outline btn-sm" onclick="openScoreModal('bracket',${tp.id})">Score</button></div>`:''}</div>
    </div>`;
  }
  html+=`</div></div><div style="margin-top:20px">`;
  // 3rd place match detail card first
  if(tp&&tp.teamA&&tp.teamB){
    html+=`<div class="card-title mb8">🥉 3rd Place Match</div>`;
    const isDone=tp.status==='done';
    const sc=S.schedule[tp.id],court=sc?S.courts.find(c=>c.id===sc.courtId):null;
    const sd=matchScoreDisplay(tp,tp.bestOf);
    html+=`<div class="match-card" style="border-color:rgba(205,127,50,.4);margin-bottom:18px">
      <div class="match-header">
        <div class="flex-row" style="gap:5px;flex-wrap:wrap">
          <span class="match-label">🥉 3rd Place · Best of ${tp.bestOf}</span>
          ${court?`<span class="court-badge">${court.name}</span>`:''}
          ${sc?.time?`<span class="time-badge">${fmtTime(sc.time)}</span>`:''}
        </div>
        <div class="match-meta">
          ${isDone?`<button class="btn btn-ghost btn-sm no-print" onclick="openScoreModal('bracket',${tp.id})">✏</button>`:''}
          <span class="match-status-badge status-${isDone?'done':'pending'}">${isDone?'W: '+tp.winner?.name:'Pending'}</span>
        </div>
      </div>
      <div class="teams-row">
        <div class="team-slot ${isDone&&tp.winner?.id===tp.teamA.id?'winner':''}"><div class="team-slot-name">${tp.teamA.name}</div>${sd?sd.scoreA:''}</div>
        <div class="vs-sep">VS</div>
        <div class="team-slot ${isDone&&tp.winner?.id===tp.teamB.id?'winner':''}"><div class="team-slot-name">${tp.teamB.name}</div>${sd?sd.scoreB:''}</div>
      </div>
      ${sd?sd.pips:''}
      ${!isDone?`<div class="mt8 no-print"><button class="btn btn-outline btn-sm" onclick="openScoreModal('bracket',${tp.id})">+ Enter Score</button></div>`:''}
    </div>`;
  }
  // Main bracket rounds detail
  S.bracketRounds.forEach(round=>{
    html+=`<div class="card-title mb8">${round.title}</div>`;
    round.matches.forEach(m=>{
      if(m.teamA?.isBye||m.teamB?.isBye||!m.teamA||!m.teamB)return;
      const isDone=m.status==='done';
      const sc=S.schedule[m.id],court=sc?S.courts.find(c=>c.id===sc.courtId):null;
      const sd=matchScoreDisplay(m,m.bestOf);
      const is3p=m.is3rdPlace;
      html+=`<div class="match-card ${isDone?'completed':''}" ${is3p?'style="border-color:rgba(205,127,50,.4)"':''}>
        <div class="match-header">
          <div class="flex-row" style="gap:5px;flex-wrap:wrap">
            <span class="match-label">${is3p?'🥉 3rd Place · ':''}Best of ${m.bestOf}</span>
            ${court?`<span class="court-badge">${court.name}</span>`:''}
            ${sc?.time?`<span class="time-badge">${fmtTime(sc.time)}</span>`:''}
          </div>
          <div class="match-meta">
            ${isDone?`<button class="btn btn-ghost btn-sm no-print" onclick="openScoreModal('bracket',${m.id})">✏</button>`:''}
            <span class="match-status-badge status-${isDone?'done':'pending'}">${isDone?'W: '+m.winner?.name:'Pending'}</span>
          </div>
        </div>
        <div class="teams-row">
          <div class="team-slot ${isDone&&m.winner?.id===m.teamA.id?'winner':''}"><div class="team-slot-name">${m.teamA.name}</div>${sd?sd.scoreA:''}</div>
          <div class="vs-sep">VS</div>
          <div class="team-slot ${isDone&&m.winner?.id===m.teamB.id?'winner':''}"><div class="team-slot-name">${m.teamB.name}</div>${sd?sd.scoreB:''}</div>
        </div>
        ${sd?sd.pips:''}
        ${!isDone?`<div class="mt8 no-print"><button class="btn btn-outline btn-sm" onclick="openScoreModal('bracket',${m.id})">+ Enter Score</button></div>`:''}
      </div>`;
    });
  });
  html+=`</div>`;
  content.innerHTML=html;
  // Auto-trigger confetti if tournament just finished
  if(tournamentDone&&!S._confettiShown){S._confettiShown=true;startConfetti();}
}

// ─── CONFETTI ─────────────────────────────────────────
let _confettiRAF=null,_confettiParticles=[];
function startConfetti(){
  const fin=S.bracketRounds[S.bracketRounds.length-1]?.matches[0];
  const champ=fin?.status==='done'?fin.winner:null;
  if(!champ)return;
  const tp=S.thirdPlaceMatch;
  const third=tp?.status==='done'?tp.winner:null;
  document.getElementById('celebChampName').textContent=champ.name;
  document.getElementById('celebThirdRow').textContent=third?`🥉 3rd Place: ${third.name}`:'';
  const overlay=document.getElementById('celebrationOverlay');
  overlay.style.display='block';overlay.style.pointerEvents='all';
  const canvas=document.getElementById('confettiCanvas');
  canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  const ctx=canvas.getContext('2d');
  const colors=['#a8d44a','#e8c84a','#4ab8e8','#e05555','#b48ae8','#c8f060','#e8f0d8'];
  _confettiParticles=Array.from({length:180},()=>({
    x:Math.random()*canvas.width,y:Math.random()*canvas.height-canvas.height,
    r:Math.random()*7+3,color:colors[Math.floor(Math.random()*colors.length)],
    vx:(Math.random()-0.5)*3,vy:Math.random()*4+2,
    angle:Math.random()*360,spin:(Math.random()-0.5)*8,
    shape:Math.random()>0.5?'rect':'circle',w:Math.random()*10+4,h:Math.random()*5+3,
  }));
  function frame(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    _confettiParticles.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;p.angle+=p.spin;
      if(p.y>canvas.height+20){p.y=-20;p.x=Math.random()*canvas.width;}
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle*Math.PI/180);
      ctx.fillStyle=p.color;ctx.globalAlpha=0.85;
      if(p.shape==='circle'){ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();}
      else{ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);}
      ctx.restore();
    });
    _confettiRAF=requestAnimationFrame(frame);
  }
  if(_confettiRAF)cancelAnimationFrame(_confettiRAF);
  frame();
}
function stopConfetti(){
  if(_confettiRAF)cancelAnimationFrame(_confettiRAF);_confettiRAF=null;
  const overlay=document.getElementById('celebrationOverlay');
  overlay.style.display='none';overlay.style.pointerEvents='none';
  const canvas=document.getElementById('confettiCanvas');
  canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
}

// ─── SPECTATOR FULLSCREEN ─────────────────────────────
function openSpectator(){
  const tn=document.getElementById('tournamentName')?.value||'Tournament';
  document.getElementById('specTitle').textContent=tn;
  document.getElementById('specDate').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
  const overlay=document.getElementById('spectatorOverlay');
  overlay.style.display='flex';

  // Build the 4 panels
  const fin=S.bracketRounds[S.bracketRounds.length-1]?.matches[0];
  const champ=fin?.status==='done'?fin.winner:null;
  const tp=S.thirdPlaceMatch;
  const third=tp?.status==='done'?tp.winner:null;
  const pending=allMatchesFlat().filter(m=>m.status!=='done'&&m.teamA&&m.teamB&&!m.teamA.isBye&&!m.teamB.isBye);
  const done=allMatchesFlat().filter(m=>m.status==='done'&&!m.teamA?.isBye&&!m.teamB?.isBye).slice(-4).reverse();

  const panel=(title,body,accentColor='var(--text3)')=>`
    <div style="background:var(--surface);padding:16px;overflow:hidden;display:flex;flex-direction:column">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:2px;color:${accentColor};margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid var(--border);flex-shrink:0">${title}</div>
      <div style="overflow-y:auto;overflow-x:hidden;flex:1;min-height:0">${body}</div>
    </div>`;

  // Panel 1: Standings
  let p1='';
  if(Object.keys(S.rrMatches).length){
    p1+=`<div style="display:flex;gap:10px;flex-wrap:wrap">`;
    S.groups.forEach((g,gi)=>{
      const st=computeStandings(gi);
      p1+=`<div style="flex:1;min-width:140px">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-bottom:6px">${g.name}</div>
        <table class="standings-table"><thead><tr><th>#</th><th>Team</th><th>W</th><th>L</th></tr></thead><tbody>
        ${st.map((s,i)=>`<tr><td><span class="rank-num rank-${i+1}">${i+1}</span></td><td style="font-size:12px">${s.team.name}</td><td style="color:var(--accent);font-size:12px">${s.wins}</td><td style="color:var(--red);font-size:12px">${s.losses}</td></tr>`).join('')}
        </tbody></table></div>`;
    });
    p1+=`</div>`;
  } else p1='<div style="color:var(--text3);font-size:13px">No round robin data yet</div>';

  // Panel 2: Bracket visual
  let p2='';
  if(champ)p2+=`<div style="background:var(--accent-dim);border:1px solid var(--border2);border-radius:var(--r);padding:8px 12px;margin-bottom:10px;font-size:13px;font-weight:600;color:var(--accent)">🏆 Champion: ${champ.name}${third?` · 🥉 ${third.name}`:''}</div>`;
  if(S.bracketRounds.length){
    const specGroupBadge=(team)=>{
      if(!team||team.isBye)return '';
      const gi=S.bracketSeedGroups[team.id];
      if(gi===undefined)return '';
      const g=S.groups[gi];
      return g?`<span style="font-family:'DM Mono',monospace;font-size:8px;padding:1px 3px;border-radius:2px;background:var(--accent-dim);color:var(--text3);margin-left:3px">${g.name}</span>`:'';
    };
    p2+=`<div style="overflow-x:auto"><div style="display:flex;align-items:stretch;min-width:max-content;gap:0">`;
    S.bracketRounds.forEach((round,ri)=>{
      p2+=`<div style="display:flex;flex-direction:column;justify-content:space-around"><div style="font-family:'Bebas Neue',sans-serif;font-size:12px;letter-spacing:1px;color:var(--text3);text-align:center;padding:0 12px 6px">${round.title}</div>`;
      round.matches.forEach(m=>{
        const isDone=m.status==='done';
        const sd=matchScoreDisplay(m,m.bestOf);
        const sA=sd?sd.scoreA.match(/>([\d]+)</)?.[1]||'':'' ;
        const sB=sd?sd.scoreB.match(/>([\d]+)</)?.[1]||'':'' ;
        const winA=isDone&&m.winner?.id===m.teamA?.id;
        const winB=isDone&&m.winner?.id===m.teamB?.id;
        p2+=`<div style="margin:5px;background:var(--surface2);border:1px solid ${isDone?'var(--accent)':'var(--border)'};border-radius:var(--r);width:160px;overflow:hidden;${isDone?'box-shadow:0 0 0 1px var(--accent-dim)':''}">
          <div style="padding:5px 8px;display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:500;border-bottom:1px solid var(--border);${winA?'background:var(--accent-dim);color:var(--accent);border-left:2px solid var(--accent)':''}">${m.teamA?.name||'TBD'}${specGroupBadge(m.teamA)}${sA?` <span style="font-family:'DM Mono',monospace;font-size:11px">${sA}</span>`:''}</div>
          <div style="padding:5px 8px;display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:500;${winB?'background:var(--accent-dim);color:var(--accent);border-left:2px solid var(--accent)':''}">${m.teamB?.name||'TBD'}${specGroupBadge(m.teamB)}${sB?` <span style="font-family:'DM Mono',monospace;font-size:11px">${sB}</span>`:''}</div>
        </div>`;
      });
      p2+=`</div>`;
      // Connector columns between rounds
      if(ri<S.bracketRounds.length-1){
        const nc=S.bracketRounds[ri+1].matches.length;
        p2+=`<div class="bracket-connector-col">`;
        for(let ci=0;ci<nc;ci++)p2+=`<div class="bc-group"><div class="bc-top-half"></div><div class="bc-bottom-half"></div></div>`;
        p2+=`</div>`;
      }
    });
    p2+=`</div></div>`;
  } else p2+='<div style="color:var(--text3);font-size:13px">Bracket not generated yet</div>';

  // Panel 3: Upcoming matches
  let p3='';
  if(pending.length){
    p3+=pending.map(m=>{
      const sc=S.schedule[m.id],court=sc?S.courts.find(c=>c.id===sc.courtId):null;
      return `<div style="padding:9px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);margin-bottom:7px">
        <div style="display:flex;justify-content:space-between;margin-bottom:5px">
          <span style="font-size:11px;color:var(--purple)">${court?court.name:''}</span>
          <span style="font-size:11px;color:var(--text3)">${sc?.time?fmtTime(sc.time):''}</span>
          <span class="match-status-badge status-${m.status}" style="font-size:9px">${m.status==='live'?'🔴 Live':'Upcoming'}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;text-align:center">
            <div style="font-size:12px;font-weight:600">${m.teamA.name}</div>
            ${m.games.length?`<div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--accent)">${gamesWon(m,'A')}</div>`:''}
          </div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:14px;color:var(--text3)">VS</div>
          <div style="flex:1;text-align:center">
            <div style="font-size:12px;font-weight:600">${m.teamB.name}</div>
            ${m.games.length?`<div style="font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--accent)">${gamesWon(m,'B')}</div>`:''}
          </div>
        </div>
      </div>`;
    }).join('');
  } else p3='<div style="color:var(--text3);font-size:13px">No upcoming matches</div>';

  // Panel 4: Recent results
  let p4='';
  if(done.length){
    p4+=done.map(m=>{
      const sd=matchScoreDisplay(m,m.bestOf);
      const sA=sd?sd.scoreA.match(/>([\d]+)</)?.[1]||gamesWon(m,'A'):gamesWon(m,'A');
      const sB=sd?sd.scoreB.match(/>([\d]+)</)?.[1]||gamesWon(m,'B'):gamesWon(m,'B');
      return `<div style="padding:9px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);margin-bottom:7px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1">
            <div style="font-size:12px;font-weight:600;color:${m.winner?.id===m.teamA.id?'var(--accent)':'var(--text2)'}">${m.teamA.name}</div>
            <div style="font-size:12px;font-weight:600;margin-top:4px;color:${m.winner?.id===m.teamB.id?'var(--accent)':'var(--text2)'}">${m.teamB.name}</div>
          </div>
          <div style="text-align:right">
            <div style="font-family:'Bebas Neue',sans-serif;font-size:26px;color:${m.winner?.id===m.teamA.id?'var(--accent)':'var(--text3)'}">${sA}</div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:26px;color:${m.winner?.id===m.teamB.id?'var(--accent)':'var(--text3)'}">${sB}</div>
          </div>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px">
          ${m.games.map(g=>`<span class="game-pip ${gameWin(g.scoreA,g.scoreB)===0?'win':'loss'}" style="font-size:10px">${g.scoreA}–${g.scoreB}</span>`).join('')}
        </div>
      </div>`;
    }).join('');
  } else p4='<div style="color:var(--text3);font-size:13px">No completed matches yet</div>';

  document.getElementById('spectatorContent').innerHTML=
    panel('📊 Standings',p1,'var(--blue)')+
    panel('🏆 Bracket',p2,'var(--gold)')+
    panel('⚡ On Court / Upcoming',p3,'var(--accent)')+
    panel('✅ Recent Results',p4,'var(--text2)');
}
function closeSpectator(){
  document.getElementById('spectatorOverlay').style.display='none';
}

// ─── CSV EXPORT ───────────────────────────────────────
function exportCSV(){
  const tn=document.getElementById('tournamentName')?.value||'Tournament';
  const rows=[['PickleBracket Export — '+tn],[''],['ROUND ROBIN RESULTS'],['Group','Match #','Team A','Team B','Games','Winner']];
  for(const gi in S.rrMatches)S.rrMatches[gi].forEach((m,i)=>rows.push([S.groups[gi]?.name||'',i+1,m.teamA.name,m.teamB.name,m.games.map(g=>g.scoreA+'-'+g.scoreB).join(' | '),m.winner?.name||'']));
  rows.push([],['STANDINGS']);
  S.groups.forEach((g,gi)=>{
    rows.push([g.name],['Rank','Team','Wins','Losses','Pt Diff']);
    computeStandings(gi).forEach((s,i)=>rows.push([i+1,s.team.name,s.wins,s.losses,s.pd]));
    rows.push([]);
  });
  if(S.bracketMatches.length){
    rows.push(['BRACKET'],['Round','Team A','Team B','Games Won A','Games Won B','Winner']);
    S.bracketRounds.forEach(r=>r.matches.forEach(m=>{
      if(m.teamA?.isBye||m.teamB?.isBye)return;
      rows.push([r.title,m.teamA?.name||'',m.teamB?.name||'',gamesWon(m,'A'),gamesWon(m,'B'),m.winner?.name||'']);
    }));
  }
  const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download=`${tn.replace(/\s+/g,'_')}_results.csv`;a.click();
}

// ─── MODAL HELPERS ────────────────────────────────────
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.modal-overlay').forEach(el=>el.addEventListener('click',e=>{if(e.target===el)el.classList.remove('open');}));

// ═══════════════════════════════════════════
// ─── CONFIG ─────────────────────────────────
// ═══════════════════════════════════════════
const CONFIG = {
  WEBSOCKET_URL: 'wss://mq8ptz92j9.execute-api.us-east-1.amazonaws.com/prod'
};

// ═══════════════════════════════════════════
// ─── WEBSOCKET SYNC ENGINE ───────────────────
// ═══════════════════════════════════════════
const WS = {
  socket: null,
  url: null,
  tournamentId: null,
  role: 'viewer',        // 'admin' | 'viewer' — confirmed by server on join response
  connected: false,
  reconnectTimer: null,
  reconnectDelay: 2000,
  _broadcastDebounce: null,
  _pendingBroadcast: false,
  _initialJoinComplete: false,
  _openSpectatorOnLoad: false,
};

function wsSetIndicator(state, text) {
  const el = document.getElementById('syncIndicator');
  if (!el) return;
  el.className = 'sync-indicator' + (state ? ' ' + state : '');
  el.textContent = text;
}

// ── Connect to WebSocket ───────────────────────────────
function wsConnect(wsUrl, tournamentId, role) {
  WS.url = wsUrl;
  WS.tournamentId = tournamentId;
  WS.role = role || 'viewer';
  wsSetIndicator('syncing', '⟳ Connecting…');

  try { WS.socket = new WebSocket(wsUrl); }
  catch(e) { wsSetIndicator('error', '✕ Bad URL'); return; }

  WS.socket.onopen = () => {
    WS.connected = true;
    WS.reconnectDelay = 2000;
    clearTimeout(WS.reconnectTimer);
    wsSetIndicator('connected', '● Live');
    const joinMsg = { action: 'join', tournamentId, role: WS.role };
    WS.socket.send(JSON.stringify(joinMsg));
    if (WS._pendingBroadcast) {
      WS._pendingBroadcast = false;
      setTimeout(wsBroadcast, 200);
    }
  };

  WS.socket.onmessage = (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      if (msg.action === 'init') {
        if (msg.role) WS.role = msg.role;
        if (!WS._initialJoinComplete) {
          // First join: apply server state, then mark complete
          wsApplyRemoteState(msg.state);
          WS._initialJoinComplete = true;
        } else if (WS.role === 'admin') {
          // Reconnect: admin is source of truth — push local state instead of applying stale server state
          setTimeout(wsBroadcast, 200);
        } else {
          wsApplyRemoteState(msg.state);
        }
      } else if (msg.action === 'update') {
        // Admin is the source of truth — skip echo of own broadcasts to avoid suppressBroadcast race
        if (WS.role !== 'admin') wsApplyRemoteState(msg.state);
      } else if (msg.action === 'empty') {
        if (msg.role) WS.role = msg.role;
        if (WS.role === 'admin') wsBroadcast();
      } else if (msg.action === 'error') {
        console.warn('Server error:', msg.code, msg.message);
        if (msg.code === 'CONN_LIMIT') showToast('⚠️ Tournament is full (max connections reached)', 5000);
      } else if (msg.action === 'presence') {
        updatePresence(msg.count);
      }
    } catch(e) { console.warn('WS parse error', e); }
  };

  WS.socket.onclose = () => {
    WS.connected = false;
    wsSetIndicator('error', '✕ Disconnected');
    WS.reconnectTimer = setTimeout(() => {
      if (WS.url) wsConnect(WS.url, WS.tournamentId, WS.role);
    }, WS.reconnectDelay);
    WS.reconnectDelay = Math.min(WS.reconnectDelay * 2, 30000);
  };

  WS.socket.onerror = () => wsSetIndicator('error', '✕ Error');
}

// ── Broadcast state to server (admin only, debounced) ─
function wsBroadcast() {
  if (WS.role !== 'admin') return;
  if (!WS.connected || !WS.socket || WS.socket.readyState !== 1) {
    WS._pendingBroadcast = true;
    return;
  }

  clearTimeout(WS._broadcastDebounce);
  WS._broadcastDebounce = setTimeout(() => {
    if (!WS.socket || WS.socket.readyState !== 1) {
      WS._pendingBroadcast = true;
      return;
    }
    wsSetIndicator('syncing', '⟳ Syncing…');
    const payload = JSON.stringify({
      action: 'update',
      tournamentId: WS.tournamentId,
      role: WS.role,
      state: getSerializableState(),
    });
    try {
      WS.socket.send(payload);
      WS._pendingBroadcast = false;
      setTimeout(() => { if (WS.connected) wsSetIndicator('connected', '● Live'); }, 600);
    } catch(e) {
      WS._pendingBroadcast = true;
      wsSetIndicator('error', '✕ Send failed');
    }
  }, 300);
}

function getSerializableState() {
  return {
    tType: S.tType,
    bMethod: S.bMethod,
    tournamentName: document.getElementById('tournamentName')?.value || 'Tournament',
    teams: S.teams,
    groups: S.groups.map(g => ({ id: g.id, name: g.name, teamIds: g.teams.map(t => t.id) })),
    rrMatches: serializeMatches(S.rrMatches),
    bracketMatches: serializeMatches({'_': S.bracketMatches})['_'],
    bracketRounds: S.bracketRounds.map(r => ({ title: r.title, matchIds: r.matches.map(m => m.id) })),
    thirdPlaceMatchId: S.thirdPlaceMatch?.id || null,
    courts: S.courts,
    schedule: S.schedule,
    history: S.history.slice(-50),
    settings: S.settings,
    bracketSeedGroups: S.bracketSeedGroups || {},
    _tid, _mid, _cid,
  };
}

function serializeMatches(rrMatches) {
  const out = {};
  for (const gi in rrMatches) {
    out[gi] = rrMatches[gi].map(m => ({
      ...m,
      teamA: m.teamA ? (m.teamA.isBye ? m.teamA : { id: m.teamA.id }) : null,
      teamB: m.teamB ? (m.teamB.isBye ? m.teamB : { id: m.teamB.id }) : null,
      winner: m.winner ? (m.winner.isBye ? m.winner : { id: m.winner.id }) : null,
      loser: m.loser ? (m.loser.isBye ? m.loser : { id: m.loser.id }) : null,
    }));
  }
  return out;
}

function wsApplyRemoteState(remoteState) {
  if (!remoteState) return;

  const teamById = {};
  (remoteState.teams || []).forEach(t => { teamById[t.id] = t; });

  S.tType = remoteState.tType || S.tType;
  S.bMethod = remoteState.bMethod || S.bMethod;
  S.teams = remoteState.teams || [];
  S.settings = { ...S.settings, ...remoteState.settings };
  S.courts = remoteState.courts || [];
  S.schedule = remoteState.schedule || {};
  S.history = remoteState.history || [];
  if (remoteState._tid) _tid = remoteState._tid;
  if (remoteState._mid) _mid = remoteState._mid;
  if (remoteState._cid) _cid = remoteState._cid;

  const tnEl = document.getElementById('tournamentName');
  if (tnEl && remoteState.tournamentName) tnEl.value = remoteState.tournamentName;

  S.groups = (remoteState.groups || []).map(g => ({
    id: g.id, name: g.name,
    teams: (g.teamIds || []).map(id => teamById[id]).filter(Boolean),
  }));

  function hydrateTeam(ref) {
    if (!ref) return null;
    if (ref.isBye) return ref;
    return teamById[ref.id] || ref;
  }

  S.bracketMatches = (remoteState.bracketMatches || []).map(m => ({
    ...m,
    teamA: hydrateTeam(m.teamA), teamB: hydrateTeam(m.teamB),
    winner: hydrateTeam(m.winner), loser: hydrateTeam(m.loser),
  }));

  const matchById = {};
  S.bracketMatches.forEach(m => { matchById[m.id] = m; });

  S.bracketRounds = (remoteState.bracketRounds || []).map(r => ({
    title: r.title,
    matches: (r.matchIds || []).map(id => matchById[id]).filter(Boolean),
  }));

  S.thirdPlaceMatch = remoteState.thirdPlaceMatchId ? matchById[remoteState.thirdPlaceMatchId] || null : null;
  S.bracketSeedGroups = remoteState.bracketSeedGroups || {};

  S.rrMatches = {};
  for (const gi in remoteState.rrMatches || {}) {
    S.rrMatches[gi] = remoteState.rrMatches[gi].map(m => ({
      ...m,
      teamA: hydrateTeam(m.teamA), teamB: hydrateTeam(m.teamB),
      winner: hydrateTeam(m.winner), loser: hydrateTeam(m.loser),
    }));
  }

  const activePage = document.querySelector('.page.active')?.id?.replace('page-', '');
  if (activePage === 'teams') renderTeams();
  else if (activePage === 'players') renderPlayersPage();
  else if (activePage === 'groups') renderGroups();
  else if (activePage === 'roundrobin') renderRRPage();
  else if (activePage === 'bracket') renderBracketPage();
  else if (activePage === 'schedule') renderSchedulePage();
  else if (activePage === 'history') renderHistory();

  syncSettingsUI();

  // Refresh spectator overlay if it's already open
  const _specOverlay = document.getElementById('spectatorOverlay');
  if (_specOverlay && _specOverlay.style.display !== 'none') {
    openSpectator();
  }

  if (WS.role === 'viewer') restrictViewerUI();
}

// ─── Restrict UI for viewer-only mode ───────────────
function restrictViewerUI() {
  if (WS.role !== 'viewer') return;

  document.querySelectorAll('nav button').forEach(btn => {
    btn.style.display = 'none';
  });

  document.querySelectorAll('.header-actions .btn').forEach(btn => {
    const t = btn.textContent.trim();
    if (t.includes('Go Live') || t.includes('Share')) {
      btn.style.display = 'none';
    }
  });

  document.querySelectorAll('#spectatorOverlay button').forEach(btn => {
    if (btn.textContent.includes('Close')) btn.style.display = 'none';
  });

  const _ov = document.getElementById('spectatorOverlay');
  if (!_ov || _ov.style.display === 'none') {
    setTimeout(() => openSpectator(), 500);
  }
}

function syncSettingsUI() {
  ['rrBestOf','advanceCount','sfBestOf','finalsBestOf','thirdBestOf','numGroups','matchDuration'].forEach(k => {
    const el = document.getElementById('val-' + k);
    if (el) el.textContent = S.settings[k];
  });
}

function updatePresence(count) {
  const el = document.getElementById('presenceCount');
  if (!el) return;
  el.style.display = count > 1 ? 'block' : 'none';
  el.textContent = `${count} online`;
}

function showToast(text, duration = 2500) {
  const toast = document.getElementById('joinToast');
  const textEl = document.getElementById('joinToastText');
  if (!toast || !textEl) return;
  textEl.textContent = text;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, duration);
}

// ─── SESSION CREATE / JOIN ─────────────────────────────
function createSession() {
  const tid = 'pb_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  WS.tournamentId = tid;
  WS.role = 'admin';

  document.getElementById('createSessionBtn').style.display = 'none';
  document.getElementById('shareBtn').style.display = 'inline-flex';

  localStorage.setItem('pb_ws_url', CONFIG.WEBSOCKET_URL);

  const url = new URL(window.location.href);
  url.searchParams.set('t', tid);
  url.searchParams.set('ws', encodeURIComponent(CONFIG.WEBSOCKET_URL));
  window.history.replaceState({}, '', url.toString());

  wsConnect(CONFIG.WEBSOCKET_URL, tid, 'admin', null);
  wsSetIndicator('syncing', '⟳ Creating tournament…');
}

function openShareModal() {
  const base = window.location.href.split('?')[0];
  const tid = WS.tournamentId || '';
  const adminUrl = `${base}?t=${tid}&role=admin`;
  const viewerUrl = `${base}?t=${tid}&role=viewer`;

  document.getElementById('shareAdminUrl').value = adminUrl;
  document.getElementById('shareViewerUrl').value = viewerUrl;
  document.getElementById('shareTournamentId').textContent = tid;
  openModal('shareModal');
}

function copyUrl(inputId, confirmId) {
  const el = document.getElementById(inputId);
  if (!el) return;
  navigator.clipboard.writeText(el.value).then(() => {
    const conf = document.getElementById(confirmId);
    if (conf) { conf.textContent = '✓ Copied!'; setTimeout(() => conf.textContent = '', 2000); }
  });
}

// ─── AUTO-JOIN FROM URL ────────────────────────────────
async function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const tid = params.get('t');
  const role = params.get('role') || 'viewer';

  if (!tid) return;

  const wsUrl = CONFIG.WEBSOCKET_URL;
  WS.tournamentId = tid;
  WS.role = role;

  document.getElementById('createSessionBtn').style.display = 'none';
  document.getElementById('shareBtn').style.display = 'inline-flex';

  if (role === 'viewer') WS._openSpectatorOnLoad = true;

  wsConnect(wsUrl, tid, WS.role);
  showToast(WS.role === 'viewer' ? '👀 Joining as viewer…' : '🔗 Joining as admin…', 3000);
}

// ─── PATCH STATE-MUTATING FUNCTIONS TO BROADCAST ──────
// All writes go through wsBroadcast which enforces:
// - role === 'admin' check
// - 300ms debounce
const _origSubmitScore = submitScore;
window.submitScore = function() { try{_origSubmitScore();}finally{wsBroadcast();} };

const _origSubmitAddTeam = submitAddTeam;
window.submitAddTeam = function() { try{_origSubmitAddTeam();}finally{wsBroadcast();} };

// submitEditTeam delegates from submitAddTeam, but patch directly for safety
const _origSubmitEditTeam = submitEditTeam;
window.submitEditTeam = function() { try{_origSubmitEditTeam();}finally{wsBroadcast();} };

const _origRemoveTeam = removeTeam;
window.removeTeam = function(id) { try{_origRemoveTeam(id);}finally{wsBroadcast();} };

const _origAssignGroups = assignGroups;
window.assignGroups = function() { try{_origAssignGroups();}finally{wsBroadcast();} };

const _origStartRR = startRR;
window.startRR = function() { try{_origStartRR();}finally{wsBroadcast();} };

const _origGenerateBracket = generateBracket;
window.generateBracket = function() { try{_origGenerateBracket();}finally{wsBroadcast();} };

const _origUndoLast = undoLast;
window.undoLast = function() { try{_origUndoLast();}finally{wsBroadcast();} };

const _origSubmitAssignCourt = submitAssignCourt;
window.submitAssignCourt = function() { try{_origSubmitAssignCourt();}finally{wsBroadcast();} };

const _origAutoSchedule = autoSchedule;
window.autoSchedule = function() { try{_origAutoSchedule();}finally{wsBroadcast();} };

const _origDrop = drop;
window.drop = function(e, toGid) { try{_origDrop(e, toGid);}finally{wsBroadcast();} };

const _origAdj = adj;
window.adj = function(k,d) { try{_origAdj(k,d);}finally{wsBroadcast();} };

const _origSetSetting = setSetting;
window.setSetting = function(k,v,btn) { try{_origSetSetting(k,v,btn);}finally{wsBroadcast();} };

const _origSetSettingB = setSettingB;
window.setSettingB = function(k,v,btn) { try{_origSetSettingB(k,v,btn);}finally{wsBroadcast();} };

document.getElementById('tournamentName')?.addEventListener('input', wsBroadcast);

// Viewers cannot close the spectator overlay
const _origCloseSpectator = closeSpectator;
window.closeSpectator = function() {
  if (WS.role === 'viewer') return;
  _origCloseSpectator();
};

const _origSubmitAddCourt = submitAddCourt;
window.submitAddCourt = function() { try{_origSubmitAddCourt();}finally{wsBroadcast();} };

const _origRemoveCourt = removeCourt;
window.removeCourt = function(id) { try{_origRemoveCourt(id);}finally{wsBroadcast();} };

const _origSetTType = setTType;
window.setTType = function(t,btn) { try{_origSetTType(t,btn);}finally{wsBroadcast();} };

const _origSetBMethod = setBMethod;
window.setBMethod = function(m,btn) { try{_origSetBMethod(m,btn);}finally{wsBroadcast();} };

// ─── THEME TOGGLE ─────────────────────────────────────
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('pb_theme', 'light');
    document.getElementById('themeToggle').textContent = '🌙 Dark';
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('pb_theme', 'dark');
    document.getElementById('themeToggle').textContent = '☀ Light';
  }
}
// Restore saved theme on load (default is light, so only apply if saved dark)
(function initTheme() {
  if (localStorage.getItem('pb_theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = '☀ Light';
  }
})();

// ─── INIT ─────────────────────────────────────────────
syncPv();
checkUrlParams();
