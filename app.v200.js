

const firebaseConfig = {
  apiKey: "AIzaSyCC6oG4f-GGqFoG785z_ePREt86Sugptd4",
  authDomain: "kuecken-cockpit.firebaseapp.com",
  projectId: "kuecken-cockpit",
  storageBucket: "kuecken-cockpit.firebasestorage.app",
  messagingSenderId: "523160644442",
  appId: "1:523160644442:web:ff840ac629a9f62ebae163"
};

const APP_VERSION='2.0.0';
const LANDINGPAGE_URL='https://www.ichmachdicherfolgreich.de';
const APP_BUILD='10.07.2026';
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
let crmFilters={q:'',owner:'Meine',status:'',source:'',priority:'',job:'',branch:'',targetGroup:'',tag:''};
let crmSortMode='updated';
let knowledgeQuery='';
let knowledgeCategory='Alle';
let dashboardListFilter='today';
let salesDashboardPeriod='today';
let salesDashboardMetric='newContacts';
let salesFunnelSelectedPhase='Erstansprache';

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

const yearPlanStart=new Date(2026,7,1); // Samstag, 01.08.2026
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
    groupBtn.onclick=()=>g.directTarget ? go(g.directTarget) : toggleNavGroup(g.label);
    nav.appendChild(groupBtn);
    if(isOpen && !g.directTarget){
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
  if(s.type==='daily_overview')return renderDailyOverview(s);
  if(s.type==='tasks')return renderTasks(s);
  if(s.type==='dashboard')return renderDashboard(s);
  if(s.type==='links')return renderLinks(s);
  if(s.type==='sales_cockpit')return renderSalesCockpit(s);
  if(s.type==='settings')return renderSettings(s);
  if(s.type==='impressum')return renderImpressum(s);
  if(s.type==='recruiting')return renderRecruiting(s);
  if(s.type==='assistant')return renderAssistantPage(s);
  if(s.type==='knowledge')return renderKnowledge(s);
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
function crmDashboardContacts(){
  ensureCrm();
  return crmContacts().filter(c=>crmPersonFilter(c) && crmActive(c));
}
function crmIsAppointment(c){
  return /termin|zoom|präsentation|praesentation|persönlich treffen|persoenlich treffen/i.test(`${c.nextStep||''} ${c.status||''}`);
}
function crmIsFollowup(c){
  return /nachfass|follow.?up|wiedervorlage|prüfen|pruefen|beobachten|nachfragen/i.test(`${c.nextStep||''} ${c.status||''}`);
}

function crmSmartPriority(c){
  if(!c || !crmActive(c))return {level:'green',rank:3,label:'Kein aktueller Handlungsbedarf',reason:'Kontakt ist aktuell im Plan.'};
  const today=crmToday();
  const next2=crmDateAddKey(2);
  const phase=crmEnsurePhase(c);
  const follow=String(c.followDate||'');
  const isToday=follow===today;
  const overdue=follow && follow<today;
  const text=`${c.nextStep||''} ${phase}`;
  if(overdue)return {level:'red',rank:0,label:'Heute bearbeiten',reason:`Wiedervorlage seit ${formatDate(follow)} überfällig.`};
  if(isToday && crmIsAppointment(c))return {level:'red',rank:0,label:'Heute bearbeiten',reason:'Termin oder Präsentation ist heute fällig.'};
  if(isToday && crmIsFollowup(c))return {level:'red',rank:0,label:'Heute bearbeiten',reason:'Nachfassen ist heute vorgesehen.'};
  if(isToday)return {level:'red',rank:0,label:'Heute bearbeiten',reason:'Wiedervorlage ist heute fällig.'};
  if(phase==='Entscheidung' && (!follow || follow<=next2))return {level:'red',rank:0,label:'Heute bearbeiten',reason:'Entscheidung ist offen.'};
  if(follow && follow>today && follow<=next2)return {level:'orange',rank:1,label:'Bald bearbeiten',reason:`Wiedervorlage am ${formatDate(follow)}.`};
  const alert=crmAssistantAlert(c);
  if(alert?.type==='missing')return {level:'orange',rank:1,label:'Bald bearbeiten',reason:'Keine Wiedervorlage festgelegt.'};
  if(alert?.type==='stalled')return {level:'orange',rank:1,label:'Bald bearbeiten',reason:alert.text};
  return {level:'green',rank:2,label:'Kein aktueller Handlungsbedarf',reason:follow?`Nächste Wiedervorlage am ${formatDate(follow)}.`:'Aktuell kein dringender Schritt.'};
}
function crmSmartPriorityCounts(list){
  return list.reduce((acc,c)=>{const p=crmSmartPriority(c); acc[p.level]=(acc[p.level]||0)+1; return acc;},{red:0,orange:0,green:0});
}
function crmDailyRecommendation(list){
  const red=list.filter(c=>crmSmartPriority(c).level==='red');
  const orange=list.filter(c=>crmSmartPriority(c).level==='orange');
  const overdue=red.filter(c=>c.followDate && c.followDate<crmToday()).length;
  const followups=red.filter(c=>c.followDate===crmToday() && crmIsFollowup(c)).length;
  const appointments=red.filter(c=>c.followDate===crmToday() && crmIsAppointment(c)).length;
  if(red.length){
    const parts=[];
    if(overdue)parts.push(`${overdue} überfällige${overdue===1?'n Kontakt':' Kontakte'}`);
    if(followups)parts.push(`${followups} Nachfass${followups===1?'kontakt':'kontakte'}`);
    if(appointments)parts.push(`${appointments} Termin${appointments===1?'':'e'}`);
    return `Heute solltest du zuerst ${parts.length?parts.join(', '):`${red.length} priorisierte Kontakte`} bearbeiten.`;
  }
  if(orange.length)return `Heute gibt es nichts Dringendes. Plane als Nächstes ${orange.length} bald fällige${orange.length===1?'n Kontakt':' Kontakte'} ein.`;
  return 'Heute gibt es keinen dringenden Handlungsbedarf. Deine Kontakte sind im Plan.';
}

function crmDashboardBuckets(){
  const today=crmToday();
  const all=crmDashboardContacts();
  const byDue=(a,b)=>crmSmartPriority(a).rank-crmSmartPriority(b).rank || String(a.followTime||'99:99').localeCompare(String(b.followTime||'99:99')) || String(a.priority||'C').localeCompare(String(b.priority||'C')) || crmFullName(a).localeCompare(crmFullName(b),'de');
  return {
    today:all.filter(c=>c.followDate===today).sort(byDue),
    overdue:all.filter(c=>c.followDate && c.followDate<today).sort((a,b)=>String(a.followDate).localeCompare(String(b.followDate)) || byDue(a,b)),
    appointments:all.filter(c=>c.followDate===today && crmIsAppointment(c)).sort(byDue),
    followups:all.filter(c=>c.followDate===today && crmIsFollowup(c)).sort(byDue)
  };
}
function dashboardLongDate(){
  return new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(new Date());
}
function dashboardCompletedToday(){
  const today=crmToday();
  const person=currentPerson();
  let count=0;
  crmContacts().filter(c=>((c.owner||'Peter')===person || (c.support||'')===person)).forEach(c=>{
    count+=(c.timeline||[]).filter(e=>e.date===today && /^Erledigt:/i.test(String(e.text||''))).length;
  });
  count+=crmTasks().filter(t=>t.done && t.doneAt===today && (!t.owner || t.owner===person || (t.contactId && crmPersonFilter(crmFindContact(t.contactId)||{})))).length;
  return count;
}
function dashboardProgressData(buckets){
  const remaining=buckets.today.length+buckets.overdue.length;
  const completed=dashboardCompletedToday();
  const total=remaining+completed;
  return {remaining,completed,total,percent:total?Math.round(completed/total*100):100};
}
function dashboardSetList(filter){dashboardListFilter=filter; render(); setTimeout(()=>document.getElementById('dashboardWorkList')?.scrollIntoView({behavior:'smooth',block:'start'}),40)}
function dashboardListTitle(filter){return ({today:'Heute fällige Kontakte',overdue:'Überfällige Kontakte',appointments:'Heutige Termine',followups:'Wiedervorlagen für heute'})[filter]||'Heute fällige Kontakte'}
function renderDashboardContactList(list,filter){
  const title=dashboardListTitle(filter);
  return `<div id="dashboardWorkList" class="card dashboard-work-list"><div class="section-title-row"><div><p class="eyebrow">Arbeitsliste</p><h3>${esc(title)} (${list.length})</h3></div><button class="copy-btn" onclick="current='recruiting'; render(); setTimeout(()=>document.getElementById('crmContactsSection')?.scrollIntoView({behavior:'smooth'}),50)">Alle Kontakte</button></div>${list.length?`<div class="dashboard-contact-list">${list.map(c=>`<div class="dashboard-contact-row"><button class="dashboard-contact-main" onclick="crmOpenContact('${esc(c.id)}')"><strong>${esc(crmFullName(c))}</strong><span>${esc(c.contactCode||'')} · ${esc(c.company||c.job||'')} ${c.city?'· '+esc(c.city):''}</span><small><span class="smart-priority smart-priority-${crmSmartPriority(c).level}">${esc(crmSmartPriority(c).label)}</span> ${esc(crmSmartPriority(c).reason)}<br>${c.followDate?esc(formatDate(c.followDate))+' · ':''}${esc(c.nextStep||'Nächsten Schritt festlegen')} · Priorität ${esc(c.priority||'A')}</small></button><button class="copy-btn" onclick="crmCompleteProcessItem('follow','${esc(c.id)}')">✓ Erledigt</button></div>`).join('')}</div>`:`<p class="ok-text">In diesem Bereich ist aktuell nichts offen.</p>`}</div>`;
}
function renderDailyOverview(s){
  const b=crmDashboardBuckets();
  const person=currentPerson();
  const selected=b[dashboardListFilter]||b.today;
  const progress=dashboardProgressData(b);
  view.innerHTML=`
    <div class="card dashboard-intro"><p class="eyebrow">Tagesübersicht · ${esc(dashboardLongDate())}</p><h2>${crmGreeting(person)}</h2><p>Du siehst hier nur Kontakte und Termine, die jetzt bearbeitet werden müssen. Ein Klick öffnet die passende Arbeitsliste.</p></div>
    <div class="card smart-daily-recommendation"><p class="eyebrow">Tagesempfehlung</p><h3>${esc(crmDailyRecommendation(crmDashboardContacts()))}</h3><div class="smart-priority-summary">${(()=>{const x=crmSmartPriorityCounts(crmDashboardContacts());return `<span class="smart-priority smart-priority-red">${x.red} heute</span><span class="smart-priority smart-priority-orange">${x.orange} bald</span><span class="smart-priority smart-priority-green">${x.green} im Plan</span>`})()}</div></div>
    ${b.overdue.length?`<button class="dashboard-alert" onclick="dashboardSetList('overdue')"><strong>${b.overdue.length} überfällige${b.overdue.length===1?'r Kontakt':' Kontakte'}</strong><span>Bitte zuerst bearbeiten. Ein Klick öffnet die Arbeitsliste.</span></button>`:''}
    <div class="card dashboard-progress-card">
      <div class="dashboard-progress-head"><div><p class="eyebrow">Tagesziel</p><h3>Alle heute fälligen und überfälligen Kontakte bearbeiten</h3></div><strong>${progress.percent}%</strong></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${progress.percent}%"></div></div>
      <div class="dashboard-progress-meta"><span>${progress.completed} erledigt</span><span>${progress.remaining} offen</span><span>${progress.total} Aufgaben heute</span></div>
    </div>
    <div class="dashboard-summary-grid">
      <button class="dashboard-summary-card ${dashboardListFilter==='today'?'active':''}" onclick="dashboardSetList('today')"><span>Heute fällige Kontakte</span><strong>${b.today.length}</strong><small>Alle Kontakte mit heutiger Fälligkeit</small></button>
      <button class="dashboard-summary-card ${dashboardListFilter==='overdue'?'active':''}" onclick="dashboardSetList('overdue')"><span>Überfällige Kontakte</span><strong>${b.overdue.length}</strong><small>Fälligkeit liegt vor dem heutigen Tag</small></button>
      <button class="dashboard-summary-card ${dashboardListFilter==='appointments'?'active':''}" onclick="dashboardSetList('appointments')"><span>Heutige Termine</span><strong>${b.appointments.length}</strong><small>Termine, Zooms und Präsentationen</small></button>
      <button class="dashboard-summary-card ${dashboardListFilter==='followups'?'active':''}" onclick="dashboardSetList('followups')"><span>Wiedervorlagen für heute</span><strong>${b.followups.length}</strong><small>Nachfassungen und offene Prüfungen</small></button>
    </div>
    ${renderDashboardContactList(selected,dashboardListFilter)}
  `;
}
function renderTasks(s){
  ensureCrm();
  const person=currentPerson();
  const items=crmProcessItems(person);
  const overdue=crmProcessBucket(items,'overdue');
  const today=crmProcessBucket(items,'today');
  const week=crmProcessBucket(items,'week');
  view.innerHTML=`
    <div class="card"><p class="eyebrow">Aufgaben</p><h2>${esc(s.title)}</h2><p>Alle Aufgaben stammen aus der Kontaktverwaltung. Du pflegst Fälligkeit, Priorität und nächsten Schritt nur einmal beim Kontakt.</p></div>
    <div class="grid process-grid">
      ${crmRenderProcessList('Überfällig',overdue,'Keine überfälligen Aufgaben.','danger-zone')}
      ${crmRenderProcessList('Heute',today,'Heute ist nichts offen.')}
      ${crmRenderProcessList('Diese Woche',week,'Für diese Woche sind keine weiteren Aufgaben geplant.')}
    </div>
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
function salesDashboardRange(period){
  const now=new Date(); now.setHours(0,0,0,0);
  const key=d=>{const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`};
  if(period==='total')return {start:'',end:'',label:'Gesamtbestand',total:true};
  if(period==='today')return {start:key(now),end:key(now),label:'Heute'};
  if(period==='week'){
    const start=new Date(now); const weekday=(start.getDay()+6)%7; start.setDate(start.getDate()-weekday);
    const end=new Date(start); end.setDate(end.getDate()+6);
    return {start:key(start),end:key(end),label:'Diese Woche'};
  }
  const start=new Date(now.getFullYear(),now.getMonth(),1);
  const end=new Date(now.getFullYear(),now.getMonth()+1,0);
  return {start:key(start),end:key(end),label:'Dieser Monat'};
}
function salesDateInRange(date,range){
  if(range?.total)return true;
  const d=String(date||'').slice(0,10);
  return !!d && d>=range.start && d<=range.end;
}
function salesTimelineMatches(c,range,patterns,types=[]){
  return (c.timeline||[]).some(t=>salesDateInRange(t.date,range) && (patterns.some(p=>p.test(String(t.text||''))) || types.some(x=>String(t.type||'').toLowerCase()===x.toLowerCase())));
}
function salesMetricContacts(metric,period){
  const range=salesDashboardRange(period);
  const all=crmDashboardContacts();
  return all.filter(c=>{
    const created=String(c.createdAt||'').slice(0,10);
    const updated=String(c.updatedAt||'').slice(0,10);
    if(metric==='newContacts')return salesDateInRange(created,range);
    if(metric==='firstTalks')return salesTimelineMatches(c,range,[/→\s*Erstgespräch/i,/Erstgespräch/i],["Anruf","Telefon"]);
    if(metric==='infoSent')return salesDateInRange(c.landingSentDate,range) || salesTimelineMatches(c,range,[/Landingpage.*gesendet/i,/Information.*versendet/i,/Link.*gesendet/i],["Landingpage"]);
    if(metric==='appointments')return salesTimelineMatches(c,range,[/→\s*Präsentation geplant/i,/Termin vereinbart/i,/Termin geplant/i],["Termin"]);
    if(metric==='presentations')return salesTimelineMatches(c,range,[/→\s*Präsentation erfolgt/i,/Präsentation durchgeführt/i,/Präsentation erfolgt/i],["Präsentation"]);
    if(metric==='customers')return salesTimelineMatches(c,range,[/→\s*Kunde/i,/Status geändert:.*Kunde/i]) || false;
    if(metric==='partners')return salesTimelineMatches(c,range,[/→\s*Geschäftspartner/i,/Status geändert:.*Geschäftspartner/i]) || (crmEnsurePhase(c)==='Geschäftspartner' && salesDateInRange(updated,range));
    return false;
  }).filter((c,i,a)=>a.findIndex(x=>x.id===c.id)===i);
}
function salesDashboardMetricTitle(metric){
  return ({newContacts:'Neue Kontakte',firstTalks:'Erstgespräche',infoSent:'Informationen versendet',appointments:'Termine vereinbart',presentations:'Präsentationen',customers:'Neue Kunden',partners:'Neue Geschäftspartner'})[metric]||'Neue Kontakte';
}
function salesDashboardSetPeriod(period){salesDashboardPeriod=period; render()}
function salesDashboardSetMetric(metric){salesDashboardMetric=metric; render(); setTimeout(()=>document.getElementById('salesMetricList')?.scrollIntoView({behavior:'smooth',block:'start'}),40)}
function renderSalesMetricList(list,metric,period){
  const range=salesDashboardRange(period); const title=salesDashboardMetricTitle(metric);
  return `<div id="salesMetricList" class="card dashboard-work-list"><div class="section-title-row"><div><p class="eyebrow">Kontaktliste · ${esc(range.label)}</p><h3>${esc(title)} (${list.length})</h3></div><button class="copy-btn" onclick="current='recruiting'; render(); setTimeout(()=>document.getElementById('crmContactsSection')?.scrollIntoView({behavior:'smooth'}),50)">Alle Kontakte</button></div>${list.length?`<div class="dashboard-contact-list">${list.map(c=>`<div class="dashboard-contact-row"><button class="dashboard-contact-main" onclick="crmOpenContact('${esc(c.id)}')"><strong>${esc(crmFullName(c))}</strong><span>${esc(c.contactCode||'')} · ${esc(c.company||c.job||'')} ${c.city?'· '+esc(c.city):''}</span><small>Status: ${esc(crmEnsurePhase(c))} · Zuständig: ${esc(c.owner||'Peter')}${c.nextStep?' · '+esc(c.nextStep):''}</small></button></div>`).join('')}</div>`:`<p class="ok-text">Für diesen Zeitraum sind keine passenden Kontakte dokumentiert.</p>`}</div>`;
}

