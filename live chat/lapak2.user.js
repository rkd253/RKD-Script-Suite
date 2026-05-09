// ==UserScript==
// @name         LAPAK2 - LiveChat Duplicate Message Highlighter - DANGER Neural Shield
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Deteksi pesan duplikat dengan Neural Shield alert + red border pada input
// @author       Antigravity
// @match        https://my.livechatinc.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';
  function injectStyles() {
    if (document.getElementById('lapak2-style')) return;
    const s = document.createElement('style'); s.id = 'lapak2-style';
    s.textContent = `#neural-shield { position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%) translateY(12px); z-index: 9999999; width: 420px; background: #1a0505; border: 2px solid #ef4444; border-radius: 10px; padding: 14px 16px 12px; font-family: 'Segoe UI', sans-serif; color: #fff; box-shadow: 0 0 0 1px rgba(239,68,68,0.3), 0 8px 32px rgba(239,68,68,0.25); opacity: 0; pointer-events: none; transition: opacity 0.2s ease, transform 0.2s ease; } #neural-shield.visible { opacity: 1; pointer-events: all; transform: translateX(-50%) translateY(0); } #neural-shield-title { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: #ef4444; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; } #neural-shield-body { font-size: 12px; color: #d1d5db; line-height: 1.55; margin-bottom: 12px; } #ns-count-text { margin-top: 6px; color: #fbbf24; font-size: 11px; } #neural-shield-footer { display: flex; gap: 8px; justify-content: flex-end; } .ns-btn { border: none; border-radius: 6px; padding: 6px 14px; font-size: 11px; font-weight: 600; cursor: pointer; transition: 0.15s; letter-spacing: 0.5px; } .ns-btn-cancel { background: #1f1f2e; color: #9ca3af; border: 1.5px solid #374151; } .ns-btn-send { background: #450a0a; color: #ef4444; border: 1.5px solid #ef4444; } .ns-input-danger, .ns-input-danger:focus { outline: 2px solid #ef4444 !important; box-shadow: 0 0 0 3px rgba(239,68,68,0.2) !important; }`;
    document.head.appendChild(s);
  }
  const dupHistory = {};
  let nsHideTimer = null;
  function buildShieldAlert() {
    if (document.getElementById('neural-shield')) return;
    const el = document.createElement('div'); el.id = 'neural-shield';
    el.innerHTML = `<div id="neural-shield-title"><span>🛡</span> NEURAL SHIELD: SPAM ALERT</div><div id="neural-shield-body">Pesan yang Anda ketik terdeteksi <strong>100% duplikat</strong> dengan riwayat chat hari ini. Mohon lakukan variasi kata agar tidak terblokir sistem.<div id="ns-count-text"></div></div><div id="neural-shield-footer"><button class="ns-btn ns-btn-cancel" id="ns-btn-cancel">✖ Batal</button><button class="ns-btn ns-btn-send" id="ns-btn-send">⚡ Kirim Tetap</button></div>`;
    document.body.appendChild(el);
    document.getElementById('ns-btn-cancel').onclick = () => hideShield();
    document.getElementById('ns-btn-send').onclick = () => { hideShield(); if (window._lapak2CB) window._lapak2CB(); };
  }
  function showShield(count, activeEl) {
    const el = document.getElementById('neural-shield'); if (!el) return;
    document.getElementById('ns-count-text').textContent = `Sudah dikirim ${count} kali sebelumnya.`;
    el.classList.add('visible');
    if (activeEl) activeEl.classList.add('ns-input-danger');
    clearTimeout(nsHideTimer); nsHideTimer = setTimeout(() => hideShield(), 6000);
  }
  function hideShield() {
    const el = document.getElementById('neural-shield');
    if (el) el.classList.remove('visible');
    clearTimeout(nsHideTimer);
    document.querySelectorAll('.ns-input-danger').forEach(el => el.classList.remove('ns-input-danger'));
    window._lapak2Force = false;
  }
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.altKey) return;
    if (document.getElementById('neural-shield')?.classList.contains('visible') || window._lapak2Force) return;
    const active = document.activeElement;
    if (!active || !(active.isContentEditable || active.tagName === 'TEXTAREA')) return;
    const text = (active.tagName === 'TEXTAREA' ? active.value : active.innerText).trim();
    if (!text) return;
    const chatKey = document.querySelector('[aria-selected="true"][data-id]')?.dataset.id || 'global';
    const prev = dupHistory[chatKey];
    if (prev && prev.text === text) {
      prev.count++;
      window._lapak2CB = () => {
        window._lapak2Force = true;
        active.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        setTimeout(() => { window._lapak2Force = false; }, 300);
      };
      showShield(prev.count, active);
      e.stopImmediatePropagation();
      e.preventDefault();
    } else {
      dupHistory[chatKey] = { text, count: 1 };
      hideShield();
    }
  }, true);
  document.addEventListener('input', e => {
    if (document.getElementById('neural-shield')?.classList.contains('visible')) hideShield();
  }, true);
  function init() { injectStyles(); buildShieldAlert(); }
  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
