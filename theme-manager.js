// theme-manager.js
const themes = {
  default: { name: '🌹 Rose Moon', bg: 'bg_dashboard.png', anim: 'sakura' }
};

function initThemeManager() {
  // Load saved theme (always default now)
  setTheme('default');
}

window.setTheme = function(key) {
  key = 'default';
  
  // Change Background with exact 100% 100% fit
  const cyberBg = document.querySelector('.cyber-bg');
  if(cyberBg) {
    cyberBg.style.backgroundImage = `linear-gradient(rgba(10, 11, 15, 0.22), rgba(10, 11, 15, 0.45)), url('bg_dashboard.png')`;
    cyberBg.style.backgroundSize = 'cover';
    cyberBg.style.backgroundPosition = 'center';
    cyberBg.style.backgroundAttachment = 'fixed';
    cyberBg.style.backgroundRepeat = 'no-repeat';
  }

  // Particles disabled for a completely clean background wallpaper
}

// Run init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeManager);
} else {
  initThemeManager();
}