function salesFunnelPhases(){
  return ['Erstansprache','Interesse','Informationen versendet','Nachfassen','Termin vereinbart','Präsentation','Entscheidung','Geschäftspartner','Kein Interesse'];
}
function salesRegexEscape(value){return String(value||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function salesPhaseEntryDate(c,phase){
  const rx=new RegExp(`(?:→|Phase:\\s*)\\s*${salesRegexEscape(phase)}(?:$|\\b)`,'i');
  const hits=(c.timeline||[]).filter(t=>rx.test(String(t.text||''))).map(t=>String(t.date||'').slice(0,10)).filter(Boolean).sort();
  if(hits.length)return hits[hits.length-1];
  if(crmEnsurePhase(c)===phase)return String(c.updatedAt||c.createdAt||'').slice(0,10);
  return '';
}
function salesFunnelContacts(phase,period){
  const range=salesDashboardRange(period);
  return crmDashboardContacts().filter(c=>{
    if(crmEnsurePhase(c)!==phase)return false;
    return range.total || salesDateInRange(salesPhaseEntryDate(c,phase),range);
  }).filter((c,i,a)=>a.findIndex(x=>x.id===c.id)===i);
}
function salesFunnelSetPhase(phase){
  salesFunnelSelectedPhase=phase; render();
  setTimeout(()=>document.getElementById('salesFunnelList')?.scrollIntoView({behavior:'smooth',block:'start'}),40);
}
function salesContactReachedPhase(c,phase){
  const phases=['Erstansprache','Interesse','Informationen versendet','Nachfassen','Termin vereinbart','Präsentation','Entscheidung','Geschäftspartner'];
  const target=phases.indexOf(phase); if(target<0)return false;
  let highest=phases.indexOf(crmEnsurePhase(c));
  (c.timeline||[]).forEach(t=>{
    const text=String(t.text||'');
    phases.forEach((p,i)=>{if(new RegExp(`(?:→|Phase:\\s*)\\s*${salesRegexEscape(p)}(?:$|\\b)`,'i').test(text))highest=Math.max(highest,i)});
  });
  return highest>=target;
}
function salesFunnelCohort(period){
  const range=salesDashboardRange(period);
  const all=crmDashboardContacts();
  if(range.total)return all;
  return all.filter(c=>salesDateInRange(String(c.createdAt||'').slice(0,10),range));
}
function renderRecruitingFunnel(period){
  const range=salesDashboardRange(period);
  const phases=salesFunnelPhases();
  const cohort=salesFunnelCohort(period);
  const positive=phases.slice(0,8);
  const reached=Object.fromEntries(positive.map(p=>[p,cohort.filter(c=>salesContactReachedPhase(c,p)).length]));
  const selected=salesFunnelContacts(salesFunnelSelectedPhase,period);
  return `<section class="card recruiting-funnel-card"><div class="section-title-row"><div><p class="eyebrow">Recruiting-Trichter · ${esc(range.label)}</p><h3>Kontakte nach Recruiting-Phase</h3></div><span class="funnel-cohort">Basis: ${cohort.length} Kontakte</span></div>
    <div class="recruiting-funnel-grid">${phases.map((phase,i)=>{const count=salesFunnelContacts(phase,period).length; const prev=i>0&&i<8?reached[positive[i-1]]:0; const quote=i>0&&i<8&&prev?Math.round((reached[phase]/prev)*100):null; return `<button class="recruiting-funnel-step ${salesFunnelSelectedPhase===phase?'active':''} ${phase==='Kein Interesse'?'negative':''}" onclick="salesFunnelSetPhase('${esc(phase)}')"><span>${i+1}</span><div><strong>${esc(phase)}</strong>${quote!==null?`<small>Übergangsquote: ${quote}%</small>`:(phase==='Erstansprache'?'<small>Startphase</small>':'<small>Abschlussphase</small>')}</div><b>${count}</b></button>`}).join('')}</div>
    <div class="conversion-summary"><h4>Umwandlungsquoten</h4><div class="conversion-grid">${positive.slice(1).map((phase,i)=>{const prev=positive[i]; const base=reached[prev]||0; const value=reached[phase]||0; const rate=base?Math.round((value/base)*100):0; return `<div><span>${esc(prev)} → ${esc(phase)}</span><strong>${rate}%</strong><small>${value} von ${base}</small></div>`}).join('')}</div></div>
    ${renderSalesFunnelList(selected,salesFunnelSelectedPhase,range.label)}
  </section>`;
}
function renderSalesFunnelList(list,phase,label){
  return `<div id="salesFunnelList" class="funnel-contact-list"><div class="section-title-row"><div><p class="eyebrow">Kontaktliste · ${esc(label)}</p><h4>${esc(phase)} (${list.length})</h4></div></div>${list.length?`<div class="dashboard-contact-list">${list.map(c=>`<div class="dashboard-contact-row"><button class="dashboard-contact-main" onclick="crmOpenContact('${esc(c.id)}')"><strong>${esc(crmFullName(c))}</strong><span>${esc(c.contactCode||'')} · ${esc(c.company||c.job||'')} ${c.city?'· '+esc(c.city):''}</span><small>Zuständig: ${esc(c.owner||'Peter')}${c.nextStep?' · '+esc(c.nextStep):''}</small></button></div>`).join('')}</div>`:`<p class="ok-text">In dieser Auswahl befinden sich keine Kontakte.</p>`}</div>`;
}

function renderSalesCockpit(s){
  const metrics=[
    ['newContacts','Neue Kontakte','Neu angelegte Kontakte'],
    ['firstTalks','Erstgespräche','Dokumentierte erste Gespräche'],
    ['infoSent','Informationen versendet','Landingpage oder Informationen gesendet'],
    ['appointments','Termine vereinbart','Vereinbarte Termine und Präsentationen'],
    ['presentations','Präsentationen','Durchgeführte Präsentationen'],
    ['customers','Neue Kunden','Kontakte mit Status Kunde'],
    ['partners','Neue Geschäftspartner','Kontakte mit Status Geschäftspartner']
  ];
  const selected=salesMetricContacts(salesDashboardMetric,salesDashboardPeriod);
  view.innerHTML=`
    <div class="card"><p class="eyebrow">Vertriebscockpit</p><h2>${esc(s.title || '3. Vertriebscockpit')}</h2><p>Alle Kennzahlen entstehen automatisch aus der Kontaktverwaltung. Ein Klick auf eine Zahl öffnet die dazugehörigen Kontakte.</p></div>
    <div class="sales-period-tabs">
      <button class="${salesDashboardPeriod==='today'?'active':''}" onclick="salesDashboardSetPeriod('today')">Heute</button>
      <button class="${salesDashboardPeriod==='week'?'active':''}" onclick="salesDashboardSetPeriod('week')">Diese Woche</button>
      <button class="${salesDashboardPeriod==='month'?'active':''}" onclick="salesDashboardSetPeriod('month')">Dieser Monat</button>
      <button class="${salesDashboardPeriod==='total'?'active':''}" onclick="salesDashboardSetPeriod('total')">Gesamtbestand</button>
    </div>
    ${renderRecruitingFunnel(salesDashboardPeriod)}
    <div class="sales-metric-grid">${metrics.map(([key,label,hint])=>{const count=salesMetricContacts(key,salesDashboardPeriod).length; return `<button class="sales-metric-card ${salesDashboardMetric===key?'active':''}" onclick="salesDashboardSetMetric('${key}')"><span>${esc(label)}</span><strong>${count}</strong><small>${esc(hint)}</small></button>`}).join('')}</div>
    ${renderSalesMetricList(selected,salesDashboardMetric,salesDashboardPeriod)}
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



/* Recruiting CRM Version 1.5.1 RC1 */
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
    if(!c.phoneCountry)c.phoneCountry='+49';
    if(typeof c.landingSent!=='boolean')c.landingSent=!!c.landingSeen;
    if(!c.landingSentDate && c.landingSent && c.landingDate)c.landingSentDate=c.landingDate;
    if(!Array.isArray(c.communication))c.communication=[];
    if(!Array.isArray(c.noteEntries))c.noteEntries=[];
    if(!Array.isArray(c.tags))c.tags=String(c.tags||'').split(',').map(x=>x.trim()).filter(Boolean);
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
function crmPipelinePhases(){return ['Erstansprache','Interesse','Informationen versendet','Nachfassen','Termin vereinbart','Präsentation','Entscheidung','Geschäftspartner','Kein Interesse','Archiv']}
function crmPhaseFromLegacy(c){
  const raw=String(c?.phase||c?.status||'').trim();
  if(crmPipelinePhases().includes(raw))return raw;
  const map={
    'Neu':'Erstansprache','Neuer Kontakt':'Erstansprache','Kontaktanfrage gesendet':'Erstansprache','Vernetzt':'Erstansprache','Erstgespräch':'Erstansprache',
    'Interesse':'Interesse','Präsentation geplant':'Termin vereinbart','Präsentation erfolgt':'Präsentation','Nachfassen':'Nachfassen',
    'Kunde':'Geschäftspartner','Geschäftspartner':'Geschäftspartner','Kein Interesse':'Kein Interesse','Archiv':'Archiv'
  };
  if(c?.landingSent||c?.landingSeen)return c?.followupActive?'Nachfassen':'Informationen versendet';
  return map[raw]||'Erstansprache';
}
function crmStatusFromPhase(phase){
  return crmPipelinePhases().includes(phase) ? phase : 'Erstansprache';
}
function crmEnsurePhase(c){
  if(!c)return 'Erstansprache';
  const phase=crmPhaseFromLegacy(c);
  c.phase=phase;
  c.status=phase;
  return phase;
}
function crmStatusOptions(){return crmPipelinePhases()}
function crmSources(){return ['LinkedIn','Facebook','WhatsApp','Empfehlung','Veranstaltung','Kunde','Sonstiges']}
function crmPriorities(){return ['A','B','C']}
function crmAllTags(){return [...new Set(crmContacts().flatMap(c=>Array.isArray(c.tags)?c.tags:[]).map(x=>String(x).trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'de',{sensitivity:'base'}))}
function crmTagChips(c){return (Array.isArray(c.tags)?c.tags:[]).map(t=>`<span class="contact-tag">${esc(t)}</span>`).join('')}
function crmNextStepOptions(){return ['LinkedIn-Anfrage senden','Facebook-Nachricht senden','WhatsApp senden','Telefonat führen','Landingpage senden','Prüfen, ob Landingpage angekommen ist','Landingpage-Fortschritt beobachten','Bei teilweise angesehenen Videos nachfragen','Follow-up-Gespräch führen','Zoom vereinbaren','Präsentation durchführen','Nachfassen','Kunde betreuen','Geschäftspartner begleiten','Sonstiges']}
function crmChannelOptions(){return ['LinkedIn','Facebook','WhatsApp','Telefon','Zoom','Persönlich','E-Mail','Sonstiges']}
function crmCommTemplates(channel){
  if(channel==='WhatsApp')return {
    first:{label:'Erstkontakt',step:'Erstkontakt',text:(c)=>`Hallo ${c.firstName||crmFullName(c)}, danke für den angenehmen Kontakt. Ich freue mich auf den weiteren Austausch.`},
    landing:{label:'Landingpage senden',step:'Landingpage senden',text:(c)=>`Hallo ${c.firstName||crmFullName(c)}, hier ist wie besprochen der Link zu unserer kurzen Info-Seite:

${LANDINGPAGE_URL}

Schau dir das in Ruhe an. Danach interessiert mich deine ehrliche Einschätzung.`},
    video1:{label:'Link angekommen?',step:'Prüfen, ob Landingpage angekommen ist',text:(c)=>`Hallo ${c.firstName||crmFullName(c)}, kurze Nachfrage: Ist der Link zur Landingpage bei dir angekommen und lässt er sich öffnen?`},
    video2:{label:'Teilweise angesehen',step:'Bei teilweise angesehenen Videos nachfragen',text:(c)=>`Hallo ${c.firstName||crmFullName(c)}, ich wollte kurz hören, ob beim Anschauen der Informationen eine Frage aufgekommen ist. Schau dir den Rest gern in Ruhe an.`},
    video3:{label:'Follow-up nach allen Videos',step:'Follow-up-Gespräch führen',text:(c)=>`Hallo ${c.firstName||crmFullName(c)}, du hast dir die Informationen vollständig angesehen. Lass uns kurz über deinen Eindruck und deine offenen Fragen sprechen.`},
    followup:{label:'Follow-up',step:'Nachfassen',text:(c)=>`Hallo ${c.firstName||crmFullName(c)}, ich wollte kurz hören, wie dein Eindruck nach den Informationen ist.`},
    appointment:{label:'Terminbestätigung',step:'Termin bestätigen',text:(c)=>`Hallo ${c.firstName||crmFullName(c)}, ich bestätige dir hiermit unseren Termin. Ich freue mich auf das Gespräch.`},
    reminder:{label:'Erinnerung',step:'Erinnerung senden',text:(c)=>`Hallo ${c.firstName||crmFullName(c)}, kurze Erinnerung an unseren vereinbarten nächsten Schritt.`},
    free:{label:'Freie Nachricht',step:'Freie Nachricht',text:(c)=>''}
  };
  return {
    first:{label:'Erstkontakt',subject:'Unser Austausch',step:'Erstkontakt',text:(c)=>`Hallo ${c.firstName||crmFullName(c)},\n\nvielen Dank für den angenehmen Kontakt. Ich freue mich auf den weiteren Austausch.\n\nViele Grüße\n${currentPerson()}`},
    landing:{label:'Landingpage senden',subject:'Informationen wie besprochen',step:'Landingpage senden',text:(c)=>`Hallo ${c.firstName||crmFullName(c)},\n\nwie besprochen sende ich dir hier die Informationen zu. Schau dir alles in Ruhe an. Danach interessiert mich deine ehrliche Einschätzung.\n\nViele Grüße\n${currentPerson()}`},
    appointment:{label:'Terminbestätigung',subject:'Unser Termin',step:'Termin bestätigen',text:(c)=>`Hallo ${c.firstName||crmFullName(c)},\n\nhiermit bestätige ich unseren Termin. Ich freue mich auf das Gespräch.\n\nViele Grüße\n${currentPerson()}`},
    followup:{label:'Follow-up',subject:'Kurze Nachfrage',step:'Nachfassen',text:(c)=>`Hallo ${c.firstName||crmFullName(c)},\n\nich wollte kurz nachfragen, wie dein aktueller Eindruck ist.\n\nViele Grüße\n${currentPerson()}`},
    thanks:{label:'Dankeschön',subject:'Vielen Dank',step:'Dank senden',text:(c)=>`Hallo ${c.firstName||crmFullName(c)},\n\nvielen Dank für deine Zeit und den angenehmen Austausch.\n\nViele Grüße\n${currentPerson()}`},
    free:{label:'Freie E-Mail',subject:'',step:'Freie E-Mail',text:(c)=>''}
  };
}
function crmPhoneCountryOptions(){return ['+49','+43','+41','+31','+32','+33','+34','+39','+45','+46','+47','+352','+1']}
function crmCleanPhone(phone){return String(phone||'').replace(/[^0-9+]/g,'').replace(/^00/,'+').replace(/\+/g,'')}
function crmFullPhone(c){
  const raw=String(c.phone||'').trim();
  if(!raw)return '';
  if(raw.startsWith('+') || raw.startsWith('00'))return crmCleanPhone(raw);
  const country=String(c.phoneCountry||'+49').trim()||'+49';
  const cc=crmCleanPhone(country);
  const local=raw.replace(/[^0-9]/g,'').replace(/^0+/, '');
  return `${cc}${local}`;
}
function crmPhoneDisplay(c){const full=crmFullPhone(c); return full?`+${full}`:''}
function crmPhoneLocalDisplay(c){return [c.phoneCountry||'+49', c.phone||''].filter(Boolean).join(' ')}
function crmWebsiteHref(url){
  const v=String(url||'').trim();
  if(!v)return '';
  if(/^https?:\/\//i.test(v))return v;
  return 'https://'+v.replace(/^\/+/, '');
}
function crmTemplateSelect(channel){const templates=crmCommTemplates(channel); return Object.entries(templates).map(([k,v])=>`<option value="${esc(k)}">${esc(v.label)}</option>`).join('')}
function crmBuildCommunicationUrl(c,channel,key){
  const t=crmCommTemplates(channel)[key]||crmCommTemplates(channel).free;
  const text=typeof t.text==='function'?t.text(c):'';
  if(channel==='WhatsApp'){
    const num=crmFullPhone(c); if(!num)return '';
    return `https://wa.me/${num}${text?'?text='+encodeURIComponent(text):''}`;
  }
  if(channel==='E-Mail'){
    if(!c.email)return '';
    const subject=encodeURIComponent(t.subject||''); const body=encodeURIComponent(text||'');
    return `mailto:${encodeURIComponent(c.email)}?subject=${subject}&body=${body}`;
  }
  if(channel==='Telefon')return crmFullPhone(c)?`tel:+${crmFullPhone(c)}`:'';
  return '';
}
function crmAddCommunicationLog(c,channel,label){
  const entry={date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),channel,text:`${channel} geöffnet · Vorlage: ${label}`};
  if(!Array.isArray(c.communication))c.communication=[]; c.communication.push(entry);
  if(!Array.isArray(c.timeline))c.timeline=[]; c.timeline.push({date:entry.date,time:entry.time,type:channel,text:entry.text});
  c.updatedAt=new Date().toISOString();
}
function crmSuggestFollowup(c,channel,key){
  const t=crmCommTemplates(channel)[key]; if(!t)return;
  if(key==='landing'){
    c.phase='Informationen versendet'; c.status='Informationen versendet'; c.landingSent=true; c.landingSentDate=c.landingSentDate||todayKey();
    c.nextStep='Prüfen, ob Landingpage angekommen ist';
  }else if(key==='video1'){
    c.nextStep='Landingpage-Fortschritt beobachten';
  }else if(key==='video2'){
    c.nextStep='Landingpage-Fortschritt beobachten';
  }else if(key==='video3'){
    c.nextStep='Follow-up-Gespräch führen';
  }else if(key==='followup'){c.nextStep='Telefonat führen';}
}
function crmOpenComm(id,channel){
  const key=document.getElementById(`crm_template_${channel}`)?.value||'free';
  const c=crmFindContact(id); if(!c)return;
  const templates=crmCommTemplates(channel); const label=(templates[key]||templates.free).label;
  const url=crmBuildCommunicationUrl(c,channel,key);
  if(!url){alert(channel==='WhatsApp'?'Bitte erst eine Mobilnummer im Kontakt eintragen.':channel==='E-Mail'?'Bitte erst eine E-Mail-Adresse im Kontakt eintragen.':'Bitte erst eine Telefonnummer eintragen.'); return;}
  crmAddCommunicationLog(c,channel,label); crmSuggestFollowup(c,channel,key); save();
  window.location.href=url;
  setTimeout(()=>render(),300);
}
function crmQuickLog(id,channel,label,nextStep){
  const c=crmFindContact(id); if(!c)return;
  crmAddCommunicationLog(c,channel,label);
  if(nextStep)c.nextStep=nextStep;
  if(label.includes('Landingpage')){c.phase='Informationen versendet'; c.status='Informationen versendet'; c.landingSent=true; c.landingSentDate=c.landingSentDate||todayKey();}
  save(); render();
}
function crmDaysSince(dateKey){
  if(!dateKey)return 0;
  const then=new Date(`${dateKey}T00:00:00`); const now=new Date(); now.setHours(0,0,0,0);
  return Math.max(0,Math.floor((now-then)/86400000));
}
function crmRecommendedAction(c){
  if(!c.landingSent && !c.landingSeen)return 'Landingpage senden';
  if(c.landingSent && !c.landingSeen)return 'Prüfen, ob Landingpage angekommen ist';
  const watched=[c.video1Seen,c.video2Seen,c.video3Seen].filter(Boolean).length;
  if(watched<3){
    const age=crmDaysSince(c.landingDate||c.landingSentDate);
    return age>=2?'Bei teilweise angesehenen Videos freundlich nachfragen':'Landingpage-Fortschritt beobachten';
  }
  if(!c.followupActive)return 'Follow-up-Gespräch führen';
  if(!['Termin vereinbart','Präsentation','Entscheidung','Geschäftspartner'].includes(crmEnsurePhase(c)))return 'Telefontermin oder Zoom vereinbaren';
  return c.nextStep||'Nächsten Schritt prüfen';
}
function renderCrmCommunicationBar(c){
  return `<div class="comm-panel"><div class="comm-actions">
    <a class="copy-btn" href="${crmFullPhone(c)?'tel:+'+esc(crmFullPhone(c)):'#'}" onclick="crmQuickLog('${esc(c.id)}','Telefon','Anruf gestartet','Nachfassen')">Anrufen</a>
    <label>WhatsApp<select id="crm_template_WhatsApp">${crmTemplateSelect('WhatsApp')}</select></label><button class="primary" onclick="crmOpenComm('${esc(c.id)}','WhatsApp')">WhatsApp Business öffnen</button>
    <label>E-Mail<select id="crm_template_E-Mail">${crmTemplateSelect('E-Mail')}</select></label><button class="primary" onclick="crmOpenComm('${esc(c.id)}','E-Mail')">Outlook öffnen</button>
    <button class="copy-btn" onclick="selectedContactTab='tasks'; render()">Termin/Aufgabe</button>
    <button class="copy-btn" onclick="crmQuickLog('${esc(c.id)}','Landingpage','Landingpage gesendet','Prüfen, ob Landingpage angekommen ist')">Landingpage gesendet</button>
  </div></div>`;
}

