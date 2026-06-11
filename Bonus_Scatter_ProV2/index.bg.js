// ====== BACKGROUND SWITCHER untuk index.html ======
// Dipisah ke file ini karena CSP ekstensi melarang inline script

const BG_PRESETS_INDEX = {
  default: 'url("https://images.unsplash.com/photo-1528164344705-47542687000d?q=80&w=2092&auto=format&fit=crop")',
  fire:    'url("https://i.pinimg.com/736x/4d/5e/9e/4d5e9e242c5fcda602fa1709cd170a55.jpg")',
  ocean:   'radial-gradient(920px 420px at 16% -10%, rgba(0,153,204,0.3), transparent 55%), radial-gradient(760px 340px at 82% -25%, rgba(0,204,255,0.22), transparent 60%), #00101a',
  forest:  'url("./samurai_fog.png")',
  galaxy:  'radial-gradient(920px 420px at 16% -10%, rgba(68,0,204,0.35), transparent 55%), radial-gradient(760px 340px at 82% -25%, rgba(204,0,255,0.26), transparent 60%), #05000f',
  gold:    'url("https://i.pinimg.com/736x/fc/ff/45/fcff4541945e00faf6351a54ce7518eb.jpg")',
  dasha:   'url("./Dasha taran.jpg")',
};

function applyBgIndex(name) {
  const bgLayer   = document.getElementById('bgLayer');
  const bgOverlay = document.getElementById('bgOverlay');
  if (!bgLayer) return;

  const gradient = BG_PRESETS_INDEX[name] || BG_PRESETS_INDEX.default;
  if (gradient.includes('url(')) {
    // If it's an image preset
    bgLayer.style.background = '#000';
    bgLayer.style.backgroundImage = gradient;
    bgLayer.style.backgroundSize = 'cover';
    bgLayer.style.backgroundPosition = 'center';
    bgLayer.style.backgroundRepeat = 'no-repeat';
    document.documentElement.style.setProperty('--dasha-img', gradient);
    if (bgOverlay) bgOverlay.style.background = 'rgba(0,0,0,0.4)';
  } else {
    // If it's a gradient preset
    bgLayer.style.background = gradient;
    bgLayer.style.backgroundImage = '';
    if (bgOverlay) bgOverlay.style.background = 'rgba(0,0,0,0)';
  }

  document.querySelectorAll('.bgBtn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.bg === name);
  });

  if (name === 'default' || name === 'custom') {
    startLeafAnimation();
    stopFogAnimation();
    stopWindAnimation();
  } else if (name === 'forest') {
    stopLeafAnimation();
    startFogAnimation();
    stopWindAnimation();
  } else if (name === 'gold') {
    stopLeafAnimation();
    stopFogAnimation();
    startWindAnimation();
  } else {
    stopLeafAnimation();
    stopFogAnimation();
    stopWindAnimation();
  }
}

let leafInterval = null;
function startLeafAnimation() {
  if (leafInterval) return;
  const emojis = ['🍁', '🍂', '🌸'];
  const maxLeaves = 25;
  leafInterval = setInterval(() => {
    if (document.querySelectorAll('.leaf').length > maxLeaves) return;
    const leaf = document.createElement('div');
    leaf.className = 'leaf';
    leaf.innerText = emojis[Math.floor(Math.random() * emojis.length)];
    leaf.style.left = Math.random() * 100 + 'vw';
    const duration = Math.random() * 3 + 4; // 4 to 7 seconds
    leaf.style.animationDuration = duration + 's, ' + (duration / 2) + 's';
    leaf.style.fontSize = (Math.random() * 10 + 15) + 'px';
    document.body.appendChild(leaf);
    setTimeout(() => {
      if (leaf.parentNode) leaf.remove();
    }, duration * 1000);
  }, 300);
}

function stopLeafAnimation() {
  if (leafInterval) clearInterval(leafInterval);
  leafInterval = null;
  document.querySelectorAll('.leaf').forEach(l => l.remove());
}

let fogInterval = null;
function startFogAnimation() {
  if (fogInterval) return;
  const maxFog = 8;
  // Buat kabut awal secara acak agar layar tidak kosong saat pertama ganti tema
  for (let i = 0; i < 4; i++) {
    createFogParticle(true);
  }
  fogInterval = setInterval(() => {
    if (document.querySelectorAll('.fog-particle').length > maxFog) return;
    createFogParticle(false);
  }, 3000);
}

