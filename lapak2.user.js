// ==UserScript==
// @name         LAPAK2 - Neural Shield: Anti-Spam
// @namespace    http://tampermonkey.net/
// @version      4.4.0
// @description  Deteksi pesan duplikat dengan Neural Shield alert
// @author       Antigravity
// @match        https://my.livechatinc.com/*
// @icon         https://www.livechat.com/favicon.ico
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  function injectStyles() {
    if (document.getElementById('dup-main-style')) return;
    const s = document.createElement('style'); s.id = 'dup-main-style';
    s.textContent = `
      #dup-overlay { position: fixed; inset: 0; z-index: 9999999; background: rgba(0,0,0,0.65); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: 0.2s; }
      #dup-overlay.visible { opacity: 1; pointer-events: all; }
      #dup-modal { background: #0f0f1a; border: 2px solid #ef4444; border-radius: 14px; box-shadow: 6px 6px 0 #ef4444; padding: 22px 24px 18px; width: 340px; font-family: 'Segoe UI', sans-serif; color: #fff; }
    `;
    document.head.appendChild(s);
  }

  const dupHistory = {};
  function buildDupModal() {
    if (document.getElementById('dup-overlay')) return;
    const ov = document.createElement('div'); ov.id = 'dup-overlay';
    ov.innerHTML = \`<div id="dup-modal"><div style="font-size:32px;text-align:center">⚠️</div><div style="font-weight:bold;color:#ef4444;text-align:center;margin:10px 0;text-shadow:0 0 10px rgba(239,68,68,0.5)">PESAN DUPLIKAT TERDETEKSI!</div><div id="dup-preview-text" style="background:#1e1e3a;border:1.5px solid #374151;border-radius:8px;padding:10px;margin-bottom:14px;font-size:12px;max-height:80px;overflow:auto"></div><div id="dup-counter-text" style="text-align:center;color:#fbbf24;font-size:11px;margin-bottom:15px"></div><div style="display:flex;gap:8px"><button id="dup-btn-cancel" style="flex:1;background:#1e1e3a;color:#9ca3af;border:1.5px solid #4b5563;border-radius:8px;padding:9px;cursor:pointer">✖ Batal</button><button id="dup-btn-send" style="flex:1;background:#450a0a;color:#ef4444;border:2px solid #ef4444;border-radius:8px;padding:9px;cursor:pointer;font-weight:bold">⚡ Kirim</button></div></div>\`;
    document.body.appendChild(ov);
    document.getElementById('dup-btn-cancel').onclick = () => ov.classList.remove('visible');
    document.getElementById('dup-btn-send').onclick = () => { ov.classList.remove('visible'); if (window.dupCB) window.dupCB(); };
  }

  function init() {
    injectStyles(); buildDupModal();
    document.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.altKey || document.getElementById('dup-overlay')?.classList.contains('visible') || window.dupForce) return;
      const active = document.activeElement; if (!active || !(active.isContentEditable || active.tagName === 'TEXTAREA')) return;
      const text = (active.tagName === 'TEXTAREA' ? active.value : active.innerText).trim(); if (!text) return;
      const chatKey = document.querySelector('[aria-selected="true"][data-id]')?.dataset.id || 'global';
      const prev = dupHistory[chatKey];
      if (prev && prev.text === text) { 
        prev.count++; 
        window.dupCB = () => { window.dupForce = true; active.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true })); setTimeout(() => { window.dupForce = false; }, 300); }; 
        document.getElementById('dup-preview-text').textContent = text; 
        document.getElementById('dup-counter-text').textContent = \`Sudah dikirim \${prev.count} kali sebelumnya\`; 
        document.getElementById('dup-overlay').classList.add('visible'); 
        e.stopImmediatePropagation(); e.preventDefault(); 
      } else { 
        dupHistory[chatKey] = { text: text, count: 1 }; 
      }
    }, true);
  }

  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
