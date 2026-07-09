

const firebaseConfig = {
  apiKey: "AIzaSyCC6oG4f-GGqFoG785z_ePREt86Sugptd4",
  authDomain: "kuecken-cockpit.firebaseapp.com",
  projectId: "kuecken-cockpit",
  storageBucket: "kuecken-cockpit.firebasestorage.app",
  messagingSenderId: "523160644442",
  appId: "1:523160644442:web:ff840ac629a9f62ebae163"
};

const APP_VERSION='1.3.4';
const APP_BUILD='09.07.2026';
let firebaseApp=null;
let auth=null;
let db=null;
let currentUser=null;
let cloudReady=false;
let applyingRemote=false;
let unsubscribeAppState=null;
let saveTimer=null;
let mediaStatus={};
let cloudError='';

try{
  firebaseApp=firebase.initializeApp(firebaseConfig);
  auth=firebase.auth();
  db=firebase.firestore();
}catch(e){
  cloudError=e && e.message ? e.message : String(e);
}

const stateKey='kuecken_state_v18';
const activityKey='kuecken_activity_v18';
const salesKey='kuecken_sales_v18';
const todayKey=()=>new Date().toISOString().slice(0,10);

let state=JSON.parse(localStorage.getItem(stateKey)||'{}');
let activity=JSON.parse(localStorage.getItem(activityKey)||'{}');
let sales=JSON.parse(localStorage.getItem(salesKey)||'{}');
mediaStatus=JSON.parse(localStorage.getItem('kuecken_media_status_v18')||'{}');
if(!state.checks)state.checks={};
if(!state.kpis)state.kpis={};
if(!state.crm)state.crm={contacts:[],tasks:[]};
if(!state.crm.contacts)state.crm.contacts=[];
if(!state.crm.tasks)state.crm.tasks=[];

const nav=document.getElementById('nav');
const view=document.getElementById('view');
const searchInput=document.getElementById('searchInput');

let current='heute';
let openNavGroupLabel=null;
let selectedChapterIndex=null;
let selectedDate=todayKey();
let selectedSalesDate=todayKey();
let selectedContactId=null;
let selectedContactTab='overview';
let crmLastOpenedContactId=null;
let crmFilters={q:'',owner:'Meine',status:'',source:'',priority:'',job:'',branch:'',targetGroup:''};
let crmSortMode='updated';

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

function save(){localStorage.setItem(stateKey,JSON.stringify(state)); scheduleCloudSave()}
function saveActivity(){localStorage.setItem(activityKey,JSON.stringify(activity)); scheduleCloudSave()}
function saveSales(){localStorage.setItem(salesKey,JSON.stringify(sales)); scheduleCloudSave()}
function saveMediaStatus(){localStorage.setItem('kuecken_media_status_v18',JSON.stringify(mediaStatus)); scheduleCloudSave()}
function scheduleCloudSave(){
  if(applyingRemote || !currentUser || !db || !cloudReady)return;
  clearTimeout(saveTimer);
  saveTimer=setTimeout(writeCloudState,350);
}
async function writeCloudState(){
  if(!currentUser || !db)return;
  setSyncStatus('Speichert ...');
  try{
    await db.collection('app').doc('sharedState').set({
      state, activity, sales, mediaStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: currentUser.email || currentUser.uid
    },{merge:true});
    setSyncStatus('Synchronisiert');
  }catch(e){
    setSyncStatus('Speicherfehler');
    console.error(e);
  }
}
function setSyncStatus(text){const el=document.getElementById('syncStatus'); if(el)el.textContent=text}

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

