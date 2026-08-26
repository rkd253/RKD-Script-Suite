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
  statLimit: document.getElementById('statLimit') || document.getElementById('statSuksesCek'),
  statSuksesCek: document.getElementById('statLimit') || document.getElementById('statSuksesCek'),
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

let lastTrackedDate = todayISO();

function performMidnightRollover(newDate) {
  const targetDate = newDate || todayISO();
  const targetYesterday = yesterdayISO();
  console.log(`[CekBonus] 📅 Pergantian hari (00:00) terdeteksi: ${targetDate}`);
  
  if (el.startDate) el.startDate.value = targetDate;
  if (el.endDate) el.endDate.value = targetDate;
  if (el.yesterdayDate) el.yesterdayDate.value = targetYesterday;
  
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        startDate: targetDate,
        endDate: targetDate,
        yesterdayDate: targetYesterday,
        todayDate: targetDate
      });
    }
  } catch (e) {}

  if (typeof showCenterNotif === 'function') {
    showCenterNotif(`📅 Pergantian Hari (00:00)!\nTanggal otomatis diperbarui ke ${targetDate}`, 4000);
  }
  if (typeof setStatus === 'function') {
    setStatus(`📅 Tanggal otomatis diperbarui ke hari baru: ${targetDate}`);
  }
}

function updateClock() {
  const now = new Date();
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

  // Cek pergantian hari (00:00:00 rollover)
  const currentISO = todayISO();
  if (currentISO !== lastTrackedDate) {
    lastTrackedDate = currentISO;
    performMidnightRollover(currentISO);
  }
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

