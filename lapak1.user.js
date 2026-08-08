// ==UserScript==
// @name         LAPAK1 - Custom Chat Word Highlighter with Dashboard (PREMIUM UI)
// @namespace    http://tampermonkey.net/
// @version      3.9.6
// @description  Border only for .css-ckkl4v (no background). Instant 0ms border without delay.
// @match        https://my.livechatinc.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // Storage Keys
    const STORAGE_KEY = 'chatHighlighterWords';
    const ENABLED_KEY = 'chatHighlighterEnabled';
    const CONFIG_KEY = 'MC_DASHBOARD_CONFIG';
    const SLA_NOTIF_2MIN_KEY = 'slaNotif2minEnabled';
    const SLA_NOTIF_3MIN_KEY = 'slaNotif3minEnabled';
    const BG_POSITION_KEY = 'chatBgPosition';
    const SIDEBAR_POS_KEY = 'sidebarBgPosition';
    const ORB_POS_KEY = 'MC_ORB_POS';
    const CONTAINER_OPACITY_KEY = 'chatContainerOpacity';
    const CHAT_BG_POS_KEY = 'chatMainBgPosition';

    // Border Keys
    const BORDER_COLOR_KEY = 'lapakBorderColor';
    const BORDER_THICKNESS_KEY = 'lapakBorderThickness';
    const BORDER_RADIUS_KEY = 'lapakBorderRadius';

    // Storage Helpers
    function getStore(key, defaultValue) {
        try {
            let val = GM_getValue(key);
            if (val === undefined || val === null) {
                const ls = localStorage.getItem(key);
                if (ls !== null) {
                    try { return JSON.parse(ls); } catch (e) { return ls; }
                }
                return defaultValue;
            }
            return val;
        } catch (e) {
            return defaultValue;
        }
    }

    function setStore(key, value) {
        try {
            GM_setValue(key, value);
            localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : value);
        } catch (e) {}
    }

    // State Management
    const state = {
        slaNotif2minEnabled: getStore(SLA_NOTIF_2MIN_KEY, true),
        slaNotif3minEnabled: getStore(SLA_NOTIF_3MIN_KEY, true),
        isHighlighterEnabled: getStore(ENABLED_KEY, true),
        bgPosition: getStore(BG_POSITION_KEY, 'cover'),
        sidebarBgPosition: getStore(SIDEBAR_POS_KEY, 'cover'),
        chatBgPosition: getStore(CHAT_BG_POS_KEY, 'cover'),
        containerOpacity: getStore(CONTAINER_OPACITY_KEY, 15),
        orbPos: getStore(ORB_POS_KEY, { x: 20, y: 80 }),
        dashConfig: {
            profileImg: 'https://i.imgur.com/EcWMSY4.png',
            mcLabel: 'Lapak99',
            dashBg: 'rgba(10, 10, 20, 0.96)',
            bubbleBg: 'radial-gradient(circle at 30% 30%, rgba(255,215,0,0.35), rgba(0,0,0,0.75))',
            chatBgImage: '',
            sidebarBgImage: '',
            ...getStore(CONFIG_KEY, {})
        },
        borderColor: getStore(BORDER_COLOR_KEY, '#ffd700'),
        borderThickness: getStore(BORDER_THICKNESS_KEY, '3px'),
        borderRadius: getStore(BORDER_RADIUS_KEY, '12px'),
        dragMoved: false,
        isDashVisible: false,
        activeTab: 'words'
    };

    // Color Groups Definition
    const colorGroups = {
        Blue: {
            textColor: '#ffffff',
            grad: 'linear-gradient(135deg, #00d2ff, #3a7bd5)',
            shadow: 'rgba(0, 210, 255, 0.4)',
            accentColor: '#00d2ff',
            words: ['dp', 'deposit', 'pola', 'depo', 'tf', 'dpo', 'dep0', 'defisit', 'depositnya', 'deposit dong', 'top up', 'topup', 'depositkan', 'Topap'],
            icon: '💎'
        },
        Red: {
            textColor: '#ffffff',
            grad: 'linear-gradient(135deg, #ff0844, #ffb199)',
            shadow: 'rgba(255, 8, 68, 0.4)',
            accentColor: '#ff0844',
            words: ['anjing', 'ajing', 'babi', 'bangsat', 'bangst', 'puki', 'cuki', 'konto', 'sampah', 'tai', 'biadap', 'Pukimak', 'bangsad', 'kontol', 'memek', 'ngentot', 'jancok', 'taik', 'bajingan', 'Pantek', 'Picek', 'asuu', 'pepek', 'Anjong', 'Bujang', 'Monyet', 'binatang', 'lonte', 'Kampret', 'bangke', 'banke', 'setan', 'setab', 'kampang', 'berak', 'pejoh', 'Tempek', 'bgst', 'Najis', 'ajg', 'anjeng', 'anjingg'],
            icon: '🚫'
        },
        Green: {
            textColor: '#ffffff',
            grad: 'linear-gradient(135deg, #00f260, #0575e6)',
            shadow: 'rgba(0, 242, 96, 0.4)',
            accentColor: '#00f260',
            words: ['wd', 'Wd', 'WD', 'withdraw', 'withdrawal', 'tarik', 'penarikan', 'pnarikan', 'witdraw', 'Widrow', 'widraw', 'Widrau'],
            icon: '💰'
        },
        Yellow: {
            textColor: '#000000',
            grad: 'linear-gradient(135deg, #f9d423, #ff4e50)',
            shadow: 'rgba(249, 212, 35, 0.4)',
            accentColor: '#f9d423',
            words: ['bonus', 'claim', 'klaim', 'bonusnya', 'klaim bonus', 'bonus dong', 'clame', 'freespin', 'free spin', 'buyspin', 'buy spin', 'sketer', 'scater', 'scatter'],
            icon: '🎯'
        },
        Purple: {
            textColor: '#ffffff',
            grad: 'linear-gradient(135deg, #8e2de2, #4a00e0)',
            shadow: 'rgba(142, 45, 226, 0.4)',
            accentColor: '#8e2de2',
            words: ['batalin', 'batalkan', 'sandi', 'password', 'pasword', 'paspor', 'pasport', 'lupa sandi', 'lupa password', 'ganti password', 'reset password', 'paswod', 'Lupa id', 'lupa akun', 'lupa pw', 'lupa pin', 'paspot', 'reset deposit', 'Lupa pasword', 'Lupa password', 'reset pasword'],
            icon: '🔐'
        }
    };

    // Load custom saved words
    const savedWords = getStore(STORAGE_KEY, null);
    if (savedWords) {
        Object.keys(savedWords).forEach(name => {
            if (colorGroups[name] && Array.isArray(savedWords[name])) {
                colorGroups[name].words = savedWords[name];
            }
        });
    }


    function saveGroups() {
        const obj = {};
        Object.keys(colorGroups).forEach(name => obj[name] = colorGroups[name].words);
        setStore(STORAGE_KEY, obj);
        rebuildRegex();
        runHighlight();
        renderDashboard();
    }

    function saveConfig() {
        setStore(CONFIG_KEY, state.dashConfig);
        setStore(BG_POSITION_KEY, state.bgPosition);
        setStore(SIDEBAR_POS_KEY, state.sidebarBgPosition);
        setStore(CHAT_BG_POS_KEY, state.chatBgPosition);
        setStore(CONTAINER_OPACITY_KEY, state.containerOpacity);
        setStore(BORDER_COLOR_KEY, state.borderColor);
        setStore(BORDER_THICKNESS_KEY, state.borderThickness);
        setStore(BORDER_RADIUS_KEY, state.borderRadius);
    }

    // ============================================================
    // BACKGROUND + BORDER (STABLE)
    // ============================================================
    function applyBackground() {
        const sidebarBgImage = state.dashConfig.sidebarBgImage || '';
        const chatBgImage = state.dashConfig.chatBgImage || '';
        const borderColor = state.borderColor || '#ffd700';
        const borderThick = state.borderThickness || '3px';
        const borderRadius = state.borderRadius || '12px';

        // --- SIDEBAR KIRI .css-1cmlcj3 (background + border) ---
        const leftSidebar = document.querySelector('.css-1cmlcj3');
        if (leftSidebar) {
            if (sidebarBgImage) {
                leftSidebar.style.setProperty('background-image', `url('${sidebarBgImage}')`, 'important');
                const size = state.sidebarBgPosition === 'contain' ? 'contain' :
                             state.sidebarBgPosition === 'stretch' ? '100% 100%' :
                             state.sidebarBgPosition === 'tile' ? 'auto' :
                             state.sidebarBgPosition === 'center' ? 'auto' :
                             'cover';
                leftSidebar.style.setProperty('background-size', size, 'important');
                const repeat = state.sidebarBgPosition === 'tile' ? 'repeat' : 'no-repeat';
                leftSidebar.style.setProperty('background-repeat', repeat, 'important');
                leftSidebar.style.setProperty('background-position', 'center', 'important');
                leftSidebar.style.setProperty('background-color', 'transparent', 'important');
                leftSidebar.style.setProperty('border', `${borderThick} solid ${borderColor}`, 'important');
                leftSidebar.style.setProperty('border-radius', borderRadius, 'important');
                leftSidebar.style.setProperty('box-shadow', `0 0 20px ${borderColor}66`, 'important');
            } else {
                leftSidebar.style.setProperty('background-image', 'none', 'important');
                leftSidebar.style.setProperty('border', 'none', 'important');
                leftSidebar.style.setProperty('border-radius', '', 'important');
                leftSidebar.style.setProperty('box-shadow', 'none', 'important');
            }
        }

        // --- SIDEBAR KANAN - .css-1orfco2 (background + border) ---
        const el1 = document.querySelector('.css-1orfco2');
        if (el1) {
            if (sidebarBgImage) {
                el1.style.setProperty('background-image', `url('${sidebarBgImage}')`, 'important');
                const size = state.sidebarBgPosition === 'contain' ? 'contain' :
                             state.sidebarBgPosition === 'stretch' ? '100% 100%' :
                             state.sidebarBgPosition === 'tile' ? 'auto' :
                             state.sidebarBgPosition === 'center' ? 'auto' :
                             'cover';
                el1.style.setProperty('background-size', size, 'important');
                const repeat = state.sidebarBgPosition === 'tile' ? 'repeat' : 'no-repeat';
                el1.style.setProperty('background-repeat', repeat, 'important');
                el1.style.setProperty('background-position', 'center', 'important');
                el1.style.setProperty('background-color', 'transparent', 'important');
                el1.style.setProperty('border', `${borderThick} solid ${borderColor}`, 'important');
                el1.style.setProperty('border-radius', borderRadius, 'important');
                el1.style.setProperty('box-shadow', `0 0 20px ${borderColor}66`, 'important');

                // Child transparan
                const childSelectors = [
                    '.lc-DetailsCard-module__details-card___v-Avc',
                    '.lc-DetailsCard-module__details-card__label-wrapper___r70F3',
                    '.lc-DetailsCard-module__details-card__content-wrapper___6U9cE',
                    '.lc-DetailsCard-module__details-card__content___aJux3',
                    '.css-1w1hkr0', '.css-ncqwun', '.css-19xtuo8', '.css-1ujqw2c',
                    '.css-cssveg', '.css-7ebjq', '.css-ov1ktg', '.css-adz6ad',
                    '.css-gnokho', '.css-1353qxl',
                    '.lc-ActionBar-module__action-bar___yfLdO',
                    '.lc-ActionBar-module__action-bar__items___E8fX6',
                    '.lc-ActionBar-module__action-bar__items__button-wrapper___sgdUc',
                    '.css-1l83s7m', '.css-13f7rot'
                ];
                for (const sel of childSelectors) {
                    const elements = el1.querySelectorAll(sel);
                    elements.forEach(elChild => {
                        elChild.style.setProperty('background-color', 'transparent', 'important');
                        elChild.style.setProperty('background-image', 'none', 'important');
                    });
                }
                el1.querySelectorAll('[class*="DetailsCard"], [class*="ActionBar"], [class*="details-card"]').forEach(elChild => {
                    elChild.style.setProperty('background-color', 'transparent', 'important');
                    elChild.style.setProperty('background-image', 'none', 'important');
                });
            } else {
                el1.style.setProperty('background-image', 'none', 'important');
                el1.style.setProperty('border', 'none', 'important');
                el1.style.setProperty('border-radius', '', 'important');
                el1.style.setProperty('box-shadow', 'none', 'important');
            }
        }

        // --- SIDEBAR KANAN - .css-ckkl4v (HANYA BORDER, TIDAK SENTUH BACKGROUND) ---
        const el2 = document.querySelector('.css-ckkl4v');
        if (el2) {
            // Hanya set border, jangan ubah background sama sekali
            el2.style.setProperty('border', `${borderThick} solid ${borderColor}`, 'important');
            el2.style.setProperty('border-radius', borderRadius, 'important');
            // Hapus properti yang tidak diperlukan agar tidak mengganggu
            el2.style.removeProperty('background-image');
            el2.style.removeProperty('background-size');
            el2.style.removeProperty('background-repeat');
            el2.style.removeProperty('background-position');
            el2.style.removeProperty('background-color');
            // Box-shadow opsional, tapi kita beri sedikit agar border terlihat
            el2.style.setProperty('box-shadow', `0 0 15px ${borderColor}44`, 'important');
        }

        // --- CHAT UTAMA - HANYA .css-7eezsw (bukan .css-i1m9wv) ---
        const chatMain = document.querySelector('.css-7eezsw');
        if (chatMain) {
            if (chatBgImage) {
                chatMain.style.setProperty('background-image', `url('${chatBgImage}')`, 'important');
                const size = state.chatBgPosition === 'contain' ? 'contain' :
                             state.chatBgPosition === 'stretch' ? '100% 100%' :
                             state.chatBgPosition === 'tile' ? 'auto' :
                             state.chatBgPosition === 'center' ? 'auto' :
                             'cover';
                chatMain.style.setProperty('background-size', size, 'important');
                const repeat = state.chatBgPosition === 'tile' ? 'repeat' : 'no-repeat';
                chatMain.style.setProperty('background-repeat', repeat, 'important');
                chatMain.style.setProperty('background-position', 'center', 'important');
                chatMain.style.setProperty('background-color', 'transparent', 'important');
                chatMain.style.setProperty('border', `${borderThick} solid ${borderColor}`, 'important');
                chatMain.style.setProperty('border-radius', borderRadius, 'important');
                chatMain.style.setProperty('box-shadow', `0 0 20px ${borderColor}66`, 'important');
            } else {
                chatMain.style.setProperty('background-image', 'none', 'important');
                chatMain.style.setProperty('background-color', '', 'important');
                chatMain.style.setProperty('border', 'none', 'important');
                chatMain.style.setProperty('border-radius', '', 'important');
                chatMain.style.setProperty('box-shadow', 'none', 'important');
            }
        }

        // --- CSS GLOBAL UNTUK TRANSPARANSI SIDEBAR ---
        let styleTag = document.getElementById('lapak-sidebar-transparency');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'lapak-sidebar-transparency';
            (document.head || document.documentElement).appendChild(styleTag);
        }

        const sSize = state.sidebarBgPosition === 'contain' ? 'contain' :
                      state.sidebarBgPosition === 'stretch' ? '100% 100%' :
                      state.sidebarBgPosition === 'tile' ? 'auto' :
                      state.sidebarBgPosition === 'center' ? 'auto' :
                      'cover';
        const sRepeat = state.sidebarBgPosition === 'tile' ? 'repeat' : 'no-repeat';

        if (sidebarBgImage) {
            styleTag.textContent = `
                /* SIDEBAR KIRI .css-1cmlcj3 (background + border) */
                .css-1cmlcj3 {
                    background-image: url('${sidebarBgImage}') !important;
                    background-size: ${sSize} !important;
                    background-repeat: ${sRepeat} !important;
                    background-position: center !important;
                    background-color: transparent !important;
                    border: ${borderThick} solid ${borderColor} !important;
                    border-radius: ${borderRadius} !important;
                    box-shadow: 0 0 20px ${borderColor}66 !important;
                }
                /* SIDEBAR KANAN .css-1orfco2 (background + border) */
                .css-1orfco2 {
                    background-image: url('${sidebarBgImage}') !important;
                    background-size: ${sSize} !important;
                    background-repeat: ${sRepeat} !important;
                    background-position: center !important;
                    background-color: transparent !important;
                    border: ${borderThick} solid ${borderColor} !important;
                    border-radius: ${borderRadius} !important;
                    box-shadow: 0 0 20px ${borderColor}66 !important;
                }
                .css-1orfco2 * {
                    background-color: transparent !important;
                    background-image: none !important;
                }
                .css-1orfco2 [class*="hl-"] {
                    background: inherit !important;
                }
                /* SIDEBAR KANAN .css-ckkl4v (HANYA BORDER, TANPA BACKGROUND, INSTANT TANPA DELAY) */
                .css-ckkl4v {
                    border: ${borderThick} solid ${borderColor} !important;
                    border-radius: ${borderRadius} !important;
                    box-shadow: 0 0 15px ${borderColor}44 !important;
                    transition: none !important;
                    animation: none !important;
                    /* JANGAN set background-image, biarkan default */
                }
                .css-ckkl4v * {
                    background-color: transparent !important;
                    background-image: none !important;
                }
                .css-ckkl4v [class*="hl-"] {
                    background: inherit !important;
                }
                /* CHAT UTAMA - HANYA .css-7eezsw */
                .css-7eezsw {
                    background-image: url('${chatBgImage ? chatBgImage : 'none'}') !important;
                    background-size: ${state.chatBgPosition === 'contain' ? 'contain' :
                                    state.chatBgPosition === 'stretch' ? '100% 100%' :
                                    state.chatBgPosition === 'tile' ? 'auto' :
                                    state.chatBgPosition === 'center' ? 'auto' :
                                    'cover'} !important;
                    background-repeat: ${state.chatBgPosition === 'tile' ? 'repeat' : 'no-repeat'} !important;
                    background-position: center !important;
                    background-color: ${chatBgImage ? 'transparent' : ''} !important;
                    border: ${chatBgImage ? `${borderThick} solid ${borderColor}` : 'none'} !important;
                    border-radius: ${chatBgImage ? borderRadius : ''} !important;
                    box-shadow: ${chatBgImage ? `0 0 20px ${borderColor}66` : 'none'} !important;
                }
                .lc-ActionBar-module__action-bar___yfLdO,
                .lc-DetailsCard-module__details-card___v-Avc,
                .lc-DetailsCard-module__details-card__label-wrapper___r70F3,
                .lc-DetailsCard-module__details-card__content-wrapper___6U9cE,
                .lc-DetailsCard-module__details-card__content___aJux3 {
                    background-color: transparent !important;
                    background-image: none !important;
                }
            `;
        } else {
            // Tanpa background sidebar, .css-ckkl4v tetap dapat border instant tanpa delay
            styleTag.textContent = `
                .css-1cmlcj3 { background-image: none !important; border: none !important; border-radius: unset !important; box-shadow: none !important; }
                .css-1orfco2 { background-image: none !important; border: none !important; border-radius: unset !important; box-shadow: none !important; }
                .css-ckkl4v {
                    border: ${borderThick} solid ${borderColor} !important;
                    border-radius: ${borderRadius} !important;
                    box-shadow: 0 0 15px ${borderColor}44 !important;
                    transition: none !important;
                    animation: none !important;
                    background-image: none !important;
                }
                .css-7eezsw { background-image: none !important; border: none !important; border-radius: unset !important; box-shadow: none !important; }
            `;
        }
    }

    // Direct invocation at document-start (0ms delay for CSS rule creation)
    applyBackground();

    // ============================================================
    // OBSERVER UNTUK SIDEBAR & CHAT UTAMA (DENGAN DEBOUNCE)
    // ============================================================
    function initSidebarObserver() {
        applyBackground(); // Langsung terapkan style saat script dimuat (0ms delay)
        // Interval yang lebih lambat untuk mengurangi beban
        setInterval(applyBackground, 2000);
        setTimeout(applyBackground, 300);
        setTimeout(applyBackground, 800);
        setTimeout(applyBackground, 2000);

        const targetNode = document.body;
        const config = { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] };
        let timeoutId = null;

        const callback = function(mutationsList) {
            let shouldApply = false;
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.matches && (node.matches('.css-1cmlcj3') || node.matches('.css-1orfco2') || node.matches('.css-ckkl4v') || node.matches('.css-7eezsw'))) {
                                shouldApply = true;
                                break;
                            }
                            if (node.querySelector && (node.querySelector('.css-1cmlcj3') || node.querySelector('.css-1orfco2') || node.querySelector('.css-ckkl4v') || node.querySelector('.css-7eezsw'))) {
                                shouldApply = true;
                                break;
                            }
                        }
                    }
                }
            }

            if (shouldApply) {
                if (timeoutId) clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    applyBackground();
                    timeoutId = null;
                }, 150); // debounce lebih lama agar tidak terlalu sering
            }
        };

        const observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    }

    // ======================================================================
    // SISA KODE (highlight, dashboard, dll) TETAP SAMA
    // ======================================================================

    // Ultra-Fast Regex Engine
    let compiledRegex = null;
    let wordGroupMap = {};

    function rebuildRegex() {
        wordGroupMap = {};
        const patterns = [];
        Object.entries(colorGroups).forEach(([groupName, group]) => {
            group.words.forEach(word => {
                if (!word || !word.trim()) return;
                const trimmed = word.trim();
                const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                patterns.push(escaped);
                wordGroupMap[trimmed.toLowerCase()] = groupName;
            });
        });
        if (patterns.length === 0) {
            compiledRegex = null;
            return;
        }
        patterns.sort((a, b) => b.length - a.length);
        compiledRegex = new RegExp(`(?<=^|[\\s\\u00a0.,!?;:()'"\\-\\/])(${patterns.join('|')})(?=$|[\\s\\u00a0.,!?;:()'"\\-\\/])`, 'gi');
    }
    rebuildRegex();

    // Dynamic Highlighting & Custom Component CSS
    const styleEl = document.createElement('style');
    styleEl.id = 'lapak1-fast-styles';
    document.head.appendChild(styleEl);

    function updateCSS() {
        let css = `
            ${Object.entries(colorGroups).map(([name, group]) => `
                .hl-${name} {
                    background: ${state.isHighlighterEnabled ? group.grad : 'transparent'} !important;
                    color: ${state.isHighlighterEnabled ? group.textColor : 'inherit'} !important;
                    font-size: inherit !important;
                    line-height: inherit !important;
                    padding: ${state.isHighlighterEnabled ? '2px 8px' : '0'};
                    border-radius: 16px;
                    box-shadow: ${state.isHighlighterEnabled ? `0 2px 10px ${group.shadow}` : 'none'};
                    font-weight: ${state.isHighlighterEnabled ? '700' : 'normal'};
                    display: inline-block;
                    margin: 0 2px;
                    vertical-align: baseline;
                }
            `).join('\n')}
            [data-lapak-hl="1"], [class*="hl-"], #chat-hl-bubble, #chat-hl-dashboard, #chat-hl-dashboard * {
                background-color: initial;
            }
            #chat-hl-dashboard {
                background: rgba(10, 10, 20, 0.96) !important;
                color: #ffffff !important;
                border: 1px solid rgba(255, 255, 255, 0.12) !important;
            }
            .lapak1-switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
            .lapak1-switch input { opacity: 0; width: 0; height: 0; }
            .lapak1-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #2a2a38; transition: .3s; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1); }
            .lapak1-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 2px; bottom: 2px; background-color: white; transition: .3s; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.4); }
            input:checked + .lapak1-slider { background: linear-gradient(135deg, #00d4ff, #7b2ffc); border-color: transparent; }
            input:checked + .lapak1-slider:before { transform: translateX(20px); }
            .lapak1-nav-bar { display: flex; gap: 4px; background: rgba(0, 0, 0, 0.4); padding: 4px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 14px; }
            .lapak1-tab-btn { flex: 1; padding: 8px 10px; font-size: 11px; font-weight: 700; border-radius: 8px; border: none; background: transparent; color: #8888a0; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 6px; }
            .lapak1-tab-btn:hover { color: #ffffff; background: rgba(255, 255, 255, 0.05); }
            .lapak1-tab-btn.active { background: linear-gradient(135deg, #00d4ff 0%, #7b2ffc 100%); color: #ffffff; box-shadow: 0 4px 15px rgba(0, 212, 255, 0.3); }
            .lapak1-card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07); border-left: 4px solid #00d4ff; border-radius: 14px; padding: 14px; margin-bottom: 12px; transition: all 0.2s ease; color: #ffffff; }
            .lapak1-card:hover { border-color: rgba(255, 255, 255, 0.15); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35); }
            .lapak1-card-title { font-size: 12px; font-weight: 700; color: #e0e0ff; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; }
            .lapak1-input { background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.1); color: #ffffff; border-radius: 8px; padding: 8px 12px; font-size: 12px; outline: none; transition: border-color 0.2s ease; }
            .lapak1-input:focus { border-color: #00d4ff; box-shadow: 0 0 10px rgba(0, 212, 255, 0.2); }
            .lapak1-btn-primary { background: linear-gradient(135deg, #00d4ff, #7b2ffc); color: #ffffff; border: none; border-radius: 8px; padding: 8px 14px; font-size: 11px; font-weight: 700; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; }
            .lapak1-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 212, 255, 0.4); }
            .lapak1-btn-danger { background: rgba(255, 71, 87, 0.15); color: #ff4757; border: 1px solid rgba(255, 71, 87, 0.3); border-radius: 8px; padding: 8px 12px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s ease; }
            .lapak1-btn-danger:hover { background: rgba(255, 71, 87, 0.3); border-color: #ff4757; }
        `;
        styleEl.textContent = css;
    }
    updateCSS();

    // Highlighting Logic
    function highlightNode(node) {
        if (!compiledRegex || !state.isHighlighterEnabled) return;
        if (!node || node.nodeType !== 3) return;
        const text = node.nodeValue;
        if (!text || !text.trim()) return;
        compiledRegex.lastIndex = 0;
        if (!compiledRegex.test(text)) return;
        compiledRegex.lastIndex = 0;
        const parent = node.parentNode;
        if (!parent || parent.closest('[data-lapak-hl="1"]')) return;
        const span = document.createElement('span');
        span.setAttribute('data-lapak-hl', '1');
        let html = text.replace(compiledRegex, (match) => {
            const groupName = wordGroupMap[match.toLowerCase()];
            if (groupName) {
                return `<span class="hl-${groupName}" data-lapak-hl="1">${match}</span>`;
            }
            return match;
        });
        span.innerHTML = html;
        parent.replaceChild(span, node);
    }

    function runHighlight() {
        if (!state.isHighlighterEnabled || !compiledRegex) return;
        const messageContainers = document.querySelectorAll(
            '[data-testid="visitor-message"], [data-testid="customer-message"], [data-testid="agent-message"], [data-testid="message-text"], .css-3dz5hy, [class*="message__text"], [class*="MessageText"], [class*="feed"]'
        );
        messageContainers.forEach(msgContainer => {
            const walker = document.createTreeWalker(msgContainer, NodeFilter.SHOW_TEXT, null);
            const textNodes = [];
            let currentNode;
            while (currentNode = walker.nextNode()) {
                if (currentNode.nodeValue && currentNode.nodeValue.trim() && !currentNode.parentNode.closest('[data-lapak-hl="1"]')) {
                    textNodes.push(currentNode);
                }
            }
            textNodes.forEach(highlightNode);
        });
    }

    let highlightTimer = null;
    function scheduleHighlight() {
        if (highlightTimer) return;
        highlightTimer = setTimeout(() => {
            highlightTimer = null;
            runHighlight();
        }, 150);
    }

    const observer = new MutationObserver(() => {
        scheduleHighlight();
    });

    function initObserver() {
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    window.addEventListener('popstate', scheduleHighlight);
    window.addEventListener('hashchange', scheduleHighlight);
    document.addEventListener('click', () => setTimeout(scheduleHighlight, 150));

    // Create Floating Orb & Dashboard
    const orb = document.createElement('div');
    orb.id = 'chat-hl-bubble';
    orb.style.cssText = `
        position: fixed; top: 0; left: 0;
        width: 58px; height: 58px;
        background: ${state.dashConfig.bubbleBg};
        border: 1px solid rgba(255,215,0,0.3);
        border-radius: 50%;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        cursor: pointer; z-index: 999999;
        box-shadow: 0 8px 25px rgba(0,0,0,0.6);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transform: translate3d(${state.orbPos.x}px, ${state.orbPos.y}px, 0);
        user-select: none;
        touch-action: none;
    `;
    orb.innerHTML = `
        <img src="${state.dashConfig.profileImg}" style="width:26px; height:26px; border-radius:50%; pointer-events:none;">
        <div style="color:#fff; font-size:8px; font-weight:800; letter-spacing:1px; margin-top:2px; pointer-events:none; text-transform:uppercase;">${state.dashConfig.mcLabel}</div>
    `;

    const dash = document.createElement('div');
    dash.id = 'chat-hl-dashboard';
    dash.style.cssText = `
        position: fixed; top: 0; left: 0;
        width: 400px; max-height: 580px;
        background: ${state.dashConfig.dashBg};
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 20px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.85);
        z-index: 999998; display: none; overflow: hidden;
        color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-sizing: border-box;
    `;
    dash.addEventListener('click', (e) => { e.stopPropagation(); });

    const dashHeader = document.createElement('div');
    dashHeader.style.cssText = 'padding: 14px 18px; background: rgba(0,0,0,0.35); border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between;';
    dashHeader.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:20px;">✨</span>
            <div>
                <div style="font-size:14px; font-weight:800; color:#ffd700; letter-spacing:0.5px;">LAPAK HIGHLIGHTER PRO</div>
                <div style="font-size:9px; color:#8888a0; font-weight:600;">Control & Dashboard Panel v6.8.0</div>
            </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
            <label class="lapak1-switch" title="Toggle Active Status">
                <input type="checkbox" id="lapak1-master-toggle" ${state.isHighlighterEnabled ? 'checked' : ''}>
                <span class="lapak1-slider"></span>
            </label>
        </div>
    `;
    dash.appendChild(dashHeader);

    const dashContent = document.createElement('div');
    dashContent.style.cssText = 'padding: 16px 18px; max-height: 500px; overflow-y: auto; box-sizing: border-box;';
    dash.appendChild(dashContent);

    function renderDashboard() {
        dashContent.innerHTML = '';
        const navBar = document.createElement('div');
        navBar.className = 'lapak1-nav-bar';
        navBar.innerHTML = `
            <button class="lapak1-tab-btn ${state.activeTab === 'words' ? 'active' : ''}" data-tab="words">📝 Kelompok Kata</button>
            <button class="lapak1-tab-btn ${state.activeTab === 'background' ? 'active' : ''}" data-tab="background">🖼️ Background</button>
            <button class="lapak1-tab-btn ${state.activeTab === 'settings' ? 'active' : ''}" data-tab="settings">⚙️ Pengaturan</button>
        `;
        navBar.querySelectorAll('.lapak1-tab-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                state.activeTab = btn.dataset.tab;
                renderDashboard();
            };
        });
        dashContent.appendChild(navBar);
        if (state.activeTab === 'background') {
            renderBackgroundTab(dashContent);
        } else if (state.activeTab === 'settings') {
            renderSettingsTab(dashContent);
        } else {
            renderWordsTab(dashContent);
        }
    }

    // TAB 1: KELOMPOK KATA
    function renderWordsTab(container) {
        const totalWordsCount = Object.values(colorGroups).reduce((acc, g) => acc + g.words.length, 0);
        const summaryCard = document.createElement('div');
        summaryCard.className = 'lapak1-card';
        summaryCard.style.cssText = 'background: linear-gradient(135deg, rgba(0,212,255,0.08), rgba(123,47,252,0.08)); border-left: 4px solid #00d4ff; border-color: rgba(0,212,255,0.2); margin-bottom: 14px;';
        summaryCard.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between;">
                <div>
                    <div style="font-size:11px; color:#aaa; font-weight:600;">TOTAL KATA HIGHLIGHT</div>
                    <div style="font-size:20px; font-weight:900; color:#00d4ff;">${totalWordsCount} Kata Terdaftar</div>
                </div>
                <div style="font-size:24px;">🏷️</div>
            </div>
        `;
        container.appendChild(summaryCard);

        Object.entries(colorGroups).forEach(([name, group]) => {
            const card = document.createElement('div');
            card.className = 'lapak1-card';
            card.style.borderLeft = `4px solid ${group.accentColor}`;
            const title = document.createElement('div');
            title.className = 'lapak1-card-title';
            title.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="width:10px; height:10px; border-radius:50%; background:${group.grad}; display:inline-block; box-shadow: 0 0 10px ${group.shadow};"></span>
                    <span style="color:${group.accentColor}; font-weight:800;">${group.icon} ${name} Group</span>
                </div>
                <span style="font-size:10px; color:#888; font-weight:600;">${group.words.length} Kata</span>
            `;
            card.appendChild(title);
            const chipsDiv = document.createElement('div');
            chipsDiv.style.cssText = 'display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;';
            group.words.forEach((w, idx) => {
                const chip = document.createElement('span');
                chip.style.cssText = `background:rgba(255,255,255,0.06); border:1px solid ${group.accentColor}44; border-radius:12px; padding:3px 10px; font-size:11px; display:inline-flex; align-items:center; gap:6px; color:#e0e0ff; transition: all 0.2s ease;`;
                chip.innerHTML = `<span>${w}</span> <span style="cursor:pointer; color:#ff4757; font-weight:800;" title="Hapus">✕</span>`;
                chip.querySelector('span:last-child').onclick = (e) => {
                    e.stopPropagation();
                    group.words.splice(idx, 1);
                    saveGroups();
                };
                chipsDiv.appendChild(chip);
            });
            card.appendChild(chipsDiv);
            const addRow = document.createElement('div');
            addRow.style.cssText = 'display:flex; gap:6px;';
            addRow.innerHTML = `
                <input type="text" class="lapak1-input" placeholder="Tambah kata baru ke ${name}..." style="flex:1;">
                <button class="lapak1-btn-primary" style="padding:0 14px; background:${group.grad};">+</button>
            `;
            const input = addRow.querySelector('input');
            const btn = addRow.querySelector('button');
            const addWord = (e) => {
                if (e) e.stopPropagation();
                const val = input.value.trim();
                if (val) {
                    group.words.push(val);
                    saveGroups();
                    input.value = '';
                }
            };
            btn.onclick = addWord;
            input.onkeydown = (e) => { if (e.key === 'Enter') addWord(e); };
            card.appendChild(addRow);
            container.appendChild(card);
        });
    }

    // TAB 2: BACKGROUND SIDEBAR + CHAT UTAMA + BORDER CONTROLS
    function renderBackgroundTab(container) {
        // --- SIDEBAR BACKGROUND CARD ---
        const sidebarBgCard = document.createElement('div');
        sidebarBgCard.className = 'lapak1-card';
        sidebarBgCard.style.borderLeft = '4px solid #ffd700';
        sidebarBgCard.innerHTML = `
            <div class="lapak1-card-title">
                <span style="color:#ffd700; font-weight:800;">🎨 Background Sidebar</span>
                <span style="font-size:10px; color:#ffd700; font-weight:700;">SIDEBARS</span>
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-size:11px; color:#aaa; display:block; margin-bottom:6px;">URL Gambar Background Sidebar</label>
                <div style="display:flex; gap:6px;">
                    <input type="text" id="lapak1-sidebar-bg-url" class="lapak1-input" value="${state.dashConfig.sidebarBgImage || ''}" placeholder="Masukkan URL Gambar Sidebar..." style="flex:1;">
                    <button id="lapak1-sidebar-bg-upload" class="lapak1-btn-primary" style="background:linear-gradient(135deg, #ffd700, #ff8c00); color:#000;">Upload</button>
                    <button id="lapak1-sidebar-bg-remove" class="lapak1-btn-danger">✕</button>
                </div>
            </div>
            ${state.dashConfig.sidebarBgImage ? `
                <div style="margin-bottom:14px; border-radius:10px; overflow:hidden; border:1px solid rgba(255,215,0,0.3); height:85px; position:relative;">
                    <img src="${state.dashConfig.sidebarBgImage}" style="width:100%; height:100%; object-fit:cover;">
                </div>
            ` : ''}
            <div class="lapak1-card-title" style="margin-top:10px;">
                <span>📐 Posisi Layout (${state.sidebarBgPosition.toUpperCase()})</span>
            </div>
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px;">
                ${['cover', 'contain', 'stretch', 'tile', 'center', 'span'].map(pos => `
                    <button class="lapak1-sidebar-pos-btn" data-pos="${pos}" style="
                        padding:8px 4px;
                        background:${state.sidebarBgPosition === pos ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255,255,255,0.03)'};
                        border:1px solid ${state.sidebarBgPosition === pos ? '#ffd700' : 'rgba(255,255,255,0.08)'};
                        border-radius:8px;
                        color:${state.sidebarBgPosition === pos ? '#ffd700' : '#aaa'};
                        font-size:10px; font-weight:800; cursor:pointer; text-transform:uppercase; transition:all 0.2s ease;
                    ">${pos}</button>
                `).join('')}
            </div>
        `;
        container.appendChild(sidebarBgCard);

        // Bind Sidebar Bg Events
        const sidebarInput = sidebarBgCard.querySelector('#lapak1-sidebar-bg-url');
        const sidebarUploadBtn = sidebarBgCard.querySelector('#lapak1-sidebar-bg-upload');
        const sidebarRemoveBtn = sidebarBgCard.querySelector('#lapak1-sidebar-bg-remove');
        const sidebarPosBtns = sidebarBgCard.querySelectorAll('.lapak1-sidebar-pos-btn');

        sidebarInput.onchange = (e) => {
            e.stopPropagation();
            state.dashConfig.sidebarBgImage = sidebarInput.value.trim();
            saveConfig();
            applyBackground();
            renderDashboard();
        };
        sidebarRemoveBtn.onclick = (e) => {
            e.stopPropagation();
            state.dashConfig.sidebarBgImage = '';
            saveConfig();
            applyBackground();
            renderDashboard();
        };
        const sidebarFileInput = document.createElement('input');
        sidebarFileInput.type = 'file';
        sidebarFileInput.accept = 'image/*';
        sidebarFileInput.style.display = 'none';
        sidebarFileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    state.dashConfig.sidebarBgImage = re.target.result;
                    saveConfig();
                    applyBackground();
                    renderDashboard();
                };
                reader.readAsDataURL(file);
            }
        };
        sidebarUploadBtn.onclick = (e) => {
            e.stopPropagation();
            sidebarFileInput.click();
        };
        sidebarPosBtns.forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                state.sidebarBgPosition = btn.dataset.pos;
                saveConfig();
                applyBackground();
                renderDashboard();
            };
        });

        // --- CHAT UTAMA BACKGROUND CARD ---
        const chatBgCard = document.createElement('div');
        chatBgCard.className = 'lapak1-card';
        chatBgCard.style.borderLeft = '4px solid #00d4ff';
        chatBgCard.innerHTML = `
            <div class="lapak1-card-title">
                <span style="color:#00d4ff; font-weight:800;">💬 Background Utama Chat</span>
                <span style="font-size:10px; color:#00d4ff; font-weight:700;">HANYA .CSS-7EEZSW</span>
            </div>
            <div style="margin-bottom:14px;">
                <label style="font-size:11px; color:#aaa; display:block; margin-bottom:6px;">URL Gambar Background Chat</label>
                <div style="display:flex; gap:6px;">
                    <input type="text" id="lapak1-chat-bg-url" class="lapak1-input" value="${state.dashConfig.chatBgImage || ''}" placeholder="Masukkan URL Gambar Chat..." style="flex:1;">
                    <button id="lapak1-chat-bg-upload" class="lapak1-btn-primary" style="background:linear-gradient(135deg, #00d4ff, #7b2ffc);">Upload</button>
                    <button id="lapak1-chat-bg-remove" class="lapak1-btn-danger">✕</button>
                </div>
            </div>
            ${state.dashConfig.chatBgImage ? `
                <div style="margin-bottom:14px; border-radius:10px; overflow:hidden; border:1px solid rgba(0,212,255,0.3); height:85px; position:relative;">
                    <img src="${state.dashConfig.chatBgImage}" style="width:100%; height:100%; object-fit:cover;">
                </div>
            ` : ''}
            <div class="lapak1-card-title" style="margin-top:10px;">
                <span>📐 Posisi Layout (${state.chatBgPosition.toUpperCase()})</span>
            </div>
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px;">
                ${['cover', 'contain', 'stretch', 'tile', 'center', 'span'].map(pos => `
                    <button class="lapak1-chat-pos-btn" data-pos="${pos}" style="
                        padding:8px 4px;
                        background:${state.chatBgPosition === pos ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255,255,255,0.03)'};
                        border:1px solid ${state.chatBgPosition === pos ? '#00d4ff' : 'rgba(255,255,255,0.08)'};
                        border-radius:8px;
                        color:${state.chatBgPosition === pos ? '#00d4ff' : '#aaa'};
                        font-size:10px; font-weight:800; cursor:pointer; text-transform:uppercase; transition:all 0.2s ease;
                    ">${pos}</button>
                `).join('')}
            </div>
        `;
        container.appendChild(chatBgCard);

        // Bind Chat Bg Events
        const chatInput = chatBgCard.querySelector('#lapak1-chat-bg-url');
        const chatUploadBtn = chatBgCard.querySelector('#lapak1-chat-bg-upload');
        const chatRemoveBtn = chatBgCard.querySelector('#lapak1-chat-bg-remove');
        const chatPosBtns = chatBgCard.querySelectorAll('.lapak1-chat-pos-btn');

        chatInput.onchange = (e) => {
            e.stopPropagation();
            state.dashConfig.chatBgImage = chatInput.value.trim();
            saveConfig();
            applyBackground();
            renderDashboard();
        };
        chatRemoveBtn.onclick = (e) => {
            e.stopPropagation();
            state.dashConfig.chatBgImage = '';
            saveConfig();
            applyBackground();
            renderDashboard();
        };
        const chatFileInput = document.createElement('input');
        chatFileInput.type = 'file';
        chatFileInput.accept = 'image/*';
        chatFileInput.style.display = 'none';
        chatFileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    state.dashConfig.chatBgImage = re.target.result;
                    saveConfig();
                    applyBackground();
                    renderDashboard();
                };
                reader.readAsDataURL(file);
            }
        };
        chatUploadBtn.onclick = (e) => {
            e.stopPropagation();
            chatFileInput.click();
        };
        chatPosBtns.forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                state.chatBgPosition = btn.dataset.pos;
                saveConfig();
                applyBackground();
                renderDashboard();
            };
        });

        // --- BORDER SETTINGS CARD ---
        const borderCard = document.createElement('div');
        borderCard.className = 'lapak1-card';
        borderCard.style.borderLeft = '4px solid #ff00aa';
        borderCard.innerHTML = `
            <div class="lapak1-card-title">
                <span style="color:#ff00aa; font-weight:800;">🖼️ Pengaturan Border</span>
                <span style="font-size:10px; color:#ff00aa; font-weight:700;">SEMUA AREA</span>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; align-items:center;">
                <div>
                    <label style="font-size:11px; color:#aaa; display:block; margin-bottom:4px;">Warna Border</label>
                    <input type="color" id="lapak1-border-color" value="${state.borderColor}" style="width:100%; height:38px; padding:2px; border-radius:6px; border:1px solid #333; background:#222; cursor:pointer;">
                </div>
                <div>
                    <label style="font-size:11px; color:#aaa; display:block; margin-bottom:4px;">Ketebalan</label>
                    <select id="lapak1-border-thickness" class="lapak1-input" style="width:100%; padding:6px 8px;">
                        ${['1px','2px','3px','4px','5px','6px','8px','10px'].map(t => `
                            <option value="${t}" ${state.borderThickness === t ? 'selected' : ''}>${t}</option>
                        `).join('')}
                    </select>
                </div>
                <div style="grid-column: span 2;">
                    <label style="font-size:11px; color:#aaa; display:block; margin-bottom:4px;">Radius Sudut</label>
                    <select id="lapak1-border-radius" class="lapak1-input" style="width:100%; padding:6px 8px;">
                        ${['0px','4px','8px','12px','16px','20px','24px','30px','50px'].map(r => `
                            <option value="${r}" ${state.borderRadius === r ? 'selected' : ''}>${r}</option>
                        `).join('')}
                    </select>
                </div>
            </div>
            <div style="margin-top:8px; font-size:10px; color:#888; text-align:center;">
                Border diterapkan ke: .css-1cmlcj3 (sidebar kiri), .css-1orfco2 (sidebar kanan+bg), .css-ckkl4v (border only), .css-7eezsw (chat utama).
                <br>.css-i1m9wv TIDAK terkena border.
            </div>
        `;
        container.appendChild(borderCard);

        // Bind Border Events
        const borderColorInput = borderCard.querySelector('#lapak1-border-color');
        const borderThicknessSelect = borderCard.querySelector('#lapak1-border-thickness');
        const borderRadiusSelect = borderCard.querySelector('#lapak1-border-radius');

        borderColorInput.onchange = (e) => {
            e.stopPropagation();
            state.borderColor = e.target.value;
            saveConfig();
            applyBackground();
            renderDashboard();
        };
        borderThicknessSelect.onchange = (e) => {
            e.stopPropagation();
            state.borderThickness = e.target.value;
            saveConfig();
            applyBackground();
            renderDashboard();
        };
        borderRadiusSelect.onchange = (e) => {
            e.stopPropagation();
            state.borderRadius = e.target.value;
            saveConfig();
            applyBackground();
            renderDashboard();
        };
    }

    // TAB 3: PENGATURAN & BACKUP
    function renderSettingsTab(container) {
        const slaCard = document.createElement('div');
        slaCard.className = 'lapak1-card';
        slaCard.style.borderLeft = '4px solid #7b2ffc';
        slaCard.innerHTML = `
            <div class="lapak1-card-title">
                <span style="color:#a766ff; font-weight:800;">🔔 Kontrol Notifikasi SLA</span>
                <span style="font-size:10px; color:#888;">LiveChat SLA Alert</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:10px;">
                <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.3); padding:10px 12px; border-radius:10px; border-left: 3px solid #ffd700;">
                    <div>
                        <div style="font-size:12px; font-weight:700; color:#ffd700;">Timer 2 Menit</div>
                        <div style="font-size:10px; color:#888;">Notifikasi Peringatan Kuning</div>
                    </div>
                    <label class="lapak1-switch">
                        <input type="checkbox" id="sla2mToggle" ${state.slaNotif2minEnabled ? 'checked' : ''}>
                        <span class="lapak1-slider"></span>
                    </label>
                </div>
                <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.3); padding:10px 12px; border-radius:10px; border-left: 3px solid #ff4757;">
                    <div>
                        <div style="font-size:12px; font-weight:700; color:#ff4757;">Timer 3 Menit</div>
                        <div style="font-size:10px; color:#888;">Alert Merah Cepat</div>
                    </div>
                    <label class="lapak1-switch">
                        <input type="checkbox" id="sla3mToggle" ${state.slaNotif3minEnabled ? 'checked' : ''}>
                        <span class="lapak1-slider"></span>
                    </label>
                </div>
            </div>
        `;
        slaCard.querySelector('#sla2mToggle').onchange = (e) => {
            e.stopPropagation();
            state.slaNotif2minEnabled = e.target.checked;
            setStore(SLA_NOTIF_2MIN_KEY, state.slaNotif2minEnabled);
            window.dispatchEvent(new CustomEvent('slaNotifSettingChanged', { detail: { type: '2min', enabled: state.slaNotif2minEnabled } }));
        };
        slaCard.querySelector('#sla3mToggle').onchange = (e) => {
            e.stopPropagation();
            state.slaNotif3minEnabled = e.target.checked;
            setStore(SLA_NOTIF_3MIN_KEY, state.slaNotif3minEnabled);
            window.dispatchEvent(new CustomEvent('slaNotifSettingChanged', { detail: { type: '3min', enabled: state.slaNotif3minEnabled } }));
        };
        container.appendChild(slaCard);

        const fontCard = document.createElement('div');
        fontCard.className = 'lapak1-card';
        fontCard.style.borderLeft = '4px solid #00d4ff';
        fontCard.innerHTML = `
            <div class="lapak1-card-title">
                <span style="color:#00d4ff; font-weight:800;">🔤 Ukuran Font Highlight</span>
                <span style="font-size:10px; color:#00d4ff; font-weight:700;">OTOMATIS (INHERIT)</span>
            </div>
            <div style="font-size:11px; color:#aaa; line-height:1.4;">
                Ukuran font highlight secara otomatis mengikuti ukuran font obrolan bawaan di LiveChat agar selalu rapi dan simetris.
            </div>
        `;
        container.appendChild(fontCard);

        const backupCard = document.createElement('div');
        backupCard.className = 'lapak1-card';
        backupCard.style.borderLeft = '4px solid #00f260';
        backupCard.innerHTML = `
            <div class="lapak1-card-title">
                <span style="color:#00f260; font-weight:800;">💾 Backup & Restore Data</span>
                <span style="font-size:10px; color:#888;">JSON Format</span>
            </div>
            <div style="display:flex; gap:10px;">
                <button id="btnExport" class="lapak1-btn-primary" style="flex:1; padding:10px;">📤 Export Backup</button>
                <button id="btnImport" class="lapak1-btn-primary" style="flex:1; padding:10px; background:linear-gradient(135deg, #00f260, #0575e6);">📥 Import Data</button>
            </div>
        `;
        backupCard.querySelector('#btnExport').onclick = (e) => {
            e.stopPropagation();
            const data = {
                highlighter: GM_getValue(STORAGE_KEY),
                config: GM_getValue(CONFIG_KEY),
                bgPos: GM_getValue(BG_POSITION_KEY),
                sidebarPos: GM_getValue(SIDEBAR_POS_KEY),
                chatBgPos: GM_getValue(CHAT_BG_POS_KEY),
                opacity: GM_getValue(CONTAINER_OPACITY_KEY),
                borderColor: GM_getValue(BORDER_COLOR_KEY),
                borderThickness: GM_getValue(BORDER_THICKNESS_KEY),
                borderRadius: GM_getValue(BORDER_RADIUS_KEY),
                date: new Date().toISOString()
            };
            const blob = new Blob([JSON.stringify(data, null, 4)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `HighlighterPro_Backup_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
            a.click();
            URL.revokeObjectURL(url);
        };
        const importFile = document.createElement('input');
        importFile.type = 'file';
        importFile.accept = '.json';
        importFile.style.display = 'none';
        importFile.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (re) => {
                try {
                    const data = JSON.parse(re.target.result);
                    if (data.highlighter) setStore(STORAGE_KEY, data.highlighter);
                    if (data.config) setStore(CONFIG_KEY, data.config);
                    if (data.bgPos) setStore(BG_POSITION_KEY, data.bgPos);
                    if (data.sidebarPos) setStore(SIDEBAR_POS_KEY, data.sidebarPos);
                    if (data.chatBgPos) setStore(CHAT_BG_POS_KEY, data.chatBgPos);
                    if (data.opacity !== undefined) setStore(CONTAINER_OPACITY_KEY, data.opacity);
                    if (data.borderColor) setStore(BORDER_COLOR_KEY, data.borderColor);
                    if (data.borderThickness) setStore(BORDER_THICKNESS_KEY, data.borderThickness);
                    if (data.borderRadius) setStore(BORDER_RADIUS_KEY, data.borderRadius);
                    alert('✅ Data Berhasil Diimport! Me-refresh halaman...');
                    location.reload();
                } catch (err) {
                    alert('❌ Format file JSON tidak valid!');
                }
            };
            reader.readAsText(file);
        };
        backupCard.querySelector('#btnImport').onclick = (e) => {
            e.stopPropagation();
            importFile.click();
        };
        container.appendChild(backupCard);
        container.appendChild(importFile);
    }

    renderDashboard();

    // Toggle Dashboard Display
    function toggleDash() {
        const isVisible = dash.style.display === 'block';
        if (isVisible) {
            dash.style.display = 'none';
            state.isDashVisible = false;
        } else {
            dash.style.display = 'block';
            updateDashPosition();
            state.isDashVisible = true;
        }
    }

    function updateDashPosition() {
        const bRect = orb.getBoundingClientRect();
        let tx = bRect.left;
        let ty = bRect.bottom + 10;
        if (tx + 400 > window.innerWidth) tx = window.innerWidth - 410;
        if (tx < 10) tx = 10;
        if (ty + 580 > window.innerHeight) ty = bRect.top - 590;
        if (ty < 10) ty = 10;
        dash.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    }

    let startX, startY, origX, origY;
    function onMouseMove(e) {
        state.dragMoved = true;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        state.orbPos.x = Math.max(0, Math.min(origX + dx, window.innerWidth - 60));
        state.orbPos.y = Math.max(0, Math.min(origY + dy, window.innerHeight - 60));
        orb.style.transform = `translate3d(${state.orbPos.x}px, ${state.orbPos.y}px, 0)`;
        if (state.isDashVisible) updateDashPosition();
    }
    function onMouseUp() {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        setStore(ORB_POS_KEY, state.orbPos);
        setTimeout(() => { state.dragMoved = false; }, 50);
    }
    orb.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        startY = e.clientY;
        origX = state.orbPos.x;
        origY = state.orbPos.y;
        state.dragMoved = false;
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    });
    orb.onclick = (e) => {
        e.stopPropagation();
        if (!state.dragMoved) toggleDash();
    };
    document.addEventListener('click', (e) => {
        if (state.isDashVisible && !dash.contains(e.target) && !orb.contains(e.target)) {
            if (e.composedPath && e.composedPath().includes(dash)) return;
            toggleDash();
        }
    });

    setTimeout(() => {
        const masterToggle = dash.querySelector('#lapak1-master-toggle');
        if (masterToggle) {
            masterToggle.onchange = (e) => {
                e.stopPropagation();
                state.isHighlighterEnabled = e.target.checked;
                setStore(ENABLED_KEY, state.isHighlighterEnabled);
                updateCSS();
                if (state.isHighlighterEnabled) runHighlight();
            };
        }
    }, 100);

    // ============================================================
    // INISIALISASI
    // ============================================================
    function init() {
        if (document.body && !document.getElementById('chat-hl-bubble')) {
            document.body.appendChild(orb);
            document.body.appendChild(dash);
            applyBackground();
            initSidebarObserver();
            initObserver();
            runHighlight();
            console.log('✨ LAPAK1 - v3.9.5 Loaded! .css-ckkl4v hanya border line (tanpa background). Stabil & aman.');
        } else if (!document.body) {
            setTimeout(init, 100);
        }
    }

    init();
})();