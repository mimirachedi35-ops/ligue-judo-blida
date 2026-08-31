/* ============================================================
   LIGUE DE JUDO BLIDA — logique de l'application
   ============================================================ */

const CATS = ['akabir','awasit','achbal','asghar','baraem','katakit'];
const CAT_LABELS = {
  akabir: 'Séniors',
  awasit: 'Juniors',
  achbal: 'Cadets',
  asghar: 'Minimes',
  baraem: 'Benjamins',
  katakit: 'Poussins'
};

let STATE = null;
let currentTab = 'dashboard';

function uid(){ return 'id_' + Math.random().toString(36).slice(2,10) + Date.now().toString(36); }
function money(n){ return (Number(n)||0).toLocaleString('fr-FR') + ' DA'; }
function todayStr(){ return new Date().toISOString().slice(0,10); }

/* ---------------- API ---------------- */
async function api(path, method='GET', body){
  const opts = { method, headers:{'Content-Type':'application/json'} };
  if(body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  if(res.status === 401){ showLogin(); throw new Error('non authentifié'); }
  return res.json();
}

async function saveState(){
  await api('/api/state', 'POST', STATE);
}

/* ---------------- AUTH ---------------- */
async function checkAuthOnLoad(){
  const r = await fetch('/api/check-auth').then(r=>r.json());
  if(r.authenticated){
    await loadStateAndStart();
  } else {
    showLogin();
  }
}

function showLogin(){
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appScreen').style.display = 'none';
}

document.getElementById('loginBtn').addEventListener('click', doLogin);
document.getElementById('passwordInput').addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });

async function doLogin(){
  const pwd = document.getElementById('passwordInput').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  try{
    const r = await fetch('/api/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ password: pwd })
    }).then(r=>r.json());
    if(r.success){
      await loadStateAndStart();
    } else {
      errEl.textContent = r.error || 'Code incorrect';
    }
  }catch(e){
    errEl.textContent = 'Erreur de connexion au serveur';
  }
}

document.getElementById('logoutBtn').addEventListener('click', async ()=>{
  await fetch('/api/logout', { method:'POST' });
  location.reload();
});

async function loadStateAndStart(){
  STATE = await api('/api/state');
  if(!STATE.treasury) STATE.treasury = [];
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appScreen').style.display = 'block';
  document.getElementById('loginSeason').textContent = STATE.currentSeason;
  document.getElementById('currentSeasonLabel').textContent = STATE.currentSeason;
  renderTab('dashboard');
}

/* ---------------- TABS ---------------- */
document.querySelectorAll('.tab-box').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tab-box').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    renderTab(btn.dataset.tab);
  });
});

const JUDOGI_ICON = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-1.1 0-2 .9-2 2v1.2C7.6 5.9 6 7.9 6 10.3V13l-2 2v3c0 1.1.9 2 2 2h1v2h2v-2h6v2h2v-2h1c1.1 0 2-.9 2-2v-3l-2-2v-2.7c0-2.4-1.6-4.4-4-5.1V4c0-1.1-.9-2-2-2z"/></svg>`;
function emptyState(text){
  return `<div class="empty-state">${JUDOGI_ICON}<p>${text}</p></div>`;
}

function renderTab(tab){
  currentTab = tab;
  const main = document.getElementById('mainContent');
  if(tab==='dashboard') return renderDashboard(main);
  if(tab==='clubs') return renderClubs(main);
  if(tab==='journal') return renderJournal(main);
  if(tab==='caisse') return renderCaisse(main);
  if(tab==='stats') return renderStats(main);
  if(tab==='archives') return renderArchives(main);
  if(tab==='settings') return renderSettings(main);
}

/* ---------------- HELPERS DE CALCUL ---------------- */
function emptyCategories(){
  const o = {};
  CATS.forEach(c => o[c] = { licenses:0, male:0, female:0 });
  return o;
}
function emptyPayments(){
  const o = { coaches: [], referees: [] };
  CATS.forEach(c => o[c] = []);
  return o;
}
function newClub(){
  return { id: uid(), name:'', manager:'', categories: emptyCategories(), coachesCount:0, refereesCount:0, payments: emptyPayments() };
}
function catDue(club, cat){ return (club.categories[cat]?.licenses||0) * (STATE.settings.prices[cat]||0); }
function catPaid(club, cat){ return (club.payments[cat]||[]).reduce((s,p)=>s+Number(p.amount||0),0); }
function coachDue(club){ return (club.coachesCount||0) * (STATE.settings.coachPrice||0); }
function coachPaid(club){ return (club.payments.coaches||[]).reduce((s,p)=>s+Number(p.amount||0),0); }
function refereeDue(club){ return (club.refereesCount||0) * (STATE.settings.refereePrice||0); }
function refereePaid(club){ return (club.payments.referees||[]).reduce((s,p)=>s+Number(p.amount||0),0); }
function clubTotalDue(club){ return CATS.reduce((s,c)=>s+catDue(club,c),0) + coachDue(club) + refereeDue(club); }
function clubTotalPaid(club){ return CATS.reduce((s,c)=>s+catPaid(club,c),0) + coachPaid(club) + refereePaid(club); }
function clubTotalLicenses(club){ return CATS.reduce((s,c)=>s+(club.categories[c]?.licenses||0),0); }
function clubTotalMale(club){ return CATS.reduce((s,c)=>s+(club.categories[c]?.male||0),0); }
function clubTotalFemale(club){ return CATS.reduce((s,c)=>s+(club.categories[c]?.female||0),0); }

function allPaymentEntries(clubs){
  const list = [];
  clubs.forEach(club=>{
    CATS.forEach(cat=>{
      (club.payments[cat]||[]).forEach(p=> list.push({...p, clubName:club.name, type:CAT_LABELS[cat]}));
    });
    (club.payments.coaches||[]).forEach(p=> list.push({...p, clubName:club.name, type:'Entraîneurs'}));
    (club.payments.referees||[]).forEach(p=> list.push({...p, clubName:club.name, type:'Arbitres'}));
  });
  return list;
}
function sumByPeriod(entries, mode, refDate){
  const ref = refDate || new Date();
  return entries.filter(e=>{
    if(!e.date) return false;
    const d = new Date(e.date);
    if(mode==='day') return d.toDateString()===ref.toDateString();
    if(mode==='month') return d.getMonth()===ref.getMonth() && d.getFullYear()===ref.getFullYear();
    if(mode==='year') return d.getFullYear()===ref.getFullYear();
    return true;
  }).reduce((s,e)=>s+Number(e.amount||0),0);
}

