// theme-manager.js
const themes = {
  default: { name: '🌆 Cyberpunk (Default)', bg: 'bg_dashboard.png', anim: 'cyber' },
  fuji: { name: '🏔️ Fuji Autumn', bg: 'bg_fuji.jpg', anim: 'leaves' },
  ninja: { name: '🥷 Shadow Ninja', bg: 'bg_ninja.png', anim: 'mist' },
  car: { name: '🏎️ Luxury Car', bg: 'bg_car.png', anim: 'speed' },
  forest: { name: '🌲 Dark Forest', bg: 'bg_forest.png', anim: 'rain' },
  jjk: { name: '🤞 Jujutsu Clash (Sukuna Gojo)', bg: 'jjk_bg_purple.png', anim: 'sparks' },
  japan: { name: '🏮 Neon Tokyo (Japan)', bg: 'bg_dashboard.png', anim: 'sakura' }
};

function initThemeManager() {
  // 1. Inject FAB UI with sidebar cohesive style
  const fabHtml = `
    <div class="theme-fab">
      <div class="theme-menu" id="themeMenu">
        <div style="font-family: 'Orbitron', sans-serif; font-size: 11px; color:#a78bfa; margin-bottom: 8px; font-weight:800; text-align:center; letter-spacing: 2px; border-bottom: 1px dashed rgba(168,85,247,0.3); padding-bottom: 6px;">TEMA BACKGROUND</div>
        ${Object.keys(themes).map(key => `
          <button class="theme-item" onclick="setTheme('${key}')" id="btn-theme-${key}">
            ${themes[key].name}
          </button>
        `).join('')}
      </div>
      <button class="fab-btn" onclick="toggleThemeMenu()" title="Ganti Tema">🎨</button>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', fabHtml);

  // Close theme menu if clicking outside
  document.addEventListener('click', function(e) {
    const menu = document.getElementById('themeMenu');
    const btn = document.querySelector('.fab-btn');
    if (menu && menu.classList.contains('show') && !menu.contains(e.target) && e.target !== btn) {
      menu.classList.remove('show');
    }
  });

  // 2. Load saved theme
  const saved = localStorage.getItem('rkd_theme') || 'default';
  setTheme(saved);
}

window.toggleThemeMenu = function() {
  document.getElementById('themeMenu').classList.toggle('show');
}

window.setTheme = function(key) {
  if(!themes[key]) key = 'default';
  
  // Save to localStorage
  localStorage.setItem('rkd_theme', key);
  
  // Update UI Active states
  document.querySelectorAll('.theme-item').forEach(el => el.classList.remove('active'));
  const activeBtn = document.getElementById('btn-theme-'+key);
  if (activeBtn) activeBtn.classList.add('active');

  // Change Background with exact 100% 100% fit (no zoom) and elegant overlays
  const cyberBg = document.querySelector('.cyber-bg');
  if(cyberBg) {
    cyberBg.style.background = '';
    
    if (key === 'japan') {
      // Japan theme uses bg_dashboard (Tokyo street) with a sweet pink/cherry filter overlay
      cyberBg.style.backgroundImage = `linear-gradient(rgba(244, 114, 182, 0.1), rgba(7, 2, 14, 0.35)), url('bg_dashboard.png')`;
    } else if (key === 'fuji') {
      // Custom soft light-pink to dark gradient for the beautiful Fuji cherry blossom sky
      cyberBg.style.backgroundImage = `linear-gradient(rgba(255, 241, 242, 0.05), rgba(7, 2, 14, 0.3)), url('bg_fuji.jpg')`;
    } else if (key === 'jjk') {
      // JJK uses the dedicated jjk_bg_purple.png with cursed energy dark violet overlay
      cyberBg.style.backgroundImage = `linear-gradient(rgba(24, 6, 48, 0.25), rgba(7, 2, 14, 0.45)), url('jjk_bg_purple.png')`;
    } else {
      // Standard dark overlay for other generated backgrounds
      cyberBg.style.backgroundImage = `linear-gradient(rgba(7, 2, 14, 0.15), rgba(7, 2, 14, 0.4)), url('${themes[key].bg}')`;
    }

    // Set background properties AFTER setting the image!
    cyberBg.style.backgroundSize = 'cover';
    cyberBg.style.backgroundPosition = 'center';
    cyberBg.style.backgroundAttachment = 'fixed';
    cyberBg.style.backgroundRepeat = 'no-repeat';
  }

  // Clear existing particles
  const existingLayer = document.getElementById('particle-layer');
  if(existingLayer) existingLayer.remove();

  // Hide/Show default elements depending on theme
  const glowOrbs = document.querySelectorAll('.glow-orb-1, .glow-orb-2, .glow-orb-3, .cyber-particles');
  glowOrbs.forEach(el => el.style.display = (key === 'default' ? 'block' : 'none'));

  // Spawn new particles
  const layer = document.createElement('div');
  layer.id = 'particle-layer';
  layer.className = 'particle-layer';
  document.body.appendChild(layer);

  const anim = themes[key].anim;
  
  if(anim === 'leaves') {
    // Soft Pink Sakura/Cherry Petals for the beautiful Fuji background
    for(let i=0; i<25; i++) {
      let p = document.createElement('div');
      p.className = 'leaf';
      p.style.left = (Math.random() * 150 - 50) + 'vw';
      p.style.top = (Math.random() * -20) + 'vh';
      p.style.animationDuration = (Math.random() * 6 + 6) + 's';
      p.style.animationDelay = (Math.random() * 8) + 's';
      const leafColors = ['#fbcfe8', '#f472b6', '#fce7f3', '#fae8ff'];
      p.style.background = leafColors[Math.floor(Math.random() * leafColors.length)];
      layer.appendChild(p);
    }
  } else if(anim === 'rain') {
    // Heavy Forest Rain
    for(let i=0; i<80; i++) {
      let p = document.createElement('div');
      p.className = 'rain';
      p.style.left = (Math.random() * 120 - 10) + 'vw';
      p.style.animationDuration = (Math.random() * 0.4 + 0.4) + 's';
      p.style.animationDelay = (Math.random() * 2) + 's';
      layer.appendChild(p);
    }
  } else if(anim === 'mist') {
    // Shadow Ninja Mist
    for(let i=0; i<6; i++) {
      let p = document.createElement('div');
      p.className = 'mist';
      p.style.top = (Math.random() * 70 + 10) + 'vh';
      p.style.animationDuration = (Math.random() * 25 + 20) + 's';
      p.style.animationDelay = (Math.random() * 5) + 's';
      layer.appendChild(p);
    }
  } else if(anim === 'speed') {
    // Speeding Lines for Car
    for(let i=0; i<15; i++) {
      let p = document.createElement('div');
      p.className = 'speedline';
      p.style.top = (Math.random() * 90 + 5) + 'vh';
      p.style.width = (Math.random() * 250 + 80) + 'px';
      p.style.animationDuration = (Math.random() * 0.8 + 0.4) + 's';
      p.style.animationDelay = (Math.random() * 3) + 's';
      const colors = ['#38bdf8', '#c084fc', '#f43f5e'];
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.boxShadow = `0 0 15px ${p.style.background}`;
      layer.appendChild(p);
    }
  } else if(anim === 'sparks') {
    // JJK Cursed Energy Sparks (Sukuna vs Gojo red/blue/purple)
    for(let i=0; i<30; i++) {
      let p = document.createElement('div');
      p.className = 'cursed-spark';
      p.style.left = (Math.random() * 100) + 'vw';
      p.style.top = (Math.random() * 100) + 'vh';
      p.style.animationDuration = (Math.random() * 3 + 2) + 's';
      p.style.animationDelay = (Math.random() * 4) + 's';
      const sparkColors = ['#f43f5e', '#3b82f6', '#8b5cf6'];
      p.style.background = sparkColors[Math.floor(Math.random() * sparkColors.length)];
      p.style.boxShadow = `0 0 15px ${p.style.background}, 0 0 30px ${p.style.background}`;
      layer.appendChild(p);
    }
  } else if(anim === 'sakura') {
    // Pink Sakura Petals for Neon Tokyo
    for(let i=0; i<25; i++) {
      let p = document.createElement('div');
      p.className = 'sakura-petal';
      p.style.left = (Math.random() * 150 - 50) + 'vw';
      p.style.top = (Math.random() * -20) + 'vh';
      p.style.animationDuration = (Math.random() * 8 + 6) + 's';
      p.style.animationDelay = (Math.random() * 8) + 's';
      layer.appendChild(p);
    }
  }
}

// Run init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeManager);
} else {
  initThemeManager();
}