function copyButtonLabel(platformLabel){
  const label=String(platformLabel||'').toLowerCase();
  if(label.includes('linkedin'))return 'LinkedIn-Beitrag kopieren';
  if(label.includes('facebook') && label.includes('beitrag'))return 'Facebook-Beitrag kopieren';
  if(label.includes('whatsapp'))return 'WhatsApp-Status kopieren';
  if(label.includes('instagram') && label.includes('story'))return 'Instagram-Story kopieren';
  if(label.includes('facebook') && label.includes('story'))return 'Facebook-Story kopieren';
  if(label.includes('story'))return 'Story kopieren';
  if(label.includes('short'))return 'Short kopieren';
  if(label.includes('reel'))return 'Reel kopieren';
  if(label.includes('video') || label.includes('youtube'))return 'Videoskript kopieren';
  if(label.includes('status'))return 'Status kopieren';
  return 'Beitrag kopieren';
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
        const copyLabel=copyButtonLabel(currentPlatformLabel);
        html+=`<button class="copy-btn small-copy block-copy" onclick="copyFromElement('${id}')">📋 ${esc(copyLabel)}</button>`;
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
    const normalizedPlatform = trimmed
      .replace(/^\*+|\*+$/g,'')
      .replace(/<\/?strong>/g,'')
      .replace(/[:：]$/,'')
      .replace(/\s*[–-]\s*(Beitrag|Status|Story|Video|Short)$/i,'')
      .trim();
    if(platformMap[trimmed] || platformMap[normalizedPlatform]){
      flushSegment();
      currentPlatform=normalizedPlatform;
      currentPlatformLabel=platformMap[trimmed] || platformMap[normalizedPlatform];
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
  if(s.type==='impressum')return renderImpressum(s);
  if(s.type==='recruiting')return renderRecruiting(s);
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
function toWholeNumber(value){
  if(value === '' || value === null || value === undefined)return '';
  const cleaned = String(value).split(/[.,]/)[0].replace(/\D/g,'');
  if(cleaned === '')return '';
  return Math.max(0, parseInt(cleaned, 10));
}
function sanitizeIntegerInput(input){
  const old = input.value;
  const cleaned = toWholeNumber(old);
  input.value = cleaned === '' ? '' : String(cleaned);
}
function blockNonIntegerKeys(event){
  const blocked = ['e','E','+','-','.',','];
  if(blocked.includes(event.key)){event.preventDefault(); return false;}
  return true;
}
function integerInput(attrs){
  return `type="number" min="0" step="1" inputmode="numeric" pattern="[0-9]*" onkeydown="return blockNonIntegerKeys(event)" oninput="sanitizeIntegerInput(this)" ${attrs}`;
}
function setActivity(date,person,key,value){
  ensureActivityDate(date);
  activity[date][person][key]=toWholeNumber(value);
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
        <input ${integerInput(`value="${val}" onchange="setActivity('${date}','${person}','${f.key}',this.value)"`)}>
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
  sales[date][person][key]=toWholeNumber(value);
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
    return `<tr class="${targetClass(n,f.target)}"><td>${esc(f.label)}</td><td>${round(f.target)}</td><td><input ${integerInput(`value="${val}" onchange="setSales('${date}','${person}','${f.key}',this.value)"`)}></td><td>${statusText(n,f.target)}</td></tr>`;
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

function renderImpressum(s){
  const email=currentUser?.email || 'Nicht angemeldet';
  const firebaseState=cloudError ? 'Fehler' : (cloudReady ? 'Verbunden' : 'Nicht verbunden');
  const syncText=document.getElementById('syncStatus')?.textContent || 'Nicht bekannt';
  const userName=email.includes('martina') ? 'Martina' : (email.includes('peter') ? 'Peter' : email);
  view.innerHTML=`
    <div class="card single-page">
      <h2>Impressum</h2>
      <p><strong>Recruiting-Cockpit</strong></p>
      <p>Peter & Martina Kücken</p>
      <div class="info-grid">
        <div><strong>Version</strong><br>${esc(APP_VERSION)}</div>
        <div><strong>Letzte Aktualisierung</strong><br>${esc(APP_BUILD)}</div>
        <div><strong>Firebase</strong><br>${esc(firebaseState)}</div>
        <div><strong>Synchronisierung</strong><br>${esc(syncText)}</div>
        <div><strong>Angemeldet als</strong><br>${esc(userName)}</div>
      </div>
      <p class="muted">Diese Angaben dienen nur zur internen Kontrolle der App-Version und der Synchronisierung.</p>
    </div>`;
}

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
  (c.templates||[]).forEach((t,ti)=>{
    const id=`single-${s.id}-${idx}-${ti}`;
    const txt=weekly?weeklyTemplateDatePrefix(t,idx):t;
    const body=weekly?formatWeeklyTemplateHtml(t,idx,s.id):esc(txt);
    html+=`<div class="template ${weekly?'weekly-template':''}" id="${id}">${body}</div>`;
    if(!weekly){
      html+=`<button class="copy-btn" onclick="copyFromElement('${id}')">Text kopieren</button>`;
    }
  });
  html+=`</div>`;
  const prevLabel=isPublishSection(s.id)?'Vorherige Woche':'Vorheriger Eintrag';
  const nextLabel=isPublishSection(s.id)?'Nächste Woche':'Nächster Eintrag';
  const prev=idx>0?`<button class="copy-btn" onclick="openChapter(${idx-1})">${prevLabel}</button>`:'';
  const next=idx<(s.chapters.length-1)?`<button class="copy-btn" onclick="openChapter(${idx+1})">${nextLabel}</button>`:'';
  let status='';
  view.innerHTML=html+`<div class="card">${prev}${next}</div>`;
}
function statusClass(status){if(status==='Veröffentlicht')return 'status-published'; if(status==='Geplant')return 'status-planned'; return 'status-open'}
function setContentStatus(section,idx,value){if(!state.contentStatuses)state.contentStatuses={}; state.contentStatuses[`content_status_${section}_${idx}`]=value; save(); render()}

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
function getMediaStatus(section,idx,dayIdx,mediaKey){return mediaStatus[mediaStatusKey(section,idx,dayIdx,mediaKey)]||'Offen'}
function toggleMediaStatus(section,idx,dayIdx,mediaKey){
  const key=mediaStatusKey(section,idx,dayIdx,mediaKey);
  const cur=mediaStatus[key]||'Offen';
  mediaStatus[key]=cur==='Erledigt'?'Offen':'Erledigt';
  saveMediaStatus();
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
  s.chapters.forEach((c,idx)=>{const val=isPublishSection(sectionId)?weekAggregateStatus(sectionId,idx):(state.contentStatuses?.[`content_status_${sectionId}_${idx}`]||'Offen'); if(val==='Veröffentlicht')published++; else if(val==='Geplant')planned++; else open++});
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
function round(n){return Math.round(Number(n||0))}



/* Recruiting CRM Version 1.3.3 */
function ensureCrm(){
  if(!state.crm)state.crm={contacts:[],tasks:[],dailyDone:{},counters:{PK:0,MK:0}};
  if(!Array.isArray(state.crm.contacts))state.crm.contacts=[];
  if(!Array.isArray(state.crm.tasks))state.crm.tasks=[];
  if(!state.crm.dailyDone)state.crm.dailyDone={};
  if(!state.crm.counters)state.crm.counters={PK:0,MK:0};
  crmNormalizeCounters();
  crmEnsureContactCodes();
}
function crmOwnerPrefix(owner){return owner==='Martina'?'MK':'PK'}
function crmCodeNumber(code){const m=String(code||'').match(/^(PK|MK)-(\d{1,})$/); return m?{prefix:m[1],num:Number(m[2])}:null}
function crmFormatCode(prefix,num){return `${prefix}-${String(num).padStart(5,'0')}`}
function crmNormalizeCounters(){
  if(!state.crm.counters)state.crm.counters={PK:0,MK:0};
  ['PK','MK'].forEach(prefix=>{
    let max=Number(state.crm.counters[prefix]||0);
    (state.crm.contacts||[]).forEach(c=>{const parsed=crmCodeNumber(c.contactCode); if(parsed && parsed.prefix===prefix && parsed.num>max)max=parsed.num});
    state.crm.counters[prefix]=max;
  });
}
function crmNextContactCode(owner){
  const prefix=crmOwnerPrefix(owner);
  crmNormalizeCounters();
  state.crm.counters[prefix]=Number(state.crm.counters[prefix]||0)+1;
  return crmFormatCode(prefix,state.crm.counters[prefix]);
}
function crmEnsureContactCodes(){
  let changed=false;
  (state.crm.contacts||[]).forEach(c=>{
    const validCode=crmCodeNumber(c.contactCode);
    if(!validCode){
      c.contactCode=crmNextContactCode(c.createdBy||c.owner||'Peter');
      changed=true;
    }else{
      const normalized=crmFormatCode(validCode.prefix,validCode.num);
      if(c.contactCode!==normalized){c.contactCode=normalized; changed=true;}
    }
    if(!c.createdBy)c.createdBy=(c.contactCode||'').startsWith('MK-')?'Martina':'Peter';
    if(!Array.isArray(c.communication))c.communication=[];
    if(!Array.isArray(c.noteEntries))c.noteEntries=[];
  });
  return changed;
}
function currentPerson(){
  const email=(currentUser?.email || '').toLowerCase();
  if(email.includes('martina'))return 'Martina';
  return 'Peter';
}
function crmId(){return 'c_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8)}
function crmContacts(){ensureCrm(); return state.crm.contacts}
function crmTasks(){ensureCrm(); return state.crm.tasks}
function crmToday(){return todayKey()}
function crmSave(){ensureCrm(); save(); render()}
function crmFindContact(id){return crmContacts().find(c=>c.id===id)}
function crmFullName(c){return `${c.firstName||''} ${c.lastName||''}`.trim() || c.company || 'Unbenannter Kontakt'}
function crmDisplayName(c){return `${c.contactCode?c.contactCode+' · ':''}${crmFullName(c)}${c.company?' · '+c.company:''}${c.city?' · '+c.city:''}`}
function crmShortLabel(c){return `${c.contactCode||''} ${crmFullName(c)} ${c.company||''} ${c.city||''}`.trim()}
function crmLastActivity(c){return (c.timeline||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0]}
function crmPersonFilter(c){return (c.owner || 'Peter')===currentPerson() || (c.support || '')===currentPerson()}
function crmStatusOptions(){return ['Neu','Kontaktanfrage gesendet','Vernetzt','Erstgespräch','Interesse','Präsentation geplant','Präsentation erfolgt','Nachfassen','Kunde','Geschäftspartner','Kein Interesse','Archiv']}
function crmSources(){return ['LinkedIn','Facebook','WhatsApp','Empfehlung','Veranstaltung','Kunde','Sonstiges']}
function crmPriorities(){return ['A','B','C']}
function crmNextStepOptions(){return ['LinkedIn-Anfrage senden','Facebook-Nachricht senden','WhatsApp senden','Telefonat führen','Landingpage senden','Video 1 senden','Video 2 senden','Video 3 senden','Zoom vereinbaren','Präsentation durchführen','Nachfassen','Kunde betreuen','Geschäftspartner begleiten','Sonstiges']}
function crmChannelOptions(){return ['LinkedIn','Facebook','WhatsApp','Telefon','Zoom','Persönlich','E-Mail','Sonstiges']}
function crmTaskOptions(){return ['LinkedIn-Nachricht','WhatsApp senden','Rückruf','Zoom vorbereiten','Präsentation','Landingpage senden','Video senden','Nachfassen','Sonstiges']}
function crmSortAz(items,lastLabel){
  const collator=new Intl.Collator('de',{sensitivity:'base',numeric:true});
  const base=(items||[]).filter(x=>x!==lastLabel).sort((a,b)=>collator.compare(a,b));
  if(lastLabel && (items||[]).includes(lastLabel))base.push(lastLabel);
  return base;
}
function crmJobOptions(){return crmSortAz(['Apotheker','Berater','Bodenleger','Dachdecker','Elektriker','Elektromeister','Fensterbauer','Finanzberater','Fliesenleger','Garten- und Landschaftsbauer','Gastronom','Gebäudereiniger','Geschäftsführer','Heilpraktiker','Heizungsbauer','Hotelier','Immobilienmakler','Klima- und Lüftungsbauer','Küchenmonteur','Maler und Lackierer','Optiker','Physiotherapeut','Sanitärinstallateur','Schornsteinfeger','Schreiner','Selbstständig','Tischler','Unternehmer','Versicherungsmakler','Sonstiges'],'Sonstiges')}
function crmBranchOptions(){return crmSortAz(['Beratung','Dienstleistung','Einzelhandel','Finanzen','Gastronomie','Gesundheit','Handwerk','Hausverwaltung','Hotellerie','Immobilien','IT','Marketing','Sonstige Branche'],'Sonstige Branche')}
function crmTargetGroupOptions(){return crmSortAz(['Dachdecker','Elektriker','Finanzberater','Fliesenleger','Gebäudereiniger','Gesundheitsberufe','Heizungsbauer','Immobilienmakler','Kundenempfehlung','Maler','Sanitär','Selbstständige','Tischler','Unternehmer','Versicherungsmakler','Sonstige Zielgruppe'],'Sonstige Zielgruppe')}
function crmSelectedFromOptions(value,items,otherLabel){return items.includes(value||'') ? (value||'') : ((value||'') ? otherLabel : '')}
function crmOtherValue(value,items){return (value && !items.includes(value)) ? value : ''}
function crmSelectWithOther(key,label,items,value,otherLabel){const selected=crmSelectedFromOptions(value,items,otherLabel); const other=crmOtherValue(value,items); return `<label>${label}<select id="crm_${key}Select">${crmHtmlOptions(items,selected)}</select></label><label>${label} frei eintragen<input id="crm_${key}Other" value="${esc(other)}" placeholder="Nur nutzen, wenn nicht in der Liste"></label>`}
function crmToggleLandingDetails(){
  const seen=document.getElementById('crm_landingSeen')?.checked;
  const v1=document.getElementById('crm_video1Seen')?.checked;
  const v2=document.getElementById('crm_video2Seen')?.checked;
  const v3=document.getElementById('crm_video3Seen')?.checked;
  const details=document.getElementById('crm_landingDetails'); if(details)details.style.display=seen?'contents':'none';
  document.querySelectorAll('.crm-step-video2').forEach(el=>el.style.display=(seen&&v1)?'flex':'none');
  document.querySelectorAll('.crm-step-video3').forEach(el=>el.style.display=(seen&&v1&&v2)?'flex':'none');
  document.querySelectorAll('.crm-step-followup').forEach(el=>el.style.display=(seen&&v1&&v2&&v3)?'flex':'none');
}
function crmHtmlOptions(items,selected){return items.map(x=>`<option value="${esc(x)}" ${x===(selected||'')?'selected':''}>${esc(x)}</option>`).join('')}
function crmNormalize(v){return String(v||'').trim().toLowerCase().replace(/\s+/g,' ')}
function crmActive(c){return !['Archiv','Kein Interesse','Kunde','Geschäftspartner'].includes(c.status)}
function crmDuplicateWarning(data,id){
  const name=crmNormalize(`${data.firstName||''} ${data.lastName||''}`);
  const phone=crmNormalize(data.phone);
  const email=crmNormalize(data.email);
  const company=crmNormalize(data.company);
  return crmContacts().find(c=>c.id!==id && ((name && name===crmNormalize(`${c.firstName||''} ${c.lastName||''}`)) || (phone && phone===crmNormalize(c.phone)) || (email && email===crmNormalize(c.email)) || (company && company===crmNormalize(c.company) && name))) || null;
}
function crmCollectForm(id){
  const p='crm_';
  const val=k=>document.getElementById(p+k)?.value?.trim()||'';
  const nextStepSelect=val('nextStepSelect');
  const nextStepOther=val('nextStepOther');
  const rawContactCode=val('contactCode');
  const cleanContactCode=crmCodeNumber(rawContactCode) ? rawContactCode : '';
  return {
    id:id||crmId(), contactCode:cleanContactCode, createdBy:val('createdBy')||currentPerson(), firstName:val('firstName'), lastName:val('lastName'), company:val('company'), job:(val('jobOther')||val('jobSelect')||val('job')), branch:(val('branchOther')||val('branchSelect')||val('branch')), city:val('city'), phone:val('phone'), email:val('email'), website:val('website'), linkedin:val('linkedin'), facebook:val('facebook'), instagram:val('instagram'), whatsapp:document.getElementById('crm_whatsapp')?.checked||false, owner:val('owner')||currentPerson(), support:val('support'), source:val('source'), targetGroup:(val('targetGroupOther')||val('targetGroupSelect')||val('targetGroup')), status:val('status')||'Neu', priority:val('priority')||'A', followDate:val('followDate'), followTime:val('followTime'), nextStep:(nextStepOther||nextStepSelect||val('nextStep')), landingSeen:document.getElementById('crm_landingSeen')?.checked||false, landingDate:(document.getElementById('crm_landingSeen')?.checked?val('landingDate'):''), video1Seen:(document.getElementById('crm_landingSeen')?.checked && (document.getElementById('crm_video1Seen')?.checked||false)), video2Seen:(document.getElementById('crm_landingSeen')?.checked && (document.getElementById('crm_video1Seen')?.checked||false) && (document.getElementById('crm_video2Seen')?.checked||false)), video3Seen:(document.getElementById('crm_landingSeen')?.checked && (document.getElementById('crm_video1Seen')?.checked||false) && (document.getElementById('crm_video2Seen')?.checked||false) && (document.getElementById('crm_video3Seen')?.checked||false)), followupActive:(document.getElementById('crm_landingSeen')?.checked && (document.getElementById('crm_video1Seen')?.checked||false) && (document.getElementById('crm_video2Seen')?.checked||false) && (document.getElementById('crm_video3Seen')?.checked||false) && (document.getElementById('crm_followupActive')?.checked||false)), interest:val('interest')||'3', trust:val('trust')||'3', activityLevel:val('activityLevel')||'3', notes:val('notes')
  }
}
function crmSaveContact(id){
  ensureCrm();
  const data=crmCollectForm(id);
  const dup=crmDuplicateWarning(data,id);
  if(dup && !confirm(`Dieser Kontakt existiert vermutlich bereits: ${crmDisplayName(dup)}. Trotzdem speichern?`))return;
  const now=new Date().toISOString();
  const idx=state.crm.contacts.findIndex(c=>c.id===data.id);
  if(idx>=0){
    const old=state.crm.contacts[idx];
    data.contactCode=old.contactCode||data.contactCode||crmNextContactCode(old.createdBy||data.createdBy||old.owner||data.owner||currentPerson());
    data.createdBy=old.createdBy||data.createdBy||currentPerson();
    data.createdAt=old.createdAt||now; data.updatedAt=now; data.timeline=old.timeline||[]; data.communication=old.communication||[]; data.noteEntries=old.noteEntries||[];
    if(old.status!==data.status)data.timeline.push({date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),type:'Status',text:`Status geändert: ${old.status||'ohne'} → ${data.status}`});
    if(old.owner!==data.owner)data.timeline.push({date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),type:'Zuständigkeit',text:`Zuständigkeit geändert: ${old.owner||'offen'} → ${data.owner}`});
    if(old.priority!==data.priority)data.timeline.push({date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),type:'Priorität',text:`Priorität geändert: ${old.priority||'offen'} → ${data.priority}`});
    if(old.followDate!==data.followDate || old.followTime!==data.followTime || old.nextStep!==data.nextStep)data.timeline.push({date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),type:'Wiedervorlage',text:`Nächster Schritt: ${data.nextStep||'offen'}`});
    if(old.landingSeen!==data.landingSeen || old.video1Seen!==data.video1Seen || old.video2Seen!==data.video2Seen || old.video3Seen!==data.video3Seen || old.followupActive!==data.followupActive)data.timeline.push({date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),type:'Landingpage',text:'Landingpage-Status aktualisiert'});
    state.crm.contacts[idx]=data;
  }else{
    data.contactCode=data.contactCode||crmNextContactCode(data.createdBy||data.owner||currentPerson());
    data.createdBy=data.createdBy||currentPerson();
    data.createdAt=now; data.updatedAt=now; data.communication=[]; data.noteEntries=[]; data.timeline=[{date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),type:'Anlage',text:`Kontakt ${data.contactCode} angelegt`}];
    state.crm.contacts.unshift(data);
  }
  selectedContactId=data.id; selectedContactTab='overview'; crmSave();
}
function crmDeleteContact(id){
  const c=crmFindContact(id); if(!c)return;
  if(!confirm(`Kontakt ${crmFullName(c)} wirklich löschen?`))return;
  state.crm.contacts=crmContacts().filter(x=>x.id!==id); selectedContactId=null; crmSave();
}
function crmAddTimeline(id){
  const c=crmFindContact(id); if(!c)return;
  const text=document.getElementById('crm_timeline_text')?.value.trim();
  const type=document.getElementById('crm_timeline_type')?.value || 'Notiz';
  if(!text)return;
  if(!c.timeline)c.timeline=[];
  c.timeline.push({date:todayKey(),type,text});
  c.updatedAt=new Date().toISOString();
  save(); render();
}
function crmFilteredContacts(){
  ensureCrm();
  const q=crmNormalize(crmFilters.q||'');
  const owner=crmFilters.owner||'Meine';
  const status=crmFilters.status||'';
  const source=crmFilters.source||'';
  const prio=crmFilters.priority||'';
  const job=crmFilters.job||'';
  const branch=crmFilters.branch||'';
  const targetGroup=crmFilters.targetGroup||'';
  return crmContacts().filter(c=>{
    if(owner==='Meine' && !crmPersonFilter(c))return false;
    if(owner==='Peter' && (c.owner||'Peter')!=='Peter')return false;
    if(owner==='Martina' && (c.owner||'Peter')!=='Martina')return false;
    if(status && c.status!==status)return false;
    if(source && c.source!==source)return false;
    if(prio && c.priority!==prio)return false;
    if(job && c.job!==job)return false;
    if(branch && c.branch!==branch)return false;
    if(targetGroup && c.targetGroup!==targetGroup)return false;
    if(q){
      const hay=crmNormalize([c.contactCode,crmFullName(c),c.firstName,c.lastName,c.company,c.job,c.branch,c.city,c.phone,c.email,c.linkedin,c.facebook,c.targetGroup,c.source,c.status].join(' '));
      if(!hay.includes(q))return false;
    }
    return true;
  }).sort((a,b)=> crmSortMode==='az' ? crmCompareContactAz(a,b) : (b.updatedAt||b.createdAt||'').localeCompare(a.updatedAt||a.createdAt||''));
}
function crmCompareContactAz(a,b){
  const collator=new Intl.Collator('de',{sensitivity:'base',numeric:true});
  const an=[crmFullName(a),a.lastName,a.firstName,a.company,a.city,a.contactCode].filter(Boolean).join(' ');
  const bn=[crmFullName(b),b.lastName,b.firstName,b.company,b.city,b.contactCode].filter(Boolean).join(' ');
  return collator.compare(an,bn);
}
function crmShowMyContacts(){
  crmFilters={q:'',owner:'Meine',status:'',source:'',priority:'',job:'',branch:'',targetGroup:''};
  crmSortMode='az';
  selectedContactId=null;
  selectedContactTab='overview';
  render();
  setTimeout(()=>document.getElementById('crmContactsSection')?.scrollIntoView({behavior:'smooth',block:'start'}),60);
}
function crmOpenContact(id){
  crmLastOpenedContactId=id;
  selectedContactId=id;
  selectedContactTab='overview';
  render();
  setTimeout(()=>document.querySelector('.contact-file')?.scrollIntoView({behavior:'smooth',block:'start'}),50);
}
function crmCloseContact(){
  const last=crmLastOpenedContactId;
  selectedContactId=null;
  selectedContactTab='overview';
  render();
  setTimeout(()=>{
    const target=last ? document.querySelector(`[data-contact-id=\"${last}\"]`) : null;
    (target || document.getElementById('crmContactsSection'))?.scrollIntoView({behavior:'smooth',block:'center'});
  },60);
}
function crmFocusForToday(person){
  const day=new Date().getDay();
  const peter=['Nachfassgespräche und offene Wiedervorlagen','Elektriker im Raum Kassel','Heizungsbauer und Sanitärbetriebe','Immobilienmakler und Unternehmer','WhatsApp-Gespräche vertiefen','Wochenabschluss und offene Kontakte','Ruhe, Sichtbarkeit und Planung'];
  const martina=['Kundenpflege und Empfehlungen','Facebook-Kontakte pflegen','WhatsApp-Nachfassungen','Kundenerfahrungen und Status','Empfehlungsfragen stellen','Wochenabschluss und Beziehungspflege','Ruhe, Sichtbarkeit und Planung'];
  return (person==='Martina'?martina:peter)[day];
}
function crmDailyDoneKey(){return `${crmToday()}_${currentPerson()}`}
function crmDailyDone(){ensureCrm(); const k=crmDailyDoneKey(); if(!state.crm.dailyDone[k])state.crm.dailyDone[k]={}; return state.crm.dailyDone[k]}
function crmToggleDailyTask(key){const d=crmDailyDone(); d[key]=!d[key]; save(); render()}
function crmTodayTaskList(person,my,due,open){
  const base=person==='Martina' ? [
    ['focus','Tagesfokus prüfen und Zielgruppe festlegen'],
    ['kontakte','3 passende Kontakte pflegen oder neu ansprechen'],
    ['status','1 WhatsApp-Status oder Facebook-Impuls vorbereiten'],
    ['follow','Offene Wiedervorlagen erledigen'],
    ['notes','Gesprächsnotizen sauber eintragen']
  ] : [
    ['focus','Tagesfokus prüfen und Zielgruppe festlegen'],
    ['research','5 passende Unternehmer oder Selbständige recherchieren'],
    ['requests','3 Kontaktanfragen oder Erstnachrichten senden'],
    ['follow','Offene Wiedervorlagen erledigen'],
    ['notes','Gesprächsnotizen sauber eintragen']
  ];
  if(due.length)base.splice(1,0,['due',`${due.length} fällige Wiedervorlage${due.length===1?'':'n'} bearbeiten`]);
  if(open.length)base.push(['open',`${open.length} Kontakt${open.length===1?'':'e'} ohne nächsten Schritt klären`]);
  return base;
}
function renderRecruiting(s){
  ensureCrm();
  const person=currentPerson();
  const my=crmContacts().filter(crmPersonFilter);
  const dueToday=my.filter(c=>c.followDate && c.followDate<=crmToday() && crmActive(c));
  const open=my.filter(c=>!c.nextStep && crmActive(c));
  const active=my.filter(crmActive);
  const html=`
    ${renderCrmDashboard(person,my,dueToday,open,active)}
    <div id="crmContactsSection" class="card section-card"><h3>Adressdatenbank</h3>${renderCrmToolbar()}${renderCrmContacts()}</div>
    ${selectedContactId ? (selectedContactId==='__new' ? renderCrmForm(null) : renderCrmDetail(selectedContactId)) : renderCrmEmptyState()}
    <div class="card"><h3>Teamübersicht</h3>${renderCrmTeamOverview()}</div>`;
  view.innerHTML=html;
}
function renderCrmDashboard(person,my,dueToday,open,active){
  const done=crmDailyDone();
  const tasks=crmTodayTaskList(person,my,dueToday,open);
  const doneCount=tasks.filter(t=>done[t[0]]).length;
  const percent=tasks.length?Math.round(doneCount/tasks.length*100):0;
  return `<div class="card hero-dashboard">
    <div class="hero-head"><div><p class="eyebrow">Persönliches Dashboard</p><h2>Guten Morgen ${esc(person)}.</h2><p>Heute konzentrieren wir uns auf: <strong>${esc(crmFocusForToday(person))}</strong></p></div><div class="hero-score"><strong>${doneCount}/${tasks.length}</strong><span>Aufgaben erledigt</span></div></div>
    <div class="progress-bar"><div class="progress-fill" style="width:${percent}%"></div></div>
    <div class="task-list">${tasks.map(t=>`<label class="task-item ${done[t[0]]?'done':''}"><input type="checkbox" ${done[t[0]]?'checked':''} onchange="crmToggleDailyTask('${esc(t[0])}')"><span>${esc(t[1])}</span></label>`).join('')}</div>
    <div class="quick-actions"><button class="primary" onclick="selectedContactId='__new'; selectedContactTab='overview'; render(); setTimeout(()=>document.getElementById('crmFormCard')?.scrollIntoView({behavior:'smooth'}),50)">Neuen Kontakt anlegen</button><button class="copy-btn" onclick="crmShowMyContacts()">Meine Kontakte anzeigen</button></div>
  </div>
  <div class="grid dashboard-numbers">
    <div class="card"><h3>Heute fällig</h3><div class="big-number">${dueToday.length}</div><p class="small">Wiedervorlagen bis heute.</p></div>
    <div class="card"><h3>Aktive Kontakte</h3><div class="big-number">${active.length}</div><p class="small">Deine laufenden Kontakte.</p></div>
    <div class="card"><h3>Ohne nächsten Schritt</h3><div class="big-number">${open.length}</div><p class="small">Diese Kontakte brauchen eine klare Aufgabe.</p></div>
  </div>
  ${dueToday.length?`<div class="card"><h3>Heute zuerst erledigen</h3><div class="focus-list">${dueToday.slice(0,8).map(c=>`<button class="focus-contact" onclick="crmOpenContact('${esc(c.id)}')"><strong>${esc(crmFullName(c))}</strong><span>${esc(c.contactCode||'')} · ${esc(c.company||c.job||'')} ${c.city?'· '+esc(c.city):''}</span><small>${esc(c.followDate||'')}${c.followTime?' · '+esc(c.followTime):''} · ${esc(c.nextStep||'Nachfassen')}</small></button>`).join('')}</div></div>`:''}`;
}
function crmSetFilter(key,value){crmFilters[key]=value; render()}
function renderCrmToolbar(){
  return `<div class="crm-toolbar">
    <input id="crmSearch" class="crm-search-wide" type="search" value="${esc(crmFilters.q||'')}" placeholder="Kontakt suchen: ID, Name, Firma, Ort, Telefon, E-Mail, LinkedIn oder Facebook" oninput="crmSetFilter('q',this.value)">
    <select id="crmOwnerFilter" onchange="crmSetFilter('owner',this.value)">${crmHtmlOptions(['Meine','Alle','Peter','Martina'],crmFilters.owner||'Meine')}</select>
    <select id="crmStatusFilter" onchange="crmSetFilter('status',this.value)"><option value="">Alle Status</option>${crmHtmlOptions(crmStatusOptions(),crmFilters.status||'')}</select>
    <select id="crmSourceFilter" onchange="crmSetFilter('source',this.value)"><option value="">Alle Quellen</option>${crmHtmlOptions(crmSources(),crmFilters.source||'')}</select>
    <select id="crmPriorityFilter" onchange="crmSetFilter('priority',this.value)"><option value="">Alle Prioritäten</option>${crmHtmlOptions(crmPriorities(),crmFilters.priority||'')}</select>
    <select id="crmJobFilter" onchange="crmSetFilter('job',this.value)"><option value="">Alle Berufe</option>${crmHtmlOptions(crmJobOptions().filter(x=>x!=='Sonstiges'),crmFilters.job||'')}</select>
    <select id="crmBranchFilter" onchange="crmSetFilter('branch',this.value)"><option value="">Alle Branchen</option>${crmHtmlOptions(crmBranchOptions().filter(x=>x!=='Sonstige Branche'),crmFilters.branch||'')}</select>
    <select id="crmTargetFilter" onchange="crmSetFilter('targetGroup',this.value)"><option value="">Alle Zielgruppen</option>${crmHtmlOptions(crmTargetGroupOptions().filter(x=>!x.startsWith('Sonstige')),crmFilters.targetGroup||'')}</select>
    <button class="primary" onclick="selectedContactId='__new'; selectedContactTab='overview'; render()">Neuer Kontakt</button>
  </div>`;
}
function renderCrmContacts(){
  const list=crmFilteredContacts();
  if(!list.length)return `<p class="small">Noch keine Kontakte in dieser Ansicht.</p>`;
  return `<div class="contact-list">${list.map(c=>`<button data-contact-id="${esc(c.id)}" onclick="crmOpenContact('${esc(c.id)}')" class="contact-card ${selectedContactId===c.id?'active':''}"><div><strong>${esc(crmFullName(c))}</strong><span>${esc(c.contactCode||'')}</span><small>${esc(c.company||c.job||'')} ${c.city?'· '+esc(c.city):''} · ${esc(c.source||'')} · Prio ${esc(c.priority||'A')}</small></div><div><span class="badge">${esc(c.status||'Neu')}</span><small>${esc(c.followDate||'')}</small></div></button>`).join('')}</div>`;
}
function renderCrmEmptyState(){return `<div class="card empty-state"><h3>Kontaktakte</h3><p>Wähle einen Kontakt aus der Liste oder lege einen neuen Kontakt an.</p><button class="primary" onclick="selectedContactId='__new'; render()">Neuen Kontakt anlegen</button></div>`}
function renderCrmForm(c){
  c=c||{owner:currentPerson(),createdBy:currentPerson(),status:'Neu',priority:'A',source:'LinkedIn',interest:'3',trust:'3',activityLevel:'3'};
  const id=c.id||'';
  const input=(k,label,type='text')=>`<label>${label}<input id="crm_${k}" type="${type}" value="${esc(c[k]||'')}"></label>`;
  const nextSelected=crmNextStepOptions().includes(c.nextStep||'') ? (c.nextStep||'') : ((c.nextStep||'') ? 'Sonstiges' : '');
  const nextOther=(c.nextStep && !crmNextStepOptions().includes(c.nextStep)) ? c.nextStep : '';
  const stars=(k,label,val)=>`<label>${label}<select id="crm_${k}">${crmHtmlOptions(['1','2','3','4','5'],String(val||'3'))}</select></label>`;
  return `<div id="crmFormCard" class="card"><h3>${id?'Kontakt bearbeiten':'Neuen Kontakt anlegen'}</h3>
    <div class="crm-form-group"><h4>Kontaktkopf</h4><div class="crm-form">
      <label>Kontakt-ID<input id="crm_contactCode" value="${esc(c.contactCode||'wird beim Speichern vergeben')}" disabled></label>
      <label>Angelegt von<input id="crm_createdBy" value="${esc(c.createdBy||currentPerson())}" disabled></label>
    </div></div>
    <div class="crm-form-group"><h4>Persönliche Daten</h4><div class="crm-form">${input('firstName','Vorname')}${input('lastName','Nachname')}${input('company','Firma')}${crmSelectWithOther('job','Beruf',crmJobOptions(),c.job||'','Sonstiges')}${crmSelectWithOther('branch','Branche',crmBranchOptions(),c.branch||'','Sonstige Branche')}${input('city','Ort')}${input('phone','Mobilnummer','tel')}${input('email','E-Mail','email')}${input('website','Website','url')}</div></div>
    <div class="crm-form-group"><h4>Online-Profile</h4><div class="crm-form">${input('linkedin','LinkedIn-Profil','url')}${input('facebook','Facebook-Profil','url')}${input('instagram','Instagram-Profil','url')}<label class="check-inline"><input id="crm_whatsapp" type="checkbox" ${c.whatsapp?'checked':''}> WhatsApp vorhanden</label></div></div>
    <div class="crm-form-group"><h4>Recruiting</h4><div class="crm-form">
      <label>Zuständig<select id="crm_owner">${crmHtmlOptions(['Peter','Martina'],c.owner||currentPerson())}</select></label>
      <label>Zweiter Ansprechpartner<select id="crm_support"><option value="">Keiner</option>${crmHtmlOptions(['Peter','Martina'],c.support||'')}</select></label>
      <label>Quelle<select id="crm_source">${crmHtmlOptions(crmSources(),c.source||'LinkedIn')}</select></label>
      ${crmSelectWithOther('targetGroup','Zielgruppe',crmTargetGroupOptions(),c.targetGroup||'','Sonstige Zielgruppe')}
      <label>Status<select id="crm_status">${crmHtmlOptions(crmStatusOptions(),c.status||'Neu')}</select></label>
      <label>Priorität<select id="crm_priority">${crmHtmlOptions(crmPriorities(),c.priority||'A')}</select></label>
      <label>Wiedervorlage Datum<input id="crm_followDate" type="date" value="${esc(c.followDate||'')}"></label>
      <label>Wiedervorlage Uhrzeit<input id="crm_followTime" type="time" value="${esc(c.followTime||'')}"></label>
      <label>Nächster Schritt<select id="crm_nextStepSelect">${crmHtmlOptions(['',...crmNextStepOptions()],nextSelected)}</select></label>
      <label>Nächster Schritt frei<input id="crm_nextStepOther" value="${esc(nextOther)}" placeholder="Nur nutzen, wenn nicht in der Liste"></label>
      ${stars('interest','Interesse',c.interest)}${stars('trust','Vertrauen',c.trust)}${stars('activityLevel','Aktivität',c.activityLevel)}
    </div></div>
    <div class="crm-form-group"><h4>Landingpage</h4><div class="crm-form">
      <label class="check-inline"><input id="crm_landingSeen" type="checkbox" ${c.landingSeen?'checked':''} onchange="crmToggleLandingDetails()"> Landingpage gesehen</label>
      <div id="crm_landingDetails" style="display:${c.landingSeen?'contents':'none'}" class="crm-form-nested">
        <label>Datum<input id="crm_landingDate" type="date" value="${esc(c.landingDate||'')}"></label>
        <label class="check-inline"><input id="crm_video1Seen" type="checkbox" ${c.video1Seen?'checked':''} onchange="crmToggleLandingDetails()"> Video 1 gesehen</label>
        <label class="check-inline crm-step-video2" style="display:${c.video1Seen?'flex':'none'}"><input id="crm_video2Seen" type="checkbox" ${c.video2Seen?'checked':''} onchange="crmToggleLandingDetails()"> Video 2 gesehen</label>
        <label class="check-inline crm-step-video3" style="display:${c.video2Seen?'flex':'none'}"><input id="crm_video3Seen" type="checkbox" ${c.video3Seen?'checked':''} onchange="crmToggleLandingDetails()"> Video 3 gesehen</label>
        <label class="check-inline crm-step-followup" style="display:${c.video3Seen?'flex':'none'}"><input id="crm_followupActive" type="checkbox" ${c.followupActive?'checked':''}> Follow-up-System aktiviert</label>
      </div>
    </div></div>
    <div class="crm-form-group"><h4>Notizen</h4><label>Notizen<textarea id="crm_notes">${esc(c.notes||'')}</textarea></label></div>
    <button class="primary" onclick="crmSaveContact('${esc(id)}')">Speichern</button>
    ${id?`<button class="copy-btn" onclick="crmDeleteContact('${esc(id)}')">Kontakt löschen</button>`:''}
    <button class="copy-btn" onclick="selectedContactId=null; render()">Abbrechen</button>
  </div>`;
}
function crmTabButton(key,label){return `<button class="tab-btn ${selectedContactTab===key?'active':''}" onclick="selectedContactTab='${key}'; render()">${label}</button>`}
function crmTabButton(key,label){return `<button class="tab-btn ${selectedContactTab===key?'active':''}" onclick="selectedContactTab='${key}'; render()">${label}</button>`}
function crmProgress(c){
  return [
    ['Kontakt',true],['Vernetzt',['Vernetzt','Erstgespräch','Interesse','Präsentation geplant','Präsentation erfolgt','Nachfassen','Kunde','Geschäftspartner'].includes(c.status)],['Gespräch',['Erstgespräch','Interesse','Präsentation geplant','Präsentation erfolgt','Nachfassen','Kunde','Geschäftspartner'].includes(c.status)],['Landingpage',!!c.landingSeen],['Video 1',!!c.video1Seen],['Video 2',!!c.video2Seen],['Video 3',!!c.video3Seen],['Follow-up',!!c.followupActive],['Präsentation',['Präsentation geplant','Präsentation erfolgt','Kunde','Geschäftspartner'].includes(c.status)],['Geschäftspartner',c.status==='Geschäftspartner']
  ];
}
function renderCrmProgress(c){return `<div class="crm-progress-steps">${crmProgress(c).map(([label,done])=>`<span class="crm-step ${done?'done':''}">${esc(label)}</span>`).join('')}</div>`}
function renderCrmDetail(id){
  const c=crmFindContact(id); if(!c)return renderCrmForm(null);
  return `<div class="card contact-file"><div class="contact-file-actions"><button class="copy-btn" onclick="crmCloseContact()">◀ Zur Kontaktübersicht</button><div><button class="copy-btn" onclick="selectedContactTab='edit'; render()">Bearbeiten</button><button class="copy-btn danger" onclick="crmDeleteContact('${esc(c.id)}')">Löschen</button></div></div><div class="contact-sticky-head"><div><p class="eyebrow">Kontaktakte</p><h3>${esc(crmFullName(c))}</h3><p class="contact-code-line">${esc(c.contactCode||'')}</p><p>${esc(c.company||'')} ${c.city?'· '+esc(c.city):''}</p></div><div class="contact-head-meta"><span class="badge">Prio ${esc(c.priority||'A')}</span><span class="badge">${esc(c.status||'Neu')}</span><p class="small">Zuständig: ${esc(c.owner||'Peter')}${c.support?' · Unterstützung: '+esc(c.support):''}</p><p class="small"><strong>Nächster Schritt:</strong> ${esc(c.nextStep||'offen')}</p><p class="small"><strong>Wiedervorlage:</strong> ${esc(c.followDate||'offen')} ${esc(c.followTime||'')}</p></div></div>
    ${renderCrmProgress(c)}
    <div class="tabs">${crmTabButton('overview','Übersicht')}${crmTabButton('communication','Kommunikation')}${crmTabButton('tasks','Aufgaben')}${crmTabButton('timeline','Zeitachse')}${crmTabButton('notes','Notizen')}${crmTabButton('documents','Dokumente')}${crmTabButton('edit','Bearbeiten')}</div>
    ${renderCrmTabContent(c)}
    <div class="quick-actions contact-close-bottom"><button class="primary" onclick="crmCloseContact()">Kontakt schließen</button></div>
  </div>`;
}
function renderCrmTabContent(c){
  if(selectedContactTab==='edit')return renderCrmForm(c);
  if(selectedContactTab==='timeline')return renderCrmTimeline(c);
  if(selectedContactTab==='tasks')return renderCrmTasksTab(c);
  if(selectedContactTab==='communication')return renderCrmCommunication(c);
  if(selectedContactTab==='notes')return renderCrmNotes(c);
  if(selectedContactTab==='documents')return `<div class="tab-content"><h4>Dokumente</h4><p class="small">Dieser Bereich ist vorbereitet. Dokumente, Angebote, Bilder und PDFs folgen in einer späteren Version.</p></div>`;
  return `<div class="tab-content"><div class="grid"><div><h4>Persönliche Daten</h4><p><strong>Kontakt-ID:</strong> ${esc(c.contactCode||'')}</p><p><strong>Angelegt von:</strong> ${esc(c.createdBy||'')}</p><p><strong>Firma:</strong> ${esc(c.company||'')}</p><p><strong>Beruf:</strong> ${esc(c.job||'')}</p><p><strong>Branche:</strong> ${esc(c.branch||'')}</p><p><strong>Ort:</strong> ${esc(c.city||'')}</p></div><div><h4>Nächster Schritt</h4><p><strong>Wiedervorlage:</strong> ${esc(c.followDate||'offen')} ${esc(c.followTime||'')}</p><p><strong>Aufgabe:</strong> ${esc(c.nextStep||'Noch kein nächster Schritt eingetragen.')}</p><p><strong>Quelle:</strong> ${esc(c.source||'')}</p><p><strong>Priorität:</strong> ${esc(c.priority||'A')}</p><p><strong>Bewertung:</strong> Interesse ${esc(c.interest||'3')}/5 · Vertrauen ${esc(c.trust||'3')}/5 · Aktivität ${esc(c.activityLevel||'3')}/5</p></div><div><h4>Landingpage</h4><p><strong>Gesehen:</strong> ${c.landingSeen?'Ja':'Nein'} ${c.landingDate?'am '+esc(c.landingDate):''}</p>${c.landingSeen?`<p><strong>Video 1:</strong> ${c.video1Seen?'Ja':'Nein'}</p>${c.video1Seen?`<p><strong>Video 2:</strong> ${c.video2Seen?'Ja':'Nein'}</p>`:''}${c.video2Seen?`<p><strong>Video 3:</strong> ${c.video3Seen?'Ja':'Nein'}</p>`:''}${c.video3Seen?`<p><strong>Follow-up aktiv:</strong> ${c.followupActive?'Ja':'Nein'}</p>`:''}`:''}</div></div><div class="quick-actions"><button class="primary" onclick="selectedContactTab='edit'; render()">Bearbeiten</button><button class="copy-btn" onclick="selectedContactTab='communication'; render()">Kommunikation eintragen</button><button class="copy-btn" onclick="selectedContactTab='timeline'; render()">Zeitachse öffnen</button></div></div>`;
}
function crmAddTimeline(id){
  const c=crmFindContact(id); if(!c)return;
  const text=document.getElementById('crm_timeline_text')?.value.trim();
  const type=document.getElementById('crm_timeline_type')?.value || 'Notiz';
  if(!text)return;
  if(!c.timeline)c.timeline=[];
  c.timeline.push({date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),type,text});
  c.updatedAt=new Date().toISOString();
  save(); render();
}
function renderCrmTimeline(c){
  const timeline=(c.timeline||[]).slice().reverse();
  return `<div class="tab-content"><h4>Zeitachse</h4><div class="crm-toolbar"><select id="crm_timeline_type"><option>Notiz</option><option>Anruf</option><option>WhatsApp</option><option>LinkedIn</option><option>Facebook</option><option>Termin</option><option>Präsentation</option><option>Landingpage</option></select><input id="crm_timeline_text" placeholder="Aktivität oder Gesprächsnotiz"><button class="primary" onclick="crmAddTimeline('${esc(c.id)}')">Eintragen</button></div>${timeline.length?timeline.map(t=>`<div class="timeline-item"><strong>${esc(t.date||'')}${t.time?' · '+esc(t.time):''}</strong> <span class="badge">${esc(t.type||'Notiz')}</span><br>${esc(t.text||'')}</div>`).join(''):'<p class="small">Noch keine Aktivitäten.</p>'}</div>`;
}
function crmAddCommunication(id){
  const c=crmFindContact(id); if(!c)return;
  const channel=document.getElementById('crm_comm_channel')?.value||'WhatsApp';
  const text=document.getElementById('crm_comm_text')?.value.trim();
  if(!text)return;
  const entry={date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),channel,text};
  if(!Array.isArray(c.communication))c.communication=[];
  c.communication.push(entry);
  if(!Array.isArray(c.timeline))c.timeline=[];
  c.timeline.push({date:entry.date,time:entry.time,type:channel,text});
  c.updatedAt=new Date().toISOString();
  save(); render();
}
function crmAddContactTask(id){
  const c=crmFindContact(id); if(!c)return;
  const title=document.getElementById('crm_task_title')?.value.trim();
  const due=document.getElementById('crm_task_date')?.value||'';
  const time=document.getElementById('crm_task_time')?.value||'';
  const priority=document.getElementById('crm_task_priority')?.value||'A';
  if(!title)return;
  state.crm.tasks.push({id:crmId(),contactId:id,title,due,time,priority,done:false,owner:c.owner||currentPerson(),createdAt:new Date().toISOString()});
  if(!Array.isArray(c.timeline))c.timeline=[];
  c.timeline.push({date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),type:'Aufgabe',text:`Aufgabe angelegt: ${title}`});
  save(); render();
}
function crmToggleTask(taskId){const t=crmTasks().find(x=>x.id===taskId); if(t){t.done=!t.done; save(); render()}}
function renderCrmTasksTab(c){
  const tasks=crmTasks().filter(t=>t.contactId===c.id).sort((a,b)=>(a.done-b.done)||String(a.due||'').localeCompare(String(b.due||'')));
  return `<div class="tab-content"><h4>Aufgaben</h4><div class="crm-toolbar"><input id="crm_task_title" placeholder="Aufgabe, z. B. Rückruf"><input id="crm_task_date" type="date"><input id="crm_task_time" type="time"><select id="crm_task_priority">${crmHtmlOptions(crmPriorities(),'A')}</select><button class="primary" onclick="crmAddContactTask('${esc(c.id)}')">Aufgabe hinzufügen</button></div><p><strong>Nächster Schritt:</strong> ${esc(c.nextStep||'Noch offen')}</p><p><strong>Wiedervorlage:</strong> ${esc(c.followDate||'kein Datum')} ${esc(c.followTime||'')}</p>${tasks.length?tasks.map(t=>`<label class="task-item ${t.done?'done':''}"><input type="checkbox" ${t.done?'checked':''} onchange="crmToggleTask('${esc(t.id)}')"><span>${esc(t.due||'ohne Datum')} ${t.time?'· '+esc(t.time):''} · Prio ${esc(t.priority||'A')} · ${esc(t.title||'')}</span></label>`).join(''):'<p class="small">Noch keine kontaktbezogenen Aufgaben.</p>'}</div>`
}
function renderCrmCommunication(c){
  const comm=(c.communication||[]).slice().reverse();
  return `<div class="tab-content"><h4>Kommunikation</h4><div class="link-grid">${c.phone?`<a class="link-card" href="tel:${esc(c.phone)}">Anrufen</a>`:''}${c.email?`<a class="link-card" href="mailto:${esc(c.email)}">E-Mail schreiben</a>`:''}${c.linkedin?`<a class="link-card" target="_blank" href="${esc(c.linkedin)}">LinkedIn öffnen</a>`:''}${c.facebook?`<a class="link-card" target="_blank" href="${esc(c.facebook)}">Facebook öffnen</a>`:''}${c.website?`<a class="link-card" target="_blank" href="${esc(c.website)}">Website öffnen</a>`:''}</div><div class="crm-toolbar"><select id="crm_comm_channel">${crmHtmlOptions(crmChannelOptions(),'WhatsApp')}</select><input id="crm_comm_text" placeholder="Kurze Gesprächsnotiz"><button class="primary" onclick="crmAddCommunication('${esc(c.id)}')">Eintragen</button></div>${comm.length?comm.map(e=>`<div class="timeline-item"><strong>${esc(e.date||'')}${e.time?' · '+esc(e.time):''}</strong> <span class="badge">${esc(e.channel||'')}</span><br>${esc(e.text||'')}</div>`).join(''):'<p class="small">Noch keine Kommunikation dokumentiert.</p>'}</div>`
}
function crmAddNote(id){
  const c=crmFindContact(id); if(!c)return;
  const text=document.getElementById('crm_note_new')?.value.trim();
  if(!text)return;
  if(!Array.isArray(c.noteEntries))c.noteEntries=[];
  c.noteEntries.push({date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),text});
  if(!Array.isArray(c.timeline))c.timeline=[];
  c.timeline.push({date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),type:'Notiz',text});
  c.updatedAt=new Date().toISOString();
  save(); render();
}
function renderCrmNotes(c){
  const notes=(c.noteEntries||[]).slice().reverse();
  return `<div class="tab-content"><h4>Notizen</h4><div class="crm-toolbar"><input id="crm_note_new" placeholder="Neue Notiz"><button class="primary" onclick="crmAddNote('${esc(c.id)}')">Notiz hinzufügen</button></div>${c.notes?`<p class="note-box">${esc(c.notes)}</p>`:''}${notes.length?notes.map(n=>`<div class="timeline-item"><strong>${esc(n.date||'')}${n.time?' · '+esc(n.time):''}</strong><br>${esc(n.text||'')}</div>`).join(''):'<p class="small">Noch keine datierten Notizen vorhanden.</p>'}<button class="copy-btn" onclick="selectedContactTab='edit'; render()">Notizen bearbeiten</button></div>`;
}
function renderCrmTeamOverview(){
  const people=['Peter','Martina'];
  return `<div class="grid">${people.map(p=>{const list=crmContacts().filter(c=>(c.owner||'Peter')===p); const due=list.filter(c=>c.followDate&&c.followDate<=crmToday()&&crmActive(c)).length; return `<div><h4>${p}</h4><p>Kontakte: ${list.length}</p><p>Heute fällig: ${due}</p><p>Aktiv: ${list.filter(crmActive).length}</p></div>`}).join('')}</div>`;
}

