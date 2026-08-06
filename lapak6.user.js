// ==UserScript==
// @name         LAPAK6 - LiveChat Duplicate Message Highlighter - DANGER ALERT
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  Highlight duplikat yang Jelas, Tegas, dan Berwibawa dengan Danger Alert Popup (Clean layout rules)
// @author       You
// @match        https://my.livechatinc.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=livechatinc.com
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    var style = document.createElement("style");
    style.textContent = ".spam-parent-active { position: relative !important; overflow: visible !important; }" +

        /* PRE-SEND INPUT: BOLD RED GUARD */
        ".spam-glow-alert { " +
        "border: 3px solid #ff0000 !important; " +
        "background: rgba(255, 0, 0, 0.08) !important; " +
        "box-shadow: 0 0 20px rgba(255, 0, 0, 0.4), 0 0 5px rgba(0,0,0,0.3) !important; " +
        "border-radius: 12px !important; " +
        "}" +

        /* HUD PERINGATAN: MODERN FLOATING HUD */
        ".spam-info-box { " +
        "position: absolute; bottom: calc(100% + 20px); left: 0; " +
        "width: 340px; background: #1a0000; " +
        "border: 2px solid #ff0000; border-radius: 14px; " +
        "padding: 18px; color: #ffffff; font-size: 12px; z-index: 9999999; " +
        "box-shadow: 0 15px 45px rgba(0,0,0,0.7), 0 0 10px rgba(255,0,0,0.2); " +
        "border-left: 10px solid #ff0000; " +
        "animation: slideUpHUD 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275); " +
        "pointer-events: none; " +
        "}" +
        ".spam-info-box b { color: #ff1111; display: block; margin-bottom: 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 900; }" +
        "@keyframes slideUpHUD { from { transform: translateY(20px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }" +

        /* FINAL FORM: THE SPAM ALERT BUBBLE */
        ".spam-detected-highlight { " +
        "background: #800000 !important; " +
        "background: linear-gradient(180deg, #bb0000 0%, #660000 100%) !important; " +
        "border: 2px solid #ff0000 !important; " +
        "border-left: 12px solid #ff0000 !important; " +
        "border-radius: 12px !important; " +
        "position: relative; overflow: visible !important; z-index: 100; " +
        "margin: 20px 0 20px 0 !important; " +
        "box-shadow: 0 12px 35px rgba(0,0,0,0.6), inset 0 0 20px rgba(255,0,0,0.4), 0 0 0 2px rgba(0,0,0,0.2) !important; " +
        "animation: alertPulse 2s infinite ease-in-out; " +
        "}" +

        /* FORCE WHITE TEXT ON EVERYTHING INSIDE */
        ".spam-detected-highlight, .spam-detected-highlight *, .spam-detected-highlight span, .spam-detected-highlight div { " +
        "color: #ffffff !important; " +
        "background-color: transparent !important; " +
        "text-shadow: 1px 1px 2px rgba(0,0,0,0.8) !important; " +
        "}" +

        /* SYSTEM ALERT HEADER RIBBON */
        ".spam-detected-highlight::before { " +
        "content: '⚠️ SYSTEM ALERT: DUPLICATE MESSAGE DETECTED'; " +
        "position: absolute; top: -14px; left: -10px; right: 0; " +
        "background: #ff0000; color: #ffffff !important; " +
        "font-size: 9px; font-weight: 900; padding: 2px 12px; " +
        "border-radius: 4px 4px 0 0; box-shadow: 0 -2px 10px rgba(255,0,0,0.4); " +
        "letter-spacing: 1.5px; z-index: 11; width: fit-content; " +
        "}" +

        /* POPUP DANGER ALERT MODAL STYLES */
        ".lapak2-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(5px); z-index: 99999999; display: flex; align-items: center; justify-content: center; animation: fadeInOverlay 0.25s ease-out; }" +
        ".lapak2-modal { background: linear-gradient(145deg, #220000 0%, #0d0000 100%); border: 2px solid #ff0000; box-shadow: 0 0 35px rgba(255, 0, 0, 0.6), 0 20px 50px rgba(0,0,0,0.9); border-radius: 16px; width: 440px; max-width: 90vw; padding: 24px; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; animation: popInModal 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); text-align: center; box-sizing: border-box; }" +
        ".lapak2-modal-header { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 16px; border-bottom: 1px solid rgba(255,0,0,0.3); padding-bottom: 12px; }" +
        ".lapak2-modal-icon { font-size: 32px; animation: alertPulseIcon 1.5s infinite; }" +
        ".lapak2-modal-title { font-size: 20px; font-weight: 900; letter-spacing: 2px; color: #ff3333; text-transform: uppercase; text-shadow: 0 0 10px rgba(255,0,0,0.6); }" +
        ".lapak2-modal-body { margin-bottom: 24px; text-align: center; }" +
        ".lapak2-modal-text { font-size: 16px; font-weight: 700; color: #ffffff; margin: 0 0 10px 0; line-height: 1.5; text-shadow: 0 1px 3px rgba(0,0,0,0.8); }" +
        ".lapak2-modal-subtext { font-size: 12px; color: #cccccc; margin: 0; line-height: 1.4; opacity: 0.9; }" +
        ".lapak2-modal-footer { display: flex; gap: 12px; justify-content: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 18px; }" +
        ".lapak2-btn { flex: 1; padding: 12px 18px; font-size: 14px; font-weight: 700; border-radius: 8px; cursor: pointer; border: none; transition: all 0.2s ease; display: inline-flex; align-items: center; justify-content: center; gap: 8px; outline: none; }" +
        ".lapak2-btn-edit { background: #2b2b2b; color: #ffffff; border: 1px solid #555555; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }" +
        ".lapak2-btn-edit:hover { background: #3d3d3d; border-color: #777777; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(0,0,0,0.4); }" +
        ".lapak2-btn-send { background: linear-gradient(135deg, #cc0000 0%, #880000 100%); color: #ffffff; border: 1px solid #ff3333; box-shadow: 0 4px 15px rgba(255,0,0,0.4); }" +
        ".lapak2-btn-send:hover { background: linear-gradient(135deg, #ee0000 0%, #aa0000 100%); border-color: #ff6666; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255,0,0,0.6); }" +

        "@keyframes alertPulse { 0% { border-color: #ff0000; } 50% { border-color: #ff6666; } 100% { border-color: #ff0000; } }" +
        "@keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }" +
        "@keyframes popInModal { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }" +
        "@keyframes alertPulseIcon { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }";
    document.head.appendChild(style);

    function normalizeText(text) {
        if (!text) return "";
        return text.replace(/[\s\n\r\t\u00a0.,!?;:-]/g, "").toLowerCase();
    }

    function findLastMarker(container) {
        var elements = container.querySelectorAll("*");
        var latest = null;
        var keys = ["started", "today", "dimulai", "hari ini"];
        for (var i = 0; i < elements.length; i++) {
            var el = elements[i];
            var txt = (el.textContent || "").toLowerCase();
            for (var j = 0; j < keys.length; j++) {
                if (txt.indexOf(keys[j]) !== -1 && el.children.length <= 4) {
                    var inner = (el.innerText || "").toLowerCase().trim();
                    if (inner.indexOf("started") === 0 || inner.indexOf("dimulai") === 0 || (txt.indexOf("started") !== -1 && txt.indexOf("today") !== -1)) {
                        latest = el;
                    }
                }
            }
        }
        return latest;
    }

    function getBubbles(container) {
        var blocks = container.querySelectorAll('[data-testid="agent-message"]');
        var results = [];
        for (var i = 0; i < blocks.length; i++) {
            var b = blocks[i].querySelector('[data-testid="message-text"]') || blocks[i].querySelector('div[class^="css-"]') || blocks[i].querySelector(".message__text");
            if (b) results.push(b);
        }
        return results;
    }

    function getMsgsAfter(container) {
        var marker = findLastMarker(container);
        var bubbles = getBubbles(container);
        if (!marker) return bubbles.slice(-5);
        var filtered = [];
        for (var i = 0; i < bubbles.length; i++) {
            if (marker.compareDocumentPosition(bubbles[i]) & Node.DOCUMENT_POSITION_FOLLOWING) filtered.push(bubbles[i]);
        }
        return filtered;
    }

    function runHighlight() {
        if (document.hidden) return;
        var list = document.querySelector('[data-testid="messages-list"]');
        if (!list) return;
        var all = getBubbles(list);
        for (var i = 0; i < all.length; i++) all[i].classList.remove("spam-detected-highlight");
        var active = getMsgsAfter(list);
        if (active.length < 2) return;
        var counts = {};
        for (var j = 0; j < active.length; j++) {
            var n = normalizeText(active[j].innerText || active[j].textContent);
            if (n.length >= 5) counts[n] = (counts[n] || 0) + 1;
        }
        for (var k = 0; k < active.length; k++) {
            var n2 = normalizeText(active[k].innerText || active[k].textContent);
            if (counts[n2] > 1) active[k].classList.add("spam-detected-highlight");
        }
    }

    function removeAlerts(input) {
        input.classList.remove("spam-glow-alert");
        var p = input.parentElement;
        if (p) {
            p.classList.remove("spam-parent-active");
            var f = p.querySelector(".spam-info-box"); if (f) f.remove();
        }
    }

    function applyAlerts(input) {
        input.classList.add("spam-glow-alert");
        var p = input.parentElement; if (!p) return;
        p.classList.add("spam-parent-active");
        if (!p.querySelector(".spam-info-box")) {
            var i = document.createElement("div"); i.className = "spam-info-box";
            i.innerHTML = "<b>🛡️ NEURAL SHIELD: SPAM ALERT</b>" +
                "Pesan yang Anda ketik terdeteksi 100% duplikat dengan riwayat chat hari ini. Mohon lakukan variasi kata agar tidak terblokir sistem.";
            p.appendChild(i);
        }
    }

    function checkIsDuplicate(input) {
        if (!input) return false;
        var raw = input.innerText || input.value || "";
        if (raw.trim().indexOf("#") === 0) return false;
        var norm = normalizeText(raw);
        if (norm.length < 5) return false;
        var list = document.querySelector('[data-testid="messages-list"]') || document.body;
        var active = getMsgsAfter(list);
        var sentNorms = [];
        for (var i = 0; i < active.length; i++) sentNorms.push(normalizeText(active[i].innerText || active[i].textContent));
        return sentNorms.indexOf(norm) !== -1;
    }

    function checkPre() {
        var input = document.querySelector('[contenteditable="true"]') || document.querySelector("textarea");
        if (!input) return;
        if (checkIsDuplicate(input)) {
            applyAlerts(input);
        } else {
            removeAlerts(input);
        }
    }

    /* DANGER ALERT POPUP MODAL SYSTEM */
    var bypassDuplicate = false;

    function showDangerAlertPopup(input, onSendAnyway) {
        if (document.getElementById("lapak2-danger-overlay")) return;

        var overlay = document.createElement("div");
        overlay.id = "lapak2-danger-overlay";
        overlay.className = "lapak2-overlay";

        var modal = document.createElement("div");
        modal.className = "lapak2-modal";

        modal.innerHTML =
            '<div class="lapak2-modal-header">' +
                '<span class="lapak2-modal-icon">🚨</span>' +
                '<span class="lapak2-modal-title">DANGER ALERT</span>' +
            '</div>' +
            '<div class="lapak2-modal-body">' +
                '<p class="lapak2-modal-text">Pesan yang Anda ketik terdeteksi 100% duplikat</p>' +
                '<p class="lapak2-modal-subtext">Mengirim pesan duplikat berisiko tinggi terdeteksi spam oleh sistem. Silakan pilih tindakan Anda:</p>' +
            '</div>' +
            '<div class="lapak2-modal-footer">' +
                '<button id="lapak2-btn-edit" class="lapak2-btn lapak2-btn-edit">✏️ Edit Pesan</button>' +
                '<button id="lapak2-btn-send" class="lapak2-btn lapak2-btn-send">⚠️ Tetap Kirim</button>' +
            '</div>';

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        function closeModal() {
            if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }

        document.getElementById("lapak2-btn-edit").addEventListener("click", function () {
            closeModal();
            if (input) input.focus();
        });

        document.getElementById("lapak2-btn-send").addEventListener("click", function () {
            closeModal();
            if (typeof onSendAnyway === "function") {
                onSendAnyway();
            }
        });

        // Close on Escape or backdrop click
        overlay.addEventListener("click", function (e) {
            if (e.target === overlay) {
                closeModal();
                if (input) input.focus();
            }
        });

        var handleKeydown = function (e) {
            if (e.key === "Escape") {
                closeModal();
                if (input) input.focus();
                document.removeEventListener("keydown", handleKeydown);
            }
        };
        document.addEventListener("keydown", handleKeydown);
    }

    function handleSendAttempt(e, input, triggerSendFn) {
        if (bypassDuplicate) {
            return;
        }
        if (checkIsDuplicate(input)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            showDangerAlertPopup(input, function () {
                bypassDuplicate = true;
                if (typeof triggerSendFn === "function") {
                    triggerSendFn();
                } else if (input) {
                    input.focus();
                    var enterEvt = new KeyboardEvent("keydown", {
                        key: "Enter",
                        code: "Enter",
                        keyCode: 13,
                        which: 13,
                        bubbles: true,
                        cancelable: true
                    });
                    input.dispatchEvent(enterEvt);
                }
                setTimeout(function () {
                    bypassDuplicate = false;
                }, 500);
            });
        }
    }

    // Intercept Enter keydown on chat input field (capturing phase)
    window.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey && !e.isComposing && !e.altKey) {
            var input = document.querySelector('[contenteditable="true"]') || document.querySelector("textarea");
            if (input && (document.activeElement === input || input.contains(document.activeElement))) {
                handleSendAttempt(e, input, null);
            }
        }
    }, true);

    // Intercept Click on Send Button
    window.addEventListener("click", function (e) {
        var sendBtn = e.target.closest('[data-testid="send-button"], [class*="send-button"], button.send');
        if (sendBtn) {
            var input = document.querySelector('[contenteditable="true"]') || document.querySelector("textarea");
            if (input) {
                handleSendAttempt(e, input, function () {
                    sendBtn.click();
                });
            }
        }
    }, true);

    setInterval(function () {
        runHighlight();
        checkPre();
    }, 1000);
})();
