// ==UserScript==
// @name         LAPAK1 - Custom Chat Word Highlighter with Dashboard
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Highlight kata-kata penting di LiveChat dengan panel dashboard + jam digital
// @author       Antigravity
// @match        https://my.livechatinc.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';
  const DEFAULT_WORDS = [
    { id: 1,  word: 'proses',    color: '#f97316', cs: false, on: true },
    { id: 2,  word: 'gangguan',  color: '#f97316', cs: false, on: true },
    { id: 3,  word: 'deposit',   color: '#22c55e', cs: false, on: true },
    { id: 4,  word: 'depo',      color: '#22c55e', cs: false, on: true },
    { id: 5,  word: 'read',      color: '#22c55e', cs: false, on: true },
    { id: 6,  word: 'online',    color: '#22c55e', cs: false, on: true },
    { id: 7,  word: 'withdraw',  color: '#ec4899', cs: false, on: true },
    { id: 8,  word: 'wede',      color: '#ec4899', cs: false, on: true },
    { id: 9,  word: 'penarikan', color: '#ec4899', cs: false, on: true },
    { id: 10, word: 'witrdraw',  color: '#ec4899', cs: false, on: true },
    { id: 11, word: 'lupa',      color: '#3b82f6', cs: false, on: true },
    { id: 12, word: 'sent',      color: '#ef4444', cs: false, on: true },
    { id: 13, word: 'babi',      color: '#ef4444', cs: false, on: true },
    { id: 14, word: 'pepek',     color: '#ef4444', cs: false, on: true },
    { id: 15, word: 'bujang',    color: '#ef4444', cs: false, on: true },
    { id: 16, word: 'kontol',    color: '#ef4444', cs: false, on: true },
    { id: 17, word: 'ajing',     color: '#ef4444', cs: false, on: true },
    { id: 18, word: '3m',        color: '#ef4444', cs: false, on: true },
    { id: 19, word: '4m',        color: '#ef4444', cs: false, on: true },
    { id: 20, word: '5m',        color: '#ef4444', cs: false, on: true },
    { id: 21, word: 'anjing',    color: '#ef4444', cs: false, on: true },
    { id: 22, word: 'claim',     color: '#f97316', cs: false, on: true },
    { id: 23, word: 'freespin',  color: '#a855f7', cs: false, on: true },
    { id: 24, word: 'scatter',   color: '#ec4899', cs: false, on: true },
  ];
  const Store = {
    get(k, d) { try { let v = GM_getValue(k); return v ? JSON.parse(v) : d; } catch (e) { try { let v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e2) { return d; } } },
    set(k, v) { try { GM_setValue(k, JSON.stringify(v)); } catch (e) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e2) { } } }
  };
  let hlWords = Store.get('manga-hl-words', DEFAULT_WORDS);
  let hlGlobalAktif = true;
  function injectStyles() {
    if (document.getElementById('lapak1-style')) return;
    const s = document.createElement('style'); s.id = 'lapak1-style';
    s.textContent = `#hl-panel { position: fixed; top: 50px; right: 24px; width: 320px; height: 500px; min-width: 280px; min-height: 350px; max-height: 90vh; background: #080812; border: 2px solid #a855f7; border-radius: 14px; box-shadow: 8px 8px 0 #a855f7; z-index: 999998; font-family: 'Segoe UI', sans-serif; color: #fff; display: none; flex-direction: column; overflow: hidden; resize: both; } #hl-panel.open { display: flex; } #hl-header { flex-shrink: 0; background: linear-gradient(135deg, #1e0a3c, #2d1060); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #a855f7; cursor: move; } #hl-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; } #hl-input-area { flex-shrink: 0; padding: 14px; background: #0f0f1a; border-bottom: 1px solid #2d1060; } #hl-list { flex: 1; overflow-y: auto; padding: 14px; scrollbar-width: thin; scrollbar-color: #7c3aed #080812; } #hl-list::-webkit-scrollbar { width: 6px; } #hl-list::-webkit-scrollbar-thumb { background: #7c3aed; border-radius: 10px; } #hl-datetime-box { margin-top: 8px; background: #000; border: 2px solid #a855f7; border-radius: 10px; padding: 10px; text-align: center; box-shadow: inset 0 0 10px rgba(168,85,247,0.4); } #hl-hari-tanggal { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #c084fc; margin-bottom: 4px; font-weight: bold; } #hl-jam { font-family: 'Courier New', Courier, monospace; font-size: 28px; font-weight: 900; color: #a855f7; text-shadow: 0 0 5px #a855f7, 0 0 10px #a855f7; line-height: 1; } .hl-item { display: flex; align-items: center; gap: 10px; background: #131326; border: 1.5px solid #2d1060; border-radius: 10px; padding: 8px 12px; margin-bottom: 6px; } .hl-swatch { width: 20px; height: 20px; border-radius: 6px; flex-shrink: 0; } .hl-btn { background: none; border: 1.5px solid #4b5563; border-radius: 6px; padding: 3px 8px; cursor: pointer; font-size: 10px; color: #fff; } .hl-on { border-color: #22c55e; color: #22c55e; }`;
    document.head.appendChild(s);
  }
  function getContrast(h) {
    const c = h.replace('#',''), r=parseInt(c.substr(0,2),16), g=parseInt(c.substr(2,2),16), b=parseInt(c.substr(4,2),16);
    return (((r*299)+(g*587)+(b*114))/1000 >= 128) ? '#000000' : '#ffffff';
  }
  function updateHighlightStyles() {
    let el = document.getElementById('lapak1-dynamic-hl-css');
    if (!el) { el = document.createElement('style'); el.id = 'lapak1-dynamic-hl-css'; document.head.appendChild(el); }
    let css = '';
    hlWords.forEach(w => {
      const id = `manga-hl-${w.color.replace('#', '')}`;
      css += `::highlight(${id}) { background-color: ${w.color}; color: ${getContrast(w.color)}; text-shadow: 0.5px 0 0.1px currentColor; }\n`;
    });
    el.textContent = css;
  }
  function applyHighlights() {
    if (!hlGlobalAktif || !window.CSS || !CSS.highlights) return;
    try {
      CSS.highlights.clear();
      const active = hlWords.filter(w => w.on && w.word.trim());
      if (!active.length) return;
      const hMap = {};
      active.forEach(w => { const id = `manga-hl-${w.color.replace('#', '')}`; if (!hMap[id]) hMap[id] = new Highlight(); w.hlId = id; });
      const chatArea = document.querySelector('[data-testid="messages-list"]');
      if (!chatArea) return;
      const walker = document.createTreeWalker(chatArea, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const t = node.nodeValue;
        active.forEach(w => {
          const rx = new RegExp(w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), w.cs ? 'g' : 'gi');
          let m;
          while ((m = rx.exec(t)) !== null) {
            try { const range = new Range(); range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length); hMap[w.hlId].add(range); } catch(e) {}
          }
        });
      }
      for (const id in hMap) CSS.highlights.set(id, hMap[id]);
    } catch (e) { }
  }
  function buildPanel() {
    if (document.getElementById('hl-panel')) return;
    const p = document.createElement('div'); p.id = 'hl-panel';
    p.innerHTML = `<div id="hl-header"><div id="hl-header-left"><div style="font-size:14px;font-weight:bold;color:#c084fc">🖊️ Penanda Kata</div><div style="font-size:9px;color:#a855f7;opacity:0.8">Ctrl+H → buka/tutup panel</div><div id="hl-datetime-box"><div id="hl-hari-tanggal">...</div><div id="hl-jam">00:00:00</div></div></div><button id="hl-close" style="background:#7c3aed;border:none;color:#fff;border-radius:10px;width:34px;height:34px;cursor:pointer;font-weight:bold;box-shadow:0 0 10px rgba(124,58,237,0.5)">✕</button></div><div id="hl-body"><div id="hl-input-area"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div style="font-size:11px;color:#c084fc;font-weight:bold;letter-spacing:1px">🎨 SOROTAN KATA</div><button id="hl-global-btn" style="background:#7c3aed;border:none;color:#fff;border-radius:6px;padding:4px 10px;font-size:10px;cursor:pointer;font-weight:bold">✅ ON</button></div><div style="display:flex;gap:8px"><input id="hl-input" type="text" placeholder="Ketik kata..." style="flex:1;background:#050510;border:1.5px solid #2d1060;border-radius:8px;padding:8px 12px;color:#fff;font-size:12px" /><input id="hl-color" type="color" value="#facc15" style="width:38px;height:38px;background:none;border:1.5px solid #7c3aed;border-radius:8px;cursor:pointer" /><button id="hl-add" style="background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:0 14px;cursor:pointer;font-weight:bold;font-size:12px;box-shadow:0 4px 0 #5b21b6">TAMBAH</button></div></div><div id="hl-list"></div></div><div style="padding:12px 16px;background:#0f0f1a;border-top:1.5px solid #2d1060;display:flex;justify-content:space-between;align-items:center;flex-shrink:0"><span style="font-size:9px;color:#4b5563">Drag corner to resize</span><button id="hl-wipe" style="background:none;border:1.5px solid #4b5563;color:#ef4444;border-radius:6px;padding:5px 12px;font-size:10px;cursor:pointer;font-weight:bold">🗑 RESET DATA</button></div>`;
    document.body.appendChild(p);
    document.getElementById('hl-global-btn').onclick = () => { hlGlobalAktif = !hlGlobalAktif; if (!hlGlobalAktif && CSS.highlights) CSS.highlights.clear(); renderPanel(); applyHighlights(); };
    document.getElementById('hl-add').onclick = () => { const i = document.getElementById('hl-input'); if (i.value.trim()) { hlWords.push({ id: Date.now(), word: i.value.trim(), color: document.getElementById('hl-color').value, cs: false, on: true }); Store.set('manga-hl-words', hlWords); i.value = ''; updateHighlightStyles(); renderPanel(); applyHighlights(); } };
    document.getElementById('hl-wipe').onclick = () => { if (confirm('Reset semua kata ke standar?')) { hlWords = DEFAULT_WORDS.map(w => ({...w})); Store.set('manga-hl-words', hlWords); updateHighlightStyles(); renderPanel(); applyHighlights(); } };
    document.getElementById('hl-close').onclick = () => p.classList.remove('open');
    const hdr = document.getElementById('hl-header'); let drag = false, sx, sy, ol, ot;
    hdr.onmousedown = e => { drag = true; sx = e.clientX; sy = e.clientY; const r = p.getBoundingClientRect(); ol = r.left; ot = r.top; p.style.right = 'auto'; p.style.transform = 'none'; };
    document.addEventListener('mousemove', e => { if (drag) { p.style.left = (ol + e.clientX - sx) + 'px'; p.style.top = (ot + e.clientY - sy) + 'px'; } });
    document.addEventListener('mouseup', () => drag = false);
  }
  function renderPanel() {
    const list = document.getElementById('hl-list'); if (!list) return; list.innerHTML = '';
    hlWords.forEach(w => {
      const item = document.createElement('div'); item.className = 'hl-item';
      item.innerHTML = `<div class="hl-swatch" style="background:${w.color}"></div><div style="flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500">${w.word}</div><button class="hl-btn ${w.on ? 'hl-on' : ''}">${w.on ? 'ON' : 'OFF'}</button><button class="hl-btn hl-del">✕</button>`;
      const b = item.querySelectorAll('button');
      b[0].onclick = () => { w.on = !w.on; Store.set('manga-hl-words', hlWords); renderPanel(); applyHighlights(); };
      b[1].onclick = () => { hlWords = hlWords.filter(x => x.id !== w.id); Store.set('manga-hl-words', hlWords); updateHighlightStyles(); renderPanel(); applyHighlights(); };
      list.appendChild(item);
    });
    const gb = document.getElementById('hl-global-btn');
    if (gb) gb.textContent = hlGlobalAktif ? '✅ ON' : '⛔ OFF';
  }
  function init() {
    injectStyles(); buildPanel(); updateHighlightStyles(); renderPanel();
    const obs = new MutationObserver(() => { clearTimeout(window.lapak1Timer); window.lapak1Timer = setTimeout(applyHighlights, 120); });
    obs.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.code === 'KeyH') { e.preventDefault(); document.getElementById('hl-panel').classList.toggle('open'); renderPanel(); }
      if (e.ctrlKey && e.code === 'KeyQ') { e.preventDefault(); document.getElementById('hl-global-btn')?.click(); }
    });
    setInterval(() => {
      const now = new Date();
      const h = document.getElementById('hl-hari-tanggal');
      const j = document.getElementById('hl-jam');
      if (h) h.textContent = `${['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][now.getDay()]}, ${now.getDate()} ${['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][now.getMonth()]} ${now.getFullYear()}`;
      if (j) j.textContent = now.toLocaleTimeString('en-GB');
    }, 1000);
    setTimeout(applyHighlights, 2000);
  }
  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
