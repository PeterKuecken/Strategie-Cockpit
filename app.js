const content = document.getElementById('content');
const navs = document.querySelectorAll('.nav');
let currentWeek = Number(localStorage.getItem('martina_current_week') || 1);

function setView(view){
  navs.forEach(n=>n.classList.toggle('active', n.dataset.view===view));
  if(view==='home') renderHome();
  if(view==='peter') renderPeter();
  if(view==='martina') renderMartina();
  if(view==='weeks') renderWeeks(currentWeek);
  if(view==='search') renderSearch();
}

function renderHome(){
  content.innerHTML = `
    <div class="card">
      <p class="eyebrow">Startseite</p>
      <h2>Strategiehandbuch Peter & Martina Kücken</h2>
      <p>Diese App trennt beide Bereiche sauber. Dein bestehender Peter-Bereich bleibt unberührt. Martinas Bereich wurde ergänzt.</p>
      <div class="grid">
        <div class="tile" onclick="setView('peter')"><h3>Bereich Peter</h3><p class="muted">Platzhalter für den vorhandenen Bereich. Bestehende Dateien bleiben unverändert.</p></div>
        <div class="tile" onclick="setView('martina')"><h3>Bereich Martina</h3><p class="muted">Band 1 bis Band 5 und das 52-Wochen-Jahresprogramm.</p></div>
        <div class="tile" onclick="setView('weeks')"><h3>52-Wochen-Plan</h3><p class="muted">Beiträge, WhatsApp-Status, Checkliste und Notizen.</p></div>
      </div>
    </div>`;
}

function renderPeter(){
  content.innerHTML = `
    <div class="card">
      <p class="eyebrow">Bereich Peter</p>
      <h2>Unverändert</h2>
      <p>Dieser Bereich ist absichtlich nicht neu aufgebaut. So bleibt dein vorhandener Peter-Bereich geschützt.</p>
      <p class="muted">Wenn du diese Dateien in dein bestehendes Repository kopierst, integrierst du nur den neuen Martina-Bereich. Den bestehenden Peter-Code ersetzt du nicht.</p>
    </div>`;
}

function renderMartina(){
  const cards = MARTINA_BANDS.map((b,idx)=>`
    <div class="tile" onclick="renderBand(${idx})">
      <h3>${b.title}</h3>
      <p class="muted">${b.sections.length} Abschnitte</p>
    </div>`).join('');
  content.innerHTML = `
    <div class="card">
      <p class="eyebrow">Bereich Martina</p>
      <h2>Martinas Strategie- und Arbeitsbereich</h2>
      <p>Hier stehen Martinas fünf Bände und das 52-Wochen-Jahresprogramm.</p>
      <div class="grid">${cards}<div class="tile" onclick="setView('weeks')"><h3>52-Wochen-Jahresprogramm</h3><p class="muted">Fertige Texte für LinkedIn, Facebook und WhatsApp.</p></div></div>
    </div>`;
}

function renderBand(index){
  const b = MARTINA_BANDS[index];
  content.innerHTML = `<div class="card"><button class="ghost" onclick="setView('martina')">Zurück</button><p class="eyebrow">Bereich Martina</p><h2>${b.title}</h2>${b.sections.map(s=>`<h3>${s[0]}</h3><p>${s[1]}</p>`).join('')}</div>`;
}

function doneCount(){
  return MARTINA_WEEKS.filter(w=>localStorage.getItem(`martina_week_${w.nr}_done`)==='true').length;
}
function renderWeeks(n){
  currentWeek=Math.max(1,Math.min(52,n));
  localStorage.setItem('martina_current_week', currentWeek);
  const w=MARTINA_WEEKS[currentWeek-1];
  const done=localStorage.getItem(`martina_week_${w.nr}_done`)==='true';
  const note=localStorage.getItem(`martina_week_${w.nr}_note`) || '';
  const percent=Math.round(doneCount()/52*100);
  content.innerHTML = `
    <div class="card">
      <p class="eyebrow">52-Wochen-Jahresprogramm</p>
      <h2>Woche ${w.nr}. ${w.theme}</h2>
      <div class="progress"><div class="bar" style="width:${percent}%"></div></div>
      <p class="muted">${doneCount()} von 52 Wochen abgeschlossen. ${percent}%</p>
      <label>Woche auswählen</label>
      <select class="select" onchange="renderWeeks(Number(this.value))">${MARTINA_WEEKS.map(x=>`<option value="${x.nr}" ${x.nr===w.nr?'selected':''}>Woche ${x.nr}. ${x.theme}</option>`).join('')}</select>
      <div class="weeknav"><button class="ghost" onclick="renderWeeks(currentWeek-1)">Vorherige Woche</button><button class="primary" onclick="renderWeeks(currentWeek+1)">Nächste Woche</button></div>
      <div class="check"><input id="done" type="checkbox" ${done?'checked':''} onchange="saveDone(${w.nr},this.checked)"><label for="done">Diese Woche veröffentlicht</label></div>
      <h3>LinkedIn-Beitrag</h3><div class="post">${escapeHtml(w.linkedin)}</div>
      <h3>Facebook-Beitrag</h3><div class="post">${escapeHtml(w.facebook)}</div>
      <h3>WhatsApp-Status Montag bis Sonntag</h3>${w.statuses.map(s=>`<div class="post">${escapeHtml(s)}</div>`).join('')}
      <h3>Persönliche Notizen</h3><textarea oninput="saveNote(${w.nr},this.value)" placeholder="Notizen zu dieser Woche">${escapeHtml(note)}</textarea>
    </div>`;
}
function saveDone(n,val){localStorage.setItem(`martina_week_${n}_done`,val);renderWeeks(n)}
function saveNote(n,val){localStorage.setItem(`martina_week_${n}_note`,val)}

function renderSearch(){
  content.innerHTML = `<div class="card"><p class="eyebrow">Suche</p><h2>Suche in Martinas Bereich</h2><input id="q" placeholder="Suchbegriff eingeben" oninput="doSearch(this.value)"><div id="results"></div></div>`;
}
function doSearch(q){
  const out=document.getElementById('results');
  if(!q.trim()){out.innerHTML='';return}
  const needle=q.toLowerCase();
  const res=[];
  MARTINA_BANDS.forEach(b=>b.sections.forEach(s=>{if((b.title+' '+s[0]+' '+s[1]).toLowerCase().includes(needle))res.push(`<div class="searchResult"><span class="badge">Band</span><h3>${b.title}</h3><p>${s[0]}: ${s[1]}</p></div>`)}));
  MARTINA_WEEKS.forEach(w=>{const hay=(w.theme+' '+w.linkedin+' '+w.facebook+' '+w.statuses.join(' ')).toLowerCase(); if(hay.includes(needle))res.push(`<div class="searchResult"><span class="badge">Woche ${w.nr}</span><h3>${w.theme}</h3><p>${w.linkedin.substring(0,220)}...</p><button class="ghost" onclick="renderWeeks(${w.nr})">Öffnen</button></div>`)});
  out.innerHTML=res.length?res.join(''):'<p class="muted">Keine Treffer gefunden.</p>';
}
function escapeHtml(str){return String(str).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}

document.querySelectorAll('.nav').forEach(btn=>btn.addEventListener('click',()=>setView(btn.dataset.view)));
document.getElementById('themeToggle').addEventListener('click',()=>{const dark=document.documentElement.dataset.theme==='dark';document.documentElement.dataset.theme=dark?'':'dark';localStorage.setItem('theme',dark?'':'dark')});
document.documentElement.dataset.theme=localStorage.getItem('theme')||'';
renderHome();