function createFogParticle(randomStart) {
  const fog = document.createElement('div');
  fog.className = 'fog-particle';
  
  // Posisi vertikal kabut (area tengah sampai bawah)
  const topPos = Math.random() * 50 + 40; // 40vh sampai 90vh
  fog.style.top = topPos + 'vh';
  
  // Ukuran kabut acak
  const width = Math.random() * 200 + 300; // 300px sampai 500px
  const height = width * 0.35;
  fog.style.width = width + 'px';
  fog.style.height = height + 'px';
  
  // Durasi melintas acak
  const duration = Math.random() * 8 + 12; // 12s sampai 20s
  fog.style.animationDuration = duration + 's';
  
  if (randomStart) {
    fog.style.animationDelay = '-' + (Math.random() * duration) + 's';
  }
  
  document.body.appendChild(fog);
  setTimeout(() => {
    if (fog.parentNode) fog.remove();
  }, duration * 1000);
}

function stopFogAnimation() {
  if (fogInterval) clearInterval(fogInterval);
  fogInterval = null;
  document.querySelectorAll('.fog-particle').forEach(f => f.remove());
}

let windInterval = null;
function startWindAnimation() {
  if (windInterval) return;
  const maxWind = 12;
  // Buat garis angin awal secara acak agar layar tidak kosong
  for (let i = 0; i < 6; i++) {
    createWindParticle(true);
  }
  windInterval = setInterval(() => {
    if (document.querySelectorAll('.wind-line').length > maxWind) return;
    createWindParticle(false);
  }, 1200);
}

function createWindParticle(randomStart) {
  const wind = document.createElement('div');
  wind.className = 'wind-line';
  
  // Posisi vertikal acak (menyebar di seluruh layar)
  const topPos = Math.random() * 85 + 5; // 5% sampai 90%
  wind.style.top = topPos + 'vh';
  
  // Panjang dan ketebalan garis angin acak
  const width = Math.random() * 120 + 80; // 80px sampai 200px
  wind.style.width = width + 'px';
  
  // Durasi melintas acak (cepat)
  const duration = Math.random() * 2 + 2; // 2s sampai 4s
  wind.style.animationDuration = duration + 's';
  
  if (randomStart) {
    wind.style.animationDelay = '-' + (Math.random() * duration) + 's';
  }
  
  document.body.appendChild(wind);
  setTimeout(() => {
    if (wind.parentNode) wind.remove();
  }, duration * 1000);
}

function stopWindAnimation() {
  if (windInterval) clearInterval(windInterval);
  windInterval = null;
  document.querySelectorAll('.wind-line').forEach(w => w.remove());
}

function applyCustomBgIndex(dataUrl) {
  const bgLayer   = document.getElementById('bgLayer');
  const bgOverlay = document.getElementById('bgOverlay');
  if (!bgLayer) return;

  bgLayer.style.background         = '#000';
  bgLayer.style.backgroundImage    = 'url(' + dataUrl + ')';
  bgLayer.style.backgroundSize     = 'cover';
  bgLayer.style.backgroundPosition = 'center';
  bgLayer.style.backgroundRepeat   = 'no-repeat';
  if (bgOverlay) bgOverlay.style.background = 'rgba(0,0,0,0.58)';

  document.querySelectorAll('.bgBtn').forEach(btn => btn.classList.remove('active'));
}

// Load preference tersimpan
try {
  chrome.storage.local.get(['bsBgTheme', 'bsBgCustom'], function(res) {
    if (res.bsBgCustom) {
      applyCustomBgIndex(res.bsBgCustom);
    } else {
      applyBgIndex(res.bsBgTheme || 'default');
    }
  });
} catch(e) {
  // fallback jika bukan extension page
  applyBgIndex('default');
}

// Klik tema
document.querySelectorAll('.bgBtn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var theme = btn.dataset.bg;
    applyBgIndex(theme);
    try {
      chrome.storage.local.set({ bsBgTheme: theme, bsBgCustom: null });
    } catch(e) {}
  });
});

// Upload foto
var uploadBtn    = document.querySelector('.bgUploadBtn');
var bgImageInput = document.getElementById('bgImageInput');

if (uploadBtn && bgImageInput) {
  uploadBtn.addEventListener('click', function() {
    bgImageInput.click();
  });

  bgImageInput.addEventListener('change', function(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      var dataUrl = ev.target.result;
      applyCustomBgIndex(dataUrl);
      try {
        chrome.storage.local.set({ bsBgCustom: dataUrl, bsBgTheme: 'custom' });
      } catch(err) {
        console.warn('BG image terlalu besar:', err);
      }
    };
    reader.readAsDataURL(file);
  });
}
