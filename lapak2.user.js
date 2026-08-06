// ==UserScript==
// @name         LAPAK2 - Neural Shield: Anti-Spam (ULTIMATE EDITION)
// @namespace    http://tampermonkey.net/
// @version      5.0.0
// @description  Persistent Real-time Duplicate Detection + Danger Alert UI + DOM History Scan
// @author       RKD Suite
// @match        https://my.livechatinc.com/*
// @icon         https://www.livechat.com/favicon.ico
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    // ═══════════════════════════════════════════════════════════════════
    // PERSISTENT STORAGE ENGINE
    // ═══════════════════════════════════════════════════════════════════
    const Store = {
        get(k, d) { try { let v = GM_getValue(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
        set(k, v) { try { GM_setValue(k, JSON.stringify(v)); } catch (e) { } }
    };
    let dupHistory = Store.get('rkd-dup-history', {});
    window.dupForce = false;

    // History expiration logic (24 hours)
    function cleanHistory() {
        const now = Date.now();
        const expiry = 24 * 60 * 60 * 1000;
        let changed = false;
        for (const key in dupHistory) {
            if (now - (dupHistory[key].timestamp || 0) > expiry) {
                delete dupHistory[key];
                changed = true;
            }
        }
        if (changed) Store.set('rkd-dup-history', dupHistory);
    }

    // Generate unique chat key based on DOM and URL
    function getChatKey() {
        const customerNameEl = document.querySelector('[data-testid="customer-details-name"], [class*="customer-name"]');
        if (customerNameEl && customerNameEl.textContent.trim()) {
            return customerNameEl.textContent.trim();
        }
        const parts = location.href.split('/');
        let key = parts.pop() || 'global';
        if (key === 'chats' || key === '') {
            const activeItem = document.querySelector('.css-1cmlcj3 .active, [data-testid="chats-list"] .active');
            if (activeItem) {
                return activeItem.textContent.trim().substring(0, 20) || 'global';
            }
        }
        return key;
    }

    // ═══════════════════════════════════════════════════════════════════
    // VISUALS & STYLES (DANGER ALERT THEME)
    // ═══════════════════════════════════════════════════════════════════
    function injectStyles() {
        if (document.getElementById("lapak2-ultimate-styles")) return;
        var style = document.createElement("style");
        style.id = "lapak2-ultimate-styles";
        style.textContent = `
            .spam-parent-active { position: relative !important; overflow: visible !important; }
            
            /* PRE-SEND INPUT: BOLD RED GUARD */
            .spam-glow-alert { 
                border: 3px solid #ff0000 !important; 
                background: rgba(255, 0, 0, 0.08) !important; 
                box-shadow: 0 0 20px rgba(255, 0, 0, 0.4), 0 0 5px rgba(0,0,0,0.3) !important; 
                border-radius: 12px !important; 
            }
            
            /* HUD PERINGATAN: MODERN FLOATING HUD */
            .spam-info-box { 
                position: absolute; bottom: calc(100% + 15px); left: 0; 
                width: 340px; background: #1a0000; 
                border: 2px solid #ff0000; border-radius: 14px; 
                padding: 16px; color: #ffffff; font-size: 11px; z-index: 9999999; 
                box-shadow: 0 15px 45px rgba(0,0,0,0.7), 0 0 10px rgba(255,0,0,0.2); 
                border-left: 8px solid #ff0000; 
                animation: slideUpHUD 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
                pointer-events: none; 
            }
            .spam-info-box b { color: #ff1111; display: block; margin-bottom: 6px; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 900; }
            @keyframes slideUpHUD { from { transform: translateY(15px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
            
            /* FINAL FORM: THE SPAM ALERT BUBBLE (IN CHAT) */
            .spam-detected-highlight { 
                background: linear-gradient(180deg, #bb0000 0%, #660000 100%) !important; 
                border: 2px solid #ff0000 !important; 
                border-left: 10px solid #ff0000 !important; 
                border-radius: 12px !important; 
                position: relative; overflow: visible !important; z-index: 100; 
                margin: 20px 0 20px 0 !important; 
                box-shadow: 0 12px 35px rgba(0,0,0,0.6), inset 0 0 20px rgba(255,0,0,0.4) !important; 
                animation: alertPulse 2s infinite ease-in-out; 
            }
            
            .spam-detected-highlight, .spam-detected-highlight *, .spam-detected-highlight span, .spam-detected-highlight div { 
                color: #ffffff !important; background-color: transparent !important; text-shadow: 1px 1px 2px rgba(0,0,0,0.8) !important; 
            }
            
            .spam-detected-highlight::before { 
                content: '⚠️ SYSTEM ALERT: DUPLICATE'; 
                position: absolute; top: -14px; left: -10px; right: 0; 
                background: #ff0000; color: #ffffff !important; 
                font-size: 9px; font-weight: 900; padding: 2px 10px; 
                border-radius: 4px 4px 0 0; box-shadow: 0 -2px 10px rgba(255,0,0,0.4); 
                letter-spacing: 1px; z-index: 11; width: fit-content; 
            }
            
            /* POPUP DANGER ALERT MODAL STYLES */
            .lapak2-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(8px); z-index: 99999999; display: flex; align-items: center; justify-content: center; animation: fadeInOverlay 0.2s ease-out; opacity: 0; pointer-events: none; transition: 0.2s; }
            .lapak2-overlay.visible { opacity: 1; pointer-events: all; }
            
            .lapak2-modal { background: linear-gradient(145deg, #220000 0%, #0d0000 100%); border: 2px solid #ff0000; box-shadow: 0 0 40px rgba(255, 0, 0, 0.5), 0 20px 50px rgba(0,0,0,0.9); border-radius: 16px; width: 420px; max-width: 90vw; padding: 24px; color: #ffffff; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif; animation: popInModal 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); text-align: center; box-sizing: border-box; position: relative; }
            .lapak2-modal-header { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 16px; border-bottom: 1px solid rgba(255,0,0,0.3); padding-bottom: 12px; }
            .lapak2-modal-icon { font-size: 36px; animation: alertPulseIcon 1.2s infinite; }
            .lapak2-modal-title { font-size: 22px; font-weight: 900; letter-spacing: 2px; color: #ff3333; text-transform: uppercase; text-shadow: 0 0 10px rgba(255,0,0,0.6); }
            
            .lapak2-modal-body { margin-bottom: 24px; }
            #lapak2-preview-text { background: #1a0505; border: 1px solid #ff3333; border-radius: 10px; padding: 12px; margin-bottom: 15px; font-size: 13px; max-height: 100px; overflow-y: auto; text-align: left; color: #ffcccc; line-height: 1.5; border-left: 5px solid #ff0000; }
            .lapak2-modal-text { font-size: 15px; font-weight: 700; color: #ffffff; margin: 0 0 8px 0; text-shadow: 0 1px 3px rgba(0,0,0,0.8); }
            .lapak2-modal-subtext { font-size: 11px; color: #cccccc; margin: 0; line-height: 1.4; opacity: 0.9; }
            
            .lapak2-modal-footer { display: flex; gap: 12px; justify-content: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 18px; }
            .lapak2-btn { flex: 1; padding: 12px 14px; font-size: 13px; font-weight: 800; border-radius: 8px; cursor: pointer; border: none; transition: all 0.2s ease; display: inline-flex; align-items: center; justify-content: center; gap: 6px; outline: none; }
            .lapak2-btn-edit { background: #2b2b2b; color: #ffffff; border: 1px solid #555555; }
            .lapak2-btn-edit:hover { background: #3d3d3d; border-color: #777777; transform: translateY(-2px); }
            .lapak2-btn-send { background: linear-gradient(135deg, #cc0000 0%, #880000 100%); color: #ffffff; border: 1px solid #ff3333; }
            .lapak2-btn-send:hover { background: linear-gradient(135deg, #ee0000 0%, #aa0000 100%); border-color: #ff6666; transform: translateY(-2px); box-shadow: 0 4px 15px rgba(255,0,0,0.5); }
            
            #lapak2-btn-clear { position: absolute; top: 12px; right: 12px; background: transparent; border: 1px solid #ff3333; color: #ff3333; border-radius: 6px; padding: 4px 8px; font-size: 9px; font-weight: 800; cursor: pointer; transition: 0.2s; }
            #lapak2-btn-clear:hover { background: #ff3333; color: #ffffff; }

            @keyframes alertPulse { 0% { border-color: #ff0000; } 50% { border-color: #ff6666; } 100% { border-color: #ff0000; } }
            @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
            @keyframes popInModal { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            @keyframes alertPulseIcon { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
        `;
        document.head.appendChild(style);
    }

    // ═══════════════════════════════════════════════════════════════════
    // CORE LOGIC: DOM & STORAGE HYBRID SCAN
    // ═══════════════════════════════════════════════════════════════════
    function normalizeText(text) {
        if (!text) return "";
        return text.replace(/[\s\n\r\t\u00a0.,!?;:-]/g, "").toLowerCase();
    }

    function findLastMarker(container) {
        const elements = container.querySelectorAll("*");
        let latest = null;
        const keys = ["started", "today", "dimulai", "hari ini"];
        for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            const txt = (el.textContent || "").toLowerCase();
            if (keys.some(k => txt.includes(k)) && el.children.length <= 4) {
                const inner = (el.innerText || "").toLowerCase().trim();
                if (inner.startsWith("started") || inner.startsWith("dimulai") || (txt.includes("started") && txt.includes("today"))) {
                    latest = el;
                }
            }
        }
        return latest;
    }

    function getBubbles(container) {
        const blocks = container.querySelectorAll('[data-testid="agent-message"]');
        const results = [];
        for (let i = 0; i < blocks.length; i++) {
            const b = blocks[i].querySelector('[data-testid="message-text"]') || blocks[i].querySelector('div[class^="css-"]') || blocks[i].querySelector(".message__text");
            if (b) results.push(b);
        }
        return results;
    }

    function getMsgsAfter(container) {
        const marker = findLastMarker(container);
        const bubbles = getBubbles(container);
        if (!marker) return bubbles.slice(-10); // Look at last 10 messages max if no marker
        const filtered = [];
        for (let i = 0; i < bubbles.length; i++) {
            if (marker.compareDocumentPosition(bubbles[i]) & Node.DOCUMENT_POSITION_FOLLOWING) {
                filtered.push(bubbles[i]);
            }
        }
        return filtered;
    }

    function runHighlight() {
        if (document.hidden) return;
        const list = document.querySelector('[data-testid="messages-list"]');
        if (!list) return;
        
        const all = getBubbles(list);
        for (let i = 0; i < all.length; i++) all[i].classList.remove("spam-detected-highlight");
        
        const active = getMsgsAfter(list);
        if (active.length < 2) return;
        
        const counts = {};
        for (let j = 0; j < active.length; j++) {
            const n = normalizeText(active[j].innerText || active[j].textContent);
            if (n.length >= 5) counts[n] = (counts[n] || 0) + 1;
        }
        
        for (let k = 0; k < active.length; k++) {
            const n2 = normalizeText(active[k].innerText || active[k].textContent);
            if (counts[n2] > 1) active[k].classList.add("spam-detected-highlight");
        }
    }

    function checkIsDuplicate(input) {
        if (!input) return false;
        const raw = input.innerText || input.value || "";
        if (raw.trim().indexOf("#") === 0) return false;
        const norm = normalizeText(raw);
        if (norm.length < 5) return false;

        // 1. Check DOM visible history
        const list = document.querySelector('[data-testid="messages-list"]');
        if (list) {
            const active = getMsgsAfter(list);
            const sentNorms = active.map(el => normalizeText(el.innerText || el.textContent));
            if (sentNorms.includes(norm)) return true;
        }

        // 2. Check Persistent Storage History
        const chatKey = getChatKey();
        const prev = dupHistory[chatKey];
        if (prev && normalizeText(prev.text) === norm) {
            return true;
        }

        return false;
    }

    // ═══════════════════════════════════════════════════════════════════
    // UI HANDLERS
    // ═══════════════════════════════════════════════════════════════════
    function removeAlerts(input) {
        input.classList.remove("spam-glow-alert");
        const p = input.closest('[class*="InputWrapper"], [class*="ChatInput"], [role="form"]') || input.parentElement;
        if (p) {
            p.classList.remove("spam-parent-active");
            const f = p.querySelector(".spam-info-box"); 
            if (f) f.remove();
        }
    }

    function applyAlerts(input) {
        input.classList.add("spam-glow-alert");
        const p = input.closest('[class*="InputWrapper"], [class*="ChatInput"], [role="form"]') || input.parentElement;
        if (!p) return;
        p.classList.add("spam-parent-active");
        if (!p.querySelector(".spam-info-box")) {
            const i = document.createElement("div"); 
            i.className = "spam-info-box";
            i.innerHTML = "<b>🛡️ NEURAL SHIELD: SPAM ALERT</b>" +
                "Pesan yang diketik 100% duplikat dengan riwayat chat ini. Lakukan variasi pesan.";
            p.appendChild(i);
        }
    }

    function checkPre(el) {
        if (!el || !(el instanceof Element)) return;
        
        let isValidInput = false;
        if (el.isContentEditable) isValidInput = true;
        else if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') isValidInput = true;
        else if (el.getAttribute('role') === 'textbox') isValidInput = true;
        
        if (!isValidInput) return;
        
        if (checkIsDuplicate(el)) {
            applyAlerts(el);
        } else {
            removeAlerts(el);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // DANGER MODAL POPUP
    // ═══════════════════════════════════════════════════════════════════
    function buildModal() {
        if (document.getElementById("lapak2-danger-overlay")) return;
        const overlay = document.createElement("div");
        overlay.id = "lapak2-danger-overlay";
        overlay.className = "lapak2-overlay";

        overlay.innerHTML = `
            <div class="lapak2-modal">
                <button id="lapak2-btn-clear" title="Hapus histori">CLEAR HISTORY</button>
                <div class="lapak2-modal-header">
                    <span class="lapak2-modal-icon">🚨</span>
                    <span class="lapak2-modal-title">DANGER ALERT</span>
                </div>
                <div class="lapak2-modal-body">
                    <p class="lapak2-modal-text">Pesan yang diketik terdeteksi 100% duplikat!</p>
                    <div id="lapak2-preview-text"></div>
                    <p class="lapak2-modal-subtext">Mengirim pesan duplikat berisiko tinggi. Silakan pilih:</p>
                </div>
                <div class="lapak2-modal-footer">
                    <button id="lapak2-btn-edit" class="lapak2-btn lapak2-btn-edit">✏️ Edit Pesan</button>
                    <button id="lapak2-btn-send" class="lapak2-btn lapak2-btn-send">⚠️ Tetap Kirim</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        document.getElementById("lapak2-btn-edit").addEventListener("click", () => {
            overlay.classList.remove('visible');
            const input = document.querySelector('[contenteditable="true"], textarea, [role="textbox"]');
            if (input) input.focus();
        });

        document.getElementById("lapak2-btn-send").addEventListener("click", () => {
            overlay.classList.remove('visible');
            if (window.dupCB) window.dupCB();
        });

        document.getElementById("lapak2-btn-clear").addEventListener("click", () => {
            dupHistory = {};
            Store.set('rkd-dup-history', dupHistory);
            overlay.classList.remove('visible');
            alert('✅ Riwayat lokal berhasil dihapus!');
        });
    }

    function showDangerModal(text, onSendAnyway) {
        const overlay = document.getElementById("lapak2-danger-overlay");
        if (overlay) {
            document.getElementById("lapak2-preview-text").textContent = text;
            window.dupCB = onSendAnyway;
            overlay.classList.add('visible');
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // EVENT LISTENERS & INJECTION
    // ═══════════════════════════════════════════════════════════════════
    function handleSendAttempt(e, input, triggerSendFn) {
        if (window.dupForce) return;
        
        const raw = input.innerText || input.value || input.textContent || "";
        if (!raw || raw.trim().length < 2) return;

        if (checkIsDuplicate(input)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            showDangerModal(raw.trim(), () => {
                window.dupForce = true;
                
                // Record to history to prevent next trigger, but we already know it's dupe
                const chatKey = getChatKey();
                dupHistory[chatKey] = { text: raw.trim(), count: 2, timestamp: Date.now() };
                Store.set('rkd-dup-history', dupHistory);

                if (typeof triggerSendFn === "function") {
                    triggerSendFn();
                } else {
                    const enterEvt = new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true });
                    input.dispatchEvent(enterEvt);
                }
                setTimeout(() => { window.dupForce = false; }, 800);
            });
        } else {
            // First time send, record to persistent storage
            const chatKey = getChatKey();
            dupHistory[chatKey] = { text: raw.trim(), count: 1, timestamp: Date.now() };
            Store.set('rkd-dup-history', dupHistory);
        }
    }

    function init() {
        cleanHistory();
        injectStyles(); 
        buildModal();

        // Realtime typing check
        window.addEventListener('input', e => checkPre(e.target), true);
        window.addEventListener('focusin', e => checkPre(e.target), true);

        // Enter key intercept
        window.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && !e.shiftKey && !e.isComposing && !e.altKey) {
                const active = document.activeElement;
                if (!active || !(active instanceof Element)) return;
                
                let isValidInput = false;
                if (active.isContentEditable || active.tagName === 'TEXTAREA' || active.tagName === 'INPUT' || active.getAttribute('role') === 'textbox') {
                    isValidInput = true;
                }
                
                if (isValidInput) {
                    handleSendAttempt(e, active, null);
                }
            }
        }, true);

        // Click Send intercept
        window.addEventListener("click", function (e) {
            const sendBtn = e.target.closest('[data-testid="send-button"], [class*="send-button"], button.send');
            if (sendBtn) {
                const input = document.querySelector('[contenteditable="true"]') || document.querySelector("textarea");
                if (input) {
                    handleSendAttempt(e, input, () => {
                        sendBtn.click();
                    });
                }
            }
        }, true);

        // Use MutationObserver instead of setInterval to trigger runHighlight (performance fix)
        const obs = new MutationObserver(() => {
            if (!document.hidden) {
                clearTimeout(window.hlTimer);
                window.hlTimer = setTimeout(runHighlight, 300);
            }
        });
        obs.observe(document.body, { childList: true, subtree: true });
        
        console.log("✨ LAPAK2 - Neural Shield v5.0.0 (Ultimate Edition) Loaded!");
    }

    if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
