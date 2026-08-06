// ==UserScript==
// @name         LAPAK3 - Wallpaper & Queue Indicator (ULTIMATE EDITION)
// @namespace    http://tampermonkey.net/
// @version      5.0.0
// @description  Wallpaper Manga + Left-Bar Pulse + Accent Toast + Global Unresponded Alert + Fixed Sidebars
// @author       RKD Suite
// @match        https://my.livechatinc.com/*
// @icon         https://www.livechat.com/favicon.ico
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ====== Konfigurasi ======
    const WALLPAPER_URL = 'https://i.pinimg.com/1200x/60/5c/43/605c430a1aacae5c4ab829e1acb73b4e.jpg';
    let wallpaperActive = true;

    const BLINK_DELAY_MS = 180000; // 3 menit (Merah Berkedip + ⚠️)
    const YELLOW_THRESHOLD_MS = 120000; // 2 menit (Kuning Diam)
    const TOAST_LIFETIME_MS = 180000;
    const TOAST_ACCENT_COLOR = '#ffcc00'; // Amber/Gold (Lebih Jelas di Putih)
    const TOAST_ACCENT_COLOR_RED = '#ff0000'; // aksen merah terang
    const TOAST_ACCENT_COLOR_BLUE = '#011d47ff'; // Biru Jeans Tua
    const LEFTBAR_WIDTH_PX = 4; // ketebalan garis kiri
    const TAG_RAINBOW = 'rainbow'; // 🌈 mode pelangi

    const SLA_NOTIF_2MIN_KEY = 'slaNotif2minEnabled';
    const SLA_NOTIF_3MIN_KEY = 'slaNotif3minEnabled';

    const calmingQuotes = [
        "Tarik napas dulu, balas satu per satu ya bosku! ☕",
        "Tenang bosku, santai saja yang penting ramah & jos! 🌟",
        "Jangan terburu-buru, santai saja. Member pasti sabar menunggu! 😊",
        "Fokus satu per satu ya, pelan tapi pasti! Semangat bosku! 💪",
        "Kerja santai tapi pasti, utamakan ramah tamah. Kamu pasti bisa! 👑"
    ];

    const archTags = [
        'archived', 'customer left', 'inactivity', 'meninggalkan',
        'followup', 'sent to', 'joined', 'assigned', 'invited', 'closed',
        'transferred', 'ditransfer'
    ];

    // =======================================
    // Utils & Global Alert logic
    // =======================================
    function getSidebarContainer() {
        try {
            const navBar = document.querySelector('nav, [class*="navigation"], [class*="Navigation"], [data-testid="navigation"]');
            if (navBar) {
                let sib = navBar.nextElementSibling;
                while (sib) {
                    const rect = sib.getBoundingClientRect();
                    if (rect.width >= 150 && rect.width <= 650 && rect.height > 400) return sib;
                    sib = sib.nextElementSibling;
                }
            }
            const messagesList = document.querySelector('[data-testid="messages-list"], [class*="MessagesList"]');
            if (messagesList) {
                let parent = messagesList.parentElement;
                while (parent && parent !== document.body) {
                    const siblings = Array.from(parent.parentElement?.children || []);
                    if (siblings.length >= 2) {
                        const myIndex = siblings.indexOf(parent);
                        if (myIndex > 0) {
                            const leftSibling = siblings[myIndex - 1];
                            const rect = leftSibling.getBoundingClientRect();
                            if (rect.width >= 150 && rect.width <= 650 && rect.height > 400) return leftSibling;
                        }
                    }
                    parent = parent.parentElement;
                }
            }
        } catch(e) {}
        return document.body;
    }

    function updateUnrespondedAlert(count) {
        let alertBox = document.getElementById('lc-unresponded-alert');
        if (!alertBox) {
            alertBox = document.createElement('div');
            alertBox.id = 'lc-unresponded-alert';
            const container = getSidebarContainer();
            if (container) {
                const style = window.getComputedStyle(container);
                if (style.position === 'static') container.style.position = 'relative';
                container.appendChild(alertBox);
            } else {
                document.body.appendChild(alertBox);
            }
        }
        
        if (count > 0) {
            const container = getSidebarContainer();
            if (container && alertBox.parentElement !== container) {
                const style = window.getComputedStyle(container);
                if (style.position === 'static') container.style.position = 'relative';
                container.appendChild(alertBox);
            }

            if (count >= 5) {
                if (!window.currentCalmingQuote) window.currentCalmingQuote = calmingQuotes[Math.floor(Math.random() * calmingQuotes.length)];
                alertBox.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 900; line-height: 1.2;">
                    <svg viewBox="0 0 24 24" width="20" height="20" style="vertical-align: middle; flex-shrink: 0; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.5));">
                        <path d="M12 2L2 22h20L12 2z" fill="#ff9800" stroke="#000000" stroke-width="2.5" stroke-linejoin="round"></path>
                        <path d="M12 9v6" stroke="#000000" stroke-width="3" stroke-linecap="round"></path>
                        <circle cx="12" cy="18" r="2" fill="#000000"></circle>
                    </svg>
                    <span>ADA ${count} CHAT <span style="color: #ffea00; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">BELUM DIRESPON!</span></span>
                </div>
                <div style="font-size: 11.5px; color: #a7f3d0; margin-top: 6px; font-weight: 700; text-transform: none; letter-spacing: 0.3px; border-top: 1px solid rgba(255, 255, 255, 0.3); padding-top: 6px; width: 100%;">
                    ${window.currentCalmingQuote}
                </div>`;
            } else {
                window.currentCalmingQuote = null;
                alertBox.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 900; line-height: 1.2;">
                    <svg viewBox="0 0 24 24" width="20" height="20" style="vertical-align: middle; flex-shrink: 0; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.5));">
                        <path d="M12 2L2 22h20L12 2z" fill="#ff9800" stroke="#000000" stroke-width="2.5" stroke-linejoin="round"></path>
                        <path d="M12 9v6" stroke="#000000" stroke-width="3" stroke-linecap="round"></path>
                        <circle cx="12" cy="18" r="2" fill="#000000"></circle>
                    </svg>
                    <span>ADA ${count} CHAT <span style="color: #ffea00; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">BELUM DIRESPON!</span></span>
                </div>`;
            }
            alertBox.classList.add('show');
        } else {
            window.currentCalmingQuote = null;
            alertBox.classList.remove('show');
        }
    }

    const detectIsTyping = (item) => {
        if (!item) return false;
        const typingEl = item.querySelector(
            '[class*="typing"], [class*="dots"], [data-test*="typing"], [data-testid*="typing"], ' +
            '.typing-indicator, [aria-label*="typing"], [class*="lc-dots"], [class*="lc-typing"], ' +
            'img[src*="typing"], .css-14v0z1c, [class*="DotIndicator"], [class*="ThreeDots"], ' +
            '[class*="LoadingDots"], [class*="typing_dots"], [class*="DotAnimation"]'
        ) || item.querySelector('svg[class*="typing"], svg[class*="dots"], svg[aria-label*="typing"]') ||
        item.querySelector('.chat-item__message--typing, .lc-typing-indicator');
        return !!typingEl;
    };

    const isNotif2minEnabled = () => localStorage.getItem(SLA_NOTIF_2MIN_KEY) !== 'false';
    const isNotif3minEnabled = () => localStorage.getItem(SLA_NOTIF_3MIN_KEY) !== 'false';

    const getActiveChatId = () => {
        const selectedLi = document.querySelector('li[data-testid^="chat-item-"][aria-selected="true"], li[class*="selected"], li[class*="active"]');
        if (selectedLi) {
            const tid = selectedLi.getAttribute('data-testid') || '';
            const m = tid.match(/chat-item-([^/]+)/i);
            if (m) return m[1];
        }
        const m = location.pathname.match(/\/chats\/(?:[^/]+\/)?([^/]+)/i);
        return m ? m[1] : null;
    };

    const manuallyRepliedIds = new Map();
    const handleManualReply = () => {
        const activeId = getActiveChatId();
        if (activeId) {
            manuallyRepliedIds.set(activeId, Date.now());
            unrepliedStartTimes.delete(activeId);
            saveUnrepliedTimers();
            const item = findItemByChatId(activeId);
            if (item) {
                item.classList.remove('blink-red', 'is-red', 'blink-yellow');
                item.classList.add('replied-instant');
                delete item.dataset.redToastShown;
                delete item.dataset.yellowToastShown;
                removeWarningBadge(item);
            }
            updateLiveToastIndices();
        }
    };

    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-testid="send-button"], [class*="send-button"], button.send')) {
            handleManualReply();
        }
    }, true);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
            if (document.activeElement.matches('[data-testid="message-input"], [contenteditable="true"], textarea')) {
                handleManualReply();
            }
        }
    }, true);

    const findItemByChatId = (chatId) => {
        if (!chatId) return null;
        const li = document.querySelector(`li[data-testid="chat-item-${chatId}"]`);
        return li ? (li.querySelector('.chat-item') || li) : null;
    };

    const getChatIdFromItem = (item) => {
        if (!item) return null;
        if (item.dataset.chatId) return item.dataset.chatId;
        const holder = item.closest('li[data-testid^="chat-item-"]') || item;
        const tid = holder.getAttribute('data-testid') || '';
        const m = tid.match(/chat-item-([^/]+)/i);
        if (m) { item.dataset.chatId = m[1]; return m[1]; }
        const a = item.querySelector('a[href*="/chats/"]');
        if (a) {
            const m2 = (a.getAttribute('href') || '').match(/\/chats\/(?:[^/]+\/)?([^/]+)/i);
            if (m2) { item.dataset.chatId = m2[1]; return m2[1]; }
        }
        return null;
    };

    const getCurrentChatItem = () => findItemByChatId(getActiveChatId());
    const storageKeyForItem = (item) => {
        const id = getChatIdFromItem(item);
        return id ? `chat-toggle-${id}` : null;
    };

    const saveColor = (item, token) => {
        const key = storageKeyForItem(item);
        if (key) {
            GM_setValue(key, token);
            localStorage.setItem(key, token);
        }
    };
    const getSavedColor = (item) => {
        const key = storageKeyForItem(item);
        if (!key) return null;
        let val = GM_getValue(key);
        if (val === undefined) {
            val = localStorage.getItem(key);
            if (val) GM_setValue(key, val);
        }
        return val;
    };
    const clearSavedColor = (item) => {
        const key = storageKeyForItem(item);
        if (key) {
            GM_deleteValue(key);
            localStorage.removeItem(key);
        }
    };

    // ====== Toast ======
    const ensureToastHost = () => {
        let host = document.querySelector('.my-toast-host');
        if (!host) {
            host = document.createElement('div');
            host.className = 'my-toast-host';
            document.body.appendChild(host);
        }
        return host;
    };

    const showToast = (message, accent = TOAST_ACCENT_COLOR, chatId = null, duration = TOAST_LIFETIME_MS, onUserClose = null) => {
        const host = ensureToastHost();
        const existingToast = host.querySelector(`.my-toast[data-chat-id="${chatId}"]`);
        if (chatId && existingToast) {
            const msgSpan = existingToast.querySelector('.my-toast-msg');
            if (msgSpan) {
                if (message.includes('#')) {
                    const parts = message.split(/#\d+/);
                    msgSpan.innerHTML = `${parts[0]}#<span class="live-idx">?</span>${parts[1] || ''}`;
                } else {
                    msgSpan.textContent = message;
                }
            }
            existingToast.style.setProperty('--toast-accent', accent);
            updateLiveToastIndices();
            return;
        }

        const toast = document.createElement('div');
        toast.className = 'my-toast';
        if (chatId) {
            toast.dataset.chatId = chatId;
            toast.style.cursor = 'pointer';
        }
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.style.setProperty('--toast-accent', accent);

        const msg = document.createElement('span');
        msg.className = 'my-toast-msg';

        if (message.includes('#')) {
            const parts = message.split(/#\d+/);
            msg.innerHTML = `${parts[0]}#<span class="live-idx">?</span>${parts[1] || ''}`;
        } else {
            msg.textContent = message;
        }

        const btn = document.createElement('button');
        btn.className = 'my-toast-close';
        btn.innerHTML = '×';

        toast.appendChild(msg);
        toast.appendChild(btn);
        host.appendChild(toast);

        if (chatId) updateLiveToastIndices();

        const close = (isUserAction = false) => {
            if (isUserAction && onUserClose) onUserClose();
            if (chatId) {
                const itm = findItemByChatId(chatId);
                if (itm) {
                    delete itm.dataset.redToastShown;
                    delete itm.dataset.yellowToastShown;
                }
            }
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 200);
        };

        toast.addEventListener('click', () => {
            if (chatId) {
                const item = findItemByChatId(chatId);
                if (item) {
                    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    item.click();
                }
            }
            close(false);
        });

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            close(true);
        });

        setTimeout(() => { if (toast.parentElement) close(false); }, duration);
    };

    const bootTime = Date.now(); 
    const UNREPLIED_STORAGE_KEY = 'chatUnrepliedStartTimes';
    const initUnrepliedMap = () => {
        let saved = GM_getValue(UNREPLIED_STORAGE_KEY);
        if (saved === undefined) {
            saved = localStorage.getItem(UNREPLIED_STORAGE_KEY);
            if (saved) {
                try {
                    const obj = JSON.parse(saved);
                    GM_setValue(UNREPLIED_STORAGE_KEY, obj);
                    return new Map(Object.entries(obj).map(([id, time]) => [id, Number(time)]));
                } catch (e) { return new Map(); }
            }
            return new Map();
        }
        return new Map(Object.entries(saved).map(([id, time]) => [id, Number(time)]));
    };

    const yellowTimers = new Map();
    const unrepliedStartTimes = initUnrepliedMap();

    const saveUnrepliedTimers = () => {
        const obj = {};
        unrepliedStartTimes.forEach((v, k) => obj[k] = v);
        GM_setValue(UNREPLIED_STORAGE_KEY, obj);
        localStorage.setItem(UNREPLIED_STORAGE_KEY, JSON.stringify(obj)); 
    };

    const setYellowTimer = (item, enable) => {
        const chatId = getChatIdFromItem(item);
        if (!chatId) return;
        if (yellowTimers.has(chatId)) {
            clearTimeout(yellowTimers.get(chatId));
            yellowTimers.delete(chatId);
        }
        const currentNode = findItemByChatId(chatId);
        if (currentNode) currentNode.classList.remove('blink-yellow');
        if (enable) {
            const tid = setTimeout(() => {
                const node = findItemByChatId(chatId);
                const stillYellow = node && getSavedColor(node) === 'yellow';
                if (stillYellow) {
                    node.classList.add('blink-yellow');
                    showToast(`⏳ Cek chat ditandai (kuning) • #1`, TOAST_ACCENT_COLOR, chatId);
                }
                yellowTimers.delete(chatId);
            }, BLINK_DELAY_MS);
            yellowTimers.set(chatId, tid);
        }
    };

    const addWarningBadge = (item) => {
        if (item.querySelector('.warning-badge-3min')) return;
        const badge = document.createElement('div');
        badge.className = 'warning-badge-3min';
        badge.innerHTML = '⚠️';
        item.style.position = 'relative';
        item.appendChild(badge);
    };

    const removeWarningBadge = (item) => {
        const badge = item.querySelector('.warning-badge-3min');
        if (badge) badge.remove();
    };

    const setRedBlinkState = (item, isRed) => {
        const chatId = getChatIdFromItem(item);
        if (!chatId) return;

        const hasReplyIcon = !!(
            item.querySelector('[data-testid="replied"]') ||
            item.querySelector('svg[data-testid="Icon--reply"]') ||
            item.querySelector('.chat-item__replied')
        );
        const hasUnread = !!item.querySelector('[data-testid="unread-messages-count"]');
        const isActive = (chatId === getActiveChatId());

        const hasReply = !!hasReplyIcon;

        if (hasReply || hasUnread) {
            manuallyRepliedIds.delete(chatId);
            item.classList.remove('replied-instant');
            delete item.dataset.redToastSuppressed;
            delete item.dataset.yellowToastSuppressed;
        }

        if (isActive && manuallyRepliedIds.has(chatId)) {
            const allMsgs = document.querySelectorAll('[data-testid="agent-message"], [data-testid="customer-message"]');
            if (allMsgs.length > 0) {
                const last = allMsgs[allMsgs.length - 1];
                if (last.getAttribute('data-testid') === 'customer-message') {
                    manuallyRepliedIds.delete(chatId);
                }
            }
        }

        if (manuallyRepliedIds.has(chatId)) {
            const replyTime = manuallyRepliedIds.get(chatId);
            if (Date.now() - replyTime > 30000) manuallyRepliedIds.delete(chatId);
        }

        if (manuallyRepliedIds.has(chatId) && !hasReply) {
            item.classList.remove('blink-red', 'is-red', 'blink-yellow');
            removeWarningBadge(item);
            return;
        }

        const itemText = (item.textContent || "").toLowerCase();
        const isArchived = archTags.some(function (tag) { return itemText.indexOf(tag) !== -1; });
        const isTyping = detectIsTyping(item);

        if (isTyping) {
            if (!unrepliedStartTimes.has(chatId)) {
                item.classList.remove('blink-red', 'is-red', 'blink-yellow');
                delete item.dataset.redToastShown;
                delete item.dataset.yellowToastShown;
                removeWarningBadge(item);
                return;
            }
        }

        if (hasReply || isArchived) {
            if (unrepliedStartTimes.has(chatId)) {
                unrepliedStartTimes.delete(chatId);
                saveUnrepliedTimers();
            }
            item.classList.remove('blink-red', 'is-red', 'blink-yellow');
            delete item.dataset.redToastShown;
            delete item.dataset.yellowToastShown;
            delete item.dataset.redToastSuppressed;
            delete item.dataset.yellowToastSuppressed;
            removeWarningBadge(item);
            return;
        }

        const isTransferred = itemText.includes('transferred') || itemText.includes('ditransfer');
        const isRichMessage = itemText.includes('sent a rich message') || itemText.includes('mengirim pesan');
        const isAgentAction = isRichMessage || (/^[a-z0-9]+\s+[a-z0-9]+\s+sent/i.test(itemText)) || itemText.includes('you:');

        if (!unrepliedStartTimes.has(chatId) && (hasUnread || (!hasReplyIcon && !isTransferred && !isAgentAction))) {
            unrepliedStartTimes.set(chatId, Date.now());
            saveUnrepliedTimers();
        }

        const startTime = unrepliedStartTimes.get(chatId);
        if (!startTime) {
            item.classList.remove('blink-red', 'is-red', 'blink-yellow');
            return;
        }

        const elapsed = Date.now() - startTime;

        if (elapsed >= BLINK_DELAY_MS) {
            item.classList.add('is-red', 'blink-red');
            item.classList.remove('blink-yellow');
            addWarningBadge(item);

            if (!isActive && !item.dataset.redToastShown && !item.dataset.redToastSuppressed && isNotif3minEnabled()) {
                showToast(`🚨 3 MENIT: Belum Dibalas (#1)`, TOAST_ACCENT_COLOR_RED, chatId, TOAST_LIFETIME_MS, () => {
                    item.dataset.redToastSuppressed = '1';
                });
                item.dataset.redToastShown = '1';
            }
        } else if (elapsed >= YELLOW_THRESHOLD_MS) {
            item.classList.add('is-red', 'blink-yellow');
            item.classList.remove('blink-red');
            removeWarningBadge(item);

            if (!isActive && !item.dataset.yellowToastShown && !item.dataset.yellowToastSuppressed && isNotif2minEnabled()) {
                showToast(`⚡ 2 MENIT: Segera Balas (#1)`, TOAST_ACCENT_COLOR, chatId, TOAST_LIFETIME_MS, () => {
                    item.dataset.yellowToastSuppressed = '1';
                });
                item.dataset.yellowToastShown = '1';
            }
        } else {
            item.classList.add('is-red');
            item.classList.remove('blink-red', 'blink-yellow');
            removeWarningBadge(item);
            delete item.dataset.redToastShown;
            delete item.dataset.yellowToastShown;
            delete item.dataset.redToastSuppressed;
            delete item.dataset.yellowToastSuppressed;
        }
    };

    const updateLiveToastIndices = () => {
        const toasts = document.querySelectorAll('.my-toast[data-chat-id]');
        const allItems = Array.from(document.querySelectorAll('.chat-item'));

        toasts.forEach(toast => {
            const chatId = toast.dataset.chatId;
            const item = findItemByChatId(chatId);
            const itemText = item ? (item.textContent || "").toLowerCase() : "";
            const isArchived = archTags.some(function (tag) { return itemText.indexOf(tag) !== -1; });
            const hasTimer = unrepliedStartTimes.has(chatId);
            const isActive = (chatId === getActiveChatId()); 

            if (!item || !hasTimer || isArchived || isActive) {
                if (!toast.classList.contains('hide')) {
                    if (item) {
                        delete item.dataset.redToastShown;
                        delete item.dataset.yellowToastShown;
                    }
                    toast.classList.add('hide');
                    setTimeout(() => toast.remove(), 200);
                }
            } else {
                const liveIdxSpan = toast.querySelector('.live-idx');
                if (liveIdxSpan && item) {
                    const currentIdx = allItems.indexOf(item) + 1;
                    if (currentIdx > 0) liveIdxSpan.textContent = currentIdx;
                }
            }
        });
    };

    const applySingleChatStyling = (item) => {
        const chatId = getChatIdFromItem(item);
        if (!chatId) return;

        const hasReplyIcon = !!item.querySelector('[data-testid="replied"]');
        const hasUnread = !!item.querySelector('[data-testid="unread-messages-count"]');
        const itemText = (item.textContent || "").toLowerCase();

        const isLeft = archTags.some(function (tag) { return itemText.indexOf(tag) !== -1; });
        const isTransferred = itemText.includes('transferred') || itemText.includes('ditransfer');
        const isRichMessage = itemText.includes('sent a rich message') || itemText.includes('mengirim pesan');
        const isAgentAction = isRichMessage || (/^[a-z0-9]+\s+[a-z0-9]+\s+sent/i.test(itemText)) || itemText.includes('you:');

        const hasReply = !!hasReplyIcon || isAgentAction;
        const isTyping = detectIsTyping(item);
        const saved = getSavedColor(item);
        let startTime = unrepliedStartTimes.get(chatId);
        const now = Date.now();

        if (startTime && (now - startTime > 1800000)) {
            unrepliedStartTimes.delete(chatId);
            startTime = null;
            saveUnrepliedTimers();
        }

        const elapsed = startTime ? (now - startTime) : 0;
        let leftColor = '#ff0000'; 
        let isRedState = false;

        if ((isTransferred || isAgentAction) && !hasUnread && unrepliedStartTimes.has(chatId)) {
            unrepliedStartTimes.delete(chatId);
            saveUnrepliedTimers();
            startTime = null;
        }

        const isSlaAlert = (hasUnread || (unrepliedStartTimes.has(chatId) && !hasReply)) && (elapsed >= YELLOW_THRESHOLD_MS);

        if (isLeft) {
            item.classList.remove('is-typing', 'blink-red', 'is-red', 'blink-yellow');
            leftColor = '#011635ff';
            isRedState = false;
        } else if (isSlaAlert) {
            item.classList.remove('is-typing');
            isRedState = true;
            leftColor = (elapsed >= BLINK_DELAY_MS) ? '#ff0000' : '#ffb300';
        } else if (isTyping) {
            item.classList.add('is-typing');
            leftColor = 'transparent';
            isRedState = false;
        } else if (saved === 'yellow') {
            item.classList.remove('is-typing');
            leftColor = '#ffb300';
        } else if (saved === 'black') {
            item.classList.remove('is-typing');
            leftColor = '#021736ff';
        } else if (hasUnread || (unrepliedStartTimes.has(chatId) && !hasReply)) {
            item.classList.remove('is-typing');
            isRedState = true;
            leftColor = '#ff0000';
        } else {
            item.classList.remove('is-typing', 'blink-red', 'is-red', 'blink-yellow');
            leftColor = '#00a300';
        }

        const hexToRgb = (hex) => {
            let h = (hex || '').replace('#', '').trim();
            if (h.length === 3) h = h.split('').map(c => c + c).join('');
            const n = parseInt(h, 16);
            return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
        };

        const { r, g, b } = hexToRgb(leftColor);
        item.style.setProperty('--leftbar-color', leftColor);
        item.style.setProperty('--leftbar-rgb', `${r}, ${g}, ${b}`);
        item.style.setProperty('--leftbar-w', `${LEFTBAR_WIDTH_PX}px`);
        item.classList.add('mp-lined');
        item.classList.toggle('rainbow', saved === TAG_RAINBOW);

        if (getComputedStyle(item).position === 'static') item.style.position = 'relative';

        item.style.backgroundColor = '';
        item.style.color = '';

        setRedBlinkState(item, isRedState);
    };

    const applyAllChatStyling = () => {
        const allItems = document.querySelectorAll('.chat-item');
        allItems.forEach(item => applySingleChatStyling(item));

        let totalUnresponded = 0;
        Array.from(allItems).forEach(item => {
            const chatId = getChatIdFromItem(item);
            const hasReplyIcon = item.querySelector('[data-testid="replied"]');
            const itemText = (item.textContent || "").toLowerCase();
            const isTransferred = itemText.includes('transferred') || itemText.includes('ditransfer');
            const isReplied = !!hasReplyIcon;
            const isArchived = archTags.some(function (tag) { return itemText.indexOf(tag) !== -1; });
            const isTyping = detectIsTyping(item);
            const isBlackToggled = getSavedColor(item) === 'black';
            const isYellowToggled = getSavedColor(item) === 'yellow';

            if (!isReplied && !isTransferred && !isArchived && !isTyping && !isBlackToggled && !isYellowToggled && unrepliedStartTimes.has(chatId)) {
                totalUnresponded++;
            }
        });
        updateUnrespondedAlert(totalUnresponded);
    };

    function runPeriodicChecker() {
        if (document.hidden) return;
        const allItems = document.querySelectorAll('.chat-item');
        const activeIds = new Set();
        allItems.forEach(item => {
            const id = getChatIdFromItem(item);
            if (id) activeIds.add(id);
            applySingleChatStyling(item);
        });

        const isBooting = (Date.now() - bootTime < 10000);
        let isChanged = false;
        if (!isBooting && activeIds.size > 0) {
            unrepliedStartTimes.forEach((v, k) => {
                if (!activeIds.has(k)) {
                    unrepliedStartTimes.delete(k);
                    isChanged = true;
                }
            });
            if (isChanged) saveUnrepliedTimers();
        }
        updateLiveToastIndices();
    }
    
    // Interval for dynamic DOM and timer updates
    setInterval(runPeriodicChecker, 500);

    // =======================================
    // WALLPAPER MANGA STYLES (v4.9.0)
    // =======================================
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

    // =======================================
    // STYLES INJECTION
    // =======================================
    const injectMinimalStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
        /* —— Unresponded Alert Box —— */
        #lc-unresponded-alert {
            position: absolute; bottom: 120px; left: 50%; transform: translateX(-50%);
            width: 300px; box-sizing: border-box; background: linear-gradient(135deg, #d32f2f, #b71c1c);
            border: 2px solid #ff3333; box-shadow: 0 4px 15px rgba(0,0,0,0.5), 0 0 10px rgba(211, 47, 47, 0.4);
            border-radius: 10px; padding: 14px 12px; color: #ffffff;
            font-family: 'Outfit', 'Segoe UI', sans-serif; font-size: 12.5px; font-weight: 900;
            text-transform: uppercase; letter-spacing: 0.6px; z-index: 9999;
            display: none; flex-direction: column; align-items: center; gap: 8px; text-align: center;
            pointer-events: none; animation: alertGlowPulse 1.2s infinite alternate;
        }
        #lc-unresponded-alert.show { display: flex; }
        @keyframes alertGlowPulse {
            0%, 100% { opacity: 1; box-shadow: 0 4px 15px rgba(0,0,0,0.4), 0 0 15px rgba(239, 68, 68, 0.7); }
            50% { opacity: 0.75; box-shadow: 0 4px 15px rgba(0,0,0,0.2), 0 0 5px rgba(239, 68, 68, 0.2); }
        }
        
        /* —— Garis kiri seragam —— */
        .chat-item.mp-lined::before {
            content:""; position:absolute; left:0; top:0; bottom:0;
            width: var(--leftbar-w, 4px); background: var(--leftbar-color, currentColor);
            border-radius: 0; transform-origin:left center; z-index: 10; pointer-events: none;
            transition: background 0.4s ease, border-color 0.4s ease, transform 0.3s ease;
            box-shadow: 1px 0 4px rgba(0,0,0,0.4), inset -1px 0 0 rgba(0,0,0,0.1);
        }
        @keyframes leftBarPulseRed {
            0%,100% { transform: scaleX(1); }
            50% { transform: scaleX(4.6); }
        }
        @keyframes leftBarPulseYellow {
            0%,100% { transform: scaleX(1); opacity: 1; }
            50% { transform: scaleX(2.5); opacity: 0.7; }
        }
        .chat-item.blink-red::before { animation: leftBarPulseRed .7s ease-in-out infinite; }
        .chat-item.blink-yellow::before { animation: leftBarPulseYellow 2s ease-in-out infinite; }
        
        /* —— Toast host & card —— */
        .my-toast-host {
            position: fixed; bottom: 20px; left: 65px; display: flex; flex-direction: column-reverse;
            gap: 10px; z-index: 99999; pointer-events: none; width: max-content; max-width: calc(100vw - 77px);
        }
        .my-toast {
            position: relative; pointer-events: auto; cursor: pointer; display: inline-flex; align-items: center;
            gap: 10px; padding: 12px 36px 12px 16px; border-radius: 12px; background: rgba(15, 15, 20, 0.98);
            color: #ffffff; border: 2px solid var(--toast-accent, ${TOAST_ACCENT_COLOR});
            box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 10px rgba(0,0,0,0.2); width: 280px; max-width: 280px;
            overflow: hidden; animation: toastIn 160ms ease-out both;
        }
        .my-toast::before {
            content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
            background: var(--toast-accent, ${TOAST_ACCENT_COLOR}); border-radius: 2px 0 0 2px;
        }
        .my-toast .my-toast-msg { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px; line-height: 1.25; padding-right: 6px; }
        .my-toast .my-toast-close {
            position: absolute; right: 8px; top: 8px; width: 24px; height: 24px; border-radius: 6px;
            border: 1px solid var(--toast-accent, ${TOAST_ACCENT_COLOR}); background: transparent;
            color: var(--toast-accent, ${TOAST_ACCENT_COLOR}); font-size: 16px; display: grid; place-items: center;
        }
        .my-toast .my-toast-close:hover { background: rgba(255,255,255,0.06); }
        .my-toast.hide { animation: toastOut 140ms ease-in both; }
        
        @keyframes toastIn { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
        @keyframes toastOut { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(8px) scale(.98); } }
        
        /* 🌈 Mode Rainbow */
        .chat-item.mp-lined.rainbow::before {
            background: linear-gradient(90deg, red, orange, yellow, green, blue, indigo, violet);
            background-size: 400% 100%; animation: rainbowPulse 3s linear infinite;
        }
        @keyframes rainbowPulse { 0% { background-position: 0% 50%; } 100% { background-position: 400% 50%; } }
        @keyframes rainbowBar {
            0% { background: #00ff00; } 20% { background: #00ffff; } 40% { background: #0000ff; }
            60% { background: #ff00ff; } 80% { background: #ffff00; } 100% { background: #00ff00; }
        }
        .chat-item.is-typing::before { animation: rainbowBar 1s linear infinite !important; width: 6px !important; box-shadow: 0 0 10px rgba(0, 255, 0, 0.5); }
        
        /* —— Warning Badge —— */
        .warning-badge-3min {
            position: absolute; right: 8px; bottom: 8px; font-size: 20px; z-index: 100;
            filter: drop-shadow(0 0 5px rgba(255, 255, 0, 0.8)) drop-shadow(0 2px 5px rgba(0,0,0,0.6));
            animation: badgePulse 0.8s ease-in-out infinite; user-select: none; pointer-events: none;
        }
        @keyframes badgePulse {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(255, 255, 0, 0.8)) drop-shadow(0 2px 5px rgba(0,0,0,0.6)); }
            50% { transform: scale(1.4); filter: drop-shadow(0 0 15px rgba(255, 255, 0, 1)) drop-shadow(0 4px 8px rgba(0,0,0,0.8)); }
        }
        `;
        document.head.appendChild(style);
    };

    // =========================
    // KEYBINDS (Hotkeys)
    // =========================
    document.addEventListener('keydown', (e) => {
        // Navigasi (Alt+↑ / Alt+↓)
        if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            const chats = Array.from(document.querySelectorAll('.chat-item')).filter(item => {
                const isReplied = item.querySelector('[data-testid="replied"]');
                const itemText = (item.textContent || "").toLowerCase();
                const isArchived = archTags.some(function (tag) { return itemText.indexOf(tag) !== -1; });
                const isBlackToggled = getSavedColor(item) === 'black';
                const isYellowToggled = getSavedColor(item) === 'yellow';
                const isTyping = detectIsTyping(item);
                return !isReplied && !isArchived && !isBlackToggled && !isYellowToggled && !isTyping;
            });
            if (chats.length === 0) return;
            let currentFocus = chats.findIndex(c => c.closest('li[aria-selected="true"], li.active, li.selected'));
            if (currentFocus === -1) currentFocus = 0;
            else {
                if (e.key === 'ArrowDown') currentFocus = (currentFocus + 1) % chats.length;
                if (e.key === 'ArrowUp') currentFocus = (currentFocus - 1 + chats.length) % chats.length;
            }
            const chatToFocus = chats[currentFocus];
            if (chatToFocus) {
                chatToFocus.scrollIntoView({ behavior: 'smooth', block: 'center' });
                chatToFocus.click();
            }
        }
        
        // Rainbow/Black toggle (Ctrl+. / Alt+/)
        const isRainbow = e.ctrlKey && (e.key === '.' || e.code === 'Period');
        const isBlack = e.altKey && (e.key === '/' || e.code === 'Slash' || e.code === 'NumpadDivide');
        if (isRainbow || isBlack) {
            e.preventDefault();
            const item = getCurrentChatItem();
            if (item) {
                const current = getSavedColor(item);
                const desired = isRainbow ? TAG_RAINBOW : 'black';
                applyToggleToken(item, current === desired ? null : desired);
            }
        }

        // Wallpaper Toggle (Ctrl+Insert / Ctrl+Delete)
        if (e.ctrlKey && e.code === 'Insert') {
            e.preventDefault(); wallpaperActive = true; applyForceTransparency();
        }
        if (e.ctrlKey && e.code === 'Delete') {
            e.preventDefault(); wallpaperActive = false; clearWallpaperStyles();
        }
    });

    const init = () => {
        injectMinimalStyles();
        applyAllChatStyling();
        setInterval(() => { if (wallpaperActive) applyForceTransparency(); }, 1500);
        console.log("✨ LAPAK3 - Wallpaper & Queue Indicator v5.0.0 (Ultimate Edition) Loaded!");
    };

    if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
