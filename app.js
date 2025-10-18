
// i18n for dashboard
const I18N = {
  en: {
    dash: {
      menu: {projects:'📁 Projects', analytics:'📊 Analytics & Reports', freelancers:'👥 Freelancers', settings:'⚙️ Settings', logout:'🚪 Logout'},
      top: {projects:'Project management'},
      actions: {add:'➕ Add project'},
      filters: {search:'Search by idea / owner…', status:'Filter: Status'},
      status: {bid:'Bid', comms:'Client communication', approved:'Project approved', dev:'In development', done:'Project completed'},
      cols: {idea:'Idea', phase:'Phase', comms:'Comms', status:'Status', owner:'Owner', profile:'Profile', collab:'Collaborators', notes:'Notes', budget:'Budget', actions:'Actions'},
      dialog: {title:'Add / Edit project', ide:'Project idea', comms:'Comms (short)', budget:'Estimated budget (e.g. €10,000)', notes:'Notes', cancel:'Cancel', save:'Save'},
      analytics: {
        kpi1: {title:'Leads', desc:'Week‑over‑week tracking by sources.'},
        kpi2: {title:'Conversions', desc:'Conversion ratio by channels & campaigns.'},
        kpi3: {title:'ROI', desc:'Return on investment per project/campaign.'},
        note:'*Analytics placeholders — can be wired to real sources later.'
      },
      freelancers: {name:'Name', skill:'Profile', add:'➕ Add Freelancer', dialogTitle:'Add / Edit Freelancer'},
      settings: {lang:'Interface language', reset:'Reset data', resetBtn:'Delete demo data', confirmReset:'Delete demo data?'}
    }
  },
  sq: {
    dash: {
      menu: {projects:'📁 Projektet', analytics:'📊 Analiza & Raporte', freelancers:'👥 Freelancerët', settings:'⚙️ Cilësimet', logout:'🚪 Dil'},
      top: {projects:'Menaxhimi i projekteve'},
      actions: {add:'➕ Shto projekt'},
      filters: {search:'Kërko sipas idesë / personit…', status:'Filtri: Statusi'},
      status: {bid:'Bid', comms:'Komunikim me klientin', approved:'Projekti i aprovuar', dev:'Në fazë zhvillimi', done:'Projekt i përfunduar'},
      cols: {idea:'Ide', phase:'Faza', comms:'Komunikim', status:'Status', owner:'Kujdeset nga', profile:'Profili', collab:'Bashkëpunëtorët', notes:'Komente', budget:'Buxheti', actions:'Veprime'},
      dialog: {title:'Shto / Edito projekt', ide:'Ide projekti', comms:'Komunikim (shkurt)', budget:'Buxheti i parashikuar (p.sh. €10,000)', notes:'Komente', cancel:'Anulo', save:'Ruaj'},
      analytics: {
        kpi1: {title:'Leads', desc:'Gjurmim javë‑pas‑jave i prospekteve dhe burimeve.'},
        kpi2: {title:'Konvertime', desc:'Raport konversioni sipas kanaleve dhe fushatave.'},
        kpi3: {title:'ROI', desc:'Kthimi nga investimi për çdo projekt/kampanjë.'},
        note:'*Placeholder analitikash — mund të lidhet me burime reale më vonë.'
      },
      freelancers: {name:'Emri', skill:'Profili', add:'➕ Shto Freelancer', dialogTitle:'Shto / Edito Freelancer'},
      settings: {lang:'Gjuha e ndërfaqes', reset:'Rivendos të dhënat', resetBtn:'Fshi të dhënat demo', confirmReset:'Të fshihen të dhënat demo?'}
    }
  }
};
const I18N_KEY='birth_lang'; const defaultLang=localStorage.getItem(I18N_KEY)||'en';
function setLang(l){ localStorage.setItem(I18N_KEY,l); applyLang(l); }
function t(path){ const parts=path.split('.'); let cur=I18N[window.currentLang||defaultLang]; for(const p of parts){ if(cur&&p in cur){cur=cur[p]} else {return path}} return cur; }
function applyLang(lang){
  window.currentLang=lang;
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key=el.getAttribute('data-i18n'); const val=t(key);
    if(el.tagName==='INPUT' || el.tagName==='TEXTAREA'){ el.setAttribute('placeholder', val); } else { el.innerHTML = val; }
  });
  const btn=document.getElementById('langBtn'); if(btn){ btn.textContent = (lang==='en' ? '🇬🇧' : '🇦🇱'); }
}
document.addEventListener('DOMContentLoaded', ()=>applyLang(defaultLang));

