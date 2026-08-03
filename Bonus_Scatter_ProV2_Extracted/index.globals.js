const state = {
  bridgeReady: false,
  results: [],
};

const el = {
  userId: document.getElementById('userId'),
  ticketCode: document.getElementById('ticketCode'),
  betting: document.getElementById('betting'),
  bulk: document.getElementById('bulk'),
  status: document.getElementById('status'),
  resultBody: document.getElementById('resultBody'),
  bridgeDot: document.getElementById('bridgeDot'),
  bridgeText: document.getElementById('bridgeText'),
  sendBtn: document.getElementById('sendBtn'),
  copyBtn: document.getElementById('copyBtn'),
  clearBtn: document.getElementById('clearBtn'),
  assistantBtn: document.getElementById('assistantBtn'),
  searchStatusBtn: document.getElementById('searchStatusBtn'),
  adminUrl: document.getElementById('adminUrl'),
  autoStatusCheck: document.getElementById('autoStatusCheck'),
  executorName: document.getElementById('executorName'),
  startDate: document.getElementById('startDate'),
  endDate: document.getElementById('endDate'),
  agentHeaders: document.getElementById('agentHeaders'),
  // New elements
  rocket: document.getElementById('rocket'),
  targetMoon: document.getElementById('targetMoon'),
  clockTime: document.getElementById('clockTime'),
  clockDate: document.getElementById('clockDate'),
  resetUserIdBtn: document.getElementById('resetUserIdBtn'),
  centerNotif: document.getElementById('centerNotif'),
  astronaut: document.getElementById('astronaut'),
  searchStatusBtnHeader: document.getElementById('searchStatusBtnHeader'),
  // Save settings elements
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  savedConfigWrap: document.getElementById('savedConfigWrap'),
  savedConfigCode: document.getElementById('savedConfigCode'),
  copyConfigBtn: document.getElementById('copyConfigBtn'),
  // Stats elements
  statTotal: document.getElementById('statTotal'),
  statApproved: document.getElementById('statApproved'),
  statRejected: document.getElementById('statRejected'),
  statPending: document.getElementById('statPending'),
  statSuksesCek: document.getElementById('statSuksesCek'),
  // Duplicate warning
  duplicateWarning: document.getElementById('duplicateWarning'),
  yesterdayDate: document.getElementById('yesterdayDate'),
  isTS: document.getElementById('isTS'),
  tableSearch: document.getElementById('tableSearch'),
  soundToggleBtn: document.getElementById('soundToggleBtn'),
};

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

let lastCheckedDate = todayISO();
let lastCheckedYesterday = yesterdayISO();

function autoRolloverDates(prevToday, prevYesterday) {
  const today = todayISO();
  const yesterday = yesterdayISO();
  
  let changed = false;
  const updates = {};
  
  if (el.startDate) {
    if (el.startDate.value === prevToday || el.startDate.value === '') {
      el.startDate.value = today;
      updates.startDate = today;
      changed = true;
    }
  }
  if (el.endDate) {
    if (el.endDate.value === prevToday || el.endDate.value === '') {
      el.endDate.value = today;
      updates.endDate = today;
      changed = true;
    }
  }
  if (el.yesterdayDate) {
    if (el.yesterdayDate.value === prevYesterday || el.yesterdayDate.value === '') {
      el.yesterdayDate.value = yesterday;
      updates.yesterdayDate = yesterday;
      changed = true;
    }
  }
  
  if (changed && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set(updates, () => {
      console.log("⏰ Hari berganti. Tanggal Mulai/Akhir auto update & tersimpan:", updates);
      if (typeof setStatus === 'function') {
        setStatus("⏰ Tanggal diperbarui otomatis karena pergantian hari.");
      }
    });
  }
}

function updateClock() {
  const now = new Date();
  
  // Cek pergantian hari (00:00)
  const currentDate = todayISO();
  if (currentDate !== lastCheckedDate) {
    const prevToday = lastCheckedDate;
    const prevYesterday = lastCheckedYesterday;
    
    lastCheckedDate = currentDate;
    lastCheckedYesterday = yesterdayISO();
    
    autoRolloverDates(prevToday, prevYesterday);
  }

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  const day = days[now.getDay()];
  const date = String(now.getDate()).padStart(2, '0');
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  if (el.clockTime) el.clockTime.textContent = `${hours}:${minutes}:${seconds}`;
  if (el.clockDate) el.clockDate.textContent = `${day}, ${date} ${month} ${year}`;
}

setInterval(updateClock, 1000);
updateClock();

el.startDate.value = todayISO();
el.endDate.value = todayISO();
if (el.yesterdayDate) el.yesterdayDate.value = yesterdayISO();
el.adminUrl.value = 'https://lapak99.idrbo2.com/';

function setBridgeBadge(mode, text) {
  el.bridgeText.textContent = text;
  el.bridgeDot.classList.remove('ok', 'bad', 'extension');
  if (mode === 'ok') el.bridgeDot.classList.add('ok');
  if (mode === 'bad') el.bridgeDot.classList.add('bad');
  if (text && text.toLowerCase().includes('extension')) {
    el.bridgeDot.classList.add('extension');
  }
}

function setStatus(text) {
  el.status.textContent = text;
}