/* ============================================================
   TABLEAU DE BORD
   ============================================================ */
function renderDashboard(main){
  const clubs = STATE.clubs;
  const entries = allPaymentEntries(clubs);
  const totalLicenses = clubs.reduce((s,c)=>s+clubTotalLicenses(c),0);
  const totalMale = clubs.reduce((s,c)=>s+clubTotalMale(c),0);
  const totalFemale = clubs.reduce((s,c)=>s+clubTotalFemale(c),0);
  const totalCoaches = clubs.reduce((s,c)=>s+(c.coachesCount||0),0);
  const totalReferees = clubs.reduce((s,c)=>s+(c.refereesCount||0),0);
  const totalDue = clubs.reduce((s,c)=>s+clubTotalDue(c),0);
  const totalPaid = clubs.reduce((s,c)=>s+clubTotalPaid(c),0);

  main.innerHTML = `
    <div class="card">
      <h3>Recherche rapide</h3>
      <p class="card-desc">Tapez le nom d'un club pour voir toutes ses informations.</p>
      <div class="search-row">
        <input type="text" id="quickSearch" placeholder="Nom du club...">
      </div>
      <div id="quickSearchResults"></div>
    </div>

    <div class="card">
      <h3>Vue d'ensemble — Saison ${STATE.currentSeason}</h3>
      <div class="grid-stats">
        <div class="stat-box plain"><div class="num">${clubs.length}</div><div class="label">Clubs affiliés</div></div>
        <div class="stat-box plain"><div class="num">${totalLicenses}</div><div class="label">Judokas licenciés</div></div>
        <div class="stat-box plain"><div class="num">${totalMale} / ${totalFemale}</div><div class="label">Garçons / Filles</div></div>
        <div class="stat-box plain"><div class="num">${totalCoaches}</div><div class="label">Entraîneurs</div></div>
        <div class="stat-box plain"><div class="num">${totalReferees}</div><div class="label">Arbitres</div></div>
      </div>
    </div>

    <div class="card">
      <h3>Encaissements de la Ligue</h3>
      <div class="grid-stats">
        <div class="stat-box"><div class="num">${money(sumByPeriod(entries,'day'))}</div><div class="label">Aujourd'hui</div></div>
        <div class="stat-box"><div class="num">${money(sumByPeriod(entries,'month'))}</div><div class="label">Ce mois</div></div>
        <div class="stat-box"><div class="num">${money(sumByPeriod(entries,'year'))}</div><div class="label">Cette année</div></div>
        <div class="stat-box plain"><div class="num">${money(totalPaid)}</div><div class="label">Total encaissé (saison)</div></div>
      </div>
      <p style="font-size:12.5px;color:var(--gray);margin-top:10px;">
        Total attendu (selon tarifs) : <b>${money(totalDue)}</b> — Reste à percevoir : <b>${money(totalDue-totalPaid)}</b>
      </p>
    </div>

    <div class="card">
      <h3>Renouvellement de saison</h3>
      <p class="card-desc">
        Archive la saison en cours (clubs, licences, règlements) et repart avec une liste de clubs vide pour la nouvelle saison.
        Les données archivées restent consultables dans l'onglet Archives.
      </p>
      <div class="btn-row">
        <button class="btn btn-primary" id="btnNewSeason">Démarrer une nouvelle saison</button>
      </div>
    </div>
  `;

  document.getElementById('btnNewSeason').addEventListener('click', openNewSeasonModal);
  document.getElementById('quickSearch').addEventListener('input', (e)=>{
    const q = e.target.value.trim().toLowerCase();
    const box = document.getElementById('quickSearchResults');
    if(!q){ box.innerHTML=''; return; }
    const matches = STATE.clubs.filter(c=>c.name.toLowerCase().includes(q));
    box.innerHTML = matches.length===0
      ? `<p style="font-size:12.5px;color:var(--gray);margin-top:10px;">Aucun club trouvé.</p>`
      : matches.map(c=>`
        <div class="list-row" onclick="openClubDetail('${c.id}')">
          ${clubThumbHtml(c)}
          <div style="flex:1;margin-left:10px;">
            <div class="list-row-name">${esc(c.name)}</div>
            <div class="list-row-sub">${clubTotalLicenses(c)} judokas</div>
          </div>
          <span class="list-row-chevron">›</span>
        </div>`).join('');
  });
}

function openNewSeasonModal(){
  openModal(`
    <div class="modal-title">Nouvelle saison sportive</div>
    <div class="form-group">
      <label>Libellé de la nouvelle saison</label>
      <input type="text" id="newSeasonLabel" placeholder="ex: 2027/2028" value="">
    </div>
    <p style="font-size:12px;color:var(--red);">Attention : la saison actuelle (${STATE.currentSeason}) sera archivée et la liste des clubs sera remise à zéro.</p>
    <div class="btn-row">
      <button class="btn btn-primary" id="confirmNewSeason">Confirmer</button>
      <button class="btn btn-outline" onclick="closeModal()">Annuler</button>
    </div>
  `);
  document.getElementById('confirmNewSeason').addEventListener('click', async ()=>{
    const label = document.getElementById('newSeasonLabel').value.trim() || 'Nouvelle saison';
    const r = await api('/api/new-season','POST',{ newSeasonLabel: label });
    STATE = r.state;
    document.getElementById('currentSeasonLabel').textContent = STATE.currentSeason;
    closeModal();
    renderTab('dashboard');
  });
}

/* ============================================================
   CLUBS
   ============================================================ */
