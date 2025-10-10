(function(){
  const SHEETDB_API = 'https://sheetdb.io/api/v1/5spb590qt55j0'; // Ganti dengan endpoint SheetDB kamu
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
  btnLoginClose.onclick = function() { hideLogin(); };
  btnLogin.onclick = function() {
    if(loginUser.value === ADMIN_USER && loginPass.value === ADMIN_PASS) {
      hideLogin();
      setAdminUI(true);
    } else {
      loginError.style.display = 'block';
    }
  };
  btnLogout.onclick = function() { setAdminUI(false); };
  btnShowLogin.onclick = function() { showLogin(); };
  loginModal.addEventListener('click', (e)=>{ if(e.target===loginModal) e.stopPropagation(); });

  // --- END LOGIN LOGIC ---

  // State
  let roadmap = {}; // akan diisi dari Google Sheet
  let tahunSidangs = [];
  let currentTahun = '';
  let masaSidangs = [];
  let currentMasa = '';
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

  // --- Google Sheet Integration ---
  function loadEventsFromSheet() {
    fetch(SHEETDB_API)
      .then(res => res.json())
      .then(data => {
        roadmap = {};
        data.forEach(ev => {
          const tahun = ev.tahun || '2025-2026';
          const masa = ev.masa || 'I';
          if(!roadmap[tahun]) roadmap[tahun] = {};
          if(!roadmap[tahun][masa]) roadmap[tahun][masa] = [];
          roadmap[tahun][masa].push(ev);
        });
        tahunSidangs = Object.keys(roadmap);
        currentTahun = tahunSidangs[0];
        masaSidangs = Object.keys(roadmap[currentTahun]);
        currentMasa = masaSidangs[0];
        renderTahunOptions();
        renderMasaOptions();
        render();
      });
  }

  function saveEventToSheet(event) {
    fetch(SHEETDB_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [event] })
    })
    .then(res => res.json())
    .then(json => {
      alert('Data berhasil disimpan ke Google Sheets!');
      loadEventsFromSheet();
      closeModal();
    })
    .catch(err => alert('Gagal simpan data!'));
  }

  // --- UI Logic ---
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
        const q = (searchInput.value||'').toLowerCase();
        return (!q) || (ev.type && ev.type.toLowerCase().includes(q)) || (ev.desc && ev.desc.toLowerCase().includes(q)) || (ev.date && ev.date.toLowerCase().includes(q));
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
      const card = document.createElement('div');
      card.className = `event`;
      card.innerHTML = `
        <div class="date">${ev.date}</div>
        <div class="type">${ev.type||''}</div>
        <div class="desc">${ev.desc||''}</div>
        ${isAdmin ? `<button class="edit-btn" data-idx="${ev._idx}">Edit</button>` : ''}
      `;
      if(isAdmin && card.querySelector('.edit-btn'))
        card.querySelector('.edit-btn').onclick = ()=>openEdit(ev._idx);
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
    // Tambahkan tahun dan masa agar bisa dikelompokkan di Sheet
    const eventObj = {
      tahun: currentTahun,
      masa: currentMasa,
      date, type, desc, status, doclink
    };
    saveEventToSheet(eventObj);
  }

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
  searchInput.oninput = debounce(render, 120);
  $('btn-save').onclick = handleSave;
  $('btn-cancel').onclick = closeModal;
  modal.addEventListener('click', (e)=>{ if(e.target===modal) closeModal(); });
  btnAdd.onclick = openAdd;
  function debounce(fn,ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn.apply(this,a),ms);} }

  // Load data dari Google Sheet saat halaman dibuka
  document.addEventListener('DOMContentLoaded', loadEventsFromSheet);
})();

