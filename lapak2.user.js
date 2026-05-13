// ==UserScript==
// @name         LAPAK2 - Neural Shield: Anti-Spam
// @namespace    http://tampermonkey.net/
// @version      4.4.3
// @description  Real-time Duplicate Detection with Red Glow Warning
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
      #dup-overlay { position: fixed; inset: 0; z-index: 9999999; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: 0.2s; font-family: 'Outfit', sans-serif; }
      #dup-overlay.visible { opacity: 1; pointer-events: all; }
      #dup-modal { background: #0f0f1a; border: 2px solid #ef4444; border-radius: 18px; box-shadow: 0 0 40px rgba(239,68,68,0.5); padding: 25px; width: 380px; color: #fff; text-align: center; }
      .dup-title { font-weight: 900; color: #ef4444; font-size: 20px; margin: 15px 0; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 0 10px rgba(239,68,68,0.5); }
      #dup-preview-text { background: #16162a; border: 1px solid #2d2d4a; border-radius: 10px; padding: 15px; margin-bottom: 15px; font-size: 13px; max-height: 120px; overflow-y: auto; text-align: left; color: #d1d1f1; line-height: 1.6; border-left: 4px solid #ef4444; }
      #dup-counter-text { color: #fbbf24; font-size: 12px; margin-bottom: 25px; font-weight: 900; text-transform: uppercase; }
      .dup-btns { display: flex; gap: 12px; }
      .dup-btn { flex: 1; border: none; border-radius: 12px; padding: 14px; cursor: pointer; font-weight: 900; transition: 0.3s; font-size: 14px; font-family: 'Orbitron', sans-serif; letter-spacing: 1px; }
      #dup-btn-cancel { background: #2d2d4a; color: #fff; border: 1px solid #4b5563; }
      #dup-btn-send { background: linear-gradient(135deg, #ef4444, #7f1d1d); color: #fff; }
      
      /* Real-time Warning Effect */
      .dup-warning-glow {
        outline: 4px solid #ef4444 !important;
        outline-offset: -2px !important;
        box-shadow: inset 0 0 20px rgba(239,68,68,0.4), 0 0 25px rgba(239,68,68,0.6) !important;
        transition: all 0.2s ease-in-out !important;
        border-radius: 8px !important;
      }
    `;
    document.head.appendChild(s);
  }

  const dupHistory = {};
  window.dupForce = false;

  function buildDupModal() {
    if (document.getElementById('dup-overlay')) return;
    const ov = document.createElement('div'); ov.id = 'dup-overlay';
    ov.innerHTML = `
      <div id="dup-modal">
        <div style="font-size:50px; filter: drop-shadow(0 0 10px #ef4444)">⚠️</div>
        <div class="dup-title">Pesan Duplikat!</div>
        <div id="dup-preview-text"></div>
        <div id="dup-counter-text"></div>
        <div class="dup-btns">
          <button id="dup-btn-cancel" class="dup-btn">GANTI PESAN</button>
          <button id="dup-btn-send" class="dup-btn">TETAP KIRIM</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    document.getElementById('dup-btn-cancel').onclick = () => ov.classList.remove('visible');
    document.getElementById('dup-btn-send').onclick = () => { 
      ov.classList.remove('visible'); 
      if (window.dupCB) window.dupCB(); 
    };
  }

  function checkRealtime(el) {
    if (!el) return;
    let text = "";
    if (el.isContentEditable) text = el.innerText;
    else if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') text = el.value;
    else if (el.getAttribute('role') === 'textbox') text = el.textContent;
    
    text = text.trim();
    if (!text || text.length < 2) {
        el.classList.remove('dup-warning-glow');
        return;
    }

    const chatKey = location.href.split('/').pop() || 'global';
    const prev = dupHistory[chatKey];

    // Cari elemen pembungkus kotak chat untuk dikasih efek merah
    const wrapper = el.closest('[class*="InputWrapper"], [class*="ChatInput"], [class*="Editor"], [role="form"]') || el;

    if (prev && prev.text === text) {
      wrapper.classList.add('dup-warning-glow');
    } else {
      wrapper.classList.remove('dup-warning-glow');
    }
  }

  function init() {
    injectStyles(); buildDupModal();
    
    // Listener saat mengetik (Real-time)
    window.addEventListener('input', e => {
      checkRealtime(e.target);
    }, true);

    // Listener saat fokus (Cek ulang)
    window.addEventListener('focusin', e => {
      checkRealtime(e.target);
    }, true);

    // Listener saat Enter (Blokir kalau duplikat)
    window.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.altKey) return;
      if (window.dupForce) return;
      
      const active = document.activeElement;
      if (!active) return;
      
      let text = "";
      if (active.isContentEditable) text = active.innerText;
      else if (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT') text = active.value;
      else if (active.getAttribute('role') === 'textbox') text = active.textContent;
      
      text = text.trim();
      if (!text || text.length < 2) return;

      const chatKey = location.href.split('/').pop() || 'global';
      const prev = dupHistory[chatKey];

      if (prev && prev.text === text) {
        prev.count++;
        
        window.dupCB = () => {
          window.dupForce = true;
          const ev = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
          active.dispatchEvent(ev);
          setTimeout(() => { window.dupForce = false; }, 800);
        };

        document.getElementById('dup-preview-text').textContent = text;
        document.getElementById('dup-counter-text').textContent = `Ditemukan ${prev.count}x pengulangan pesan!`;
        document.getElementById('dup-overlay').classList.add('visible');

        e.preventDefault();
        e.stopImmediatePropagation();
      } else {
        dupHistory[chatKey] = { text: text, count: 1 };
      }
    }, true);
  }

  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