function crmTaskOptions(){return ['LinkedIn-Nachricht','WhatsApp senden','Rückruf','Zoom vorbereiten','Präsentation','Landingpage senden','Landingpage prüfen','Follow-up-Gespräch','Nachfassen','Sonstiges']}
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
function crmActive(c){return !['Archiv','Kein Interesse','Geschäftspartner'].includes(crmEnsurePhase(c))}
function crmDuplicateWarning(data,id){
  const name=crmNormalize(`${data.firstName||''} ${data.lastName||''}`);
  const phone=crmNormalize(crmFullPhone(data));
  const email=crmNormalize(data.email);
  const company=crmNormalize(data.company);
  return crmContacts().find(c=>c.id!==id && ((name && name===crmNormalize(`${c.firstName||''} ${c.lastName||''}`)) || (phone && phone===crmNormalize(crmFullPhone(c))) || (email && email===crmNormalize(c.email)) || (company && company===crmNormalize(c.company) && name))) || null;
}
function crmCollectForm(id){
  const p='crm_';
  const val=k=>document.getElementById(p+k)?.value?.trim()||'';
  const nextStepSelect=val('nextStepSelect');
  const nextStepOther=val('nextStepOther');
  const rawContactCode=val('contactCode');
  const cleanContactCode=crmCodeNumber(rawContactCode) ? rawContactCode : '';
  const tags=[...new Set(val('tags').split(',').map(x=>x.trim()).filter(Boolean))];
  const phase=val('phase')||crmPhaseFromLegacy({status:val('status')||'Erstansprache'});
  const data={
    id:id||crmId(), contactCode:cleanContactCode, createdBy:val('createdBy')||currentPerson(), firstName:val('firstName'), lastName:val('lastName'), company:val('company'), birthday:val('birthday'), street:val('street'), postalCode:val('postalCode'), job:(val('jobOther')||val('jobSelect')||val('job')), branch:(val('branchOther')||val('branchSelect')||val('branch')), city:val('city'), phoneCountry:val('phoneCountry')||'+49', phone:val('phone'), email:val('email'), website:val('website'), linkedin:val('linkedin'), facebook:val('facebook'), instagram:val('instagram'), whatsapp:document.getElementById('crm_whatsapp')?.checked||false, owner:val('owner')||currentPerson(), support:val('support'), source:val('source'), targetGroup:(val('targetGroupOther')||val('targetGroupSelect')||val('targetGroup')), status:phase, priority:val('priority')||'A', followDate:val('followDate'), followTime:'', nextStep:(nextStepOther||nextStepSelect||val('nextStep')), landingSent:document.getElementById('crm_landingSent')?.checked||false, landingSentDate:(document.getElementById('crm_landingSent')?.checked?val('landingSentDate'):''), landingSeen:document.getElementById('crm_landingSeen')?.checked||false, landingDate:(document.getElementById('crm_landingSeen')?.checked?val('landingDate'):''), video1Seen:(document.getElementById('crm_landingSeen')?.checked && (document.getElementById('crm_video1Seen')?.checked||false)), video2Seen:(document.getElementById('crm_landingSeen')?.checked && (document.getElementById('crm_video1Seen')?.checked||false) && (document.getElementById('crm_video2Seen')?.checked||false)), video3Seen:(document.getElementById('crm_landingSeen')?.checked && (document.getElementById('crm_video1Seen')?.checked||false) && (document.getElementById('crm_video2Seen')?.checked||false) && (document.getElementById('crm_video3Seen')?.checked||false)), followupActive:(document.getElementById('crm_landingSeen')?.checked && (document.getElementById('crm_video1Seen')?.checked||false) && (document.getElementById('crm_video2Seen')?.checked||false) && (document.getElementById('crm_video3Seen')?.checked||false) && (document.getElementById('crm_followupActive')?.checked||false)), interest:val('interest')||'3', trust:val('trust')||'3', activityLevel:val('activityLevel')||'3', tags, notes:val('notes'), phase
  };
  data.status=crmStatusFromPhase(phase);
  return data;
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
    const oldPhase=crmEnsurePhase(old);
    if(oldPhase!==data.phase)data.timeline.push({date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),type:'Recruiting-Phase',text:`Phase geändert: ${oldPhase} → ${data.phase}`});
    if(old.owner!==data.owner)data.timeline.push({date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),type:'Zuständigkeit',text:`Zuständigkeit geändert: ${old.owner||'offen'} → ${data.owner}`});
    if(old.priority!==data.priority)data.timeline.push({date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),type:'Priorität',text:`Priorität geändert: ${old.priority||'offen'} → ${data.priority}`});
    if(old.followDate!==data.followDate || old.followTime!==data.followTime || old.nextStep!==data.nextStep)data.timeline.push({date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),type:'Wiedervorlage',text:`Nächster Schritt: ${data.nextStep||'offen'}`});
    if(old.landingSent!==data.landingSent || old.landingSeen!==data.landingSeen || old.video1Seen!==data.video1Seen || old.video2Seen!==data.video2Seen || old.video3Seen!==data.video3Seen || old.followupActive!==data.followupActive)data.timeline.push({date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),type:'Landingpage',text:'Landingpage-Status aktualisiert'});
    state.crm.contacts[idx]=data;
  }else{
    data.contactCode=data.contactCode||crmNextContactCode(data.createdBy||data.owner||currentPerson());
    data.createdBy=data.createdBy||currentPerson();
    data.createdAt=now; data.updatedAt=now; data.communication=[]; data.noteEntries=[]; data.timeline=[{date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),type:'Anlage',text:`Kontakt ${data.contactCode} angelegt · Phase: ${data.phase}`}];
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
  const tag=crmFilters.tag||'';
  return crmContacts().filter(c=>{
    if(owner==='Meine' && !crmPersonFilter(c))return false;
    if(owner==='Peter' && (c.owner||'Peter')!=='Peter')return false;
    if(owner==='Martina' && (c.owner||'Peter')!=='Martina')return false;
    if(status && crmEnsurePhase(c)!==status)return false;
    if(source && c.source!==source)return false;
    if(prio && c.priority!==prio)return false;
    if(job && c.job!==job)return false;
    if(branch && c.branch!==branch)return false;
    if(targetGroup && c.targetGroup!==targetGroup)return false;
    if(tag && !(Array.isArray(c.tags)&&c.tags.includes(tag)))return false;
    if(q){
      const hay=crmNormalize([c.contactCode,crmFullName(c),c.firstName,c.lastName,c.company,c.job,c.branch,c.city,c.street,c.postalCode,c.birthday,crmFullPhone(c),c.phone,c.email,c.linkedin,c.facebook,c.targetGroup,c.source,crmEnsurePhase(c),(c.tags||[]).join(' ')].join(' '));
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
  crmFilters={q:'',owner:'Meine',status:'',source:'',priority:'',job:'',branch:'',targetGroup:'',tag:''};
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
  current='recruiting';
  render();
  const focusContact=()=>{
    const target=document.querySelector('.contact-file');
    if(!target)return;
    target.scrollIntoView({behavior:'smooth',block:'start'});
    target.setAttribute('tabindex','-1');
    try{target.focus({preventScroll:true});}catch(e){}
  };
  requestAnimationFrame(()=>requestAnimationFrame(focusContact));
  setTimeout(focusContact,180);
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

const KNOWLEDGE_TEMPLATES=[
  {id:'li-request',category:'LinkedIn',title:'Kontaktanfrage',keywords:'vernetzen kontaktanfrage',text:'Hallo [Vorname], dein Profil hat mein Interesse geweckt. Ich vernetze mich gerne mit Unternehmern und Selbstständigen aus der Region. Ich freue mich auf den Austausch.'},
  {id:'li-first',category:'LinkedIn',title:'Erstnachricht',keywords:'erstkontakt erste nachricht',text:'Hallo [Vorname], vielen Dank für die Vernetzung. Mich interessiert, wie du zu deiner heutigen Tätigkeit gekommen bist.'},
  {id:'li-follow',category:'LinkedIn',title:'Nachfassen',keywords:'follow-up nachfassen',text:'Hallo [Vorname], ich wollte unseren Austausch noch einmal aufgreifen. Was beschäftigt dich beruflich aktuell am meisten?'},
  {id:'fb-first',category:'Facebook',title:'Messenger Erstkontakt',keywords:'messenger erstkontakt',text:'Hallo [Vorname], vielen Dank für die Verbindung. Ich freue mich über neue Kontakte aus der Region. Was machst du beruflich genau?'},
  {id:'fb-follow',category:'Facebook',title:'Messenger Nachfassen',keywords:'messenger follow-up nachfassen',text:'Hallo [Vorname], ich wollte kurz an unseren Austausch anknüpfen. Wie sieht deine aktuelle Situation aus?'},
  {id:'fb-appointment',category:'Facebook',title:'Terminvereinbarung',keywords:'termin telefon zoom',text:'Ich finde unseren Austausch interessant. Ein kurzes Telefonat ist oft leichter als viele Nachrichten. Wann passen dir etwa 15 Minuten?'},
  {id:'wa-first',category:'WhatsApp',title:'Erstkontakt',keywords:'erstkontakt erste nachricht',text:'Hallo [Vorname], schön, dass wir jetzt auch über WhatsApp verbunden sind. Danke für den angenehmen Austausch. Mich interessiert noch: Wie bist du zu deiner heutigen Tätigkeit gekommen?'},
  {id:'wa-landing',category:'WhatsApp',title:'Landingpage senden',keywords:'landingpage informationen',text:'Hallo [Vorname], hier ist wie besprochen der Link zu unserer kurzen Info-Seite:\n\nhttps://www.ichmachdicherfolgreich.de\n\nSchau dir alles in Ruhe an. Danach interessiert mich deine ehrliche Einschätzung.'},
  {id:'wa-video1',category:'WhatsApp',title:'Link angekommen?',keywords:'landingpage link angekommen öffnen',text:'Hallo [Vorname], kurze Nachfrage: Ist der Link zur Landingpage bei dir angekommen und lässt er sich öffnen?'},
  {id:'wa-video2',category:'WhatsApp',title:'Teilweise angesehen',keywords:'landingpage teilweise angesehen fragen offen',text:'Hallo [Vorname], ich wollte kurz hören, ob beim Anschauen der Informationen eine Frage aufgekommen ist. Schau dir den Rest gern in Ruhe an.'},
  {id:'wa-video3',category:'WhatsApp',title:'Follow-up nach allen Videos',keywords:'alle videos angesehen follow-up gespräch',text:'Hallo [Vorname], du hast dir die Informationen vollständig angesehen. Lass uns kurz über deinen Eindruck und deine offenen Fragen sprechen.'},
  {id:'wa-follow',category:'WhatsApp',title:'Follow-up',keywords:'follow-up nachfassen',text:'Hallo [Vorname], ich wollte kurz hören, wie dein Eindruck nach den Informationen ist. Welche Frage ist bei dir noch offen?'},
  {id:'mail-first',category:'E-Mail',title:'Erstkontakt',keywords:'erstkontakt erste mail',subject:'Unser Austausch',text:'Hallo [Vorname],\n\nvielen Dank für den angenehmen Kontakt. Ich freue mich auf den weiteren Austausch.\n\nViele Grüße\n[Absender]'},
  {id:'mail-landing',category:'E-Mail',title:'Landingpage senden',keywords:'landingpage informationen',subject:'Informationen wie besprochen',text:'Hallo [Vorname],\n\nwie besprochen sende ich dir hier die Informationen:\n\nhttps://www.ichmachdicherfolgreich.de\n\nSchau dir alles in Ruhe an. Danach interessiert mich deine ehrliche Einschätzung.\n\nViele Grüße\n[Absender]'},
  {id:'mail-appointment',category:'E-Mail',title:'Terminvereinbarung',keywords:'termin bestätigen vereinbaren',subject:'Unser Termin',text:'Hallo [Vorname],\n\nlass uns die offenen Punkte in einem kurzen Gespräch klären. Welche Zeit passt dir in den nächsten Tagen?\n\nViele Grüße\n[Absender]'},
  {id:'talk-phone',category:'Gespräch',title:'Telefonleitfaden',keywords:'telefon leitfaden gespräch',text:'1. Persönlich einsteigen.\n2. Nach der aktuellen Situation fragen.\n3. Ziele und Wünsche verstehen.\n4. Prüfen, ob Interesse an einer zusätzlichen Perspektive besteht.\n5. Einen klaren nächsten Schritt vereinbaren.'},
  {id:'talk-zoom',category:'Gespräch',title:'Zoom-Leitfaden',keywords:'zoom leitfaden präsentation',text:'1. Ziel und Dauer des Gesprächs klären.\n2. Bedarf kurz zusammenfassen.\n3. Firma, Produkt und Geschäft verständlich vorstellen.\n4. Fragen beantworten.\n5. Konkreten nächsten Schritt mit Datum festlegen.'}
];

const PERSON_PHASE_TEMPLATES=[
  {id:'peter-first-wa',owner:'Peter',phases:['Erstansprache'],category:'WhatsApp',title:'Peter · Persönlicher Erstkontakt',keywords:'erstansprache peter whatsapp',text:'Hallo [Vorname], danke für den angenehmen Kontakt. Mich interessiert, wie du heute beruflich aufgestellt bist und was dir dabei wichtig ist. Lass uns gern kurz austauschen. Viele Grüße, Peter'},
  {id:'peter-first-talk',owner:'Peter',phases:['Erstansprache'],category:'Gespräch',title:'Peter · Gesprächseinstieg',keywords:'erstansprache peter telefon leitfaden',text:'1. Persönlich und ruhig einsteigen.\n2. Nach der heutigen beruflichen Situation fragen.\n3. Zuhören und keine vorschnelle Lösung anbieten.\n4. Einen klaren nächsten Schritt vereinbaren.'},
  {id:'peter-info-wa',owner:'Peter',phases:['Interesse'],category:'WhatsApp',title:'Peter · Informationen senden',keywords:'interesse informationen landingpage peter',text:'Hallo [Vorname], wie besprochen sende ich dir hier unsere Informationen:\n\nhttps://www.ichmachdicherfolgreich.de\n\nSchau dir alles in Ruhe an. Danach sprechen wir kurz über deinen Eindruck. Viele Grüße, Peter'},
  {id:'peter-follow-wa',owner:'Peter',phases:['Informationen versendet','Nachfassen'],category:'WhatsApp',title:'Peter · Persönlich nachfassen',keywords:'nachfassen informationen peter',text:'Hallo [Vorname], ich wollte kurz hören, wie dein Eindruck nach den Informationen ist. Was spricht dich an und welche Frage ist noch offen? Viele Grüße, Peter'},
  {id:'peter-appointment',owner:'Peter',phases:['Nachfassen'],category:'WhatsApp',title:'Peter · Gesprächstermin vereinbaren',keywords:'termin vereinbaren peter',text:'Hallo [Vorname], lass uns die offenen Punkte in einem kurzen Gespräch klären. Wann passen dir in den nächsten Tagen etwa 15 bis 20 Minuten? Viele Grüße, Peter'},
  {id:'peter-confirm',owner:'Peter',phases:['Termin vereinbart'],category:'WhatsApp',title:'Peter · Termin bestätigen',keywords:'termin bestätigen peter',text:'Hallo [Vorname], ich freue mich auf unser Gespräch am [Termin]. Plane bitte etwa 20 Minuten ein. Bis dann, Peter'},
  {id:'peter-presentation',owner:'Peter',phases:['Präsentation'],category:'Gespräch',title:'Peter · Präsentationsleitfaden',keywords:'präsentation peter leitfaden',text:'1. Ausgangssituation des Kontakts zusammenfassen.\n2. Firma, Produkt und Einkommensmöglichkeit klar erklären.\n3. Fragen offen beantworten.\n4. Keine Entscheidung erzwingen.\n5. Verbindlichen nächsten Schritt festlegen.'},
  {id:'peter-decision',owner:'Peter',phases:['Entscheidung'],category:'Gespräch',title:'Peter · Entscheidung klären',keywords:'entscheidung abschluss peter',text:'1. Nach dem ehrlichen Gesamteindruck fragen.\n2. Offene Bedenken konkret benennen lassen.\n3. Prüfen, ob die Zusammenarbeit zu den Zielen passt.\n4. Eine klare Entscheidung festhalten.'},
  {id:'peter-onboarding',owner:'Peter',phases:['Geschäftspartner'],category:'WhatsApp',title:'Peter · Willkommen im Team',keywords:'geschäftspartner onboarding peter',text:'Hallo [Vorname], herzlich willkommen im Team. Wir gehen die ersten Schritte gemeinsam und klar strukturiert an. Als Nächstes vereinbaren wir deinen Starttermin. Viele Grüße, Peter'},

  {id:'martina-first-wa',owner:'Martina',phases:['Erstansprache'],category:'WhatsApp',title:'Martina · Persönlicher Erstkontakt',keywords:'erstansprache martina whatsapp',text:'Hallo [Vorname], danke für unseren netten Kontakt. Ich lerne gern Menschen kennen und erfahre, was sie im Alltag und beruflich beschäftigt. Erzähl mir gern ein wenig von dir. Liebe Grüße, Martina'},
  {id:'martina-first-fb',owner:'Martina',phases:['Erstansprache'],category:'Facebook',title:'Martina · Messenger-Einstieg',keywords:'erstansprache martina facebook messenger',text:'Hallo [Vorname], schön, dass wir verbunden sind. Ich freue mich immer über einen persönlichen Austausch. Was machst du beruflich und was ist dir dabei besonders wichtig? Liebe Grüße, Martina'},
  {id:'martina-info-wa',owner:'Martina',phases:['Interesse'],category:'WhatsApp',title:'Martina · Informationen senden',keywords:'interesse informationen martina',text:'Hallo [Vorname], hier kommen wie versprochen die Informationen. Schau sie dir in Ruhe an und mach dir dein eigenes Bild. Danach interessiert mich sehr, was dir dazu durch den Kopf geht. Liebe Grüße, Martina'},
  {id:'martina-follow-wa',owner:'Martina',phases:['Informationen versendet','Nachfassen'],category:'WhatsApp',title:'Martina · Wertschätzend nachfassen',keywords:'nachfassen martina informationen',text:'Hallo [Vorname], ich wollte mich kurz melden und fragen, wie dein Eindruck ist. Gibt es etwas, das dich besonders anspricht oder noch unklar ist? Liebe Grüße, Martina'},
  {id:'martina-appointment',owner:'Martina',phases:['Nachfassen'],category:'WhatsApp',title:'Martina · Gespräch vereinbaren',keywords:'termin vereinbaren martina',text:'Hallo [Vorname], ich glaube, ein kurzes persönliches Gespräch ist jetzt sinnvoller als viele Nachrichten. Wann passt es dir in den nächsten Tagen? Liebe Grüße, Martina'},
  {id:'martina-confirm',owner:'Martina',phases:['Termin vereinbart'],category:'WhatsApp',title:'Martina · Terminbestätigung',keywords:'termin bestätigen martina',text:'Hallo [Vorname], ich freue mich auf unser Gespräch am [Termin]. Wir nehmen uns in Ruhe Zeit für deine Fragen. Liebe Grüße, Martina'},
  {id:'martina-presentation',owner:'Martina',phases:['Präsentation'],category:'Gespräch',title:'Martina · Persönlicher Gesprächsleitfaden',keywords:'präsentation martina leitfaden',text:'1. Persönlich ankommen und Vertrauen schaffen.\n2. Wünsche und Alltagssituation aufnehmen.\n3. Die Möglichkeit verständlich und ohne Druck erklären.\n4. Fragen ehrlich beantworten.\n5. Gemeinsam den nächsten Schritt festlegen.'},
  {id:'martina-decision',owner:'Martina',phases:['Entscheidung'],category:'Gespräch',title:'Martina · Entscheidungsgespräch',keywords:'entscheidung martina abschluss',text:'1. Nach dem persönlichen Eindruck fragen.\n2. Zuhören, was noch fehlt.\n3. Keine Entscheidung vorwegnehmen.\n4. Klar festhalten, ob und wie es weitergeht.'},
  {id:'martina-onboarding',owner:'Martina',phases:['Geschäftspartner'],category:'WhatsApp',title:'Martina · Willkommen und Start',keywords:'geschäftspartner onboarding martina',text:'Hallo [Vorname], ich freue mich sehr, dass du dabei bist. Wir gehen deinen Start gemeinsam Schritt für Schritt an. Als Nächstes planen wir deinen ersten Termin. Liebe Grüße, Martina'},
  {id:'martina-objection',owner:'Martina',phases:['Präsentation','Entscheidung'],category:'Gespräch',title:'Martina · Einwand wertschätzend klären',keywords:'einwand bedenken entscheidung martina',text:'1. Den Einwand vollständig anhören.\n2. Nachfragen, was genau dahintersteht.\n3. Die Frage ehrlich und ohne Druck beantworten.\n4. Prüfen, welcher nächste Schritt für beide Seiten sinnvoll ist.'},
  {id:'martina-recommendation',owner:'Martina',phases:['Geschäftspartner'],category:'WhatsApp',title:'Martina · Persönlich um Empfehlung bitten',keywords:'empfehlung geschäftspartner martina',text:'Hallo [Vorname], du kennst inzwischen unsere Arbeit und weißt, wie wir Menschen begleiten. Fällt dir jemand ein, für den ein unverbindlicher Austausch interessant sein kann? Liebe Grüße, Martina'},
  {id:'martina-no-interest',owner:'Martina',phases:['Kein Interesse'],category:'WhatsApp',title:'Martina · Wertschätzender Abschluss',keywords:'kein interesse absage abschluss martina',text:'Hallo [Vorname], danke für deine offene Rückmeldung. Ich respektiere deine Entscheidung. Unser Kontakt bleibt davon unberührt, und du kannst dich jederzeit wieder melden. Liebe Grüße, Martina'},
  {id:'martina-reactivation',owner:'Martina',phases:['Archiv'],category:'WhatsApp',title:'Martina · Kontakt wieder aufnehmen',keywords:'archiv reaktivierung wieder aufnehmen martina',text:'Hallo [Vorname], wir hatten vor einiger Zeit Kontakt. Heute musste ich an unser Gespräch denken und wollte mich persönlich melden. Wie geht es dir und was hat sich bei dir inzwischen verändert? Liebe Grüße, Martina'},
  {id:'martina-partner-next',owner:'Martina',phases:['Geschäftspartner'],category:'Gespräch',title:'Martina · Nächste Schritte nach dem Start',keywords:'geschäftspartner start nächste schritte martina',text:'1. Persönliches Ziel für die ersten 30 Tage festlegen.\n2. Die ersten Kontakte gemeinsam auswählen.\n3. Einen festen nächsten Termin vereinbaren.\n4. Offene Fragen direkt klären.'},
  {id:'peter-no-interest',owner:'Peter',phases:['Kein Interesse'],category:'WhatsApp',title:'Peter · Wertschätzender Abschluss',keywords:'kein interesse absage abschluss peter',text:'Hallo [Vorname], danke für deine offene Rückmeldung. Ich respektiere deine Entscheidung. Unser Kontakt bleibt davon unberührt. Wenn sich später etwas ändert, kannst du dich jederzeit melden. Viele Grüße, Peter'},
  {id:'peter-reactivation',owner:'Peter',phases:['Archiv'],category:'WhatsApp',title:'Peter · Kontakt wieder aufnehmen',keywords:'archiv reaktivierung wieder aufnehmen peter',text:'Hallo [Vorname], wir hatten vor einiger Zeit Kontakt. Heute musste ich an unser Gespräch denken. Was hat sich bei dir inzwischen beruflich oder persönlich verändert? Viele Grüße, Peter'},
  {id:'peter-info-sent',owner:'Peter',phases:['Informationen versendet'],category:'WhatsApp',title:'Peter · Empfang der Informationen prüfen',keywords:'informationen versendet angekommen peter',text:'Hallo [Vorname], sind die Informationen gut bei dir angekommen? Schau sie dir in Ruhe an. Danach interessiert mich deine ehrliche Einschätzung. Viele Grüße, Peter'},
  {id:'martina-info-sent',owner:'Martina',phases:['Informationen versendet'],category:'WhatsApp',title:'Martina · Empfang der Informationen prüfen',keywords:'informationen versendet angekommen martina',text:'Hallo [Vorname], sind die Informationen gut bei dir angekommen? Schau sie dir in Ruhe an. Danach interessiert mich, was dir dazu durch den Kopf geht. Liebe Grüße, Martina'}
];
const RECRUITING_LIBRARY_SECTION_IDS=['whatsapp_lib','linkedin_lib','facebook_lib','unternehmer_lib','empfehlungen_lib','einwaende_lib','video_lib'];
function knowledgeSlug(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)}
function knowledgeInferCategory(section){
  const id=String(section?.id||'');
  if(id==='whatsapp_lib')return 'WhatsApp';
  if(id==='linkedin_lib')return 'LinkedIn';
  if(id==='facebook_lib')return 'Facebook';
  if(id==='video_lib')return 'Gespräch';
  return 'Gespräch';
}
function knowledgeInferPhases(section,chapter,text){
  const hay=`${section?.title||''} ${chapter?.title||''} ${text||''}`.toLowerCase();
  const phases=[];
  const add=(...items)=>items.forEach(p=>{if(!phases.includes(p))phases.push(p)});
  if(/reaktiv|lange nichts|wieder kontakt|kontakt wieder|archiv/.test(hay))add('Archiv');
  if(/kein interesse|absage|ablehnung|nicht passend|wertschätzend.*beenden/.test(hay))add('Kein Interesse');
  if(/willkommen|onboarding|erste schritte|partnerstart|geschäftspartner|empfehlungsfrage|empfehlung bitten/.test(hay))add('Geschäftspartner');
  if(/entscheidung|abschluss|einwand|bedenken|preis|keine zeit|kein geld|partner fragen|überlegen/.test(hay))add('Entscheidung');
  if(/präsentation|zoom|vorstellung|leitfaden|geschäft erklären|einkommensmöglichkeit/.test(hay))add('Präsentation');
  if(/termin bestät|terminerinner|gesprächstermin|zoomtermin|termin vereinbart/.test(hay))add('Termin vereinbart');
  if(/termin vereinbar|telefonat vereinbar|kurzes gespräch|wann passt/.test(hay))add('Nachfassen');
  if(/nachfass|follow.?up|nachfrage|noch einmal melden|erinnerung|link angekommen|angesehen/.test(hay))add('Informationen versendet','Nachfassen');
  if(/landingpage|informationen senden|infoseite|video senden|link senden|wie besprochen.*link/.test(hay))add('Interesse');
  if(/erstkontakt|kontaktanfrage|erste nachricht|kennenlernen|vernetzen|alltagstreffen|visitenkarte/.test(hay))add('Erstansprache');
  if(!phases.length){
    if(section?.id==='einwaende_lib')add('Präsentation','Entscheidung');
    else if(section?.id==='empfehlungen_lib')add('Geschäftspartner');
    else if(section?.id==='video_lib')add('Interesse','Informationen versendet','Präsentation');
    else if(section?.id==='unternehmer_lib')add('Erstansprache','Interesse');
    else add('Erstansprache');
  }
  return phases;
}
function knowledgeLibraryTemplates(){
  const sections=(window.APP_CONTENT&&Array.isArray(window.APP_CONTENT.sections))?window.APP_CONTENT.sections:[];
  const out=[];
  sections.filter(section=>RECRUITING_LIBRARY_SECTION_IDS.includes(section.id)).forEach(section=>{
    (section.chapters||[]).forEach((chapter,ci)=>{
      (chapter.templates||[]).forEach((raw,ti)=>{
        const text=typeof raw==='string'?raw:String(raw?.text||raw?.body||'');
        if(!text.trim())return;
        const title=chapter.title||section.title||'Recruiting-Vorlage';
        out.push({
          id:`library-${knowledgeSlug(section.id)}-${ci+1}-${ti+1}`,
          owner:'Peter',
          phases:knowledgeInferPhases(section,chapter,text),
          category:knowledgeInferCategory(section),
          title:`Peter · ${title}${(chapter.templates||[]).length>1?` ${ti+1}`:''}`,
          keywords:`${section.title||''} ${chapter.title||''} ${text}`,
          text,
          source:'Recruiting-Bibliothek'
        });
      });
    });
  });
  return out;
}
function knowledgeUniqueTemplates(list){
  const seen=new Set();
  return list.filter(t=>{
    const key=`${t.owner||''}|${String(t.text||'').trim().toLowerCase()}`;
    if(seen.has(key))return false;
    seen.add(key); return true;
  });
}
function knowledgeNormalizeGeneralTemplates(){
  return KNOWLEDGE_TEMPLATES.flatMap(t=>{
    const phases=(t.phases&&t.phases.length)?t.phases:knowledgeInferPhases({id:'general',title:t.category||''},{title:t.title||''},`${t.keywords||''} ${t.text||''}`);
    return ['Peter','Martina'].map(owner=>({...t,id:`${t.id}-${owner.toLowerCase()}`,owner,phases,source:'Recruiting-Bibliothek'}));
  });
}
function knowledgeAllTemplates(){return knowledgeUniqueTemplates([...PERSON_PHASE_TEMPLATES,...knowledgeLibraryTemplates(),...knowledgeNormalizeGeneralTemplates()])}
function knowledgeCoverage(){
  const phases=crmPipelinePhases();
  const templates=knowledgeAllTemplates();
  return ['Peter','Martina'].map(owner=>({owner,phases:phases.map(phase=>({phase,count:templates.filter(t=>t.owner===owner&&(t.phases||[]).includes(phase)).length}))}));
}
function knowledgeCoverageComplete(){return knowledgeCoverage().every(row=>row.phases.every(item=>item.count>0))}
function knowledgeTemplatesForContact(c){
  if(!c)return knowledgeAllTemplates();
  const owner=c.owner||'Peter';
  const phase=crmEnsurePhase(c);
  const phaseTemplates=knowledgeAllTemplates().filter(t=>(t.owner||owner)===owner && (t.phases||[]).includes(phase));
  return phaseTemplates;
}
function crmRecommendedTemplates(c,limit=3){
  const preferred=['WhatsApp','Gespräch','E-Mail','LinkedIn','Facebook'];
  return knowledgeTemplatesForContact(c).sort((a,b)=>preferred.indexOf(a.category)-preferred.indexOf(b.category)).slice(0,limit);
}
function crmRenderRecommendedTemplates(c){
  const list=crmRecommendedTemplates(c,3);
  if(!list.length)return '';
  return `<div class="assistant-template-box"><div class="process-card-head"><h4>Passende Vorlagen für ${esc(c.owner||'Peter')}</h4><span class="badge">${esc(crmEnsurePhase(c))}</span></div><div class="assistant-template-list">${list.map(t=>`<article class="assistant-template-item"><span class="knowledge-label">${esc(t.category)}</span><strong>${esc(t.title)}</strong><p>${esc(knowledgeContactText(t,c)).replaceAll('\n','<br>')}</p><div class="quick-actions"><button class="copy-btn" onclick="knowledgeCopy('${esc(t.id)}')">Kopieren</button><button class="primary" onclick="knowledgeSend('${esc(t.id)}')">Jetzt verwenden</button></div></article>`).join('')}</div></div>`;
}

function knowledgeContactText(t,c){
  const first=(c&&c.firstName)||((c&&crmFullName(c))||'').split(' ')[0]||'';
  return String(t.text||'').replaceAll('[Vorname]',first||'du').replaceAll('[Absender]',currentPerson());
}
function knowledgeTemplate(id){return knowledgeAllTemplates().find(t=>t.id===id)}
function knowledgeSetCategory(cat){knowledgeCategory=cat; render()}
function knowledgeSetQuery(v){knowledgeQuery=v||''; render()}
async function knowledgeCopy(id){
  const t=knowledgeTemplate(id); if(!t)return;
  const c=selectedContactId?crmFindContact(selectedContactId):null;
  await copyText(knowledgeContactText(t,c));
}
function knowledgeFindContact(){
  const term=window.prompt('Name, Firma oder Kontakt-ID eingeben:');
  if(!term)return null;
  const q=term.trim().toLowerCase();
  const matches=crmContacts().filter(c=>crmPersonFilter(c) && crmShortLabel(c).toLowerCase().includes(q));
  if(!matches.length){alert('Kein passender Kontakt gefunden.'); return null;}
  if(matches.length===1)return matches[0];
  const list=matches.slice(0,10).map((c,i)=>`${i+1}. ${crmFullName(c)} · ${c.contactCode||''} · ${c.company||''}`).join('\n');
  const pick=Number(window.prompt(`Mehrere Kontakte gefunden:\n${list}\n\nNummer auswählen:`));
  return matches[pick-1]||null;
}
async function knowledgeSend(id){
  const t=knowledgeTemplate(id); if(!t)return;
  const c=(selectedContactId&&crmFindContact(selectedContactId))||knowledgeFindContact();
  if(!c)return;
  const text=knowledgeContactText(t,c);

  if(t.category==='WhatsApp'){
    const num=crmFullPhone(c);
    if(!num){alert('Bei diesem Kontakt fehlt die Mobilnummer.');return;}
    crmAddCommunicationLog(c,'WhatsApp',t.title); save();
    window.location.href=`https://wa.me/${num}?text=${encodeURIComponent(text)}`;
    return;
  }

  if(t.category==='E-Mail'){
    if(!c.email){alert('Bei diesem Kontakt fehlt die E-Mail-Adresse.');return;}
    crmAddCommunicationLog(c,'E-Mail',t.title); save();
    window.location.href=`mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(t.subject||t.title)}&body=${encodeURIComponent(text)}`;
    return;
  }

  if(t.category==='LinkedIn' || t.category==='Facebook'){
    const url=t.category==='LinkedIn' ? c.linkedin : c.facebook;
    const channel=t.category;
    const opened=url ? window.open('about:blank','_blank') : null;
    await copyText(text);
    crmAddCommunicationLog(c,channel,`${t.title} vorbereitet`); save();
    selectedContactId=c.id;
    if(url){
      const target=crmWebsiteHref(url);
      if(opened){opened.location.href=target;}
      else {window.open(target,'_blank');}
      alert(`Text wurde kopiert. Das ${channel}-Profil wird geöffnet. Bitte den Text dort einfügen.`);
    }else{
      alert(`Text wurde kopiert. Bei diesem Kontakt ist noch kein ${channel}-Profil hinterlegt.`);
    }
    return;
  }

  await copyText(text);
  selectedContactId=c.id; selectedContactTab='communication'; current='recruiting'; render();
  setTimeout(()=>alert('Vorlage wurde kopiert. Die Kontaktakte ist geöffnet.'),50);
}
function knowledgeOpenForRecommendation(contactId){
  const c=crmFindContact(contactId); if(!c)return;
  const rec=crmAssistantRecommendation(c); selectedContactId=c.id;
  knowledgeQuery='';
  knowledgeCategory='Alle'; current=(c.owner==='Martina'?'wissen_martina':'wissen_peter'); openNavGroupLabel='Recruiting-Bibliothek'; searchInput.value=''; render();
  setTimeout(()=>scrollToContent(),0);
}
function renderKnowledge(s){
  const folderOwner=s.owner||'';
  const allOwnerTemplates=folderOwner?knowledgeAllTemplates().filter(t=>(t.owner||'Peter')===folderOwner):knowledgeAllTemplates();
  const cats=['Alle',...new Set(allOwnerTemplates.map(t=>t.category).filter(Boolean))];
  const q=(knowledgeQuery||'').trim().toLowerCase();
  const contact=selectedContactId?crmFindContact(selectedContactId):null;
  const source=contact?knowledgeTemplatesForContact(contact):allOwnerTemplates;
  const filtered=source.filter(t=>(knowledgeCategory==='Alle'||t.category===knowledgeCategory) && (!q||`${t.title} ${t.category} ${t.keywords} ${t.text} ${t.owner||''}`.toLowerCase().includes(q)));
  view.innerHTML=`<div class="card knowledge-head"><p class="eyebrow">Version 2.0.0</p><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p>${contact?`<p class="knowledge-contact">Aktueller Kontakt: <strong>${esc(crmFullName(contact))}</strong> · ${esc(contact.contactCode||'')}</p>`:''}<input class="knowledge-search" type="search" placeholder="Vorlage suchen, z. B. Landingpage oder Follow-up" value="${esc(knowledgeQuery)}" oninput="knowledgeQuery=this.value; renderKnowledge(sectionById(current))"></div>
  <div class="knowledge-categories">${cats.map(cat=>`<button class="${knowledgeCategory===cat?'primary':'copy-btn'}" onclick="knowledgeSetCategory('${esc(cat)}')">${esc(cat)}</button>`).join('')}</div>
  <div class="knowledge-grid">${filtered.length?filtered.map(t=>`<article class="knowledge-card"><span class="knowledge-label">${esc(t.category)}</span><h3>${esc(t.title)}</h3><div class="knowledge-text">${esc(knowledgeContactText(t,contact)).replaceAll('\n','<br>')}</div><div class="knowledge-actions"><button class="copy-btn" onclick="knowledgeCopy('${esc(t.id)}')">Kopieren</button><button class="primary" onclick="knowledgeSend('${esc(t.id)}')">Jetzt verwenden</button></div></article>`).join(''):'<div class="card"><p>Keine passende Vorlage gefunden.</p></div>'}</div>`;
}

function renderAssistantPage(s){
  ensureCrm();
  const person=currentPerson();
  const items=crmAssistantItems(person);
  view.innerHTML=`<div class="card assistant-page-head"><p class="eyebrow">Version 2.0.0</p><h2>${esc(s.title)}</h2><p>${esc(s.text||'')}</p><div class="smart-priority-summary">${(()=>{const x=crmSmartPriorityCounts(crmDashboardContacts());return `<span class="smart-priority smart-priority-red">${x.red} heute</span><span class="smart-priority smart-priority-orange">${x.orange} bald</span><span class="smart-priority smart-priority-green">${x.green} im Plan</span>`})()}</div></div>
  ${crmRenderAssistantList(person,Math.max(items.length,12))}`;
}

function renderRecruiting(s){
  ensureCrm();
  const person=currentPerson();
  const my=crmContacts().filter(crmPersonFilter);
  const dueToday=my.filter(c=>c.followDate && c.followDate<=crmToday() && crmActive(c));
  const open=my.filter(c=>!c.nextStep && crmActive(c));
  const active=my.filter(crmActive);
  const detail=selectedContactId ? (selectedContactId==='__new' ? renderCrmForm(null) : renderCrmDetail(selectedContactId)) : '';
  const mobile=window.matchMedia && window.matchMedia('(max-width: 760px)').matches;
  const html=`
    ${renderCrmDashboard(person,my,dueToday,open,active)}
    ${mobile?detail:''}
    <div id="crmContactsSection" class="card section-card"><h3>Adressdatenbank</h3>${renderCrmToolbar()}${renderCrmContacts()}</div>
    ${mobile?'':detail}
    <div class="card"><h3>Teamübersicht</h3>${renderCrmTeamOverview()}</div>`;
  view.innerHTML=html;
}
function crmGreeting(person){
  const h=new Date().getHours();
  const name=esc(person);
  if(h<12)return `Guten Morgen ${name}.`;
  if(h<18)return `Hallo ${name}.`;
  return `Guten Abend ${name}.`;
}

function crmDateAddKey(days){const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10)}
function crmTaskContact(task){return task.contactId ? crmFindContact(task.contactId) : null}
function crmProcessItems(person){
  ensureCrm();
  const contacts=crmContacts().filter(c=>((c.owner||'Peter')===person || (c.support||'')===person));
  const contactIds=new Set(contacts.map(c=>c.id));
  const items=[];
  crmTasks().forEach(t=>{
    if(t.done)return;
    const c=crmTaskContact(t);
    if((t.owner||'Peter')!==person && !(c && contactIds.has(c.id)))return;
    items.push({kind:'task',id:t.id,contactId:t.contactId||'',title:t.title||'Aufgabe',due:t.due||'',time:t.time||'',priority:t.priority||'A',contact:c});
  });
  contacts.forEach(c=>{
    if(c.followDate && crmActive(c))items.push({kind:'follow',id:c.id,contactId:c.id,title:c.nextStep||'Wiedervorlage bearbeiten',due:c.followDate,time:c.followTime||'',priority:c.priority||'A',contact:c});
  });
  return items.sort((a,b)=>String(a.due||'9999').localeCompare(String(b.due||'9999')) || String(a.time||'').localeCompare(String(b.time||'')) || String(a.priority||'C').localeCompare(String(b.priority||'C')));
}
function crmProcessBucket(items,type){
  const today=crmToday(); const week=crmDateAddKey(7);
  if(type==='overdue')return items.filter(i=>i.due && i.due<today);
  if(type==='today')return items.filter(i=>i.due===today || !i.due);
  if(type==='week')return items.filter(i=>i.due && i.due>today && i.due<=week);
  return items;
}
function crmCompleteProcessItem(kind,id){
  ensureCrm();
  if(kind==='task'){
    const t=crmTasks().find(x=>x.id===id); if(t){t.done=true; t.doneAt=todayKey();}
  }else if(kind==='follow'){
    const c=crmFindContact(id);
    if(c){
      if(!Array.isArray(c.timeline))c.timeline=[];
      c.timeline.push({date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),type:'Wiedervorlage',text:`Erledigt: ${c.nextStep||'Wiedervorlage'}`});
      c.followDate=''; c.followTime=''; c.updatedAt=new Date().toISOString();
    }
  }
  save(); render();
}
function crmPriorityClass(priority){return 'prio-'+String(priority||'A').toLowerCase()}
function crmRenderProcessList(title,items,emptyText,extraClass=''){
  const countBadge = items.length ? `<span class="process-count">${items.length}${extraClass.includes('danger-zone')?' überfällig':''}</span>` : '';
  return `<div class="process-card ${extraClass}"><div class="process-card-head"><h4>${esc(title)}</h4>${countBadge}</div>${items.length?`<div class="process-list">${items.map(i=>{const c=i.contact; const name=c?crmFullName(c):i.title; const meta=c?[c.contactCode||'',c.company||c.job||'',c.city||''].filter(Boolean).join(' · '):''; return `<div class="process-item ${extraClass.includes('danger-zone')?'process-overdue-item':''}"><button class="process-main" onclick="crmOpenContact('${esc(i.contactId||'')}')"><strong>${esc(name)}</strong>${meta?`<span>${esc(meta)}</span>`:''}<div class="process-task-line"><b>Aufgabe:</b> ${esc(i.title)}</div><small><b>Fällig:</b> ${esc(i.due||'ohne Datum')}${i.time?' · '+esc(i.time):''}</small><small><b>Priorität:</b> <span class="priority-pill ${crmPriorityClass(i.priority)}">${esc(i.priority||'A')}</span></small></button><button class="copy-btn" onclick="crmCompleteProcessItem('${esc(i.kind)}','${esc(i.id)}')">✓ Erledigt</button></div>`}).join('')}</div>`:`<p class="small">${esc(emptyText)}</p>`}</div>`;
}
function crmNewContacts(person){
  const yesterday=crmDateAddKey(-1);
  return crmContacts().filter(c=>crmPersonFilter(c) && (String(c.createdAt||'').slice(0,10)>=yesterday)).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
}
function crmMetricsFor(person){
  const list=crmContacts().filter(c=>((c.owner||'Peter')===person || (c.support||'')===person));
  const active=list.filter(crmActive);
  return {
    contacts:list.length,
    active:active.length,
    tasks:crmProcessItems(person).length,
    landing:list.filter(c=>c.landingSent||c.landingSeen).length,
    v1:list.filter(c=>c.video1Seen).length,
    v2:list.filter(c=>c.video2Seen).length,
    v3:list.filter(c=>c.video3Seen).length,
    partners:list.filter(c=>crmEnsurePhase(c)==='Geschäftspartner').length
  };
}
function crmSuggestions(person){
  const list=crmContacts().filter(c=>((c.owner||'Peter')===person || (c.support||'')===person) && crmActive(c));
  const suggestions=[];
  list.forEach(c=>{
    if(c.landingSent && !c.landingSeen)suggestions.push({c,text:'Prüfen, ob Landingpage angekommen ist'});
    else if(c.landingSeen && !(c.video1Seen&&c.video2Seen&&c.video3Seen))suggestions.push({c,text:'Landingpage-Fortschritt beobachten'});
    else if(c.video1Seen&&c.video2Seen&&c.video3Seen&&!c.followupActive)suggestions.push({c,text:'Follow-up-Gespräch führen'});
    else if(c.video3Seen && !c.followupActive)suggestions.push({c,text:'Follow-up starten'});
    else if(!c.nextStep)suggestions.push({c,text:'Nächsten Schritt festlegen'});
  });
  return suggestions.slice(0,8);
}
function crmCreateSuggestedTask(contactId,text){
  const c=crmFindContact(contactId); if(!c)return;
  const d=new Date(); d.setDate(d.getDate()+1);
  if(!state.crm.tasks)state.crm.tasks=[];
  state.crm.tasks.push({id:crmId(),contactId,title:text,due:d.toISOString().slice(0,10),time:'',priority:c.priority||'A',done:false,owner:c.owner||currentPerson(),createdAt:new Date().toISOString()});
  c.nextStep=text;
  c.updatedAt=new Date().toISOString();
  save(); render();
}

