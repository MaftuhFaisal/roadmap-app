(function(){
  const STORAGE_KEY = 'ppuuRoadmap_v3';
  const $ = (id)=>document.getElementById(id);

  // --- LOGIN LOGIC ---
  const ADMIN_USER = "admin";
  const ADMIN_PASS = "admin123";
  let isAdmin = false;

  const loginModal = $('login-modal');
  const loginUser = $('login-user');
  const loginPass = $('login-pass');
  const btnLogin = $('btn-login');
  const loginError = $('login-error');
  const btnLogout = $('btn-logout');
  const btnAdd = $('btn-add');
  const btnAddMasa = $('btn-add-masa');
  const btnAddTahun = $('btn-add-tahun');
  const btnShowLogin = $('btn-show-login');
  const btnLoginClose = $('login-close');

  function showLogin() {
    loginModal.style.display = 'block';
    loginModal.setAttribute('aria-hidden','false');
    loginError.style.display = 'none';
    loginUser.value = '';
    loginPass.value = '';
    loginUser.focus();
  }
  function hideLogin() {
    loginModal.style.display = 'none';
    loginModal.setAttribute('aria-hidden','true');
  }
  function setAdminUI(show) {
    isAdmin = show;
    btnAdd.style.display = show ? '' : 'none';
    btnAddMasa.style.display = show ? '' : 'none';
    btnAddTahun.style.display = show ? '' : 'none';
    btnLogout.style.display = show ? '' : 'none';
    btnShowLogin.style.display = show ? 'none' : '';
    render();
  }
  btnLoginClose.onclick = function() {
    hideLogin();
  };
  btnLogin.onclick = function() {
    if(loginUser.value === ADMIN_USER && loginPass.value === ADMIN_PASS) {
      hideLogin();
      setAdminUI(true);
    } else {
      loginError.style.display = 'block';
    }
  };
  btnLogout.onclick = function() {
    setAdminUI(false);
  };
  btnShowLogin.onclick = function() {
    showLogin();
  };
  loginModal.addEventListener('click', (e)=>{ if(e.target===loginModal) e.stopPropagation(); });

  // --- END LOGIN LOGIC ---

  const indoMonths = {
    'januari':0,'februari':1,'maret':2,'april':3,'mei':4,'juni':5,
    'juli':6,'agustus':7,'september':8,'oktober':9,'november':10,'desember':11
  };

  function startOfDay(d){ const nd=new Date(d); nd.setHours(0,0,0,0); return nd; }
  const today = startOfDay(new Date());

  function stripLeadingToDigit(s){ return (s||'').trim().replace(/^[^0-9]*(?=\d)/,''); }

  function parseIndoRange(dateStr){
    if(!dateStr) return {start:null,end:null};
    let s = stripLeadingToDigit(dateStr.replace(/,/g,' ').replace(/\s+/g,' ').trim());
    let m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s*[-–]\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/i);
    if(m){
      const d1=parseInt(m[1],10), mon1=indoMonths[m[2].toLowerCase()], d2=parseInt(m[3],10), mon2=indoMonths[m[4].toLowerCase()], y=parseInt(m[5],10);
      return { start: new Date(y,mon1,d1), end: new Date(y,mon2,d2) };
    }
    m = s.match(/^(\d{1,2})\s*[-–]\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/i);
    if(m){
      const d1=parseInt(m[1],10), d2=parseInt(m[2],10), mon=indoMonths[m[3].toLowerCase()], y=parseInt(m[4],10);
      return { start: new Date(y,mon,d1), end: new Date(y,mon,d2) };
    }
    m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/i);
    if(m){
      const d=parseInt(m[1],10), mon=indoMonths[m[2].toLowerCase()], y=parseInt(m[3],10);
      const dt=new Date(y,mon,d); return { start: dt, end: dt };
    }
    const fallback = new Date(dateStr);
    if(!isNaN(fallback)) return { start: startOfDay(fallback), end: startOfDay(fallback) };
    return { start:null, end:null };
  }

  function computeStatus(ev){
    if(ev.status && ev.status !== 'auto') return ev.status;
    const {start,end} = parseIndoRange(ev.date);
    if(!start||!end) return 'akan';
    if(today < startOfDay(start)) return 'akan';
    if(today > startOfDay(end)) return 'selesai';
    return 'proses';
  }

  function statusLabel(cls){
    return cls==='proses' ? 'On Process'
         : cls==='akan' ? 'Yang Akan Datang'
         : cls==='selesai' ? 'Selesai'
         : cls==='libur' ? 'Libur'
         : cls==='terminated' ? 'Terminated'
         : cls;
  }
  function deleteEvent(idx) {
    if(confirm('Yakin ingin menghapus kegiatan ini?')) {
      roadmap[currentTahun][currentMasa].splice(idx, 1);
      save();
      render();
      closeModal();
    }
  }
  // Initial roadmap data: { [tahunSidang]: { [masaSidang]: [event, ...] } }
  const initial = {
    '2025-2026': {
      'I': [
        {date:'Rabu, 13 Agustus 2025', type:'Rapat Pimpinan DPD RI', desc:'Rapat Pleno Panitia Musyawarah Ke-11 DPD RI: Persiapan Sidang Paripurna Ke-16 DPD RI; Informasi dan Lain-lain.', status:'auto'},
        {date:'Kamis , 14 Agustus 2025', type:'Sidang Paripurna Ke-16 DPD RI', desc:'Laporan Kegiatan Anggota; Laporan Kinerja Kelompok DPD 2024-2025; Penyerahan Laporan Kinerja Sekretariat Jenderal 2024-2025; Penutupan Masa Sidang V 2024-2025.', status:'auto'}
      ],
      'II': [], 'III': [], 'IV': [], 'V': []
    }
  };

  // State
  let roadmap = load() || initial;
  let tahunSidangs = Object.keys(roadmap);
  let currentTahun = tahunSidangs[0];
  let masaSidangs = Object.keys(roadmap[currentTahun]);
  let currentMasa = masaSidangs[0];
  let editIndex = null;

  // DOM refs
  const tahunSelect = $('tahun-sidang');
  const masaSelect = $('masa-sidang');
  const filterSelect = $('filter');
  const searchInput = $('search');
  const timeline = $('timeline');
  const masaTitle = $('masa-title');
  const modal = $('modal');
  const modalTitle = $('modal-title');
  const iDate = $('event-date');
  const iDocLink = $('event-doclink');
  const iType = $('event-type');
  const iDesc = $('event-desc');
  const iStatus = $('event-status');
  const iProof = $('event-proof');
  const iNotulen = $('event-notulen');
  const iHasilRapat = $('event-hasilrapat');

  // Init
  renderTahunOptions();
  renderMasaOptions();
  render();
  setAdminUI(false);
  showLogin();

  // Events
  btnAdd.onclick = function(){ if(isAdmin) openAdd(); };
  btnAddMasa.onclick = function(){ if(isAdmin) addMasa(); };
  btnAddTahun.onclick = function(){ if(isAdmin) addTahun(); };
  tahunSelect.onchange = ()=>{
    currentTahun = tahunSelect.value;
    masaSidangs = Object.keys(roadmap[currentTahun]);
    currentMasa = masaSidangs[0];
    renderMasaOptions();
    render();
  };
  masaSelect.onchange = ()=>{
    currentMasa = masaSelect.value;
    render();
  };
  filterSelect.onchange = render;
  searchInput.oninput = debounce(render, 120);
  $('btn-save').onclick = handleSave;
  $('btn-cancel').onclick = closeModal;
  modal.addEventListener('click', (e)=>{ if(e.target===modal) closeModal(); });

  function renderTahunOptions(){
    tahunSidangs = Object.keys(roadmap);
    tahunSelect.innerHTML = '';
    tahunSidangs.forEach(ts=>{
      const opt = document.createElement('option');
      opt.value = ts; opt.textContent = ts; tahunSelect.appendChild(opt);
    });
    tahunSelect.value = currentTahun;
  }
  function renderMasaOptions(){
    masaSidangs = Object.keys(roadmap[currentTahun]);
    masaSelect.innerHTML = '';
    masaSidangs.forEach(ms=>{
      const opt = document.createElement('option');
      opt.value = ms; opt.textContent = 'Masa Sidang ' + ms; masaSelect.appendChild(opt);
    });
    masaSelect.value = currentMasa;
  }
  function render(){
    timeline.innerHTML = '';
    masaTitle.textContent = 'Tahun Sidang ' + currentTahun + ' - Masa Sidang ' + currentMasa;
    const list = (roadmap[currentTahun][currentMasa]||[])
      .map((ev, idx)=>({ ...ev, _idx: idx }))
      .filter(ev=>{
        const cls = computeStatus(ev);
        const label = statusLabel(cls);
        const filterVal = filterSelect.value;
        const q = (searchInput.value||'').toLowerCase();
        const inFilter = (filterVal==='all' || cls===filterVal || label.toLowerCase()===filterVal.toLowerCase());
        const inSearch = (!q) || (ev.type && ev.type.toLowerCase().includes(q)) || (ev.desc && ev.desc.toLowerCase().includes(q)) || (ev.date && ev.date.toLowerCase().includes(q));
        return inFilter && inSearch;
      });
    if(list.length===0){
      const empty = document.createElement('div');
      empty.style.textAlign='center';
      empty.style.padding='1rem';
      empty.textContent = 'Tidak ada kegiatan untuk filter/pencarian ini.';
      timeline.appendChild(empty);
      return;
    }
    list.forEach((ev, i)=>{
      const side = (i % 2 === 0) ? 'left' : 'right';
      const cls = computeStatus(ev);
      const label = statusLabel(cls);
      const card = document.createElement('div');
      card.className = `event ${side}`;
      let proofHTML = '';
      if(ev.proof){
        const ext = (ev.proofName || '').split('.').pop().toLowerCase();
        if(['jpg','jpeg','png','webp'].includes(ext)){
          proofHTML = `<img class="proof-img" src="${ev.proof}" alt="Bukti Rapat" />`;
        } else {
          proofHTML = `<a href="${ev.proof}" download="${ev.proofName||'bukti'}" style="display:inline-block;margin-top:.4rem;color:${getComputedStyle(document.documentElement).getPropertyValue('--primary')}">📎 Bukti Rapat</a>`;
        }
      }
      let notulenHTML = '';
      if(ev.notulen){
        const ext = (ev.notulenName || '').split('.').pop().toLowerCase();
        let icon = '📄';
        if(ext === 'pdf') icon = '📕';
        else if(ext === 'doc' || ext === 'docx') icon = '📝';
        notulenHTML = `<a href="${ev.notulen}" download="${ev.notulenName||'notulen'}" style="display:inline-block;margin-top:.4rem;color:#8e24aa;margin-left:.5rem;">${icon} Notulen</a>`;
      }
      let hasilRapatHTML = '';
      if(ev.hasilrapat){
        const ext = (ev.hasilrapatName || '').split('.').pop().toLowerCase();
        let icon = '📄';
        if(ext === 'pdf') icon = '📕';
        else if(ext === 'doc' || ext === 'docx') icon = '📝';
        hasilRapatHTML = `<a href="${ev.hasilrapat}" download="${ev.hasilrapatName||'hasilrapat'}" style="display:inline-block;margin-top:.4rem;color:#009688;margin-left:.5rem;">${icon} Hasil Rapat</a>`;
      }
      let docLinkHTML = '';
      if(ev.doclink){
        docLinkHTML = `<a href="${ev.doclink}" target="_blank" rel="noopener" style="display:inline-block;margin-top:.4rem;color:#1a73e8;margin-left:.5rem;">🔗 Dokumentasi</a>`;
      }
      card.innerHTML = `
        <div class="date">${ev.date}</div>
        <div class="type">${ev.type||''}</div>
        <div class="desc">${ev.desc||''}</div>
        <span class="status ${cls}">${label}</span>
        ${isAdmin ? `<button class="edit-btn" data-idx="${ev._idx}">Edit</button>
        <button class="delete-btn" data-idx="${ev._idx}" style="background:#dc3545;color:#fff;margin-left:.5rem;">Hapus</button>` : ''}
       ${proofHTML}
       ${notulenHTML}
       ${hasilRapatHTML}
       ${docLinkHTML}
      `;
      if(isAdmin && card.querySelector('.edit-btn'))
        card.querySelector('.edit-btn').onclick = ()=>openEdit(ev._idx);
      if(isAdmin && card.querySelector('.delete-btn'))
        card.querySelector('.delete-btn').onclick = ()=>deleteEvent(ev._idx);
      timeline.appendChild(card);
    });
  }

  function openAdd(){
    editIndex = null;
    modalTitle.textContent = 'Tambah Kegiatan';
    iDate.value = ''; iType.value = ''; iDesc.value = ''; iStatus.value = 'auto'; iProof.value=''; iNotulen.value=''; iHasilRapat.value=''; iDocLink.value = '';
    openModal();
  }
  function openEdit(idx){
    editIndex = idx;
    const ev = roadmap[currentTahun][currentMasa][idx];
    modalTitle.textContent = 'Edit Kegiatan';
    iDate.value = ev.date||''; iType.value = ev.type||''; iDesc.value = ev.desc||''; iStatus.value = ev.status||'auto'; iProof.value=''; iNotulen.value=''; iHasilRapat.value='';
    openModal();
  }
  function openModal(){ modal.style.display='block'; modal.setAttribute('aria-hidden','false'); }
  function closeModal(){ modal.style.display='none'; modal.setAttribute('aria-hidden','true'); }

  function handleSave(){
    const date = iDate.value.trim();
    const type = iType.value.trim();
    const desc = iDesc.value.trim();
    const doclink = iDocLink.value.trim();
    const status = iStatus.value;
    if(!date || !type || !desc){ alert('Semua field wajib diisi.'); return; }
    const file = iProof.files && iProof.files[0];
    const notulenFile = iNotulen.files && iNotulen.files[0];
    const hasilRapatFile = iHasilRapat.files && iHasilRapat.files[0];

    let proofObj = {}, notulenObj = {}, hasilRapatObj = {};

    function readFile(file, cb){
      const reader = new FileReader();
      reader.onload = (e)=>cb(e.target.result, file.name);
      reader.readAsDataURL(file);
    }

    if(file){
      readFile(file, (data, name)=>{
        proofObj = {proof:data, proofName:name};
        if(notulenFile){
          readFile(notulenFile, (ndata, nname)=>{
            notulenObj = {notulen:ndata, notulenName:nname};
            if(hasilRapatFile){
              readFile(hasilRapatFile, (hdata, hname)=>{
                hasilRapatObj = {hasilrapat:hdata, hasilrapatName:hname};
                finishSave();
              });
            } else finishSave();
          });
        } else if(hasilRapatFile){
          readFile(hasilRapatFile, (hdata, hname)=>{
            hasilRapatObj = {hasilrapat:hdata, hasilrapatName:hname};
            finishSave();
          });
        } else finishSave();
      });
    } else if(notulenFile){
      readFile(notulenFile, (ndata, nname)=>{
        notulenObj = {notulen:ndata, notulenName:nname};
        if(hasilRapatFile){
          readFile(hasilRapatFile, (hdata, hname)=>{
            hasilRapatObj = {hasilrapat:hdata, hasilrapatName:hname};
            finishSave();
          });
        } else finishSave();
      });
    } else if(hasilRapatFile){
      readFile(hasilRapatFile, (hdata, hname)=>{
        hasilRapatObj = {hasilrapat:hdata, hasilrapatName:hname};
        finishSave();
      });
    } else {
      finishSave();
    }

    function finishSave(){
      upsert(Object.assign({date,type,desc,status,doclink}, proofObj, notulenObj, hasilRapatObj));
    }
  }

  function upsert(eventObj){
    if(editIndex===null){ (roadmap[currentTahun][currentMasa] = roadmap[currentTahun][currentMasa]||[]).push(eventObj); }
    else { roadmap[currentTahun][currentMasa][editIndex] = eventObj; }
    save(); closeModal(); render();
  }
  function addMasa(){
    const label = prompt('Masukkan label Masa Sidang baru (contoh: VI atau 6):');
    if(!label) return;
    if(roadmap[currentTahun][label]){ alert('Masa Sidang sudah ada.'); return; }
    roadmap[currentTahun][label] = []; masaSidangs.push(label); currentMasa = label; save(); renderMasaOptions(); render();
  }
  function addTahun(){
    const label = prompt('Masukkan label Tahun Sidang baru (contoh: 2026-2027):');
    if(!label) return;
    if(roadmap[label]){ alert('Tahun Sidang sudah ada.'); return; }
    roadmap[label] = { 'I':[], 'II':[], 'III':[], 'IV':[], 'V':[] };
    tahunSidangs.push(label); currentTahun = label;
    masaSidangs = Object.keys(roadmap[currentTahun]);
    currentMasa = masaSidangs[0];
    save(); renderTahunOptions(); renderMasaOptions(); render();
  }
  function save(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(roadmap)); }catch(e){} }
  function load(){ try{ const s=localStorage.getItem(STORAGE_KEY); return s? JSON.parse(s): null; }catch(e){ return null; } }
  function debounce(fn,ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn.apply(this,a),ms);}}
  })();