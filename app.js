
const stateKey='kuecken_state_v18';
const activityKey='kuecken_activity_v18';
const salesKey='kuecken_sales_v18';
const todayKey=()=>new Date().toISOString().slice(0,10);

let state=JSON.parse(localStorage.getItem(stateKey)||'{}');
let activity=JSON.parse(localStorage.getItem(activityKey)||'{}');
let sales=JSON.parse(localStorage.getItem(salesKey)||'{}');
if(!state.checks)state.checks={};
if(!state.kpis)state.kpis={};

const nav=document.getElementById('nav');
const view=document.getElementById('view');
const searchInput=document.getElementById('searchInput');

let current='heute';
let openNavGroupLabel='1. Vertriebs-Cockpit';
let selectedChapterIndex=null;
let selectedDate=todayKey();
let selectedSalesDate=todayKey();

const publishSections=['linkedin52','facebook52','videos52','peter52','martina52'];

const activityConfig={
  peter:[
    {key:'whatsapp_kontakte', label:'WhatsApp Kontakte', target:5, channel:'WhatsApp'},
    {key:'whatsapp_nachfassungen', label:'WhatsApp Nachfassungen', target:5, channel:'WhatsApp'},
    {key:'facebook_kontakte', label:'Facebook Kontakte', target:5, channel:'Facebook'},
    {key:'linkedin_kontakte', label:'LinkedIn Kontakte', target:5, channel:'LinkedIn'},
    {key:'unternehmerkontakte', label:'Unternehmerkontakte', target:3, channel:'Unternehmer'},
    {key:'empfehlungen', label:'Empfehlungen', target:3, channel:'Empfehlungen'},
    {key:'beitraege', label:'Beiträge veröffentlicht', target:1, channel:'Sichtbarkeit'},
    {key:'videos', label:'Videos veröffentlicht', target:1, channel:'Video'}
  ],
  martina:[
    {key:'kontakte', label:'Kontakte', target:3, channel:'WhatsApp'},
    {key:'kundenkontakte', label:'Kundenkontakte', target:3, channel:'Kunden'},
    {key:'nachfassungen', label:'Nachfassungen', target:3, channel:'Nachfassen'},
    {key:'facebook_aktivitaet', label:'Facebook Aktivität', target:1, channel:'Facebook'},
    {key:'empfehlungen', label:'Empfehlungen', target:2, channel:'Empfehlungen'},
    {key:'beitraege', label:'Beiträge veröffentlicht', target:1, channel:'Sichtbarkeit'},
    {key:'videos', label:'Videos veröffentlicht', target:1, channel:'Video'}
  ]
};

const fieldHelp={
  peter:{
    whatsapp_kontakte:["Jeden Tag neue Gespräche über WhatsApp starten.","Gehe dein Telefonbuch durch, aktiviere alte Kontakte, schreibe Empfehlungen an und starte persönliche Nachrichten."],
    whatsapp_nachfassungen:["Bestehende Kontakte weiterentwickeln.","Öffne deine letzten Chats und fasse offene Gespräche mit einer konkreten Frage nach."],
    facebook_kontakte:["Neue Gespräche über Facebook aufbauen.","Kommentiere bei passenden Kontakten und schreibe persönliche Nachrichten."],
    linkedin_kontakte:["Unternehmer und Selbständige erreichen.","Suche Selbständige, Geschäftsführer und Inhaber im Raum Kassel plus 50 km und sende Kontaktanfragen."],
    unternehmerkontakte:["Echte Unternehmergespräche anstoßen.","Wähle regionale Unternehmer aus und kontaktiere sie persönlich."],
    empfehlungen:["Aktiv neue Namen und Kontakte erhalten.","Stelle konkrete Empfehlungsfragen. Frage: Wer fällt dir spontan ein?"],
    beitraege:["Sichtbarkeit aufbauen.","Wähle einen Beitrag aus dem Jahresplan und veröffentliche ihn."],
    videos:["Persönlichkeit sichtbar machen.","Nimm ein kurzes Video aus dem Video-Jahresplan auf."]
  },
  martina:{
    kontakte:["Persönliche Gespräche starten.","Schreibe persönliche Kontakte an. Nutze Alltag, Interesse und Beziehung als Einstieg."],
    kundenkontakte:["Bestandskunden pflegen und reaktivieren.","Wähle Kunden aus und frage nach Zufriedenheit, Nutzung und offenen Fragen."],
    nachfassungen:["Offene Gespräche weiterführen.","Frage: Was ist aus deiner Sicht der nächste sinnvolle Schritt?"],
    facebook_aktivitaet:["Sichtbarkeit und Beziehung über Facebook stärken.","Poste eine persönliche Beobachtung oder kommentiere bei passenden Kontakten."],
    empfehlungen:["Neue Kontakte aus bestehenden Beziehungen erhalten.","Frage zufriedene Kunden oder Bekannte: Wer fällt dir spontan ein?"],
    beitraege:["Regelmäßig sichtbar bleiben.","Veröffentliche einen kurzen Beitrag aus Alltag, Erfahrung oder Kundenpflege."],
    videos:["Vertrauen durch persönliche Ansprache schaffen.","Nimm ein kurzes 60- bis 90-Sekunden-Video auf."]
  }
};