function crmAssistantRecommendation(c){
  if(!c)return null;
  const phase=crmEnsurePhase(c);
  if(['Kein Interesse','Archiv'].includes(phase))return null;

  if(phase==='Erstansprache')return {step:'interest',title:'Reaktion prüfen und Interesse klären',task:'Reaktion prüfen und Interesse klären',nextPhase:'Interesse',days:2,button:'Interesse markieren',hint:'Dokumentiere die Reaktion. Bei Interesse führst du den Kontakt in die nächste Phase.'};
  if(phase==='Interesse')return {step:'information',title:'Passende Informationen senden',task:'Passende Informationen senden',nextPhase:'Informationen versendet',days:2,button:'Informationen als gesendet markieren',hint:'Sende die vereinbarte Landingpage oder die passende Information aus der Recruiting-Bibliothek.'};
  if(phase==='Informationen versendet'){
    if(c.landingSent && !c.landingSeen)return {step:'linkcheck',title:'Prüfen, ob die Informationen angekommen sind',task:'Prüfen, ob die Informationen angekommen sind',nextPhase:'Informationen versendet',days:1,button:'Nachfrage protokollieren',hint:'Frage kurz, ob der Link oder die Information angekommen ist und funktioniert.'};
    return {step:'followup',title:'Persönlich nachfassen',task:'Persönlich nachfassen',nextPhase:'Nachfassen',days:2,button:'Nachfassen markieren',hint:'Kläre den persönlichen Eindruck und offene Fragen.'};
  }
  if(phase==='Nachfassen')return {step:'appointment',title:'Gesprächstermin vereinbaren',task:'Gesprächstermin vereinbaren',nextPhase:'Termin vereinbart',days:2,button:'Terminphase markieren',hint:'Vereinbare einen klaren Telefon-, Zoom- oder persönlichen Termin.'};
  if(phase==='Termin vereinbart')return {step:'presentation',title:'Termin vorbereiten und durchführen',task:'Termin vorbereiten und durchführen',nextPhase:'Präsentation',days:1,button:'Präsentation markieren',hint:'Bestätige den Termin und bereite die wichtigsten Gesprächspunkte vor.'};
  if(phase==='Präsentation')return {step:'decision',title:'Entscheidungsgespräch führen',task:'Entscheidungsgespräch führen',nextPhase:'Entscheidung',days:1,button:'Entscheidungsphase markieren',hint:'Besprich die offenen Fragen und vereinbare eine klare Entscheidung.'};
  if(phase==='Entscheidung')return {step:'partner',title:'Entscheidung klären',task:'Entscheidung klären',nextPhase:'Geschäftspartner',days:1,button:'Als Geschäftspartner markieren',hint:'Halte die Entscheidung fest. Bei einer Absage wählst du „Kein Interesse“.'};
  if(phase==='Geschäftspartner')return {step:'onboarding',title:'Start und Einarbeitung begleiten',task:'Start und Einarbeitung begleiten',nextPhase:'Geschäftspartner',days:3,button:'Aufgabe anlegen',hint:'Lege den nächsten konkreten Einarbeitungs- oder Startschritt fest.'};
  return {step:'review',title:c.nextStep||'Kontaktstand prüfen',task:c.nextStep||'Kontaktstand prüfen',nextPhase:phase,days:1,button:'Wiedervorlage anlegen',hint:'Prüfe den aktuellen Stand und lege den nächsten konkreten Schritt fest.'};
}

