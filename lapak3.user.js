// ==UserScript==
// @name         LAPAK3 - Wallpaper & Queue Indicator
// @namespace    http://tampermonkey.net/
// @version      4.4.3
// @description  Wallpaper manga + indikator warna antrian chat (No-Refresh Toggle)
// @author       Antigravity
// @match        https://my.livechatinc.com/*
// @icon         https://www.livechat.com/favicon.ico
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const WALLPAPER_URL = 'https://i.pinimg.com/1200x/60/5c/43/605c430a1aacae5c4ab829e1acb73b4e.jpg';
  let wallpaperActive = true;

  function injectStyles() {
    if (document.getElementById('mng-queue-style')) return;
    const s = document.createElement('style'); s.id = 'mng-queue-style';
    s.textContent = `
      #mng-toast { position: fixed; bottom: 28px; right: 28px; z-index: 999999; padding: 10px 18px; border-radius: 8px; font-family: 'Comic Sans MS', sans-serif; font-size: 13px; font-weight: bold; color: #fff; pointer-events: none; opacity: 0; transform: translateY(10px); transition: 0.25s; }
      #mng-toast.show { opacity: 1; transform: translateY(0); }
      #mng-toast.toast-on { background:#1a1a2e; border:2px solid #a855f7; box-shadow:4px 4px 0 #a855f7; }
      #mng-toast.toast-off { background:#2a0a0a; border:2px solid #ef4444; box-shadow:4px 4px 0 #ef4444; }
      .lc-antrian-orange { box-shadow: inset 4px 0 0 #f97316 !important; position: relative !important; }
      .lc-antrian-hijau  { box-shadow: inset 4px 0 0 #22c55e !important; position: relative !important; }
      .lc-antrian-kedip  { animation: mngBlink 1.8s infinite !important; position: relative !important; }
      @keyframes mngBlink { 0%, 100% { box-shadow: inset 5px 0 0 #ff0000; } 50% { box-shadow: inset 50px 0 35px -10px rgba(255,40,40,0.25); } }
    `;
    document.head.appendChild(s);
  }

  const selectors = [
    '#app > div > div > main',
    '[data-testid="chat-root"]',
    '[data-testid="messages-list"]',
    '.main-layout__content',
    '[class*="ChatRoot"]',
    '[class*="MessagesList"]',
    '[data-testid="chat-window"]',
    '[class*="LayoutContent"]',
    'section[class*="Content"]',
    '[class*="ChatWrapper"]',
    '[class*="WidgetWrapper"]',
    '[class*="ChatWindow"]',
    'main',
    '.lc-main-layout'
  ];

  function applyForceTransparency() {
    if (!wallpaperActive) return;
    
    selectors.forEach(sel => {
      const el = document.querySelector(sel);
      if (el) {
        el.style.backgroundColor = '#000000';
        el.style.backgroundImage = `url('${WALLPAPER_URL}')`;
        el.style.backgroundRepeat = 'no-repeat';
        el.style.backgroundPosition = 'center center';
        el.style.backgroundAttachment = 'fixed';
        el.style.backgroundSize = 'contain';
      }
    });
    
    const overlays = document.querySelectorAll('[class*="Backdrop"], [class*="Overlay"], [class*="Background"]');
    overlays.forEach(ov => {
        if (!ov.closest('#hl-panel') && !ov.closest('#dup-modal')) {
            ov.style.backgroundColor = 'transparent';
        }
    });
  }

  function clearWallpaperStyles() {
    selectors.forEach(sel => {
      const el = document.querySelector(sel);
      if (el) {
        el.style.backgroundColor = '';
        el.style.backgroundImage = '';
      }
    });
    const overlays = document.querySelectorAll('[class*="Backdrop"], [class*="Overlay"], [class*="Background"]');
    overlays.forEach(ov => {
        if (!ov.closest('#hl-panel') && !ov.closest('#dup-modal')) {
            ov.style.backgroundColor = '';
        }
    });
  }

  function checkChatQueue() {
    try {
      const allItems = document.querySelectorAll('a, [role="button"], [role="row"], li');
      allItems.forEach(item => {
        if (item.closest('[data-testid="messages-list"]')) return;
        const it = item.innerText || "";
        const hasTime = /\d+[smh]/.test(it);
        const isArchived = it.toLowerCase().includes('archived') || it.toLowerCase().includes('left the chat') || it.toLowerCase().includes('inactivity');
        if (!hasTime && !isArchived) return;
        item.classList.remove('lc-antrian-orange','lc-antrian-hijau','lc-antrian-kedip');
        if (isArchived) return;
        const timeMatch = it.match(/(\d+)([smh])/);
        let mins = 0;
        if (timeMatch) { const val = parseInt(timeMatch[1]); const unit = timeMatch[2]; if (unit === 'm') mins = val; else if (unit === 'h') mins = val * 60; }
        if (mins >= 3) { item.classList.add('lc-antrian-kedip'); return; }
        const hasUnread = item.querySelector('[class*="badge"], [class*="unread"], [class*="notification"], [class*="count"]');
        if (hasUnread) { item.classList.add('lc-antrian-orange'); } else { item.classList.add('lc-antrian-hijau'); }
      });
    } catch(e) { }
  }

  function showToast(m, t = 'info') { 
    let toast = document.getElementById('mng-toast');
    if (!toast) { 
        toast = document.createElement('div'); 
        toast.id = 'mng-toast'; 
        document.body.appendChild(toast); 
    } 
    toast.textContent = m; 
    toast.className = `show toast-${t}`; 
    setTimeout(() => toast.classList.remove('show'), 2500); 
  }

  function init() {
    injectStyles();
    setInterval(() => { if (wallpaperActive) applyForceTransparency(); }, 1500);
    
    const obs = new MutationObserver((mutations) => {
      let n = false; for (const m of mutations) { if (m.target.nodeType !== 1) continue; n = true; break; }
      if (n) { 
          clearTimeout(window.wTimer); 
          window.wTimer = setTimeout(() => { 
              checkChatQueue(); 
              if (wallpaperActive) applyForceTransparency(); 
          }, 200); 
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    
    document.addEventListener('keydown', e => {
      if (!e.ctrlKey) return;
      if (e.code === 'Insert') { 
          e.preventDefault(); 
          wallpaperActive = true; 
          applyForceTransparency(); 
          showToast('🌄 Wallpaper ON', 'on');
      }
      if (e.code === 'Delete') { 
          e.preventDefault(); 
          wallpaperActive = false; 
          clearWallpaperStyles(); 
          showToast('🙈 Wallpaper OFF', 'off');
      }
    });
    
    setTimeout(() => { if (wallpaperActive) applyForceTransparency(); checkChatQueue(); }, 2000);
  }

  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
