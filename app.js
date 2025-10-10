(function(){
  console.log('✅ app.js berhasil dijalankan');

  const SHEETDB_API = 'https://sheetdb.io/api/v1/5spb590qt55j0';
  const $ = (id)=>document.getElementById(id);

  // --- Fungsi bantu ---
  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

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

  // --- STATE ---
  let roadmap = {};
  let tahunSidangs = [];
  let currentTahun = '';
  let masaSidangs = [];
  let currentMasa = '';
  let editIndex = null;

  // DOM
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

  // --- DATA ---
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
      })
      .catch(err => console.error('Gagal memuat data:', err));
  }

  function saveEventToSheet(event) {
    fetch(SHEETDB_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [event] })
    })
    .then(res => res.json())
    .then(() => {
      alert('✅ Data berhasil disimpan ke Google Sheets!');
      loadEventsFromSheet();
      closeModal();
    })
    .catch(err => alert('❌ Gagal menyimpan data ke Google Sheets'));
  }

  // --- UI RENDER ---
  function renderTahunOptions(){
    tahunSidangs = Object.keys(roadmap);
    tahunSelect.innerHTML = '';
    tahunSidangs.forEach(ts=>{
      const opt = document.createElement('option');
      opt.value = ts; opt.textContent = ts;
      tahunSelect.appendChild(opt);
    });
    tahunSelect.value = currentTahun;
  }

  function renderMasaOptions(){
    masaSidangs = Object.keys(roadmap[currentTahun] || {});
    masaSelect.innerHTML = '';
    masaSidangs.forEach(ms=>{
      const opt = document.createElement('option');
      opt.value = ms; opt.textContent = 'Masa Sidang ' + ms;
      masaSelect.appendChild(opt);
    });
    masaSelect.value = currentMasa;
  }

  function render(){
    timeline.innerHTML = '';
    if (!roadmap[currentTahun] || !roadmap[currentTahun][currentMasa]) {
      masaTitle.textContent = 'Belum ada data Tahun Sidang atau Masa Sidang.';
      return;
    }
    masaTitle.textContent = `Tahun Sidang ${currentTahun} - Masa Sidang ${currentMasa}`;
    const list = (roadmap[currentTahun][currentMasa] || [])
      .map((ev, idx)=>({ ...ev, _idx: idx }))
      .filter(ev=>{
        const q = (searchInput.value||'').toLowerCase();
        return (!q) || (ev.type && ev.type.toLowerCase().includes(q)) ||
               (ev.desc && ev.desc.toLowerCase().includes(q)) ||
               (ev.date && ev.date.toLowerCase().includes(q));
      });

    if(list.length===0){
      const empty = document.createElement('div');
      empty.style.textAlign='center';
      empty.style.padding='1rem';
      empty.textContent = 'Tidak ada kegiatan untuk filter/pencarian ini.';
      timeline.appendChild(empty);
      return;
    }

    list.forEach(ev=>{
      const card = document.createElement('div');
      card.className = `event`;
      const imgHTML = ev.doclink && ev.doclink.includes('http')
        ? `<img src="${ev.doclink.replace('view?usp=sharing','preview')}" class="proof-img" alt="Bukti kegiatan">`
        : '';
      card.innerHTML = `
        <div class="date">${ev.date}</div>
        <div class="type">${ev.type||''}</div>
        <div class="desc">${ev.desc||''}</div>
        ${imgHTML}
        ${isAdmin ? `<button class="edit-btn" data-idx="${ev._idx}">Edit</button>` : ''}
      `;
      if(isAdmin && card.querySelector('.edit-btn'))
        card.querySelector('.edit-btn').onclick = ()=>openEdit(ev._idx);
      timeline.appendChild(card);
    });
  }

  // --- MODAL & FORM ---
  function openAdd(){
    editIndex = null;
    modalTitle.textContent = 'Tambah Kegiatan';
    iDate.value = '';
    iType.value = '';
    iDesc.value = '';
    iStatus.value = 'auto';
    iDocLink.value = '';
    openModal();
  }
  function openEdit(idx){
    editIndex = idx;
    const ev = roadmap[currentTahun][currentMasa][idx];
    modalTitle.textContent = 'Edit Kegiatan';
    iDate.value = ev.date || '';
    iType.value = ev.type || '';
    iDesc.value = ev.desc || '';
    iStatus.value = ev.status || 'auto';
    iDocLink.value = ev.doclink || '';
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
    if(!date || !type || !desc){
      alert('❗ Semua field wajib diisi.');
      return;
    }
    const eventObj = {
      tahun: currentTahun,
      masa: currentMasa,
      date, type, desc, status, doclink
    };
    saveEventToSheet(eventObj);
  }

  // --- EVENT LISTENER ---
  document.addEventListener('DOMContentLoaded', () => {
    $('btn-save').onclick = handleSave;
    $('btn-cancel').onclick = closeModal;
    modal.addEventListener('click', (e)=>{ if(e.target===modal) closeModal(); });

    btnAdd.onclick = openAdd;

    btnAddTahun.onclick = () => {
      const tahunBaru = prompt("Masukkan Tahun Sidang baru (contoh: 2026-2027):");
      if (!tahunBaru) return;
      if (roadmap[tahunBaru]) {
        alert("Tahun Sidang ini sudah ada!");
        return;
      }
      roadmap[tahunBaru] = { "I": [] };
      currentTahun = tahunBaru;
      currentMasa = "I";
      renderTahunOptions();
      renderMasaOptions();
      render();
      alert("Tahun Sidang baru berhasil ditambahkan!");
    };

    btnAddMasa.onclick = () => {
      const masaBaru = prompt("Masukkan Masa Sidang baru (contoh: II, III, IV):");
      if (!masaBaru) return;
      if (roadmap[currentTahun][masaBaru]) {
        alert("Masa Sidang ini sudah ada!");
        return;
      }
      roadmap[currentTahun][masaBaru] = [];
      currentMasa = masaBaru;
      renderMasaOptions();
      render();
      alert("Masa Sidang baru berhasil ditambahkan!");
    };

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

    loadEventsFromSheet();
  });

})();