function crmAssistantPhaseAgeDays(c){
  const phase=crmEnsurePhase(c);
  const raw=salesPhaseEntryDate(c,phase) || String(c.updatedAt||c.createdAt||'').slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))return 0;
  const start=new Date(`${raw}T00:00:00`);
  const today=new Date(`${crmToday()}T00:00:00`);
  return Math.max(0,Math.floor((today-start)/86400000));
}
function crmAssistantPhaseLimit(phase){
  const limits={
    'Erstansprache':3,
    'Interesse':3,
    'Informationen versendet':4,
    'Nachfassen':4,
    'Termin vereinbart':3,
    'Präsentation':3,
    'Entscheidung':3,
    'Geschäftspartner':7
  };
  return limits[phase]||5;
}
function crmAssistantAlert(c){
  if(!c || !crmActive(c))return null;
  const today=crmToday();
  const phase=crmEnsurePhase(c);
  if(c.followDate && c.followDate<today){
    const days=Math.max(1,Math.floor((new Date(`${today}T00:00:00`)-new Date(`${c.followDate}T00:00:00`))/86400000));
    return {severity:3,type:'overdue',title:'Wiedervorlage überfällig',text:`Seit ${days} ${days===1?'Tag':'Tagen'} überfällig. Bitte heute bearbeiten.`};
  }
  if(!c.followDate){
    return {severity:2,type:'missing',title:'Keine Wiedervorlage',text:'Für diesen aktiven Kontakt ist kein nächstes Datum festgelegt.'};
  }
  const age=crmAssistantPhaseAgeDays(c);
  const limit=crmAssistantPhaseLimit(phase);
  if(age>=limit){
    return {severity:1,type:'stalled',title:'Zu lange in dieser Phase',text:`Seit ${age} Tagen in „${phase}“. Bitte den Stand prüfen.`};
  }
  return null;
}