function renderSearch(q){
  selectedChapterIndex=null; let hits=[];
  window.APP_CONTENT.sections.forEach(s=>{(s.chapters||[]).forEach((c,idx)=>{if(JSON.stringify(c).toLowerCase().includes(q)||s.title.toLowerCase().includes(q))hits.push({section:s,chapter:c,idx})})});
  let html=`<div class="card"><h2>Suche</h2><p>${hits.length} Treffer für „${esc(q)}“</p></div>`;
  hits.slice(0,150).forEach(h=>{html+=`<div class="card"><h3>${esc(h.section.title)}: ${esc(h.chapter.title)}</h3><button class="copy-btn" onclick="current='${h.section.id}'; searchInput.value=''; selectedChapterIndex=${h.idx}; render(); scrollToContent();">Eintrag öffnen</button></div>`});
  view.innerHTML=html;
}

function showLogin(){
  document.getElementById('loginScreen')?.classList.remove('hidden');
  document.getElementById('appLayout')?.classList.add('hidden');
  document.getElementById('appFooter')?.classList.add('hidden');
  document.getElementById('logoutBtn')?.classList.add('hidden');
  document.getElementById('resetBtn')?.classList.add('hidden');
  const u=document.getElementById('userInfo'); if(u){u.textContent=''; u.classList.add('hidden')}
  setSyncStatus(cloudError ? 'Firebase-Fehler' : 'Nicht angemeldet');
}
function showApp(){
  document.getElementById('loginScreen')?.classList.add('hidden');
  document.getElementById('appLayout')?.classList.remove('hidden');
  document.getElementById('appFooter')?.classList.remove('hidden');
  document.getElementById('logoutBtn')?.classList.remove('hidden');
  document.getElementById('resetBtn')?.classList.remove('hidden');
  const u=document.getElementById('userInfo'); if(u){u.textContent=currentUser?.email || ''; u.classList.remove('hidden')}
}
async function login(){
  const email=document.getElementById('loginEmail')?.value.trim();
  const password=document.getElementById('loginPassword')?.value;
  const err=document.getElementById('loginError'); if(err)err.textContent='';
  if(!email || !password){if(err)err.textContent='Bitte E-Mail und Passwort eingeben.'; return;}
  try{await auth.signInWithEmailAndPassword(email,password)}catch(e){if(err)err.textContent='Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.'; console.error(e)}
}
function subscribeCloudState(){
  if(unsubscribeAppState)unsubscribeAppState();
  setSyncStatus('Lädt ...');
  unsubscribeAppState=db.collection('app').doc('sharedState').onSnapshot(async snap=>{
    applyingRemote=true;
    if(snap.exists){
      const data=snap.data()||{};
      state=data.state || state || {};
      activity=data.activity || activity || {};
      sales=data.sales || sales || {};
      mediaStatus=data.mediaStatus || mediaStatus || {};
      if(!state.checks)state.checks={};
      if(!state.kpis)state.kpis={};
      if(!state.crm)state.crm={contacts:[],tasks:[]};
      if(!state.crm.contacts)state.crm.contacts=[];
      if(!state.crm.tasks)state.crm.tasks=[];
      localStorage.setItem(stateKey,JSON.stringify(state));
      localStorage.setItem(activityKey,JSON.stringify(activity));
      localStorage.setItem(salesKey,JSON.stringify(sales));
      localStorage.setItem('kuecken_media_status_v18',JSON.stringify(mediaStatus));
    }else{
      await db.collection('app').doc('sharedState').set({state,activity,sales,mediaStatus,createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:currentUser.email||currentUser.uid},{merge:true});
    }
    applyingRemote=false;
    cloudReady=true;
    setSyncStatus('Synchronisiert');
    ensureActivityDate(todayKey()); ensureSalesDate(todayKey()); render();
  },err=>{
    applyingRemote=false;
    setSyncStatus('Sync-Fehler');
    console.error(err);
  });
}

document.getElementById('resetBtn').onclick=()=>{selectedDate=todayKey(); selectedSalesDate=todayKey(); render()}
document.getElementById('loginBtn')?.addEventListener('click',login);
document.getElementById('loginPassword')?.addEventListener('keydown',e=>{if(e.key==='Enter')login()});
document.getElementById('logoutBtn')?.addEventListener('click',()=>auth.signOut());
searchInput.addEventListener('input',()=>{selectedChapterIndex=null; render()});

if(auth && db){
  auth.onAuthStateChanged(user=>{
    currentUser=user;
    cloudReady=false;
    if(user){showApp(); subscribeCloudState();}
    else{
      if(unsubscribeAppState)unsubscribeAppState();
      unsubscribeAppState=null;
      showLogin();
    }
  });
}else{
  showLogin();
  const err=document.getElementById('loginError');
  if(err)err.textContent='Firebase konnte nicht geladen werden. Bitte Internetverbindung prüfen.';
}

