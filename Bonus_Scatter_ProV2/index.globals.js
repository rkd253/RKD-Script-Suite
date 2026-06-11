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
};

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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
}

setInterval(updateClock, 1000);
updateClock();

el.startDate.value = todayISO();
el.endDate.value = todayISO();
el.adminUrl.value = 'https://agent.png777.com';

function setBridgeBadge(mode, text) {
  el.bridgeText.textContent = text;
  el.bridgeDot.classList.remove('ok', 'bad');
  if (mode === 'ok') el.bridgeDot.classList.add('ok');
  if (mode === 'bad') el.bridgeDot.classList.add('bad');
}

function setStatus(text) {
  el.status.textContent = text;
}