function crmAssistantItems(person){
  return crmContacts().filter(c=>((c.owner||'Peter')===person || (c.support||'')===person) && crmActive(c)).map(c=>({c,rec:crmAssistantRecommendation(c),alert:crmAssistantAlert(c)})).filter(x=>x.rec).sort((a,b)=>crmSmartPriority(a.c).rank-crmSmartPriority(b.c).rank || (b.alert?.severity||0)-(a.alert?.severity||0) || String(a.c.priority||'C').localeCompare(String(b.c.priority||'C')) || String(a.c.followDate||'9999').localeCompare(String(b.c.followDate||'9999')) || crmFullName(a.c).localeCompare(crmFullName(b.c),'de'));
}
function crmAssistantSuggestedDate(c,rec){
  if(!rec)return todayKey();
  return crmDateAddKey(Number(rec.days||1));
}
function crmAssistantSelectedDate(contactId,rec){
  const input=document.getElementById(`crm_assistant_follow_${contactId}`);
  const value=String(input?.value||'').trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
  const c=crmFindContact(contactId);
  if(c && /^\d{4}-\d{2}-\d{2}$/.test(String(c.followDate||'')))return c.followDate;
  return crmAssistantSuggestedDate(c,rec);
}
function crmAssistantSetFollowDate(contactId,value){
  const c=crmFindContact(contactId); if(!c)return;
  const date=String(value||'').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
  const oldDate=String(c.followDate||'');
  c.followDate=date;
  c.followTime='';
  c.updatedAt=new Date().toISOString();
  if(!Array.isArray(c.timeline))c.timeline=[];
  if(oldDate!==date)c.timeline.push({date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),type:'Wiedervorlage',text:`Wiedervorlage geändert: ${oldDate||'offen'} → ${date}`});
  save();
  const head=document.querySelector('.contact-head-meta p.small strong');
}
function crmAssistantCreateTask(contactId,days){
  const c=crmFindContact(contactId); if(!c)return;
  const rec=crmAssistantRecommendation(c); if(!rec)return;
  const due=crmAssistantSelectedDate(contactId,rec);
  if(!state.crm.tasks)state.crm.tasks=[];
  state.crm.tasks.push({id:crmId(),contactId:c.id,title:rec.task,due,time:'',priority:c.priority||'A',done:false,owner:c.owner||currentPerson(),createdAt:new Date().toISOString()});
  c.nextStep=rec.task; c.followDate=due; c.followTime=''; c.updatedAt=new Date().toISOString();
  if(!Array.isArray(c.timeline))c.timeline=[];
  c.timeline.push({date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),type:'Recruiting-Assistent',text:`Aufgabe angelegt: ${rec.task} · fällig am ${due}`});
  save(); render();
}
function crmAssistantCompleteOpenTask(c,rec){
  const candidates=crmTasks().filter(t=>!t.done && t.contactId===c.id);
  const wanted=[rec?.task,c.nextStep].filter(Boolean).map(v=>String(v).trim().toLowerCase());
  let task=candidates.find(t=>wanted.includes(String(t.title||'').trim().toLowerCase()));
  if(!task && candidates.length===1)task=candidates[0];
  if(task){task.done=true; task.doneAt=todayKey(); return task.title||rec?.task||c.nextStep||'Aufgabe';}
  return rec?.task||c.nextStep||rec?.title||'Arbeitsschritt';
}
function crmAssistantApply(contactId){
  const c=crmFindContact(contactId); if(!c)return;
  const rec=crmAssistantRecommendation(c); if(!rec)return;
  const oldPhase=crmEnsurePhase(c);
  const targetPhase=rec.nextPhase||oldPhase;
  if(['Geschäftspartner','Kein Interesse','Archiv'].includes(targetPhase) && targetPhase!==oldPhase){
    const ok=window.confirm(`Möchtest du den Recruiting-Prozess für diesen Kontakt wirklich mit „${targetPhase}“ abschließen?`);
    if(!ok)return;
  }
  const nowTime=new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
  if(!Array.isArray(c.timeline))c.timeline=[];
  const completedTitle=crmAssistantCompleteOpenTask(c,rec);

  if(rec.step==='information'){
    c.landingSent=true;
    c.landingSentDate=c.landingSentDate||todayKey();
  }
  if(rec.step==='followup')c.followupActive=true;

  if(targetPhase!==oldPhase){
    c.phase=targetPhase;
    c.status=crmStatusFromPhase(targetPhase);
    c.timeline.push({date:todayKey(),time:nowTime,type:'Recruiting-Phase',text:`Phase geändert: ${oldPhase} → ${targetPhase}`});
  }

  const nextRec=crmAssistantRecommendation(c);
  if(nextRec){
    c.nextStep=nextRec.task;
    c.followDate=crmAssistantSuggestedDate(c,nextRec);
    c.followTime='';
  }else{
    c.nextStep='';
    c.followDate='';
    c.followTime='';
  }
  c.updatedAt=new Date().toISOString();
  c.timeline.push({date:todayKey(),time:nowTime,type:'Recruiting-Assistent',text:`Schritt abgeschlossen: ${completedTitle}. ${nextRec?`Nächster Schritt: ${nextRec.task} · Wiedervorlage: ${c.followDate}`:'Recruiting-Prozess abgeschlossen.'}`});
  save(); render();
}
function crmRenderAssistantList(person,limit=6){
  const allItems=crmAssistantItems(person);
  const items=allItems.slice(0,limit);
  const urgent=allItems.filter(x=>(x.alert?.severity||0)>=2).length;
  const stalled=allItems.filter(x=>x.alert?.type==='stalled').length;
  return `<div class="process-card assistant-card"><div class="process-card-head"><div><h4>Recruiting-Assistent</h4>${urgent||stalled?`<p class="assistant-alert-summary">${urgent?`${urgent} dringend`:''}${urgent&&stalled?' · ':''}${stalled?`${stalled} zu lange ohne Fortschritt`:''}</p>`:''}</div><span class="process-count">${allItems.length} Vorschläge</span></div>${items.length?`<div class="process-list">${items.map(({c,rec,alert})=>`<div class="process-item assistant-item ${alert?`assistant-alert-${alert.type}`:''}"><button class="process-main" onclick="crmOpenContact('${esc(c.id)}')"><strong>${esc(crmFullName(c))}</strong><span>${esc(c.contactCode||'')} · ${esc(c.company||c.job||'')} ${c.city?'· '+esc(c.city):''}</span><div class="smart-priority smart-priority-${crmSmartPriority(c).level}">${esc(crmSmartPriority(c).label)} · ${esc(crmSmartPriority(c).reason)}</div>${alert?`<div class="assistant-proactive-alert"><b>${esc(alert.title)}</b><small>${esc(alert.text)}</small></div>`:''}<div class="process-task-line"><b>Empfohlener Schritt:</b> ${esc(rec.title)}</div><small>${esc(rec.hint)}</small></button><div class="assistant-actions"><button class="copy-btn" onclick="knowledgeOpenForRecommendation('${esc(c.id)}')">Passende Vorlage</button><button class="copy-btn" onclick="crmAssistantCreateTask('${esc(c.id)}',${Number(rec.days||1)})">Aufgabe anlegen</button><button class="primary" onclick="crmAssistantApply('${esc(c.id)}')">Schritt abschließen und weiter</button></div></div>`).join('')}</div>`:'<p class="small">Aktuell gibt es keine neuen Empfehlungen.</p>'}</div>`;
}
function crmAssistantStatusText(c,rec){
  const today=crmToday();
  if(c.followDate && c.followDate<today)return `Überfällig seit ${formatDate(c.followDate)}. Jetzt bearbeiten: ${rec.title}.`;
  if(c.followDate===today)return `Heute vorgesehen: ${rec.title}.`;
  return `Nächster sinnvoller Schritt: ${rec.title}.`;
}
function crmRenderContactAssistant(c){
  const rec=crmAssistantRecommendation(c);
  if(!rec)return '';
  const suggestedDate=crmAssistantSuggestedDate(c,rec);
  const alert=crmAssistantAlert(c);
  return `<div class="process-card assistant-card contact-assistant"><div class="process-card-head"><h4>Recruiting-Assistent</h4><span class="badge">${esc(crmEnsurePhase(c))}</span></div>${alert?`<div class="assistant-proactive-alert assistant-proactive-alert-large ${alert.type}"><b>${esc(alert.title)}</b><span>${esc(alert.text)}</span></div>`:''}<div class="smart-priority smart-priority-${crmSmartPriority(c).level} smart-priority-large"><strong>${esc(crmSmartPriority(c).label)}</strong><span>${esc(crmSmartPriority(c).reason)}</span></div><p class="assistant-status-note"><strong>${esc(crmAssistantStatusText(c,rec))}</strong></p><p class="small">${esc(rec.hint)}</p><section class="assistant-followup assistant-followup-prominent" aria-label="Empfohlene Wiedervorlage"><div class="assistant-followup-title">Empfohlene Wiedervorlage</div><label for="crm_assistant_follow_${esc(c.id)}"><span>Datum</span><input id="crm_assistant_follow_${esc(c.id)}" type="date" value="${esc(suggestedDate)}" onchange="crmAssistantSetFollowDate('${esc(c.id)}',this.value)"></label><p class="assistant-followup-current">Aktuell vorgeschlagen: <strong>${esc(formatDate(suggestedDate))}</strong></p><small>Du kannst das Datum ändern. Aufgabe anlegen und Schritt abschließen übernehmen genau dieses Datum.</small></section><div class="quick-actions"><button class="copy-btn" onclick="knowledgeOpenForRecommendation('${esc(c.id)}')">Alle passenden Vorlagen</button><button class="copy-btn" onclick="crmAssistantCreateTask('${esc(c.id)}',${Number(rec.days||1)})">Aufgabe anlegen</button><button class="primary" onclick="crmAssistantApply('${esc(c.id)}')">Schritt abschließen und weiter</button></div>${crmRenderRecommendedTemplates(c)}</div>`;
}
function crmContactBucketSort(list){
  const rank={A:0,B:1,C:2};
  return list.slice().sort((a,b)=>{
    const pa=rank[a.priority]??9, pb=rank[b.priority]??9;
    if(pa!==pb)return pa-pb;
    const da=a.followDate||'9999-12-31', db=b.followDate||'9999-12-31';
    if(da!==db)return da.localeCompare(db);
    const ua=String(a.updatedAt||a.createdAt||''), ub=String(b.updatedAt||b.createdAt||'');
    if(ua!==ub)return ub.localeCompare(ua);
    return crmFullName(a).localeCompare(crmFullName(b),'de');
  });
}
function crmRenderContactBucket(title,items,emptyText,extraClass=''){
  const list=crmContactBucketSort(items);
  return `<div class="process-card contact-bucket ${extraClass}"><div class="process-card-head"><h4>${esc(title)}</h4><span class="process-count">${list.length}</span></div>${list.length?`<div class="process-list">${list.slice(0,12).map(c=>`<button class="process-main" onclick="crmOpenContact('${esc(c.id)}')"><strong>${esc(crmFullName(c))}</strong><span>${esc(c.contactCode||'')} · ${esc(c.company||c.job||'')} ${c.city?'· '+esc(c.city):''}</span><small>${c.followDate?`Wiedervorlage: ${esc(formatDate(c.followDate))} · `:''}Prio ${esc(c.priority||'A')} · ${esc(crmEnsurePhase(c))}</small></button>`).join('')}</div>`:`<p class="small">${esc(emptyText)}</p>`}</div>`;
}
function renderProcessManager(person){
  const all=crmProcessItems(person);
  const contacts=crmContacts().filter(c=>(person==='Alle'||(c.owner||'Peter')===person));
  const todayKeyValue=crmToday();
  const phaseOf=c=>crmEnsurePhase(c);
  const isTerminal=c=>['Geschäftspartner','Kein Interesse','Archiv'].includes(phaseOf(c));
  const isAppointment=c=>/termin|zoom|präsentation/i.test(`${c.nextStep||''} ${c.status||''} ${phaseOf(c)}`);
  const overdueContacts=contacts.filter(c=>!isTerminal(c)&&c.followDate&&c.followDate<todayKeyValue);
  const todayAppointments=contacts.filter(c=>!isTerminal(c)&&c.followDate===todayKeyValue&&isAppointment(c));
  const todayDue=contacts.filter(c=>!isTerminal(c)&&c.followDate===todayKeyValue&&!isAppointment(c));
  const futureFollowups=contacts.filter(c=>!isTerminal(c)&&c.followDate&&c.followDate>todayKeyValue);
  const withoutFollowup=contacts.filter(c=>!isTerminal(c)&&!c.followDate);
  const partners=contacts.filter(c=>phaseOf(c)==='Geschäftspartner');
  const noInterest=contacts.filter(c=>phaseOf(c)==='Kein Interesse');
  const archived=contacts.filter(c=>phaseOf(c)==='Archiv');
  const m=crmMetricsFor(person);
  const suggestions=crmSuggestions(person);
  return `<div class="card process-manager"><div class="section-title-row"><div><p class="eyebrow">Version 2.0.0</p><h3>Kontakte nach Arbeitspriorität</h3></div><span class="badge">${all.length} offene Aufgaben</span></div>
    <div class="metric-grid"><div><strong>${m.contacts}</strong><span>Kontakte</span></div><div><strong>${m.tasks}</strong><span>Aufgaben</span></div><div><strong>${m.landing}</strong><span>Landingpages</span></div><div><strong>${m.v1}</strong><span>Video 1</span></div><div><strong>${m.v2}</strong><span>Video 2</span></div><div><strong>${m.v3}</strong><span>Video 3</span></div><div><strong>${m.partners}</strong><span>Aktive Geschäftspartner</span></div></div>
    <div class="grid process-grid contact-priority-grid">
      ${crmRenderContactBucket('Überfällige Kontakte',overdueContacts,'Keine überfälligen Kontakte.','danger-zone')}
      ${crmRenderContactBucket('Heute fällige Kontakte',todayDue,'Heute sind keine Kontakte fällig.')}
      ${crmRenderContactBucket('Heutige Termine',todayAppointments,'Heute stehen keine Termine an.')}
      ${crmRenderContactBucket('Wiedervorlagen',futureFollowups,'Keine künftigen Wiedervorlagen vorhanden.')}
      ${crmRenderContactBucket('Kontakte ohne Wiedervorlage',withoutFollowup,'Alle aktiven Kontakte haben eine Wiedervorlage.','attention-zone')}
      ${crmRenderContactBucket('Aktive Geschäftspartner',partners,'Noch keine aktiven Geschäftspartner vorhanden.')}
      ${crmRenderContactBucket('Kein Interesse',noInterest,'Keine Kontakte mit dem Status „Kein Interesse“.')}
      ${crmRenderContactBucket('Archiv',archived,'Das Archiv ist leer.')}
    </div>
    ${crmRenderAssistantList(person,8)}
    <div class="process-card"><h4>Automatische Vorschläge</h4>${suggestions.length?suggestions.map(s=>`<div class="process-item"><button class="process-main" onclick="crmOpenContact('${esc(s.c.id)}')"><strong>${esc(crmFullName(s.c))}</strong><span>${esc(s.c.contactCode||'')} · ${esc(s.c.company||s.c.job||'')}</span><small>${esc(s.text)}</small></button><button class="copy-btn" onclick="crmCreateSuggestedTask('${esc(s.c.id)}','${esc(s.text)}')">Aufgabe anlegen</button></div>`).join(''):'<p class="small">Aktuell keine automatischen Vorschläge.</p>'}</div>
  </div>`;
}