// Sidebar mobile: hamburger + overlay
const hb=document.getElementById('hb');
const sidebar=document.getElementById('sidebar');
const overlay=document.getElementById('overlay');
function openSide(){ sidebar.classList.add('open'); overlay.classList.add('show'); }
function closeSide(){ sidebar.classList.remove('open'); overlay.classList.remove('show'); }
if(hb){ hb.addEventListener('click', openSide); }
if(overlay){ overlay.addEventListener('click', closeSide); }
document.querySelectorAll('.menu a[data-view]').forEach(a=>a.addEventListener('click', closeSide));

// Views routing
const views={projects:'#view-projects', analytics:'#view-analytics', freelancers:'#view-freelancers', settings:'#view-settings'};
document.querySelectorAll('.menu a[data-view]').forEach(a=>a.addEventListener('click', ()=>{
  document.querySelectorAll('.menu a').forEach(x=>x.classList.remove('active'));
  a.classList.add('active');
  const v=a.getAttribute('data-view');
  Object.values(views).forEach(sel=>document.querySelector(sel).style.display='none');
  document.querySelector(views[v]).style.display='block';
  document.getElementById('topTitle').innerHTML=(v==='projects'?t('dash.top.projects'):a.textContent);
}));

// Projects CRUD
const LS_PROJ='birth_projects_v1';
const state={editIndex:null, data:[]};
const tblBody=document.querySelector('#tbl tbody');
const dlg=document.getElementById('dlg'); const frm=document.getElementById('frm');
function load(){ try{ state.data=JSON.parse(localStorage.getItem(LS_PROJ))||[] }catch(e){ state.data=[] } }
function save(){ localStorage.setItem(LS_PROJ, JSON.stringify(state.data)) }
function row(project,i){
  const tr=document.createElement('tr');
  tr.innerHTML=`
    <td>${i+1}</td>
    <td>${project.ide||''}</td>
    <td>${project.faza||''}</td>
    <td>${project.bid||''}</td>
    <td>${project.komunikim||''}</td>
    <td>${project.status||''}</td>
    <td>${project.kujdeset||''}</td>
    <td>${project.profil||''}</td>
    <td>${project.bashke||''}</td>
    <td>${project.komente||''}</td>
    <td>${project.buxheti||''}</td>
    <td>
      <button data-act="edit" data-i="${i}">✏️</button>
      <button data-act="del" data-i="${i}">🗑️</button>
    </td>`;
  return tr;
}
function render(){
  const q=(document.getElementById('search')||{value:''}).value.toLowerCase();
  const fs=(document.getElementById('filterStatus')||{value:''}).value;
  tblBody.innerHTML='';
  state.data
    .filter(p=>(!q || JSON.stringify(p).toLowerCase().includes(q)))
    .filter(p=>(!fs || p.status===fs))
    .forEach((p,i)=> tblBody.appendChild(row(p,i)));
}
document.getElementById('addBtn').addEventListener('click', ()=>{ state.editIndex=null; frm.reset(); document.getElementById('dlgTitle').innerHTML=t('dash.dialog.title'); dlg.showModal(); });
tblBody.addEventListener('click',(e)=>{
  const btn=e.target.closest('button'); if(!btn) return;
  const i=+btn.dataset.i;
  if(btn.dataset.act==='edit'){
    state.editIndex=i; const p=state.data[i]; document.getElementById('dlgTitle').innerHTML=t('dash.dialog.title'); dlg.showModal();
    Object.entries(p).forEach(([k,v])=>{ if(frm.elements[k]) frm.elements[k].value=v; });
  } else if(btn.dataset.act==='del'){
    if(confirm(window.currentLang==='sq'?'Të fshihet projekti?':'Delete this project?')){ state.data.splice(i,1); save(); render(); }
  }
});
frm.addEventListener('submit',(e)=>{
  e.preventDefault();
  const formData=new FormData(frm);
  const p=Object.fromEntries(formData.entries());
  if(state.editIndex==null){ state.data.push(p); } else { state.data[state.editIndex]=p; }
  save(); dlg.close(); render();
});
function seed(){
  if(state.data.length===0){
    state.data=[
      {ide:'Clinic website',faza:'Bid',bid:'€4,500',komunikim:'Kickoff call',status:'Bid',kujdeset:'Martini',profil:'profil1',bashke:'Rexhina',komente:'Need SEO',buxheti:'€5,000'},
      {ide:'Booking app',faza:'Project approved',bid:'€12,000',komunikim:'Weekly email',status:'In development',kujdeset:'Igli',profil:'profil3',bashke:'Endri',komente:'Sprint #2',buxheti:'€15,000'}
    ];
    save();
  }
}
load(); seed(); render();
const searchEl=document.getElementById('search'); if(searchEl) searchEl.addEventListener('input', render);
const filterEl=document.getElementById('filterStatus'); if(filterEl) filterEl.addEventListener('change', render);

