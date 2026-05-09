// ==UserScript==
// @name         LAPAK3 - LiveChat Wallpaper + Left-Bar Chat Queue Indicator
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Wallpaper manga + indikator warna antrian chat di left-bar (orange/hijau/kedip merah)
// @author       Antigravity
// @match        https://my.livechatinc.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';
  const WALLPAPER_URL = 'https://socket-lapakmahjong.hokibgs.com/uploads/lapakmahjong/media/2026/02/media-1771946871466-912940853.png';
  let wallpaperActive = true;
  function injectWallpaper() {
    if (!wallpaperActive) return;
    let s = document.getElementById('lapak3-wallpaper');
    if (!s) { s = document.createElement('style'); s.id = 'lapak3-wallpaper'; document.head.appendChild(s); }
    s.textContent = `#app > div > div > main, [data-testid="chat-root"], [data-testid="messages-list"], .main-layout__content { background-image: url('${WALLPAPER_URL}') !important; background-repeat: no-repeat !important; background-position: center top !important; background-attachment: fixed !important; background-size: 27% auto !important; background-color: transparent !important; }`;
  }
  function removeWallpaper() { document.getElementById('lapak3-wallpaper')?.remove(); }
  function injectQueueStyles() {
    if (document.getElementById('lapak3-queue-style')) return;
    const s = document.createElement('style'); s.id = 'lapak3-queue-style';
    s.textContent = `.lc-antrian-orange { box-shadow: inset 4px 0 0 #f97316 !important; position: relative !important; } .lc-antrian-hijau { box-shadow: inset 4px 0 0 #22c55e !important; position: relative !important; } .lc-antrian-kedip { animation: lapak3Blink 1.8s infinite !important; position: relative !important; } @keyframes lapak3Blink { 0%, 100% { box-shadow: inset 5px 0 0 #ff0000; } 50% { box-shadow: inset 50px 0 35px -10px rgba(255,40,40,0.25); } }`;
    document.head.appendChild(s);
  }
  function checkChatQueue() {
    try {
      document.querySelectorAll('a, [role="button"], [role="row"], li').forEach(item => {
        if (item.closest('[data-testid="messages-list"]')) return;
        const it = item.innerText || '';
        const hasTime = /\d+[smh]/.test(it);
        const isArchived = it.toLowerCase().includes('archived') || it.toLowerCase().includes('left the chat') || it.toLowerCase().includes('inactivity');
        if (!hasTime && !isArchived) return;
        item.classList.remove('lc-antrian-orange', 'lc-antrian-hijau', 'lc-antrian-kedip');
        if (isArchived) return;
        const timeMatch = it.match(/(\d+)([smh])/);
        let mins = 0;
        if (timeMatch) { const val = parseInt(timeMatch[1]), unit = timeMatch[2]; if (unit === 'm') mins = val; else if (unit === 'h') mins = val * 60; }
        if (mins >= 3) { item.classList.add('lc-antrian-kedip'); return; }
        const hasUnread = item.querySelector('[class*="badge"],[class*="unread"],[class*="notification"],[class*="count"]');
        item.classList.add(hasUnread ? 'lc-antrian-orange' : 'lc-antrian-hijau');
      });
    } catch(e) {}
  }
  let toastEl = null;
  function injectToastStyle() {
    if (document.getElementById('lapak3-toast-style')) return;
    const s = document.createElement('style'); s.id = 'lapak3-toast-style';
    s.textContent = `#lapak3-toast { position: fixed; bottom: 28px; right: 28px; z-index: 999999; padding: 10px 18px; border-radius: 8px; font-family: 'Comic Sans MS', sans-serif; font-size: 13px; font-weight: bold; color: #fff; pointer-events: none; opacity: 0; transform: translateY(10px); transition: 0.25s; } #lapak3-toast.show { opacity: 1; transform: translateY(0); } #lapak3-toast.toast-on { background:#1a1a2e; border:2px solid #a855f7; box-shadow:4px 4px 0 #a855f7; } #lapak3-toast.toast-off { background:#2a0a0a; border:2px solid #ef4444; box-shadow:4px 4px 0 #ef4444; }`;
    document.head.appendChild(s);
  }
  function showToast(msg, type = 'on') {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.id = 'lapak3-toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.className = `show toast-${type}`;
    setTimeout(() => toastEl.classList.remove('show'), 2500);
  }
  function init() {
    injectQueueStyles(); injectToastStyle();
    const obs = new MutationObserver(() => { clearTimeout(window.lapak3Timer); window.lapak3Timer = setTimeout(() => { checkChatQueue(); injectWallpaper(); }, 150); });
    obs.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('mousedown', e => { if (e.target.closest('a, [role="button"], [role="row"]')) setTimeout(checkChatQueue, 10); }, true);
    document.addEventListener('keydown', e => {
      if (!e.ctrlKey) return;
      if (e.code === 'Insert') { e.preventDefault(); wallpaperActive = true; injectWallpaper(); showToast('🌄 Wallpaper ON', 'on'); }
      if (e.code === 'Delete') { e.preventDefault(); wallpaperActive = false; removeWallpaper(); showToast('🙈 Wallpaper OFF', 'off'); }
    });
    setTimeout(() => { injectWallpaper(); checkChatQueue(); }, 2000);
  }
  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