function renderCrmDashboard(person,my,dueToday,open,active){
  const done=crmDailyDone();
  const tasks=crmTodayTaskList(person,my,dueToday,open);
  const doneCount=tasks.filter(t=>done[t[0]]).length;
  const percent=tasks.length?Math.round(doneCount/tasks.length*100):0;
  return `<div class="card hero-dashboard">
    <div class="hero-head"><div><p class="eyebrow">Persönliches Dashboard</p><h2>${crmGreeting(person)}</h2><p>Heute konzentrieren wir uns auf: <strong>${esc(crmFocusForToday(person))}</strong></p></div><div class="hero-score"><strong>${doneCount}/${tasks.length}</strong><span>Aufgaben erledigt</span></div></div>
    <div class="progress-bar"><div class="progress-fill" style="width:${percent}%"></div></div>
    <div class="task-list">${tasks.map(t=>`<label class="task-item ${done[t[0]]?'done':''}"><input type="checkbox" ${done[t[0]]?'checked':''} onchange="crmToggleDailyTask('${esc(t[0])}')"><span>${esc(t[1])}</span></label>`).join('')}</div>
    <div class="quick-actions"><button class="primary" onclick="selectedContactId='__new'; selectedContactTab='overview'; render(); setTimeout(()=>document.getElementById('crmFormCard')?.scrollIntoView({behavior:'smooth'}),50)">Neuen Kontakt anlegen</button><button class="copy-btn" onclick="crmShowMyContacts()">Meine Kontakte anzeigen</button></div>
  </div>
  ${renderProcessManager(person)}
  <div class="grid dashboard-numbers">
    <div class="card"><h3>Heute fällig</h3><div class="big-number">${dueToday.length}</div><p class="small">Wiedervorlagen bis heute.</p></div>
    <div class="card"><h3>Aktive Kontakte</h3><div class="big-number">${active.length}</div><p class="small">Deine laufenden Kontakte.</p></div>
    <div class="card"><h3>Ohne nächsten Schritt</h3><div class="big-number">${open.length}</div><p class="small">Diese Kontakte brauchen eine klare Aufgabe.</p></div>
  </div>
  ${dueToday.length?`<div class="card"><h3>Heute zuerst erledigen</h3><div class="focus-list">${dueToday.slice(0,8).map(c=>`<button class="focus-contact" onclick="crmOpenContact('${esc(c.id)}')"><strong>${esc(crmFullName(c))}</strong><span>${esc(c.contactCode||'')} · ${esc(c.company||c.job||'')} ${c.city?'· '+esc(c.city):''}</span><small>${esc(c.followDate||'')} · ${esc(c.nextStep||'Nachfassen')}</small></button>`).join('')}</div></div>`:''}`;
}
function crmSetFilter(key,value){crmFilters[key]=value; render()}
function renderCrmToolbar(){
  return `<div class="crm-toolbar crm-toolbar-addressbook">
    <button class="primary crm-new-contact-top" onclick="selectedContactId='__new'; selectedContactTab='overview'; render()">Neuer Kontakt</button>
    <select id="crmOwnerFilter" onchange="crmSetFilter('owner',this.value)">${crmHtmlOptions(['Meine','Alle','Peter','Martina'],crmFilters.owner||'Meine')}</select>
    <select id="crmStatusFilter" onchange="crmSetFilter('status',this.value)"><option value="">Alle Phasen</option>${crmHtmlOptions(crmStatusOptions(),crmFilters.status||'')}</select>
    <select id="crmSourceFilter" onchange="crmSetFilter('source',this.value)"><option value="">Alle Quellen</option>${crmHtmlOptions(crmSources(),crmFilters.source||'')}</select>
    <select id="crmPriorityFilter" onchange="crmSetFilter('priority',this.value)"><option value="">Alle Prioritäten</option>${crmHtmlOptions(crmPriorities(),crmFilters.priority||'')}</select>
    <select id="crmJobFilter" onchange="crmSetFilter('job',this.value)"><option value="">Alle Berufe</option>${crmHtmlOptions(crmJobOptions().filter(x=>x!=='Sonstiges'),crmFilters.job||'')}</select>
    <select id="crmBranchFilter" onchange="crmSetFilter('branch',this.value)"><option value="">Alle Branchen</option>${crmHtmlOptions(crmBranchOptions().filter(x=>x!=='Sonstige Branche'),crmFilters.branch||'')}</select>
    <select id="crmTargetFilter" onchange="crmSetFilter('targetGroup',this.value)"><option value="">Alle Zielgruppen</option>${crmHtmlOptions(crmTargetGroupOptions().filter(x=>!x.startsWith('Sonstige')),crmFilters.targetGroup||'')}</select>
    <select id="crmTagFilter" onchange="crmSetFilter('tag',this.value)"><option value="">Alle Schlagwörter</option>${crmHtmlOptions(crmAllTags(),crmFilters.tag||'')}</select>
    <input id="crmSearch" class="crm-search-wide" type="search" value="${esc(crmFilters.q||'')}" placeholder="Kontakt suchen: ID, Name, Firma, Ort, Telefon, E-Mail, LinkedIn oder Facebook" oninput="crmSetFilter('q',this.value)">
  </div>`;
}
function crmContactLastActivityText(c){
  const a=crmLastActivity(c);
  if(!a)return 'Noch keine Aktivität';
  return `${a.date||''}${a.type?' · '+a.type:''}`;
}
function crmSetQuickFollowDate(id){
  const c=crmFindContact(id); if(!c)return;
  const current=c.followDate||crmToday();
  const value=window.prompt('Wiedervorlage eingeben (JJJJ-MM-TT):',current);
  if(value===null)return;
  const date=String(value||'').trim();
  if(date && !/^\d{4}-\d{2}-\d{2}$/.test(date)){alert('Bitte das Datum im Format JJJJ-MM-TT eingeben.');return;}
  c.followDate=date; c.followTime=''; c.updatedAt=new Date().toISOString();
  if(!Array.isArray(c.timeline))c.timeline=[];
  c.timeline.push({date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),type:'Wiedervorlage',text:date?`Wiedervorlage gesetzt: ${date}`:'Wiedervorlage entfernt'});
  save(); render();
}
function crmListQuickAction(c,kind){
  if(kind==='phone')return crmFullPhone(c)?`<a class="crm-list-action" href="tel:+${esc(crmFullPhone(c))}" onclick="event.stopPropagation();crmQuickLog('${esc(c.id)}','Telefon','Anruf aus Kontaktübersicht gestartet','Nachfassen')">Telefon</a>`:'';
  if(kind==='whatsapp')return crmFullPhone(c)?`<a class="crm-list-action" href="${esc(crmBuildCommunicationUrl(c,'WhatsApp','free'))}" onclick="event.stopPropagation();crmQuickLog('${esc(c.id)}','WhatsApp','WhatsApp aus Kontaktübersicht geöffnet','WhatsApp senden')">WhatsApp</a>`:'';
  if(kind==='email')return c.email?`<a class="crm-list-action" href="mailto:${esc(c.email)}" onclick="event.stopPropagation()">E-Mail</a>`:'';
  if(kind==='linkedin')return c.linkedin?`<a class="crm-list-action" href="${esc(crmWebsiteHref(c.linkedin))}" target="_blank" rel="noopener" onclick="event.stopPropagation();crmQuickLog('${esc(c.id)}','LinkedIn','LinkedIn-Profil aus Kontaktübersicht geöffnet','Nachfassen')">LinkedIn</a>`:'';
  return '';
}
function renderCrmContacts(){
  const list=crmFilteredContacts();
  if(!list.length)return `<p class="small">Noch keine Kontakte in dieser Ansicht.</p>`;
  return `<div class="contact-list contact-list-detailed">${list.map(c=>`<article data-contact-id="${esc(c.id)}" class="contact-card contact-card-detailed ${selectedContactId===c.id?'active':''}" onclick="if(!event.target.closest('a,button,input,select,textarea'))crmOpenContact('${esc(c.id)}')">
    <button type="button" class="contact-card-main" onclick="event.stopPropagation();crmOpenContact('${esc(c.id)}')">
      <div class="contact-card-name"><strong>${esc(crmFullName(c))}</strong><span>${esc(c.contactCode||'')}</span><small>${esc(c.company||c.job||'')} ${c.city?'· '+esc(c.city):''}${c.source?' · '+esc(c.source):''}</small>${crmTagChips(c)?`<div class="contact-tags">${crmTagChips(c)}</div>`:''}</div>
      <div class="contact-card-state"><span class="priority-pill ${crmPriorityClass(c.priority)}">Priorität ${esc(c.priority||'A')}</span><span class="badge">${esc(crmEnsurePhase(c))}</span></div>
      <div class="contact-card-work"><small><b>Wiedervorlage:</b> ${esc(c.followDate?formatDate(c.followDate):'offen')}</small><small><b>Nächster Schritt:</b> ${esc(c.nextStep||'offen')}</small><small><b>Letzte Aktivität:</b> ${esc(crmContactLastActivityText(c))}</small></div>
    </button>
    <div class="crm-list-actions">${crmListQuickAction(c,'phone')}${crmListQuickAction(c,'whatsapp')}${crmListQuickAction(c,'email')}${crmListQuickAction(c,'linkedin')}<button type="button" class="crm-list-action" onclick="event.stopPropagation();crmSetQuickFollowDate('${esc(c.id)}')">Wiedervorlage</button><button type="button" class="crm-list-action crm-list-open" onclick="event.stopPropagation();crmOpenContact('${esc(c.id)}')">Kontakt öffnen</button></div>
  </article>`).join('')}</div>`;
}
function renderCrmEmptyState(){return `<div class="card empty-state"><h3>Kontaktakte</h3><p>Wähle einen Kontakt aus der Liste oder lege einen neuen Kontakt an.</p><button class="primary" onclick="selectedContactId='__new'; render()">Neuen Kontakt anlegen</button></div>`}
function renderCrmForm(c){
  c=c||{owner:currentPerson(),createdBy:currentPerson(),status:'Erstansprache',phase:'Erstansprache',priority:'A',source:'LinkedIn',phoneCountry:'+49',interest:'3',trust:'3',activityLevel:'3'};
  const id=c.id||'';
  const input=(k,label,type='text')=>`<label>${label}<input id="crm_${k}" type="${type}" value="${esc(c[k]||'')}"></label>`;
  const nextSelected=crmNextStepOptions().includes(c.nextStep||'') ? (c.nextStep||'') : ((c.nextStep||'') ? 'Sonstiges' : '');
  const nextOther=(c.nextStep && !crmNextStepOptions().includes(c.nextStep)) ? c.nextStep : '';
  const stars=(k,label,val)=>`<label>${label}<span class="field-hint">1 = gering · 5 = hoch</span><select id="crm_${k}">${crmHtmlOptions(['1','2','3','4','5'],String(val||'3'))}</select></label>`;
  return `<div id="crmFormCard" class="card"><h3>${id?'Kontakt bearbeiten':'Neuen Kontakt anlegen'}</h3>
    <div class="crm-form-group"><h4>Kontaktkopf</h4><div class="crm-form">
      <label>Kontakt-ID<input id="crm_contactCode" value="${esc(c.contactCode||'wird beim Speichern vergeben')}" disabled></label>
    </div></div>
    <div class="crm-form-group"><h4>Persönliche Daten</h4><div class="crm-form">${input('firstName','Vorname')}${input('lastName','Nachname')}${input('company','Firma')}${input('birthday','Geburtsdatum','date')}${crmSelectWithOther('job','Beruf',crmJobOptions(),c.job||'','Sonstiges')}${crmSelectWithOther('branch','Branche',crmBranchOptions(),c.branch||'','Sonstige Branche')}${input('street','Straße und Hausnummer')}${input('postalCode','PLZ')}${input('city','Ort')}<label>Ländervorwahl<select id="crm_phoneCountry">${crmHtmlOptions(crmPhoneCountryOptions(),c.phoneCountry||'+49')}</select></label>${input('phone','Mobilnummer','tel')}${input('email','E-Mail','email')}${input('website','Website','url')}</div></div>
    <div class="crm-form-group"><h4>Online-Profile</h4><div class="crm-form">${input('linkedin','LinkedIn-Profil','url')}${input('facebook','Facebook-Profil','url')}${input('instagram','Instagram-Profil','url')}<label class="check-inline"><input id="crm_whatsapp" type="checkbox" ${c.whatsapp?'checked':''}> WhatsApp vorhanden</label></div></div>
    <div class="crm-form-group"><h4>Recruiting</h4><div class="crm-form">
      <label>Zuständig<select id="crm_owner">${crmHtmlOptions(['Peter','Martina'],c.owner||currentPerson())}</select></label>
      <label>Zweiter Ansprechpartner<select id="crm_support"><option value="">Keiner</option>${crmHtmlOptions(['Peter','Martina'],c.support||'')}</select></label>
      <label>Quelle<select id="crm_source">${crmHtmlOptions(crmSources(),c.source||'LinkedIn')}</select></label>
      ${crmSelectWithOther('targetGroup','Zielgruppe',crmTargetGroupOptions(),c.targetGroup||'','Sonstige Zielgruppe')}
      <label>Recruiting-Phase<select id="crm_phase">${crmHtmlOptions(crmPipelinePhases(),crmEnsurePhase(c))}</select></label><input id="crm_status" type="hidden" value="${esc(c.status||crmStatusFromPhase(crmEnsurePhase(c)))}">
      <label>Priorität<select id="crm_priority">${crmHtmlOptions(crmPriorities(),c.priority||'A')}</select></label>
      <label>Wiedervorlage Datum<input id="crm_followDate" type="date" value="${esc(c.followDate||'')}"></label>
      <label>Nächster Schritt<select id="crm_nextStepSelect">${crmHtmlOptions(['',...crmNextStepOptions()],nextSelected)}</select></label>
      <label>Nächster Schritt frei<input id="crm_nextStepOther" value="${esc(nextOther)}" placeholder="Nur nutzen, wenn nicht in der Liste"></label>
      <label class="crm-tags-field">Schlagwörter<input id="crm_tags" value="${esc((c.tags||[]).join(', '))}" placeholder="z. B. Allergiker, Unternehmer, Empfehlung"><span class="field-hint">Mehrere Schlagwörter mit Komma trennen.</span></label>
      ${stars('interest','Interesse',c.interest)}${stars('trust','Vertrauen',c.trust)}${stars('activityLevel','Aktivität',c.activityLevel)}
    </div></div>
    <div class="crm-form-group"><h4>Landingpage</h4><div class="crm-form">
      <label class="check-inline"><input id="crm_landingSent" type="checkbox" ${c.landingSent?'checked':''}> Landingpage gesendet</label>
      <label>Versanddatum<input id="crm_landingSentDate" type="date" value="${esc(c.landingSentDate||'')}"></label>
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
function crmArchiveContact(id){
  const c=crmFindContact(id); if(!c)return;
  if(!confirm(`Kontakt ${crmFullName(c)} archivieren?`))return;
  const old=crmEnsurePhase(c);
  c.phase='Archiv'; c.status='Archiv'; c.updatedAt=new Date().toISOString();
  if(!Array.isArray(c.timeline))c.timeline=[];
  c.timeline.push({date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),type:'Archiv',text:`Kontakt archiviert · vorherige Phase: ${old}`});
  save(); render();
}
function crmReactivateContact(id){
  const c=crmFindContact(id); if(!c)return;
  c.phase='Erstansprache'; c.status='Erstansprache'; c.updatedAt=new Date().toISOString();
  if(!Array.isArray(c.timeline))c.timeline=[];
  c.timeline.push({date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),type:'Archiv',text:'Kontakt reaktiviert · Phase: Erstansprache'});
  save(); render();
}
function crmSetPhase(id,phase){
  const c=crmFindContact(id); if(!c || !crmPipelinePhases().includes(phase))return;
  const old=crmEnsurePhase(c); if(old===phase)return;
  if(['Geschäftspartner','Kein Interesse','Archiv'].includes(phase)){
    const ok=window.confirm(`Möchtest du den Recruiting-Prozess für diesen Kontakt wirklich mit „${phase}“ abschließen?`);
    if(!ok)return;
  }
  c.phase=phase; c.status=crmStatusFromPhase(phase); c.updatedAt=new Date().toISOString();
  if(!Array.isArray(c.timeline))c.timeline=[];
  c.timeline.push({date:todayKey(),time:new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}),type:'Recruiting-Phase',text:`Phase geändert: ${old} → ${phase}`});
  save(); render();
}
function renderCrmPipeline(c){
  const phases=crmPipelinePhases(); const current=crmEnsurePhase(c); const currentIndex=phases.indexOf(current);
  return `<section class="crm-pipeline-card"><div class="crm-pipeline-head"><div><p class="eyebrow">Recruiting-Pipeline</p><h4>Aktuelle Phase: ${esc(current)}</h4></div><span>${currentIndex+1} von ${phases.length}</span></div><div class="crm-pipeline-scroll"><div class="crm-pipeline">${phases.map((phase,i)=>`<button class="crm-pipeline-step ${i<currentIndex?'completed':''} ${i===currentIndex?'current':''} ${['Kein Interesse','Archiv'].includes(phase)?'terminal':''}" onclick="crmSetPhase('${esc(c.id)}','${esc(phase)}')" title="Phase auf ${esc(phase)} setzen"><span>${i+1}</span><strong>${esc(phase)}</strong></button>`).join('')}</div></div><p class="small crm-pipeline-hint">Tippe oder klicke auf eine Phase, um den Kontakt direkt dorthin zu setzen.</p></section>`;
}
function renderCrmDetail(id){
  const c=crmFindContact(id); if(!c)return renderCrmForm(null);
  return `<div class="card contact-file"><div class="contact-file-actions"><button class="copy-btn" onclick="crmCloseContact()">◀ Zur Kontaktübersicht</button><div><button class="copy-btn" onclick="selectedContactTab='edit'; render()">Bearbeiten</button>${crmEnsurePhase(c)==='Archiv'?`<button class="copy-btn" onclick="crmReactivateContact('${esc(c.id)}')">Reaktivieren</button>`:`<button class="copy-btn" onclick="crmArchiveContact('${esc(c.id)}')">Archivieren</button>`}<button class="copy-btn danger" onclick="crmDeleteContact('${esc(c.id)}')">Löschen</button></div></div><div class="contact-sticky-head"><div><p class="eyebrow">Kontaktakte</p><h3>${esc(crmFullName(c))}</h3><p class="contact-code-line">${esc(c.contactCode||'')}</p><p>${esc(c.company||'')} ${c.city?'· '+esc(c.city):''}</p></div><div class="contact-head-meta"><span class="badge">Prio ${esc(c.priority||'A')}</span><span class="badge">${esc(crmEnsurePhase(c))}</span><p class="small">Zuständig: ${esc(c.owner||'Peter')}${c.support?' · Unterstützung: '+esc(c.support):''}</p><p class="small"><strong>Wiedervorlage:</strong> ${esc(c.followDate||'offen')}</p></div></div>
    ${renderCrmPipeline(c)}
    ${renderCrmCommunicationBar(c)}
    ${crmRenderContactAssistant(c)}
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
  return `<div class="tab-content"><div class="contact-status-strip"><span>${esc(c.contactCode||'')}</span><span>Priorität ${esc(c.priority||'A')}</span><span>Phase: ${esc(crmEnsurePhase(c))}</span></div><div class="info-card-grid"><section class="info-card"><h4>Kontaktdaten</h4><p><strong>Name:</strong> ${esc(crmFullName(c))}</p><p><strong>Kontakt-ID:</strong> ${esc(c.contactCode||'')}</p><p><strong>Geburtsdatum:</strong> ${esc(c.birthday||'')}</p><p><strong>Adresse:</strong><br>${esc(c.street||'')}${c.street?'<br>':''}${esc(c.postalCode||'')} ${esc(c.city||'')}</p><p><strong>Mobil:</strong> ${crmFullPhone(c)?`<a href="tel:+${esc(crmFullPhone(c))}" onclick="crmQuickLog('${esc(c.id)}','Telefon','Anruf aus Übersicht gestartet','Nachfassen')">${esc(crmPhoneDisplay(c))}</a>`:esc(crmPhoneLocalDisplay(c)||'')}</p><p><strong>WhatsApp:</strong> ${crmFullPhone(c)?`<a href="${esc(crmBuildCommunicationUrl(c,'WhatsApp','free'))}" onclick="crmQuickLog('${esc(c.id)}','WhatsApp','WhatsApp aus Kontaktdaten geöffnet','WhatsApp senden')">WhatsApp schreiben</a>`:'Nicht hinterlegt'}</p><p><strong>E-Mail:</strong> ${c.email?`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`:'Nicht hinterlegt'}</p><p><strong>Website:</strong> ${c.website?`<a href="${esc(crmWebsiteHref(c.website))}" target="_blank" rel="noopener">${esc(c.website)}</a>`:'Nicht hinterlegt'}</p></section><section class="info-card"><h4>Beruf und Profile</h4><p><strong>Firma:</strong> ${esc(c.company||'')}</p><p><strong>Beruf:</strong> ${esc(c.job||'')}</p><p><strong>Branche:</strong> ${esc(c.branch||'')}</p><p><strong>Zielgruppe:</strong> ${esc(c.targetGroup||'')}</p><p><strong>LinkedIn:</strong> ${c.linkedin?`<a href="${esc(crmWebsiteHref(c.linkedin))}" target="_blank" rel="noopener">Profil öffnen</a>`:'Nicht hinterlegt'}</p><p><strong>Facebook:</strong> ${c.facebook?`<a href="${esc(crmWebsiteHref(c.facebook))}" target="_blank" rel="noopener">Profil öffnen</a>`:'Nicht hinterlegt'}</p><p><strong>Instagram:</strong> ${c.instagram?`<a href="${esc(crmWebsiteHref(c.instagram))}" target="_blank" rel="noopener">Profil öffnen</a>`:'Nicht hinterlegt'}</p><p><strong>WhatsApp vorhanden:</strong> ${c.whatsapp?'Ja':'Nein'}</p></section><section class="info-card"><h4>Recruiting</h4><p><strong>Zuständig:</strong> ${esc(c.owner||'Peter')}${c.support?' · Unterstützung: '+esc(c.support):''}</p><p><strong>Recruiting-Phase:</strong> ${esc(crmEnsurePhase(c))}</p><p><strong>Quelle:</strong> ${esc(c.source||'')}</p><p><strong>Priorität:</strong> ${esc(c.priority||'A')}</p><p><strong>Wiedervorlage:</strong> ${esc(c.followDate||'offen')}</p><p><strong>Schlagwörter:</strong></p>${crmTagChips(c)?`<div class="contact-tags">${crmTagChips(c)}</div>`:'<p class="small">Keine Schlagwörter hinterlegt.</p>'}<p><strong>Bewertung:</strong><br>Interesse ${esc(c.interest||'3')}/5 · Vertrauen ${esc(c.trust||'3')}/5 · Aktivität ${esc(c.activityLevel||'3')}/5</p></section><section class="info-card"><h4>Landingpage</h4><p><strong>Gesendet:</strong> ${c.landingSent?'Ja':'Nein'} ${c.landingSentDate?'am '+esc(c.landingSentDate):''}</p><p><strong>Gesehen:</strong> ${c.landingSeen?'Ja':'Nein'} ${c.landingDate?'am '+esc(c.landingDate):''}</p>${c.landingSeen?`<p><strong>Video 1:</strong> ${c.video1Seen?'Ja':'Nein'}</p>${c.video1Seen?`<p><strong>Video 2:</strong> ${c.video2Seen?'Ja':'Nein'}</p>`:''}${c.video2Seen?`<p><strong>Video 3:</strong> ${c.video3Seen?'Ja':'Nein'}</p>`:''}${c.video3Seen?`<p><strong>Follow-up aktiv:</strong> ${c.followupActive?'Ja':'Nein'}</p>`:''}`:'<p class="small">Noch keine Landingpage-Aktivität hinterlegt.</p>'}</section><section class="info-card info-card-wide"><h4>Kommunikation</h4>${renderCrmCommunicationBar(c)}</section></div><div class="quick-actions"><button class="primary" onclick="selectedContactTab='edit'; render()">Bearbeiten</button><button class="copy-btn" onclick="selectedContactTab='communication'; render()">Kommunikation eintragen</button><button class="copy-btn" onclick="selectedContactTab='timeline'; render()">Zeitachse öffnen</button></div></div>`;
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
  return `<div class="tab-content"><h4>Aufgaben</h4><div class="crm-toolbar"><input id="crm_task_title" placeholder="Aufgabe, z. B. Rückruf"><input id="crm_task_date" type="date"><input id="crm_task_time" type="time"><select id="crm_task_priority">${crmHtmlOptions(crmPriorities(),'A')}</select><button class="primary" onclick="crmAddContactTask('${esc(c.id)}')">Aufgabe hinzufügen</button></div><p><strong>Nächster Schritt:</strong> ${esc(c.nextStep||'Noch offen')}</p><p><strong>Wiedervorlage:</strong> ${esc(c.followDate||'kein Datum')}</p>${tasks.length?tasks.map(t=>`<label class="task-item ${t.done?'done':''}"><input type="checkbox" ${t.done?'checked':''} onchange="crmToggleTask('${esc(t.id)}')"><span>${esc(t.due||'ohne Datum')} ${t.time?'· '+esc(t.time):''} · Prio ${esc(t.priority||'A')} · ${esc(t.title||'')}</span></label>`).join(''):'<p class="small">Noch keine kontaktbezogenen Aufgaben.</p>'}</div>`
}
function renderCrmCommunication(c){
  const comm=(c.communication||[]).slice().reverse();
  return `<div class="tab-content"><h4>Kommunikation</h4>
    ${renderCrmPipeline(c)}
    ${renderCrmCommunicationBar(c)}
    <div class="crm-toolbar"><select id="crm_comm_channel">${crmHtmlOptions(crmChannelOptions(),'WhatsApp')}</select><input id="crm_comm_text" placeholder="Kurze Gesprächsnotiz"><button class="primary" onclick="crmAddCommunication('${esc(c.id)}')">Notiz eintragen</button></div>
    ${comm.length?comm.map(e=>`<div class="timeline-item"><strong>${esc(e.date||'')}${e.time?' · '+esc(e.time):''}</strong> <span class="badge">${esc(e.channel||'')}</span><br>${esc(e.text||'')}</div>`).join(''):'<p class="small">Noch keine Kommunikation dokumentiert.</p>'}
  </div>`
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


function appBackupPayload(){
  return {
    app:'Recruiting-Cockpit Peter und Martina Kücken',
    version:APP_VERSION,
    exportedAt:new Date().toISOString(),
    state, activity, sales, mediaStatus
  };
}
function appExportBackup(){
  try{
    const payload=JSON.stringify(appBackupPayload(),null,2);
    const blob=new Blob([payload],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`recruiting-cockpit-datensicherung-${todayKey()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),500);
    alert('Datensicherung wurde erstellt.');
  }catch(e){console.error(e); alert('Die Datensicherung konnte nicht erstellt werden.');}
}
function appChooseBackup(){document.getElementById('settingsBackupFile')?.click()}
function appImportBackup(input){
  const file=input?.files?.[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const data=JSON.parse(String(reader.result||''));
      if(!data || typeof data!=='object' || !data.state)throw new Error('Ungültige Sicherungsdatei');
      if(!confirm('Diese Sicherung ersetzt die aktuell in der App gespeicherten Daten. Fortfahren?')){input.value='';return;}
      state=data.state||{}; activity=data.activity||{}; sales=data.sales||{}; mediaStatus=data.mediaStatus||{};
      if(!state.checks)state.checks={}; if(!state.kpis)state.kpis={};
      if(!state.crm)state.crm={contacts:[],tasks:[]}; if(!state.crm.contacts)state.crm.contacts=[]; if(!state.crm.tasks)state.crm.tasks=[];
      localStorage.setItem(stateKey,JSON.stringify(state));
      localStorage.setItem(activityKey,JSON.stringify(activity));
      localStorage.setItem(salesKey,JSON.stringify(sales));
      localStorage.setItem('kuecken_media_status_v18',JSON.stringify(mediaStatus));
      scheduleCloudSave();
      alert('Datensicherung wurde erfolgreich eingelesen.');
      input.value=''; render();
    }catch(e){console.error(e); input.value=''; alert('Die Datei ist keine gültige Datensicherung des Recruiting-Cockpits.');}
  };
  reader.onerror=()=>{input.value=''; alert('Die Datei konnte nicht gelesen werden.');};
  reader.readAsText(file,'utf-8');
}
function renderSettings(s){
  const contacts=crmContacts().length;
  const tasks=crmTasks().length;
  const sync=currentUser?(cloudReady?'Synchronisiert':'Verbindung wird hergestellt'):'Nur lokal gespeichert';
  const coverage=knowledgeCoverageComplete();
  view.innerHTML=`
    <div class="card settings-head"><p class="eyebrow">Version ${esc(APP_VERSION)}</p><h2>${esc(s.title)}</h2><p>${esc(s.text||'')}</p></div>
    <div class="settings-grid">
      <section class="card settings-card"><h3>Datensicherung</h3><p>Speichere Kontakte, Aufgaben, Aktivitäten, Kennzahlen und Veröffentlichungsstände in einer Datei.</p><button class="primary" onclick="appExportBackup()">Datensicherung exportieren</button></section>
      <section class="card settings-card"><h3>Datensicherung einlesen</h3><p>Stelle zuvor exportierte Daten wieder her. Die aktuellen Daten werden erst nach deiner Bestätigung ersetzt.</p><input id="settingsBackupFile" class="hidden" type="file" accept="application/json,.json" onchange="appImportBackup(this)"><button class="copy-btn" onclick="appChooseBackup()">Sicherungsdatei auswählen</button></section>
      <section class="card settings-card"><h3>Speicherstatus</h3><p><strong>${esc(sync)}</strong></p><p>${currentUser?'Angemeldet als '+esc(currentUser.email||'Benutzer'):'Keine Cloud-Anmeldung aktiv.'}</p><p>Kontakte: ${contacts}<br>Aufgaben: ${tasks}</p></section>
      <section class="card settings-card"><h3>Systemstatus</h3><p>Recruiting-Bibliothek: <strong>${coverage?'vollständig zugeordnet':'Zuordnung unvollständig'}</strong></p><p>Startdatum der Jahrespläne: <strong>01.08.2026</strong></p><button class="copy-btn" onclick="go('impressum')">Technische Informationen</button></section>
    </div>`;
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