// Logout
document.getElementById('logout').addEventListener('click',(e)=>{ e.preventDefault(); sessionStorage.removeItem('auth'); location.replace('login.html'); });

// Freelancers CRUD
const LS_FREEL='birth_freelancers_v1';
const stateFree={data:[], editIndex:null};
const tblFreeBody=document.querySelector('#tblFree tbody');
const dlgFree=document.getElementById('dlgFreelancer');
const frmFree=document.getElementById('frmFreelancer');
function loadFreelancers(){ try{ stateFree.data=JSON.parse(localStorage.getItem(LS_FREEL))||[] }catch(e){ stateFree.data=[] } }
function saveFreelancers(){ localStorage.setItem(LS_FREEL, JSON.stringify(stateFree.data)) }
function renderFreelancers(){
  if(!tblFreeBody) return;
  tblFreeBody.innerHTML='';
  stateFree.data.forEach((f,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${f.emri}</td><td>${f.profil}</td><td>${f.email}</td>
      <td><button data-act="edit" data-i="${i}">✏️</button>
      <button data-act="del" data-i="${i}">🗑️</button></td>`;
    tblFreeBody.appendChild(tr);
  });
}
const btnAddFree=document.getElementById('addFreelancerBtn');
if(btnAddFree){ btnAddFree.addEventListener('click', ()=>{ stateFree.editIndex=null; frmFree.reset(); dlgFree.showModal(); }); }
if(tblFreeBody){
  tblFreeBody.addEventListener('click',(e)=>{
    const b=e.target.closest('button'); if(!b) return;
    const i=+b.dataset.i;
    if(b.dataset.act==='edit'){
      stateFree.editIndex=i; const f=stateFree.data[i];
      Object.entries(f).forEach(([k,v])=>{ if(frmFree.elements[k]) frmFree.elements[k].value=v; });
      dlgFree.showModal();
    } else if(b.dataset.act==='del'){
      if(confirm(window.currentLang==='sq'?'Të fshihet ky freelancer?':'Delete this freelancer?')){ stateFree.data.splice(i,1); saveFreelancers(); renderFreelancers(); }
    }
  });
}
if(frmFree){
  frmFree.addEventListener('submit',(e)=>{
    e.preventDefault();
    const f=Object.fromEntries(new FormData(frmFree).entries());
    if(stateFree.editIndex==null){ stateFree.data.push(f); } else { stateFree.data[stateFree.editIndex]=f; }
    saveFreelancers(); dlgFree.close(); renderFreelancers();
  });
}
function seedFreelancers(){
  if(stateFree.data.length===0){
    stateFree.data=[
      {emri:'Martini',profil:'profil1',email:'martini@example.com'},
      {emri:'Rexhina',profil:'profil2',email:'rexhina@example.com'},
      {emri:'Igli',profil:'profil3',email:'igli@example.com'},
      {emri:'Bruna',profil:'profil4',email:'bruna@example.com'},
      {emri:'Albora',profil:'profil2',email:'albora@example.com'},
      {emri:'Endri',profil:'profil3',email:'endri@example.com'}
    ];
    saveFreelancers();
  }
}
loadFreelancers(); seedFreelancers(); renderFreelancers();