const salesConfig={
  peter:[
    {key:'neue_kontakte', label:'Neue Kontakte', target:5},
    {key:'gespraeche', label:'Gespräche', target:3},
    {key:'nachfassungen', label:'Nachfassungen', target:5},
    {key:'termine', label:'Termine vereinbart', target:2},
    {key:'praesentationen', label:'Präsentationen', target:1},
    {key:'empfehlungen', label:'Empfehlungen', target:3},
    {key:'verkaeufe', label:'Verkäufe', target:0.3},
    {key:'partner', label:'Neue Partner', target:0.1},
    {key:'unternehmergespraeche', label:'Unternehmergespräche', target:1},
    {key:'linkedin_kontakte', label:'LinkedIn-Kontakte', target:5},
    {key:'facebook_kontakte', label:'Facebook-Kontakte', target:5},
    {key:'whatsapp_kontakte', label:'WhatsApp-Kontakte', target:5},
    {key:'beitraege', label:'Beiträge veröffentlicht', target:1},
    {key:'videos', label:'Videos veröffentlicht', target:1}
  ],
  martina:[
    {key:'kontakte', label:'Kontakte', target:3},
    {key:'kundenkontakte', label:'Kundenkontakte', target:3},
    {key:'nachfassungen', label:'Nachfassungen', target:3},
    {key:'termine', label:'Termine vereinbart', target:1},
    {key:'praesentationen', label:'Präsentationen', target:0.5},
    {key:'empfehlungen', label:'Empfehlungen', target:2},
    {key:'verkaeufe', label:'Verkäufe', target:0.2},
    {key:'partner', label:'Neue Partner', target:0.05},
    {key:'facebook_aktivitaet', label:'Facebook-Aktivitäten', target:1},
    {key:'whatsapp_aktivitaet', label:'WhatsApp-Aktivitäten', target:3},
    {key:'beitraege', label:'Beiträge veröffentlicht', target:1},
    {key:'videos', label:'Videos veröffentlicht', target:0.5}
  ]
};

const funnelKeys=[
  ['kontakte','Kontakte'],
  ['gespraeche','Gespräche'],
  ['termine','Termine'],
  ['praesentationen','Präsentationen'],
  ['verkaeufe','Verkäufe'],
  ['partner','Partner']
];

