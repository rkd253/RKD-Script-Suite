// ==UserScript==
// @name         LAPAK3 - Wallpaper & Queue Indicator
// @namespace    http://tampermonkey.net/
// @version      4.6.0
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

      /* ===== CHAT UNRESPONSED ALERT (DI DALAM SIDEBAR) ===== */
      #lc-unresponded-alert {
        position: absolute;
        bottom: 120px; /* Dinaikkan pas di dalam kotak putih */
        left: 12px;
        right: 12px;
        background: linear-gradient(135deg, #d32f2f, #b71c1c);
        border: 1.5px solid #ff3333;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5), 0 0 10px rgba(211, 47, 47, 0.4);
        border-radius: 10px;
        padding: 10px 12px;
        color: #ffffff;
        font-family: 'Outfit', 'Segoe UI', sans-serif;
        font-size: 11px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        z-index: 9999;
        display: none;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        text-align: center;
        pointer-events: none;
        animation: alertGlowPulse 1.2s infinite alternate;
      }
      #lc-unresponded-alert.show {
        display: flex;
      }
      @keyframes alertGlowPulse {
        0%, 100% { opacity: 1; box-shadow: 0 4px 15px rgba(0,0,0,0.4), 0 0 15px rgba(239, 68, 68, 0.7); }
        50% { opacity: 0.75; box-shadow: 0 4px 15px rgba(0,0,0,0.2), 0 0 5px rgba(239, 68, 68, 0.2); }
      }
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

  const calmingQuotes = [
    "Tarik napas dulu, balas satu per satu ya bosku! ☕",
    "Tenang bosku, santai saja yang penting ramah & jos! 🌟",
    "Jangan terburu-buru, santai saja. Member pasti sabar menunggu! 😊",
    "Fokus satu per satu ya, pelan tapi pasti! Semangat bosku! 💪",
    "Kerja santai tapi pasti, utamakan ramah tamah. Kamu pasti bisa! 👑"
  ];

  function getSidebarContainer() {
    // 1. Dapatkan kolom list chat lewat navigasi kiri (nav.nextElementSibling)
    const nav = document.querySelector('nav, [class*="Navigation"]');
    if (nav && nav.nextElementSibling) {
      return nav.nextElementSibling;
    }

    // 2. Fallback: Cari parent dari chats list
    const chatsList = document.querySelector('[class*="ChatsList"], [data-testid="chats-list"], [class*="chats-list"]');
    if (chatsList) {
      return chatsList.parentElement || chatsList;
    }
    
    // 3. Fallback: cari element sidebar kiri
    const sidebar = document.querySelector('[data-testid="sidebar"], [class*="Sidebar"], [class*="left-panel"], .lc-sidebar');
    if (sidebar) return sidebar;
    
    return document.body;
  }

  function updateUnrespondedAlert(count) {
    // FORCE SHOW UNTUK TES POSISI (Ubah ke count biasa jika tes selesai)
    let displayCount = count;
    if (displayCount === 0) {
      displayCount = 1;
    }

    let alertBox = document.getElementById('lc-unresponded-alert');
    if (!alertBox) {
      alertBox = document.createElement('div');
      alertBox.id = 'lc-unresponded-alert';
      const container = getSidebarContainer();
      if (container) {
        const style = window.getComputedStyle(container);
        if (style.position === 'static') {
          container.style.position = 'relative';
        }
        container.appendChild(alertBox);
      } else {
        document.body.appendChild(alertBox);
      }
    }
    
    if (displayCount > 0) {
      // Pengaman jika container sidebar di-render ulang secara dinamis oleh LiveChat
      const container = getSidebarContainer();
      if (container && alertBox.parentElement !== container) {
        const style = window.getComputedStyle(container);
        if (style.position === 'static') {
          container.style.position = 'relative';
        }
        container.appendChild(alertBox);
      }

      if (displayCount >= 5) {
        if (!window.currentCalmingQuote) {
          window.currentCalmingQuote = calmingQuotes[Math.floor(Math.random() * calmingQuotes.length)];
        }
        alertBox.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 900; line-height: 1.2;">
            <svg viewBox="0 0 24 24" width="16" height="16" style="vertical-align: middle; flex-shrink: 0; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.5));">
              <path d="M12 2L2 22h20L12 2z" fill="#ff9800" stroke="#000000" stroke-width="2.5" stroke-linejoin="round"></path>
              <path d="M12 9v6" stroke="#000000" stroke-width="3" stroke-linecap="round"></path>
              <circle cx="12" cy="18" r="2" fill="#000000"></circle>
            </svg>
            <span>ADA ${displayCount} CHAT <span style="color: #ffea00; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">BELUM DIRESPON!</span></span>
          </div>
          <div style="font-size: 10.5px; color: #a7f3d0; margin-top: 6px; font-weight: 700; text-transform: none; letter-spacing: 0.3px; border-top: 1px solid rgba(255, 255, 255, 0.3); padding-top: 6px; width: 100%;">
            ${window.currentCalmingQuote}
          </div>
        `;
      } else {
        window.currentCalmingQuote = null;
        alertBox.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 900; line-height: 1.2;">
            <svg viewBox="0 0 24 24" width="16" height="16" style="vertical-align: middle; flex-shrink: 0; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.5));">
              <path d="M12 2L2 22h20L12 2z" fill="#ff9800" stroke="#000000" stroke-width="2.5" stroke-linejoin="round"></path>
              <path d="M12 9v6" stroke="#000000" stroke-width="3" stroke-linecap="round"></path>
              <circle cx="12" cy="18" r="2" fill="#000000"></circle>
            </svg>
            <span>ADA ${displayCount} CHAT <span style="color: #ffea00; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">BELUM DIRESPON!</span></span>
          </div>
        `;
      }
      alertBox.classList.add('show');
    } else {
      window.currentCalmingQuote = null;
      alertBox.classList.remove('show');
    }
  }

  function isActiveChatLastMessageFromVisitor() {
    try {
      const chatArea = document.querySelector('[data-testid="messages-list"]');
      if (!chatArea) return false;
      const messages = chatArea.children;
      if (messages.length === 0) return false;
      
      // Pindai mundur mencari baris pesan obrolan nyata (top-level children)
      let lastMsg = null;
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        const text = msg.innerText || "";
        const isSystem = text.includes('rated good') || text.includes('chat transcript') || text.includes('joined the chat') || text.includes('left the chat') || text.includes('rated bad') || text.includes('started the chat');
        if (!isSystem) {
          lastMsg = msg;
          break;
        }
      }
      
      if (lastMsg) {
        // Cek apakah pesan nyata terakhir dikirim oleh Agent/CS
        const hasAgent = lastMsg.querySelector('[data-testid*="agent"], [class*="agent"], [class*="Agent"], [class*="me"], [class*="Me"]');
        if (!hasAgent) {
          // Jika tidak dikirim oleh agent, berarti dikirim oleh visitor (customer)
          return true;
        }
      }
    } catch(e) {}
    return false;
  }

  function checkChatQueue() {
    try {
      const allItems = document.querySelectorAll('a, [role="button"], [role="row"], li');
      let unrespondedCount = 0;

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
        if (timeMatch) { 
          const val = parseInt(timeMatch[1]); 
          const unit = timeMatch[2]; 
          if (unit === 'm') mins = val; 
          else if (unit === 'h') mins = val * 60; 
        }

        const hasUnread = item.querySelector('[class*="badge"], [class*="unread"], [class*="notification"], [class*="count"]');
        
        // 1. Cek chat latar belakang yang unread
        let isUnresponded = (hasUnread && mins >= 1);

        // 2. Cek chat aktif yang sedang terbuka (Deteksi Akurat lewat URL)
        const anchor = item.closest('a');
        let isActive = false;
        if (anchor) {
          const href = anchor.getAttribute('href');
          if (href && (window.location.pathname.includes(href) || window.location.href.includes(href))) {
            isActive = true;
          }
        }

        if (isActive && mins >= 1) {
          if (isActiveChatLastMessageFromVisitor()) {
            isUnresponded = true;
          }
        }

        if (isUnresponded) {
          unrespondedCount++;
        }

        if (mins >= 3) { 
          item.classList.add('lc-antrian-kedip'); 
          return; 
        }

        if (hasUnread) { 
          item.classList.add('lc-antrian-orange'); 
        } else { 
          item.classList.add('lc-antrian-hijau'); 
        }
      });

      updateUnrespondedAlert(unrespondedCount);
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