function renderClubs(main){
  main.innerHTML = `
    <div class="card">
      <h3>Clubs affiliés</h3>
      <p class="card-desc">Cliquez sur un club pour voir sa fiche complète et ses règlements.</p>
      <div class="search-row">
        <input type="text" id="clubSearch" placeholder="Rechercher un club...">
        <button class="btn btn-secondary" onclick="window.print()">🖨️ Imprimer</button>
      </div>
      <div id="clubsList"></div>
    </div>
    <button class="fab" id="btnAddClub" title="Ajouter un club">+</button>
  `;
  document.getElementById('btnAddClub').addEventListener('click', ()=>openClubModal(null));
  document.getElementById('clubSearch').addEventListener('input', (e)=>renderClubsListFiltered(e.target.value));
  renderClubsListFiltered('');
}

function clubPaymentEntries(club){
  const list = [];
  CATS.forEach(cat=> (club.payments[cat]||[]).forEach(p=>list.push({...p, poste:CAT_LABELS[cat]})));
  (club.payments.coaches||[]).forEach(p=>list.push({...p, poste:'Entraîneurs'}));
  (club.payments.referees||[]).forEach(p=>list.push({...p, poste:'Arbitres'}));
  return list;
}
function lastPaidDate(list){
  if(!list || list.length===0) return null;
  return list.reduce((max,p)=> (!max || new Date(p.date)>new Date(max)) ? p.date : max, null);
}
function statusCellHtml(paidList, due){
  const paid = (paidList||[]).reduce((s,p)=>s+Number(p.amount||0),0);
  if(due<=0) return `<span style="color:var(--text-muted);">—</span>`;
  if(paid>=due){
    const d = lastPaidDate(paidList);
    return `<span class="badge badge-ok">Réglé${d?(' le '+new Date(d).toLocaleDateString('fr-FR')):''}</span>`;
  }
  return `<span class="badge badge-warn">Reste ${money(due-paid)}</span>`;
}
function clubThumbHtml(club){
  if(club.photo){
    return `<img src="${club.photo}" style="width:44px;height:44px;border-radius:10px;object-fit:cover;flex-shrink:0;">`;
  }
  return `<div style="width:44px;height:44px;border-radius:10px;background:var(--card-2);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--text-muted);font-size:18px;font-weight:800;">${esc(club.name||'?').charAt(0).toUpperCase()}</div>`;
}
function readAndCompressImage(file, maxSize=500, quality=0.75){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = (e)=>{
      const img = new Image();
      img.onload = ()=>{
        let w = img.width, h = img.height;
        if(w>h){ if(w>maxSize){h=Math.round(h*maxSize/w); w=maxSize;} }
        else { if(h>maxSize){w=Math.round(w*maxSize/h); h=maxSize;} }
        const canvas = document.createElement('canvas');
        canvas.width=w; canvas.height=h;
        canvas.getContext('2d').drawImage(img,0,0,w,h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderClubsListFiltered(query){
  const q = (query||'').trim().toLowerCase();
  const clubs = STATE.clubs.filter(c=>!q || c.name.toLowerCase().includes(q));
  const list = document.getElementById('clubsList');
  if(clubs.length===0){
    list.innerHTML = emptyState('Aucun club enregistré pour le moment.');
    return;
  }
  list.innerHTML = clubs.map(club=>{
    const due = clubTotalDue(club), paid = clubTotalPaid(club);
    const okBadge = due>0 && paid>=due;
    return `
    <div class="list-row" onclick="openClubDetail('${club.id}')">
      ${clubThumbHtml(club)}
      <div style="flex:1;margin-left:10px;">
        <div class="list-row-name">${esc(club.name)||'(Sans nom)'}</div>
        <div class="list-row-sub">${clubTotalLicenses(club)} judokas — ${club.coachesCount||0} entraîneurs — ${club.refereesCount||0} arbitres</div>
      </div>
      <span class="badge ${okBadge?'badge-ok':'badge-warn'}">${okBadge?'À jour':money(Math.max(0,due-paid))+' restant'}</span>
    </div>`;
  }).join('');
}

function clubDetailHtml(club){
  const due = clubTotalDue(club), paid = clubTotalPaid(club);
  const pct = due>0 ? Math.min(100, Math.round(paid/due*100)) : 0;
  const entries = clubPaymentEntries(club);
  return `
    ${club.photo ? `<div style="text-align:center;margin-bottom:12px;"><img src="${club.photo}" style="width:90px;height:90px;border-radius:16px;object-fit:cover;"></div>` : ''}
    <div class="grid-stats" style="margin-bottom:14px;">
      <div class="stat-box"><div class="num">${money(sumByPeriod(entries,'day'))}</div><div class="label">Payé aujourd'hui</div></div>
      <div class="stat-box"><div class="num">${money(sumByPeriod(entries,'month'))}</div><div class="label">Payé ce mois</div></div>
      <div class="stat-box"><div class="num">${money(sumByPeriod(entries,'year'))}</div><div class="label">Payé cette année</div></div>
      <div class="stat-box plain"><div class="num">${money(paid)}</div><div class="label">Total payé (saison)</div></div>
    </div>
    <table class="table">
      <thead><tr><th class="label-col">Catégorie</th><th>Licenciés</th><th>G</th><th>F</th><th>Payé / Dû</th><th>Statut</th></tr></thead>
      <tbody>
        ${CATS.map(cat=>{
          const c = club.categories[cat];
          return `<tr>
            <td class="label-col">${CAT_LABELS[cat]}</td>
            <td>${c.licenses}</td><td>${c.male}</td><td>${c.female}</td>
            <td>${money(catPaid(club,cat))} / ${money(catDue(club,cat))}</td>
            <td>${statusCellHtml(club.payments[cat], catDue(club,cat))}</td>
          </tr>`;
        }).join('')}
        <tr>
          <td class="label-col"><b>Entraîneurs</b></td>
          <td colspan="3">${club.coachesCount||0}</td>
          <td>${money(coachPaid(club))} / ${money(coachDue(club))}</td>
          <td>${statusCellHtml(club.payments.coaches, coachDue(club))}</td>
        </tr>
        <tr>
          <td class="label-col"><b>Arbitres</b></td>
          <td colspan="3">${club.refereesCount||0}</td>
          <td>${money(refereePaid(club))} / ${money(refereeDue(club))}</td>
          <td>${statusCellHtml(club.payments.referees, refereeDue(club))}</td>
        </tr>
      </tbody>
    </table>
    <div class="progress-bar"><div class="progress-fill ${pct<100?'warn':''}" style="width:${pct}%"></div></div>
    <p style="font-size:11.5px;color:var(--text-muted);margin:8px 0 0;">Total licenciés : <b style="color:#fff;">${clubTotalLicenses(club)}</b> (G:${clubTotalMale(club)} / F:${clubTotalFemale(club)}) — Payé ${money(paid)} sur ${money(due)}</p>
  `;
}

function openClubDetail(clubId){
  const club = STATE.clubs.find(c=>c.id===clubId);
  if(!club) return;
  openModal(`
    <button class="close-x" onclick="closeModal()">×</button>
    <div class="modal-title">${esc(club.name)||'(Sans nom)'}</div>
    <p style="font-size:12.5px;color:var(--text-muted);margin-top:-10px;">Directeur du club : ${esc(club.manager)||'—'}</p>
    <div id="clubDetailBody">${clubDetailHtml(club)}</div>
    <div class="btn-row" style="margin-top:16px;">
      <button class="btn btn-small btn-secondary" onclick="openPaymentModal('${club.id}')">💰 Règlements</button>
      <button class="btn btn-small btn-outline" onclick="openClubModal('${club.id}')">Modifier</button>
      <button class="btn btn-small btn-outline" onclick="printClub('${club.id}')">🖨️ Imprimer</button>
      <button class="btn btn-small btn-danger" onclick="deleteClub('${club.id}')">Supprimer</button>
    </div>
  `);
}

function esc(s){ return (s||'').toString().replace(/[<>&]/g, c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c])); }

function openClubModal(clubId){
  const isNew = !clubId;
  const club = isNew ? newClub() : STATE.clubs.find(c=>c.id===clubId);

  openModal(`
    <button class="close-x" onclick="closeModal()">×</button>
    <div class="modal-title">${isNew?'Ajouter un club':'Modifier le club'}</div>
    <div style="text-align:center;margin-bottom:14px;">
      <img id="photoPreview" src="${club.photo||''}" style="width:90px;height:90px;border-radius:16px;object-fit:cover;background:var(--card-2);display:${club.photo?'block':'none'};margin:0 auto 8px;">
      <input type="file" id="photoInput" accept="image/*" capture="environment" style="display:none;">
      <button type="button" class="btn btn-small btn-secondary" onclick="document.getElementById('photoInput').click()">📷 Choisir / Prendre une photo du club</button>
    </div>
    <div class="form-group"><label>Nom du club</label><input id="f_name" value="${esc(club.name)}"></div>
    <div class="form-group"><label>Directeur du club</label><input id="f_manager" value="${esc(club.manager)}"></div>
    <div class="form-group"><label>Nombre d'entraîneurs</label><input id="f_coaches" type="number" min="0" value="${club.coachesCount||0}"></div>
    <div class="form-group"><label>Nombre d'arbitres</label><input id="f_referees" type="number" min="0" value="${club.refereesCount||0}"></div>
    <h4 style="color:#fff;font-size:13px;margin:14px 0 6px;font-weight:700;">Judokas par catégorie</h4>
    ${CATS.map(cat=>`
      <div class="form-group">
        <label>${CAT_LABELS[cat]}</label>
        <div class="form-row">
          <div>
            <label style="font-size:10.5px;">Licenciés</label>
            <input type="number" min="0" id="cat_${cat}_lic" value="${club.categories[cat].licenses}">
          </div>
          <div>
            <label style="font-size:10.5px;">Garçons</label>
            <input type="number" min="0" id="cat_${cat}_m" value="${club.categories[cat].male}">
          </div>
          <div>
            <label style="font-size:10.5px;">Filles</label>
            <input type="number" min="0" id="cat_${cat}_f" value="${club.categories[cat].female}">
          </div>
        </div>
      </div>
    `).join('')}
    <div class="btn-row">
      <button class="btn btn-primary" id="saveClubBtn">Enregistrer</button>
      <button class="btn btn-outline" onclick="closeModal()">Annuler</button>
    </div>
  `);

  document.getElementById('photoInput').addEventListener('change', async (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const dataUrl = await readAndCompressImage(file);
    club.photo = dataUrl;
    const img = document.getElementById('photoPreview');
    img.src = dataUrl;
    img.style.display = 'block';
  });

  document.getElementById('saveClubBtn').addEventListener('click', async ()=>{
    club.name = document.getElementById('f_name').value.trim();
    club.manager = document.getElementById('f_manager').value.trim();
    club.coachesCount = Number(document.getElementById('f_coaches').value)||0;
    club.refereesCount = Number(document.getElementById('f_referees').value)||0;
    CATS.forEach(cat=>{
      club.categories[cat] = {
        licenses: Number(document.getElementById(`cat_${cat}_lic`).value)||0,
        male: Number(document.getElementById(`cat_${cat}_m`).value)||0,
        female: Number(document.getElementById(`cat_${cat}_f`).value)||0
      };
    });
    if(isNew) STATE.clubs.push(club);
    await saveState();
    closeModal();
    renderTab('clubs');
  });
}

async function deleteClub(clubId){
  if(!confirm('Supprimer définitivement ce club et toutes ses données de paiement ?')) return;
  STATE.clubs = STATE.clubs.filter(c=>c.id!==clubId);
  await saveState();
  closeModal();
  renderTab('clubs');
}

/* ---------- Règlements (paiements) ---------- */
function openPaymentModal(clubId){
  const club = STATE.clubs.find(c=>c.id===clubId);
  renderPaymentModalBody(club);
}

function renderPaymentModalBody(club){
  openModal(`
    <button class="close-x" onclick="closeModal()">×</button>
    <div class="modal-title">Règlements — ${esc(club.name)}</div>
    <div class="form-group">
      <label>Catégorie / poste</label>
      <select id="paySelect">
        ${CATS.map(cat=>`<option value="${cat}">${CAT_LABELS[cat]} — Licenciés (dû ${money(catDue(club,cat))})</option>`).join('')}
        <option value="coaches">Entraîneurs (dû ${money(coachDue(club))})</option>
        <option value="referees">Arbitres (dû ${money(refereeDue(club))})</option>
      </select>
    </div>
    <div id="paymentHistory"></div>
    <h4 style="color:#fff;font-size:13px;margin:14px 0 6px;font-weight:700;">Ajouter un versement</h4>
    <div class="form-row">
      <input type="number" min="0" id="payAmount" placeholder="Montant (DA)">
      <input type="date" id="payDate" value="${todayStr()}">
      <input type="text" id="payPayer" placeholder="Nom (qui a payé)">
    </div>
    <div class="btn-row">
      <button class="btn btn-primary" id="addPaymentBtn">Ajouter le versement</button>
    </div>
  `);
  refreshPaymentHistory(club);
  document.getElementById('paySelect').addEventListener('change', ()=>refreshPaymentHistory(club));
  document.getElementById('addPaymentBtn').addEventListener('click', async ()=>{
    const key = document.getElementById('paySelect').value;
    const amount = Number(document.getElementById('payAmount').value)||0;
    const date = document.getElementById('payDate').value || todayStr();
    const payer = document.getElementById('payPayer').value.trim();
    if(amount<=0){ alert('Montant invalide'); return; }
    club.payments[key].push({ amount, date, payer, time: new Date().toISOString() });
    await saveState();
    document.getElementById('payAmount').value='';
    document.getElementById('payPayer').value='';
    refreshPaymentHistory(club);
    renderTab('clubs');
  });
}

function refreshPaymentHistory(club){
  const key = document.getElementById('paySelect').value;
  const list = club.payments[key] || [];
  const due = key==='coaches' ? coachDue(club) : (key==='referees' ? refereeDue(club) : catDue(club,key));
  const paid = list.reduce((s,p)=>s+Number(p.amount||0),0);
  const el = document.getElementById('paymentHistory');
  el.innerHTML = `
    <p style="font-size:12.5px;color:var(--gray);">Payé <b>${money(paid)}</b> sur <b>${money(due)}</b> (reste ${money(Math.max(0,due-paid))})</p>
    ${list.length===0 ? '<p style="font-size:12px;color:var(--gray);">Aucun versement enregistré.</p>' :
      list.map((p,i)=>`
        <div class="payment-entry">
          <span>${new Date(p.date).toLocaleDateString('fr-FR')} — ${money(p.amount)} ${p.payer?('— '+esc(p.payer)):''}</span>
          <span>
            <button class="btn btn-small btn-outline" onclick="printPaymentReceipt('${club.id}','${key}',${i})">🖨️</button>
            <button class="btn btn-small btn-danger" onclick="removePayment('${club.id}','${key}',${i})">✕</button>
          </span>
        </div>
      `).join('')
    }
  `;
}

async function removePayment(clubId, key, index){
  const club = STATE.clubs.find(c=>c.id===clubId);
  club.payments[key].splice(index,1);
  await saveState();
  refreshPaymentHistory(club);
  renderTab('clubs');
}

function posteLabel(key){
  if(key==='coaches') return 'Entraîneurs';
  if(key==='referees') return 'Arbitres';
  return CAT_LABELS[key];
}

function printPaymentReceipt(clubId, key, index){
  const club = STATE.clubs.find(c=>c.id===clubId);
  const list = club.payments[key] || [];
  const p = list[index];
  if(!p) return;
  const due = key==='coaches' ? coachDue(club) : (key==='referees' ? refereeDue(club) : catDue(club,key));
  const paidSoFar = list.slice(0, index+1).reduce((s,x)=>s+Number(x.amount||0),0);
  const w = window.open('', '_blank');
  w.document.write(`
    <html><head><title>Reçu — ${esc(club.name)}</title>
    <style>body{font-family:Arial;padding:30px;} .box{border:1px solid #333;padding:24px;max-width:420px;margin:0 auto;} h2{text-align:center;margin-top:0;} table{width:100%;border-collapse:collapse;margin-top:14px;} td{padding:6px 0;font-size:14px;} td.l{color:#555;} td.v{text-align:right;font-weight:bold;}</style>
    </head><body>
    <div class="box">
      <h2>Ligue de Judo — Wilaya de Blida</h2>
      <p style="text-align:center;color:#555;">Reçu de versement — Saison ${STATE.currentSeason}</p>
      <table>
        <tr><td class="l">Club</td><td class="v">${esc(club.name)}</td></tr>
        <tr><td class="l">Poste</td><td class="v">${posteLabel(key)}</td></tr>
        <tr><td class="l">Montant versé</td><td class="v">${money(p.amount)}</td></tr>
        <tr><td class="l">Date</td><td class="v">${new Date(p.date).toLocaleDateString('fr-FR')}</td></tr>
        <tr><td class="l">Heure d'enregistrement</td><td class="v">${p.time?new Date(p.time).toLocaleTimeString('fr-FR'):'—'}</td></tr>
        <tr><td class="l">Payé par</td><td class="v">${esc(p.payer||'—')}</td></tr>
        <tr><td class="l">Total payé (${posteLabel(key)})</td><td class="v">${money(paidSoFar)} / ${money(due)}</td></tr>
      </table>
    </div>
    </body></html>
  `);
  w.document.close();
  w.print();
}

function printClub(clubId){
  const club = STATE.clubs.find(c=>c.id===clubId);
  const w = window.open('', '_blank');
  w.document.write(`
    <html><head><title>${esc(club.name)}</title>
    <style>body{font-family:Arial;padding:20px;} table{width:100%;border-collapse:collapse;} td,th{border:1px solid #999;padding:6px;text-align:center;font-size:13px;}</style>
    </head><body>
    <h2>Ligue de Judo Blida — Saison ${STATE.currentSeason}</h2>
    <h3>${esc(club.name)}</h3>
    <p>Directeur du club : ${esc(club.manager)||'—'} | Entraîneurs : ${club.coachesCount||0} | Arbitres : ${club.refereesCount||0}</p>
    <table>
      <tr><th>Catégorie</th><th>Licenciés</th><th>Garçons</th><th>Filles</th><th>Payé</th><th>Dû</th></tr>
      ${CATS.map(cat=>`<tr><td>${CAT_LABELS[cat]}</td><td>${club.categories[cat].licenses}</td><td>${club.categories[cat].male}</td><td>${club.categories[cat].female}</td><td>${money(catPaid(club,cat))}</td><td>${money(catDue(club,cat))}</td></tr>`).join('')}
      <tr><td>Entraîneurs</td><td colspan="3">${club.coachesCount||0}</td><td>${money(coachPaid(club))}</td><td>${money(coachDue(club))}</td></tr>
      <tr><td>Arbitres</td><td colspan="3">${club.refereesCount||0}</td><td>${money(refereePaid(club))}</td><td>${money(refereeDue(club))}</td></tr>
    </table>
    <h4>Détail des versements</h4>
    <table><tr><th>Poste</th><th>Date</th><th>Heure</th><th>Montant</th><th>Payé par</th></tr>
    ${[...CATS.map(cat=>club.payments[cat].map(p=>({...p,poste:CAT_LABELS[cat]}))).flat(), club.payments.coaches.map(p=>({...p,poste:'Entraîneurs'})), (club.payments.referees||[]).map(p=>({...p,poste:'Arbitres'}))].flat()
      .map(p=>`<tr><td>${p.poste}</td><td>${new Date(p.date).toLocaleDateString('fr-FR')}</td><td>${p.time?new Date(p.time).toLocaleTimeString('fr-FR'):'—'}</td><td>${money(p.amount)}</td><td>${esc(p.payer||'')}</td></tr>`).join('')}
    </table>
    </body></html>
  `);
  w.document.close();
  w.print();
}

/* ============================================================
   STATISTIQUES
   ============================================================ */
function renderStats(main){
  const clubs = STATE.clubs;
  const entries = allPaymentEntries(clubs);
  main.innerHTML = `
    <div class="btn-row">
      <button class="btn btn-outline" onclick="window.print()">🖨️ Imprimer les statistiques</button>
    </div>
    <div class="card">
      <h3>Encaissements globaux de la Ligue</h3>
      <div class="grid-stats">
        <div class="stat-box red"><div class="num">${money(sumByPeriod(entries,'day'))}</div><div class="label">Aujourd'hui</div></div>
        <div class="stat-box red"><div class="num">${money(sumByPeriod(entries,'month'))}</div><div class="label">Ce mois</div></div>
        <div class="stat-box red"><div class="num">${money(sumByPeriod(entries,'year'))}</div><div class="label">Cette année</div></div>
      </div>
    </div>

    <div class="card">
      <h3>Total par catégorie (toute la ligue)</h3>
      <table class="table">
        <thead><tr><th class="label-col">Catégorie</th><th>Licenciés</th><th>Garçons</th><th>Filles</th><th>Payé</th><th>Dû</th></tr></thead>
        <tbody>
          ${CATS.map(cat=>{
            const lic = clubs.reduce((s,c)=>s+(c.categories[cat]?.licenses||0),0);
            const m = clubs.reduce((s,c)=>s+(c.categories[cat]?.male||0),0);
            const f = clubs.reduce((s,c)=>s+(c.categories[cat]?.female||0),0);
            const paid = clubs.reduce((s,c)=>s+catPaid(c,cat),0);
            const due = clubs.reduce((s,c)=>s+catDue(c,cat),0);
            return `<tr><td class="label-col">${CAT_LABELS[cat]}</td><td>${lic}</td><td>${m}</td><td>${f}</td><td>${money(paid)}</td><td>${money(due)}</td></tr>`;
          }).join('')}
          <tr>
            <td class="label-col"><b>Entraîneurs</b></td>
            <td colspan="3">${clubs.reduce((s,c)=>s+(c.coachesCount||0),0)}</td>
            <td>${money(clubs.reduce((s,c)=>s+coachPaid(c),0))}</td>
            <td>${money(clubs.reduce((s,c)=>s+coachDue(c),0))}</td>
          </tr>
          <tr>
            <td class="label-col"><b>Arbitres</b></td>
            <td colspan="3">${clubs.reduce((s,c)=>s+(c.refereesCount||0),0)}</td>
            <td>${money(clubs.reduce((s,c)=>s+refereePaid(c),0))}</td>
            <td>${money(clubs.reduce((s,c)=>s+refereeDue(c),0))}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <h3>Classement des clubs par montant payé</h3>
      <table class="table">
        <thead><tr><th class="label-col">Club</th><th>Licenciés</th><th>Payé</th><th>Dû</th><th>Reste</th></tr></thead>
        <tbody>
          ${[...clubs].sort((a,b)=>clubTotalPaid(b)-clubTotalPaid(a)).map(c=>`
            <tr><td class="label-col">${esc(c.name)}</td><td>${clubTotalLicenses(c)}</td><td>${money(clubTotalPaid(c))}</td><td>${money(clubTotalDue(c))}</td><td>${money(Math.max(0,clubTotalDue(c)-clubTotalPaid(c)))}</td></tr>
          `).join('') || '<tr><td colspan="5">Aucun club</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

/* ============================================================
   JOURNAL DES REGLEMENTS (registre de tous les versements)
   ============================================================ */
function allPaymentEntriesDetailed(clubs){
  const list = [];
  clubs.forEach(club=>{
    CATS.forEach(cat=>{
      (club.payments[cat]||[]).forEach((p,i)=> list.push({...p, clubId:club.id, clubName:club.name, key:cat, poste:CAT_LABELS[cat]}));
    });
    (club.payments.coaches||[]).forEach((p,i)=> list.push({...p, clubId:club.id, clubName:club.name, key:'coaches', poste:'Entraîneurs'}));
    (club.payments.referees||[]).forEach((p,i)=> list.push({...p, clubId:club.id, clubName:club.name, key:'referees', poste:'Arbitres'}));
  });
  return list.sort((a,b)=> new Date(b.date) - new Date(a.date));
}

function renderJournal(main){
  main.innerHTML = `
    <div class="card">
      <h3>Journal des règlements</h3>
      <p class="card-desc">Historique de tous les versements reçus. Recherchez par nom de club ou par date.</p>
      <div class="search-row">
        <input type="text" id="journalClubSearch" placeholder="Nom du club...">
        <input type="date" id="journalDateSearch">
        <button class="btn btn-secondary" id="journalClearBtn">Réinitialiser</button>
      </div>
      <div class="btn-row">
        <button class="btn btn-outline" onclick="window.print()">🖨️ Imprimer ce journal</button>
      </div>
      <div id="journalTotal" style="font-size:12.5px;color:var(--text-muted);margin-bottom:8px;"></div>
      <div id="journalList"></div>
    </div>
  `;
  const renderList = ()=>{
    const q = document.getElementById('journalClubSearch').value.trim().toLowerCase();
    const d = document.getElementById('journalDateSearch').value;
    let entries = allPaymentEntriesDetailed(STATE.clubs);
    if(q) entries = entries.filter(e=>e.clubName.toLowerCase().includes(q));
    if(d) entries = entries.filter(e=>e.date === d);
    const total = entries.reduce((s,e)=>s+Number(e.amount||0),0);
    document.getElementById('journalTotal').textContent = `${entries.length} versement(s) — total ${money(total)}`;
    const list = document.getElementById('journalList');
    if(entries.length===0){ list.innerHTML = emptyState('Aucun versement trouvé.'); return; }
    list.innerHTML = `
      <table class="table">
        <thead><tr><th class="label-col">Club</th><th>Poste</th><th>Montant</th><th>Date</th><th>Heure</th><th>Payé par</th><th></th></tr></thead>
        <tbody>
          ${entries.map(e=>`
            <tr>
              <td class="label-col">${esc(e.clubName)}</td>
              <td>${e.poste}</td>
              <td>${money(e.amount)}</td>
              <td>${new Date(e.date).toLocaleDateString('fr-FR')}</td>
              <td>${e.time?new Date(e.time).toLocaleTimeString('fr-FR'):'—'}</td>
              <td>${esc(e.payer||'')}</td>
              <td><button class="btn btn-small btn-outline no-print" onclick="openClubDetail('${e.clubId}')">Voir</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };
  document.getElementById('journalClubSearch').addEventListener('input', renderList);
  document.getElementById('journalDateSearch').addEventListener('input', renderList);
  document.getElementById('journalClearBtn').addEventListener('click', ()=>{
    document.getElementById('journalClubSearch').value='';
    document.getElementById('journalDateSearch').value='';
    renderList();
  });
  renderList();
}

/* ============================================================
   CAISSE DE LA LIGUE (versements de l'argent collecté à la trésorerie)
   ============================================================ */
function renderCaisse(main){
  const deposits = (STATE.treasury||[]).slice().sort((a,b)=> new Date(b.date)-new Date(a.date));
  const total = deposits.reduce((s,d)=>s+Number(d.amount||0),0);
  main.innerHTML = `
    <div class="card">
      <h3>Caisse de la Ligue</h3>
      <p class="card-desc">Enregistrez ici chaque fois que vous remettez l'argent collecté auprès des clubs à la trésorerie de la Ligue.</p>
      <div class="grid-stats" style="margin-bottom:14px;">
        <div class="stat-box plain"><div class="num">${money(total)}</div><div class="label">Total remis à la trésorerie</div></div>
      </div>
      <div class="form-row" style="grid-template-columns:1fr 1fr;">
        <input type="number" min="0" id="depAmount" placeholder="Montant remis (DA)">
        <input type="date" id="depDate" value="${todayStr()}">
      </div>
      <div class="btn-row" style="margin-top:10px;">
        <button class="btn btn-primary" id="addDepositBtn">Enregistrer la remise</button>
        <button class="btn btn-outline" onclick="window.print()">🖨️ Imprimer l'archive</button>
      </div>
      <div id="depositsList"></div>
    </div>
  `;
  const renderList = ()=>{
    const list = document.getElementById('depositsList');
    if(deposits.length===0){ list.innerHTML = emptyState('Aucune remise enregistrée.'); return; }
    list.innerHTML = `
      <table class="table">
        <thead><tr><th class="label-col">Date</th><th>Montant</th><th></th></tr></thead>
        <tbody>
          ${deposits.map((d)=>{
            const realIdx = STATE.treasury.indexOf(d);
            return `<tr>
              <td class="label-col">${new Date(d.date).toLocaleDateString('fr-FR')}</td>
              <td>${money(d.amount)}</td>
              <td>
                <button class="btn btn-small btn-outline no-print" onclick="printDepositReceipt(${realIdx})">🖨️</button>
                <button class="btn btn-small btn-danger no-print" onclick="removeDeposit(${realIdx})">✕</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    `;
  };
  renderList();
  document.getElementById('addDepositBtn').addEventListener('click', async ()=>{
    const amount = Number(document.getElementById('depAmount').value)||0;
    const date = document.getElementById('depDate').value || todayStr();
    if(amount<=0){ alert('Montant invalide'); return; }
    if(!STATE.treasury) STATE.treasury = [];
    STATE.treasury.push({ id: uid(), amount, date, time: new Date().toISOString() });
    await saveState();
    renderCaisse(main);
  });
}

async function removeDeposit(index){
  if(!confirm('Supprimer cette remise ?')) return;
  STATE.treasury.splice(index,1);
  await saveState();
  renderTab('caisse');
}

function printDepositReceipt(index){
  const d = STATE.treasury[index];
  if(!d) return;
  const w = window.open('', '_blank');
  w.document.write(`
    <html><head><title>Reçu de remise</title>
    <style>body{font-family:Arial;padding:30px;} .box{border:1px solid #333;padding:24px;max-width:420px;margin:0 auto;} h2{text-align:center;margin-top:0;} table{width:100%;border-collapse:collapse;margin-top:14px;} td{padding:6px 0;font-size:14px;} td.l{color:#555;} td.v{text-align:right;font-weight:bold;}</style>
    </head><body>
    <div class="box">
      <h2>Ligue de Judo — Wilaya de Blida</h2>
      <p style="text-align:center;color:#555;">Reçu de remise à la trésorerie</p>
      <table>
        <tr><td class="l">Montant remis</td><td class="v">${money(d.amount)}</td></tr>
        <tr><td class="l">Date</td><td class="v">${new Date(d.date).toLocaleDateString('fr-FR')}</td></tr>
        <tr><td class="l">Heure d'enregistrement</td><td class="v">${d.time?new Date(d.time).toLocaleTimeString('fr-FR'):'—'}</td></tr>
      </table>
    </div>
    </body></html>
  `);
  w.document.close();
  w.print();
}

/* ============================================================
   ARCHIVES
   ============================================================ */
function renderArchives(main){
  const archives = STATE.archives || [];
  if(archives.length===0){
    main.innerHTML = `<div class="card">${emptyState('Aucune saison archivée pour le moment.')}</div>`;
    return;
  }
  main.innerHTML = archives.slice().reverse().map((arch,idx)=>{
    const realIdx = archives.length-1-idx;
    const totalPaid = arch.clubs.reduce((s,c)=>s+CATS.reduce((ss,cat)=>ss+(c.payments?.[cat]||[]).reduce((a,p)=>a+Number(p.amount||0),0),0)+((c.payments?.coaches||[]).reduce((a,p)=>a+Number(p.amount||0),0))+((c.payments?.referees||[]).reduce((a,p)=>a+Number(p.amount||0),0)),0);
    return `
    <div class="card season-archive-card">
      <h3>Saison ${esc(arch.season)}</h3>
      <p style="font-size:12.5px;color:var(--gray);">${arch.clubs.length} club(s) — Total encaissé : ${money(totalPaid)}</p>
      <button class="btn btn-small btn-outline" onclick="viewArchive(${realIdx})">Voir le détail</button>
    </div>`;
  }).join('');
}

function viewArchive(idx){
  const arch = STATE.archives[idx];
  const clubsHtml = arch.clubs.map(club=>{
    const due = CATS.reduce((s,cat)=>s+(club.categories[cat].licenses*(arch.settings.prices[cat]||0)),0) + (club.coachesCount*(arch.settings.coachPrice||0)) + ((club.refereesCount||0)*(arch.settings.refereePrice||0));
    const paid = CATS.reduce((s,cat)=>s+(club.payments?.[cat]||[]).reduce((a,p)=>a+Number(p.amount||0),0),0) + (club.payments?.coaches||[]).reduce((a,p)=>a+Number(p.amount||0),0) + (club.payments?.referees||[]).reduce((a,p)=>a+Number(p.amount||0),0);
    return `<tr><td class="label-col">${esc(club.name)}</td><td>${CATS.reduce((s,c)=>s+club.categories[c].licenses,0)}</td><td>${money(paid)}</td><td>${money(due)}</td></tr>`;
  }).join('');
  openModal(`
    <button class="close-x" onclick="closeModal()">×</button>
    <div class="modal-title">Archive — Saison ${esc(arch.season)}</div>
    <table class="table">
      <thead><tr><th class="label-col">Club</th><th>Licenciés</th><th>Payé</th><th>Dû</th></tr></thead>
      <tbody>${clubsHtml || '<tr><td colspan="4">Aucun club</td></tr>'}</tbody>
    </table>
    <div class="btn-row" style="margin-top:14px;">
      <button class="btn btn-outline" onclick="window.print()">🖨️ Imprimer</button>
    </div>
  `);
}

/* ============================================================
   REGLAGES
   ============================================================ */
function renderSettings(main){
  const s = STATE.settings;
  main.innerHTML = `
    <div class="card">
      <h3>Saison en cours</h3>
      <div class="form-group">
        <label>Libellé de la saison</label>
        <input id="seasonLabelInput" value="${esc(STATE.currentSeason)}">
      </div>
      <button class="btn btn-secondary btn-small" id="saveSeasonLabel">Enregistrer</button>
    </div>

    <div class="card">
      <h3>Tarifs des licences (par judoka et par catégorie)</h3>
      ${CATS.map(cat=>`
        <div class="form-group">
          <label>${CAT_LABELS[cat]} — prix par licence (DA)</label>
          <input type="number" min="0" id="price_${cat}" value="${s.prices[cat]||0}">
        </div>
      `).join('')}
      <div class="form-group">
        <label>Prix de la licence entraîneur (DA)</label>
        <input type="number" min="0" id="price_coach" value="${s.coachPrice||0}">
      </div>
      <div class="form-group">
        <label>Prix de la licence arbitre (DA)</label>
        <input type="number" min="0" id="price_referee" value="${s.refereePrice||0}">
      </div>
      <button class="btn btn-primary" id="savePrices">Enregistrer les tarifs</button>
    </div>
  `;

  document.getElementById('saveSeasonLabel').addEventListener('click', async ()=>{
    STATE.currentSeason = document.getElementById('seasonLabelInput').value.trim() || STATE.currentSeason;
    await saveState();
    document.getElementById('currentSeasonLabel').textContent = STATE.currentSeason;
    document.getElementById('loginSeason').textContent = STATE.currentSeason;
    alert('Saison mise à jour.');
  });

  document.getElementById('savePrices').addEventListener('click', async ()=>{
    CATS.forEach(cat=>{ s.prices[cat] = Number(document.getElementById(`price_${cat}`).value)||0; });
    s.coachPrice = Number(document.getElementById('price_coach').value)||0;
    s.refereePrice = Number(document.getElementById('price_referee').value)||0;
    await saveState();
    alert('Tarifs enregistrés.');
  });
}

/* ============================================================
   MODALE GENERIQUE
   ============================================================ */
function openModal(html){
  document.getElementById('modalBox').innerHTML = html;
  document.getElementById('modalOverlay').style.display = 'flex';
}
function closeModal(){
  document.getElementById('modalOverlay').style.display = 'none';
}
document.getElementById('modalOverlay').addEventListener('click', (e)=>{
  if(e.target.id==='modalOverlay') closeModal();
});

/* ---------------- START ---------------- */
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  });
}
checkAuthOnLoad();