function save(){localStorage.setItem(stateKey,JSON.stringify(state))}
function saveActivity(){localStorage.setItem(activityKey,JSON.stringify(activity))}
function saveSales(){localStorage.setItem(salesKey,JSON.stringify(sales))}
function sectionById(id){return window.APP_CONTENT.sections.find(s=>s.id===id)}
function isPublishSection(id){return publishSections.includes(id)}
function pct(actual,target){return target ? Math.round((Number(actual||0)/target)*100) : 100}
function ampClass(percent){if(percent>=100)return 'traffic-green'; if(percent>=80)return 'traffic-yellow'; return 'traffic-red'}
function targetClass(actual,target){return ampClass(pct(actual,target))}
function statusText(actual,target){const p=pct(actual,target); if(p>=100)return 'Im Soll'; if(p>=80)return 'Fast im Soll'; return 'Unter Soll'}
function esc(str){return String(str ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function formatDate(date){const [y,m,d]=date.split('-'); return `${d}.${m}.${y}`}

const yearPlanStart=new Date(2026,6,13); // Montag, 13.07.2026
const dayNames=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
function dateObjToKey(d){const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`}
function formatDateObj(d){return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`}
function addDays(d,days){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()); x.setDate(x.getDate()+days); return x}
function isoWeekNumber(d){
  const date=new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum=date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart=new Date(Date.UTC(date.getUTCFullYear(),0,1));
  return Math.ceil((((date-yearStart)/86400000)+1)/7);
}
function weekMeta(idx){
  const start=addDays(yearPlanStart, idx*7); const end=addDays(start,6);
  const days=[]; for(let i=0;i<7;i++){const d=addDays(start,i); days.push({name:dayNames[d.getDay()], date:formatDateObj(d), key:dateObjToKey(d)});}
  return {week:idx+1, kw:isoWeekNumber(start), start, end, range:`${formatDateObj(start)} bis ${formatDateObj(end)}`, days};
}
function renderWeekDateBox(idx){
  const m=weekMeta(idx);
  return `<div class="week-date-box"><div><strong>Woche ${m.week} von 52</strong></div><div>KW ${m.kw}</div><div>Zeitraum: ${m.range}</div><div class="week-days">${m.days.map(d=>`<span>${d.name}, ${d.date}</span>`).join('')}</div></div>`;
}
function currentPlanWeekIndex(){
  const now=new Date(); const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const diff=Math.floor((today-yearPlanStart)/86400000);
  if(diff<0)return 0;
  const idx=Math.floor(diff/7);
  return Math.max(0,Math.min(51,idx));
}
function openCurrentWeek(sectionId){current=sectionId; selectedChapterIndex=currentPlanWeekIndex(); searchInput.value=''; const g=activeNavGroup(); if(g)openNavGroupLabel=g.label; render(); setTimeout(()=>scrollToContent(),0)}
function weeklyTemplateDatePrefix(t,idx){
  const m=weekMeta(idx);
  let text=String(t||'');
  text=text.replace(/\bMontag\b(?!,)/,`Montag, ${m.days[0].date}`)
           .replace(/\bDienstag\b(?!,)/,`Dienstag, ${m.days[1].date}`)
           .replace(/\bMittwoch\b(?!,)/,`Mittwoch, ${m.days[2].date}`)
           .replace(/\bDonnerstag\b(?!,)/,`Donnerstag, ${m.days[3].date}`)
           .replace(/\bFreitag\b(?!,)/,`Freitag, ${m.days[4].date}`)
           .replace(/\bSamstag\b(?!,)/,`Samstag, ${m.days[5].date}`)
           .replace(/\bSonntag\b(?!,)/,`Sonntag, ${m.days[6].date}`);
  const header=`Woche ${m.week} von 52\nKW ${m.kw}\nZeitraum: ${m.range}\n\n`;
  return text.startsWith(`Woche ${m.week} von 52`) ? text : header+text;
}
function formatWeeklyTemplateHtml(t,idx,sectionId){
  const txt=weeklyTemplateDatePrefix(t,idx);
  const platformMap={
    'LinkedIn':'LinkedIn – Beitrag',
    'Facebook':'Facebook – Beitrag',
    'WhatsApp':'WhatsApp – Status',
    'Story':'Facebook/Instagram – Story',
    'Video':'Video – Video',
    'YouTube':'YouTube – Video',
    'YouTube Short':'YouTube – Short',
    'Short':'YouTube – Short',
    'Instagram':'Instagram – Story'
  };
  const dayIndexByName={Montag:0,Dienstag:1,Mittwoch:2,Donnerstag:3,Freitag:4,Samstag:5,Sonntag:6};
  let html='';
  let currentPlatform='';
  let currentPlatformLabel='';
  let buffer=[];
  let segmentCounter=0;
  function flushSegment(){
    if(!currentPlatformLabel && !buffer.length)return;
    const clean=buffer.map(x=>String(x||'').trim()).filter(Boolean).join('\n');
    if(currentPlatformLabel){
      html+=`<div class="weekly-entry">`;
      html+=`<div class="weekly-platform"><strong>${esc(currentPlatformLabel)}</strong></div>`;
      if(clean){
        const id=`copy-${esc(sectionId||'section')}-${idx}-${segmentCounter++}`;
        html+=`<div class="weekly-copy-text" id="${id}">${clean.split('\n').map(x=>`<p class="weekly-text">${esc(x)}</p>`).join('')}</div>`;
        const label=currentPlatformLabel.includes('Status')?'Status kopieren':currentPlatformLabel.includes('Story')?'Story kopieren':currentPlatformLabel.includes('Video')?'Video kopieren':currentPlatformLabel.includes('Short')?'Short kopieren':'Beitrag kopieren';
        html+=`<button class="copy-btn small-copy" onclick="copyFromElement('${id}')">${esc(label)}</button>`;
      }
      html+=`</div>`;
    }else if(clean){
      html+=clean.split('\n').map(x=>`<p class="weekly-text">${esc(x)}</p>`).join('');
    }
    currentPlatform='';
    currentPlatformLabel='';
    buffer=[];
  }
  txt.split('\n').forEach(line=>{
    const raw=String(line||'');
    const trimmed=raw.trim();
    if(!trimmed){return;}
    const dayMatch=trimmed.match(/^(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag),\s*\d{2}\.\d{2}\.\d{4}$/);
    if(dayMatch){
      flushSegment();
      const dayIdx=dayIndexByName[dayMatch[1]];
      html+=`<div class="weekly-day"><strong>${esc(trimmed)}</strong></div>`;
      if(sectionId && isPublishSection(sectionId)){
        html+=renderInlineDayMediaStatus(sectionId,idx,dayIdx);
      }
      return;
    }
    if(/^Woche\s+\d+\s+von\s+52$/.test(trimmed) || /^KW\s+\d+$/.test(trimmed) || /^Zeitraum:/.test(trimmed)){
      flushSegment();
      html+=`<div class="weekly-meta"><strong>${esc(trimmed)}</strong></div>`;
      return;
    }
    if(platformMap[trimmed]){
      flushSegment();
      currentPlatform=trimmed;
      currentPlatformLabel=platformMap[trimmed];
      return;
    }
    buffer.push(trimmed);
  });
  flushSegment();
  return html;
}



function scrollToContent(){
  const content = document.querySelector('.content');
  if(content){
    content.scrollIntoView({behavior:'smooth', block:'start'});
  }else{
    window.scrollTo({top:0, behavior:'smooth'});
  }
}

function activeNavGroup(){
  const groups=window.APP_CONTENT.navGroups||[];
  return groups.find(g=>(g.sections||[]).includes(current)) || null;
}
function toggleNavGroup(label){
  const groups=window.APP_CONTENT.navGroups||[];
  const group=groups.find(g=>g.label===label);
  if(!group)return;
  if(openNavGroupLabel===label){
    openNavGroupLabel=null;
    renderNav();
    return;
  }
  openNavGroupLabel=label;
  const first=(group.sections||[])[0];
  if(first && !(group.sections||[]).includes(current)){
    current=first;
    selectedChapterIndex=null;
    searchInput.value='';
    render();
  }else{
    renderNav();
  }
}
function renderNav(){
  nav.innerHTML='';
  const groups=window.APP_CONTENT.navGroups||[];
  if(!groups.length){
    window.APP_CONTENT.sections.forEach(s=>{
      const b=document.createElement('button');
      b.className='nav-btn'+(s.id===current?' active':'');
      b.textContent=s.navTitle || s.title;
      b.onclick=()=>go(s.id);
      nav.appendChild(b);
    });
    return;
  }
  const activeGroup=activeNavGroup();
  groups.forEach(g=>{
    const isActive=activeGroup&&activeGroup.label===g.label;
    const isOpen=openNavGroupLabel===g.label;
    const groupBtn=document.createElement('button');
    groupBtn.className='nav-btn nav-group'+(isActive?' active':'');
    groupBtn.textContent=g.label;
    groupBtn.onclick=()=>toggleNavGroup(g.label);
    nav.appendChild(groupBtn);
    if(isOpen){
      (g.sections||[]).forEach(id=>{
        const s=sectionById(id); if(!s)return;
        const b=document.createElement('button');
        b.className='nav-btn nav-child'+(s.id===current?' active':'');
        b.textContent=s.navTitle || s.title;
        b.onclick=()=>go(s.id);
        nav.appendChild(b);
      });
    }
  });
}

function render(){
  renderNav();
  const q=searchInput.value.trim().toLowerCase();
  if(q)return renderSearch(q);
  const s=sectionById(current);
  if(!s)return;
  if(s.type==='dashboard')return renderDashboard(s);
  if(s.type==='links')return renderLinks(s);
  if(s.type==='sales_cockpit')return renderSalesCockpit(s);
  if(s.type==='kpi')return renderSalesCockpit(s);
  renderContent(s);
}

function go(id){
  current=id; selectedChapterIndex=null; searchInput.value='';
  const g=activeNavGroup(); if(g)openNavGroupLabel=g.label;
  render();
  setTimeout(()=>scrollToContent(),0);
}

/* Arbeitscockpit */
function ensureActivityDate(date){
  if(!activity[date])activity[date]={peter:{},martina:{}};
  if(!activity[date].peter)activity[date].peter={};
  if(!activity[date].martina)activity[date].martina={};
}
function setActivity(date,person,key,value){
  ensureActivityDate(date);
  activity[date][person][key]=value==='' ? '' : Math.max(0,Number(value));
  saveActivity(); render();
}
function personActivityStats(person,date){
  ensureActivityDate(date);
  let actual=0,target=0;
  activityConfig[person].forEach(f=>{actual+=Number(activity[date][person][f.key]||0); target+=f.target});
  return {actual,target,percent:pct(actual,target)};
}
function renderDashboard(s){
  const date=selectedDate || todayKey();
  view.innerHTML=`
    <div class="card"><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p></div>
    <div class="card"><h3>Heute noch offen</h3>${renderOpenToday(date)}</div>
    <div class="card">
      <h3>Tageserfassung</h3>
      <div class="date-row">
        <label>Datum wählen:</label>
        <input type="date" value="${date}" onchange="selectedDate=this.value; ensureActivityDate(this.value); render()">
        <button class="copy-btn" onclick="selectedDate=todayKey(); ensureActivityDate(selectedDate); render()">Heute anzeigen</button>
      </div>
    </div>
    <div class="grid">${renderPersonActivity('peter','Peter',date)}${renderPersonActivity('martina','Martina',date)}</div>
    ${renderActivityResult(date)}
    ${renderActivityPeriodSummaries()}
    ${renderActivityHistory()}
    ${renderProgressOverview()}
  `;
}
function renderOpenToday(date){
  ensureActivityDate(date);
  let items=[];
  ['peter','martina'].forEach(person=>{
    activityConfig[person].forEach(f=>{
      const actual=Number(activity[date][person][f.key]||0);
      if(actual<f.target)items.push(`<li><strong>${person==='peter'?'Peter':'Martina'}:</strong> ${esc(f.label)} fehlen ${round(f.target-actual)}</li>`);
    });
  });
  return items.length ? `<ul>${items.slice(0,10).join('')}</ul>` : `<p class="ok-text">Alles im Soll.</p>`;
}
function renderPersonActivity(person,title,date){
  ensureActivityDate(date);
  const st=personActivityStats(person,date);
  return `<div class="card"><h3>${title}</h3><div class="score-badge ${ampClass(st.percent)}">Erfüllung: ${st.percent}%</div>
    ${activityConfig[person].map(f=>{
      const val=activity[date][person][f.key] ?? '';
      const help=fieldHelp[person]?.[f.key] || ['',''];
      return `<div class="activity-row ${targetClass(Number(val||0),f.target)}">
        <div><strong>${esc(f.label)}</strong><small>Soll: ${f.target} · Bereich: ${esc(f.channel)}</small></div>
        <input type="number" min="0" step="0.1" value="${val}" onchange="setActivity('${date}','${person}','${f.key}',this.value)">
      </div>
      <details class="field-help"><summary>Erklärung und nächster Schritt</summary>
        <p><strong>Ziel:</strong> ${esc(help[0])}</p>
        <p><strong>Empfehlung:</strong> ${esc(help[1])}</p>
      </details>`;
    }).join('')}</div>`;
}
function renderActivityResult(date){
  return `<div class="card"><h3>Tätigkeitsergebnis für ${formatDate(date)}</h3><div class="grid">
    ${renderActivityTable('peter','Peter',date)}${renderActivityTable('martina','Martina',date)}
  </div></div>`;
}
function renderActivityTable(person,title,date){
  ensureActivityDate(date);
  return `<div><h4>${title}</h4><table class="mini-table">
  <thead><tr><th>Bereich</th><th>Soll</th><th>Ist</th><th>Status</th></tr></thead><tbody>
  ${activityConfig[person].map(f=>{
    const actual=Number(activity[date][person][f.key]||0);
    return `<tr class="${targetClass(actual,f.target)}"><td>${esc(f.label)}</td><td>${f.target}</td><td>${round(actual)}</td><td>${statusText(actual,f.target)}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function datesBy(type){
  const all=Object.keys(activity).sort();
  const now=new Date();
  if(type==='week'){
    const start=new Date(now); const day=(start.getDay()+6)%7; start.setDate(start.getDate()-day); start.setHours(0,0,0,0);
    const end=new Date(start); end.setDate(end.getDate()+7);
    return all.filter(d=>{const x=new Date(d+'T00:00:00'); return x>=start && x<end});
  }
  if(type==='month'){const ym=now.toISOString().slice(0,7); return all.filter(d=>d.startsWith(ym))}
  if(type==='year'){const y=String(now.getFullYear()); return all.filter(d=>d.startsWith(y))}
  return all;
}
function renderActivityPeriodSummaries(){
  return `<div class="card"><h3>Arbeitscockpit Auswertung</h3><div class="grid">
    ${renderActivityPeriodBox('Diese Woche',datesBy('week'))}
    ${renderActivityPeriodBox('Dieser Monat',datesBy('month'))}
    ${renderActivityPeriodBox('Dieses Jahr',datesBy('year'))}
  </div></div>`;
}
function renderActivityPeriodBox(label,dates){
  const p=sumActivity('peter',dates), m=sumActivity('martina',dates);
  return `<div class="period-box"><h4>${label}</h4>
    <p class="${ampClass(p.percent)}"><strong>Peter:</strong> ${p.percent}% · Ist ${round(p.actual)} von Soll ${round(p.target)}</p>
    <p class="${ampClass(m.percent)}"><strong>Martina:</strong> ${m.percent}% · Ist ${round(m.actual)} von Soll ${round(m.target)}</p>
  </div>`;
}
function sumActivity(person,dates){
  let actual=0,target=0;
  dates.forEach(d=>{ensureActivityDate(d); activityConfig[person].forEach(f=>{actual+=Number(activity[d][person][f.key]||0); target+=f.target})});
  return {actual,target,percent:pct(actual,target)};
}
function renderActivityHistory(){
  const dates=Object.keys(activity).sort().reverse();
  if(!dates.length)return `<div class="card"><h3>Historie</h3><p>Noch keine Daten.</p></div>`;
  return `<div class="card"><h3>Historie Arbeitscockpit</h3><div class="table-wrap"><table class="history-table">
    <thead><tr><th>Datum</th><th>Peter</th><th>Martina</th><th>Gesamt</th></tr></thead><tbody>
    ${dates.map(d=>{
      const p=sumActivity('peter',[d]), m=sumActivity('martina',[d]);
      const total=pct(p.actual+m.actual,p.target+m.target);
      return `<tr><td><button class="link-button" onclick="selectedDate='${d}'; render(); scrollToContent()">${formatDate(d)}</button></td><td class="${ampClass(p.percent)}">${p.percent}%</td><td class="${ampClass(m.percent)}">${m.percent}%</td><td class="${ampClass(total)}">${total}%</td></tr>`;
    }).join('')}</tbody></table></div></div>`;
}

/* Vertriebs-Cockpit */
function ensureSalesDate(date){
  if(!sales[date])sales[date]={peter:{},martina:{}};
  if(!sales[date].peter)sales[date].peter={};
  if(!sales[date].martina)sales[date].martina={};
}
function setSales(date,person,key,value){
  ensureSalesDate(date);
  sales[date][person][key]=value==='' ? '' : Math.max(0,Number(value));
  saveSales(); render();
}
function renderSalesCockpit(s){
  const date=selectedSalesDate || todayKey();
  ensureSalesDate(date);
  view.innerHTML=`
    <div class="card"><h2>${esc(s.title || '3. Vertriebs-Cockpit')}</h2><p>${esc(s.text || 'Steuerung vom Kontakt bis zum Partner.')}</p></div>
    ${renderSalesForecast()}
    <div class="card"><h3>Tages-Cockpit</h3><div class="date-row"><label>Datum wählen:</label><input type="date" value="${date}" onchange="selectedSalesDate=this.value; ensureSalesDate(this.value); render()"><button class="copy-btn" onclick="selectedSalesDate=todayKey(); render()">Heute anzeigen</button></div></div>
    <div class="grid">${renderSalesPerson('peter','Peter',date)}${renderSalesPerson('martina','Martina',date)}</div>
    ${renderSalesPeriods()}
    ${renderFunnel()}
    ${renderSalesHistory()}
  `;
}
function renderSalesPerson(person,title,date){
  ensureSalesDate(date);
  const fields=salesConfig[person];
  return `<div class="card"><h3>${title}</h3><table class="mini-table"><thead><tr><th>Kennzahl</th><th>Soll</th><th>Ist</th><th>Status</th></tr></thead><tbody>
  ${fields.map(f=>{
    const val=sales[date][person][f.key] ?? '';
    const n=Number(val||0);
    return `<tr class="${targetClass(n,f.target)}"><td>${esc(f.label)}</td><td>${round(f.target)}</td><td><input type="number" min="0" step="0.1" value="${val}" onchange="setSales('${date}','${person}','${f.key}',this.value)"></td><td>${statusText(n,f.target)}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function salesDates(type){
  const all=Object.keys(sales).sort();
  const now=new Date();
  if(type==='week'){
    const start=new Date(now); const day=(start.getDay()+6)%7; start.setDate(start.getDate()-day); start.setHours(0,0,0,0);
    const end=new Date(start); end.setDate(end.getDate()+7);
    return all.filter(d=>{const x=new Date(d+'T00:00:00'); return x>=start && x<end});
  }
  if(type==='month'){const ym=now.toISOString().slice(0,7); return all.filter(d=>d.startsWith(ym))}
  if(type==='year'){const y=String(now.getFullYear()); return all.filter(d=>d.startsWith(y))}
  return all;
}
function sumSales(person,dates){
  let res={};
  salesConfig[person].forEach(f=>res[f.key]={label:f.label,target:0,actual:0});
  dates.forEach(d=>{ensureSalesDate(d); salesConfig[person].forEach(f=>{res[f.key].target+=f.target; res[f.key].actual+=Number(sales[d][person][f.key]||0)})});
  return res;
}
function renderSalesPeriods(){
  return `<div class="card"><h3>Wochen-, Monats- und Jahresübersicht</h3>
    ${renderSalesPeriod('Diese Woche',salesDates('week'))}
    ${renderSalesPeriod('Dieser Monat',salesDates('month'))}
    ${renderSalesPeriod('Dieses Jahr',salesDates('year'))}
  </div>`;
}
function renderSalesPeriod(label,dates){
  const p=sumSales('peter',dates), m=sumSales('martina',dates);
  const keys=Object.keys({...p,...m});
  return `<details class="period-box" open><summary><strong>${label}</strong></summary><table class="mini-table"><thead><tr><th>Kennzahl</th><th>Ist</th><th>Soll</th><th>Abweichung</th><th>Ampel</th></tr></thead><tbody>
  ${keys.map(k=>{
    const label=(p[k]?.label || m[k]?.label || k);
    const actual=(p[k]?.actual||0)+(m[k]?.actual||0);
    const target=(p[k]?.target||0)+(m[k]?.target||0);
    const diff=actual-target;
    return `<tr class="${ampClass(pct(actual,target))}"><td>${esc(label)}</td><td>${round(actual)}</td><td>${round(target)}</td><td>${round(diff)}</td><td>${pct(actual,target)}%</td></tr>`;
  }).join('')}</tbody></table></details>`;
}
function funnelTotals(){
  const dates=Object.keys(sales);
  let result={kontakte:0,gespraeche:0,termine:0,praesentationen:0,verkaeufe:0,partner:0};
  dates.forEach(d=>{
    ensureSalesDate(d);
    result.kontakte += Number(sales[d].peter.neue_kontakte||0) + Number(sales[d].martina.kontakte||0);
    result.gespraeche += Number(sales[d].peter.gespraeche||0) + Number(sales[d].martina.gespraeche||0);
    result.termine += Number(sales[d].peter.termine||0) + Number(sales[d].martina.termine||0);
    result.praesentationen += Number(sales[d].peter.praesentationen||0) + Number(sales[d].martina.praesentationen||0);
    result.verkaeufe += Number(sales[d].peter.verkaeufe||0) + Number(sales[d].martina.verkaeufe||0);
    result.partner += Number(sales[d].peter.partner||0) + Number(sales[d].martina.partner||0);
  });
  return result;
}
function renderFunnel(){
  const f=funnelTotals();
  return `<div class="card"><h3>Aktivitäts-Trichter</h3><div class="funnel">
    ${funnelKeys.map(([k,label],i)=>{
      const prev=i>0 ? f[funnelKeys[i-1][0]] : null;
      const rate=prev ? Math.round((f[k]/prev)*100) : 100;
      return `<div class="funnel-step"><strong>${esc(label)}</strong><span>${round(f[k])}</span>${i>0?`<small>Quote aus vorheriger Stufe: ${rate}%</small>`:''}</div>`;
    }).join('<div class="funnel-arrow">↓</div>')}
  </div></div>`;
}
function renderSalesForecast(){
  const dates=Object.keys(sales).sort();
  const year=new Date().getFullYear();
  const yDates=dates.filter(d=>d.startsWith(String(year)));
  const dayOfYear=Math.max(1,Math.floor((new Date()-new Date(year,0,0))/86400000));
  const factor=365/dayOfYear;
  const f=funnelTotals();
  return `<div class="card"><h3>Jahreshochrechnung</h3><p>Bei aktueller Aktivität erreicht ihr bis Jahresende voraussichtlich:</p>
    <div class="grid">
      ${funnelKeys.map(([k,label])=>`<div class="progress-card"><strong>${esc(label)}</strong><br><span class="big-number">${round(f[k]*factor)}</span></div>`).join('')}
    </div>
  </div>`;
}
function renderSalesHistory(){
  const dates=Object.keys(sales).sort().reverse();
  if(!dates.length)return `<div class="card"><h3>Historie Vertriebs-Cockpit</h3><p>Noch keine Werte.</p></div>`;
  return `<div class="card"><h3>Historie Vertriebs-Cockpit</h3><div class="table-wrap"><table class="history-table"><thead><tr><th>Datum</th><th>Kontakte</th><th>Gespräche</th><th>Termine</th><th>Präsentationen</th><th>Verkäufe</th><th>Partner</th></tr></thead><tbody>
  ${dates.map(d=>{
    const row={
      kontakte:Number(sales[d].peter?.neue_kontakte||0)+Number(sales[d].martina?.kontakte||0),
      gespraeche:Number(sales[d].peter?.gespraeche||0)+Number(sales[d].martina?.gespraeche||0),
      termine:Number(sales[d].peter?.termine||0)+Number(sales[d].martina?.termine||0),
      praesentationen:Number(sales[d].peter?.praesentationen||0)+Number(sales[d].martina?.praesentationen||0),
      verkaeufe:Number(sales[d].peter?.verkaeufe||0)+Number(sales[d].martina?.verkaeufe||0),
      partner:Number(sales[d].peter?.partner||0)+Number(sales[d].martina?.partner||0)
    };
    return `<tr><td><button class="link-button" onclick="selectedSalesDate='${d}'; render(); scrollToContent()">${formatDate(d)}</button></td><td>${round(row.kontakte)}</td><td>${round(row.gespraeche)}</td><td>${round(row.termine)}</td><td>${round(row.praesentationen)}</td><td>${round(row.verkaeufe)}</td><td>${round(row.partner)}</td></tr>`;
  }).join('')}</tbody></table></div></div>`;
}

/* Content */
function renderLinks(s){
  let html=`<div class="card"><h2>${esc(s.title)}</h2><p>Direkter Einstieg in die wichtigsten Bereiche.</p></div>`;
  if(s.groups&&s.groups.length){
    s.groups.forEach(g=>{
      html+=`<div class="card"><h3>${esc(g.title)}</h3><div class="link-grid">${(g.links||[]).map(l=>`<button class="link-card" onclick="go('${l.target}')">${esc(l.label)}</button>`).join('')}</div></div>`;
    });
  }else{
    html+=`<div class="link-grid">${(s.links||[]).map(l=>`<button class="link-card" onclick="go('${l.target}')">${esc(l.label)}</button>`).join('')}</div>`;
  }
  view.innerHTML=html+renderProgressOverview();
}
function openChapter(idx){selectedChapterIndex=idx; render(); setTimeout(()=>scrollToContent(),0)}
function backToOverview(){selectedChapterIndex=null; render(); setTimeout(()=>scrollToContent(),0)}
function renderContent(s){
  const chapters=s.chapters||[];
  if(selectedChapterIndex!==null && chapters[selectedChapterIndex]) return renderSingleChapter(s,chapters[selectedChapterIndex],selectedChapterIndex);
  const isWeekly=isPublishSection(s.id);
  let html=`<div class="card"><h2>${esc(s.title)}</h2>${(s.tags||[]).map(t=>`<span class="badge">${esc(t)}</span>`).join('')}<p class="small">Wähle unten einen Eintrag. Er öffnet sich als eigene Seite.</p></div>`;
  if(isWeekly)html+=renderProgressOverviewForSection(s.id)+`<div class="card"><button class="copy-btn" onclick="openCurrentWeek('${s.id}')">Heute öffnen</button></div>`;
  html+=`<div class="${isWeekly?'week-list':'chapter-list'}">`;
  chapters.forEach((c,idx)=>{
    const status=isWeekly ? weekAggregateStatus(s.id,idx) : 'öffnen';
    const progress=isWeekly ? weekMediaProgress(s.id,idx) : null;
    html+=`<button class="${isWeekly?'week-row':'chapter-row'} ${isWeekly?statusClass(status):''}" onclick="openChapter(${idx})"><span>${isWeekly?`Woche ${idx+1}: `:''}${esc(c.title.replace(/^Woche\s*\d+[:.]?\s*/i,''))}</span><small>${isWeekly?`KW ${weekMeta(idx).kw} · ${weekMeta(idx).range} · ${progress.done}/${progress.total} erledigt`:esc(status)}</small></button>`;
  });
  html+=`</div>`;
  view.innerHTML=html;
}
function renderSingleChapter(s,c,idx){
  const weekly=isPublishSection(s.id);
  let html=`<div class="card single-page"><button class="copy-btn" onclick="backToOverview()">Zurück zur Übersicht</button><h2>${esc(s.title)}</h2><h3>${weekly?`Woche ${idx+1}: `:''}${esc(c.title.replace(/^Woche\s*\d+[:.]?\s*/i,''))}</h3>${weekly?renderWeekDateBox(idx):''}`;
  if(c.body)html+=`<div class="chapter-body">${esc(c.body)}</div>`;
  (c.templates||[]).forEach((t,ti)=>{const id=`single-${s.id}-${idx}-${ti}`; const txt=weekly?weeklyTemplateDatePrefix(t,idx):t; const body=weekly?formatWeeklyTemplateHtml(t,idx,s.id):esc(txt); html+=`<div class="template ${weekly?'weekly-template':''}" id="${id}">${body}</div><button class="copy-btn" onclick="copyFromElement('${id}')">Text kopieren</button>`});
  html+=`</div>`;
  const prevLabel=isPublishSection(s.id)?'Vorherige Woche':'Vorheriger Eintrag';
  const nextLabel=isPublishSection(s.id)?'Nächste Woche':'Nächster Eintrag';
  const prev=idx>0?`<button class="copy-btn" onclick="openChapter(${idx-1})">${prevLabel}</button>`:'';
  const next=idx<(s.chapters.length-1)?`<button class="copy-btn" onclick="openChapter(${idx+1})">${nextLabel}</button>`:'';
  let status='';
  view.innerHTML=html+`<div class="card">${prev}${next}</div>`;
}
function statusClass(status){if(status==='Veröffentlicht')return 'status-published'; if(status==='Geplant')return 'status-planned'; return 'status-open'}
function setContentStatus(section,idx,value){localStorage.setItem(`content_status_${section}_${idx}`,value); render()}

function weeklyMediaForSection(sectionId){
  if(sectionId==='peter52')return [
    {key:'linkedin', label:'LinkedIn – Beitrag'},
    {key:'facebook', label:'Facebook – Beitrag'},
    {key:'whatsapp', label:'WhatsApp – Status'},
    {key:'story', label:'Facebook/Instagram – Story'},
    {key:'video', label:'Video – Video'}
  ];
  if(sectionId==='martina52')return [
    {key:'linkedin', label:'LinkedIn – Beitrag'},
    {key:'facebook', label:'Facebook – Beitrag'},
    {key:'whatsapp', label:'WhatsApp – Status'},
    {key:'story', label:'Facebook/Instagram – Story'}
  ];
  return [
    {key:'linkedin', label:'LinkedIn – Beitrag'},
    {key:'facebook', label:'Facebook – Beitrag'},
    {key:'whatsapp', label:'WhatsApp – Status'},
    {key:'story', label:'Facebook/Instagram – Story'},
    {key:'video', label:'Video – Video'}
  ];
}
function mediaStatusKey(section,idx,dayIdx,mediaKey){return `media_status_${section}_${idx}_${dayIdx}_${mediaKey}`}
function getMediaStatus(section,idx,dayIdx,mediaKey){return localStorage.getItem(mediaStatusKey(section,idx,dayIdx,mediaKey))||'Offen'}
function toggleMediaStatus(section,idx,dayIdx,mediaKey){
  const key=mediaStatusKey(section,idx,dayIdx,mediaKey);
  const cur=localStorage.getItem(key)||'Offen';
  localStorage.setItem(key,cur==='Erledigt'?'Offen':'Erledigt');
  render();
}
function weekMediaProgress(section,idx){
  const media=weeklyMediaForSection(section);
  const total=7*media.length;
  let done=0;
  for(let d=0; d<7; d++){media.forEach(m=>{if(getMediaStatus(section,idx,d,m.key)==='Erledigt')done++;});}
  return {total,done,open:total-done,percent:total?Math.round(done/total*100):0};
}
function weekAggregateStatus(section,idx){
  const p=weekMediaProgress(section,idx);
  if(p.done>=p.total)return 'Veröffentlicht';
  if(p.done>0)return 'Geplant';
  return 'Offen';
}
function renderInlineDayMediaStatus(section,idx,dayIdx){
  const media=weeklyMediaForSection(section);
  const done=media.filter(md=>getMediaStatus(section,idx,dayIdx,md.key)==='Erledigt').length;
  const cls=done===media.length?'day-complete':(done>0?'day-started':'day-open');
  return `<div class="inline-day-status ${cls}"><div class="inline-status-title"><strong>Status</strong><span>${done} von ${media.length} erledigt</span></div><div class="media-buttons">${media.map(md=>{
    const st=getMediaStatus(section,idx,dayIdx,md.key);
    return `<button class="media-pill ${st==='Erledigt'?'done':'open'}" onclick="toggleMediaStatus('${section}',${idx},${dayIdx},'${md.key}')"><strong>${esc(md.label)}</strong><span>${st}</span></button>`;
  }).join('')}</div></div>`;
}
function renderMediaStatusPanel(section,idx){
  const media=weeklyMediaForSection(section);
  const m=weekMeta(idx);
  const p=weekMediaProgress(section,idx);
  return `<div class="media-status-panel"><h3>Status pro Tag und Medium</h3><p class="small">${p.done} von ${p.total} erledigt. Offen: ${p.open}.</p>${m.days.map((d,di)=>{
    const dayDone=media.filter(md=>getMediaStatus(section,idx,di,md.key)==='Erledigt').length;
    const dayClass=dayDone===media.length?'day-complete':(dayDone>0?'day-started':'day-open');
    return `<div class="media-day ${dayClass}"><div class="media-day-title"><strong>${esc(d.name)}, ${esc(d.date)}</strong><span>${dayDone} von ${media.length} erledigt</span></div><div class="media-buttons">${media.map(md=>{
      const st=getMediaStatus(section,idx,di,md.key);
      return `<button class="media-pill ${st==='Erledigt'?'done':'open'}" onclick="toggleMediaStatus('${section}',${idx},${di},'${md.key}')"><strong>${esc(md.label)}</strong><span>${st}</span></button>`;
    }).join('')}</div></div>`;
  }).join('')}</div>`;
}
function getSectionProgress(sectionId){
  const s=sectionById(sectionId); if(!s||!s.chapters)return {total:0,published:0,planned:0,open:0};
  let total=s.chapters.length,published=0,planned=0,open=0;
  s.chapters.forEach((c,idx)=>{const val=isPublishSection(sectionId)?weekAggregateStatus(sectionId,idx):(localStorage.getItem(`content_status_${sectionId}_${idx}`)||'Offen'); if(val==='Veröffentlicht')published++; else if(val==='Geplant')planned++; else open++});
  return {total,published,planned,open};
}
function progressBar(sectionId,label){
  const p=getSectionProgress(sectionId); const percent=p.total?Math.round((p.published/p.total)*100):0;
  return `<div class="progress-card"><div class="progress-head"><strong>${esc(label)}</strong><span>${p.published} von ${p.total} veröffentlicht</span></div><div class="progress-bar"><div class="progress-fill" style="width:${percent}%"></div></div><div class="progress-meta">Geplant: ${p.planned} · Offen: ${p.open} · Fortschritt: ${percent}%</div></div>`;
}
function renderProgressOverview(){return `<div class="card"><h3>Fortschritt Jahrespläne</h3>${progressBar('peter52','Peter 52-Wochen-Jahresplan')}${progressBar('linkedin52','LinkedIn Jahresplan')}${progressBar('facebook52','Facebook Jahresplan')}${progressBar('videos52','Video Jahresplan')}${progressBar('martina52','Martina 52-Wochen-Programm')}</div>`}
function renderProgressOverviewForSection(id){if(id==='peter52')return `<div class="card">${progressBar(id,'Peter 52-Wochen-Jahresplan')}</div>`; if(id==='linkedin52')return `<div class="card">${progressBar(id,'LinkedIn Jahresplan')}</div>`; if(id==='facebook52')return `<div class="card">${progressBar(id,'Facebook Jahresplan')}</div>`; if(id==='videos52')return `<div class="card">${progressBar(id,'Video Jahresplan')}</div>`; if(id==='martina52')return `<div class="card">${progressBar(id,'Martina 52-Wochen-Programm')}</div>`; return ''}

async function copyFromElement(id){const el=document.getElementById(id); if(el) await copyText(el.innerText||el.textContent||'')}
async function copyText(text){
  try{if(navigator.clipboard && window.isSecureContext){await navigator.clipboard.writeText(text); showCopyNotice('Text kopiert.'); return}}catch(e){}
  const ta=document.createElement('textarea'); ta.value=text; ta.style.position='fixed'; ta.style.top='-1000px'; document.body.appendChild(ta); ta.focus(); ta.select(); const ok=document.execCommand('copy'); document.body.removeChild(ta); showCopyNotice(ok?'Text kopiert.':'Bitte Text markieren und kopieren.');
}
function showCopyNotice(msg){let n=document.getElementById('copyNotice'); if(!n){n=document.createElement('div'); n.id='copyNotice'; n.className='copy-notice'; document.body.appendChild(n)} n.textContent=msg; n.classList.add('show'); setTimeout(()=>n.classList.remove('show'),1600)}
function round(n){return Math.round(Number(n||0)*10)/10}

function renderSearch(q){
  selectedChapterIndex=null; let hits=[];
  window.APP_CONTENT.sections.forEach(s=>{(s.chapters||[]).forEach((c,idx)=>{if(JSON.stringify(c).toLowerCase().includes(q)||s.title.toLowerCase().includes(q))hits.push({section:s,chapter:c,idx})})});
  let html=`<div class="card"><h2>Suche</h2><p>${hits.length} Treffer für „${esc(q)}“</p></div>`;
  hits.slice(0,150).forEach(h=>{html+=`<div class="card"><h3>${esc(h.section.title)}: ${esc(h.chapter.title)}</h3><button class="copy-btn" onclick="current='${h.section.id}'; searchInput.value=''; selectedChapterIndex=${h.idx}; render(); scrollToContent();">Eintrag öffnen</button></div>`});
  view.innerHTML=html;
}

document.getElementById('resetBtn').onclick=()=>{selectedDate=todayKey(); selectedSalesDate=todayKey(); render()}
searchInput.addEventListener('input',()=>{selectedChapterIndex=null; render()});
ensureActivityDate(todayKey()); ensureSalesDate(todayKey()); render();
