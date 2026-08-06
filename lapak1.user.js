// ==UserScript==
// @name         LAPAK1 - Custom Chat Word Highlighter with Dashboard (PREMIUM UI)
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  Ultra-reliable chat highlighter & background engine with 450px sidebars & crystal clear transparency (zero blur distortion).
// @match        https://my.livechatinc.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';
    const RKD_LOGO_BASE64 = "https://socket-lapak99.hokibgs.com/uploads/lapak99/media/2026/07/media-1784345069059-380570203.png";

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
        containerOpacity: getStore(CONTAINER_OPACITY_KEY, 15), // True clear 15% default!
        orbPos: getStore(ORB_POS_KEY, { x: 20, y: 80 }),
        dashConfig: {
            profileImg: 'https://i.imgur.com/EcWMSY4.png',
            mcLabel: 'Lapak99',
            dashBg: 'rgba(10, 10, 20, 0.96)',
            bubbleBg: 'radial-gradient(circle at 30% 30%, rgba(255,215,0,0.35), rgba(0,0,0,0.75))',
            chatBgImage: '',    // Main Chat Feed Background
            sidebarBgImage: '', // Background for css-1cmlcj3 & css-1orfco2 Sidebars
            ...getStore(CONFIG_KEY, {})
        },
        dragMoved: false,
        isDashVisible: false,
        activeTab: 'words' // 'words', 'background', 'settings'
    };

    // Color Groups Definition
    const colorGroups = {
        Blue: {
            textColor: '#ffffff',
            grad: 'linear-gradient(135deg, #00d2ff, #3a7bd5)',
            shadow: 'rgba(0, 210, 255, 0.4)',
            accentColor: '#00d2ff',
            words: ['dp', 'deposit', 'pola', 'depo', 'tf', 'dpo', 'dep0', 'defisit', 'depositnya', 'deposit dong', 'top up', 'topup', 'depositkan', 'Topap'],
            icon: '🔵'
        },
        Red: {
            textColor: '#ffffff',
            grad: 'linear-gradient(135deg, #ff0844, #ffb199)',
            shadow: 'rgba(255, 8, 68, 0.4)',
            accentColor: '#ff0844',
            words: ['anjing', 'ajing', 'babi', 'bangsat', 'bangst', 'puki', 'cuki', 'konto', 'sampah', 'tai', 'biadap', 'Pukimak', 'bangsad', 'kontol', 'memek', 'ngentot', 'jancok', 'taik', 'bajingan', 'Pantek', 'Picek', 'asuu', 'pepek', 'Anjong', 'Bujang', 'Monyet', 'binatang', 'lonte', 'Kampret', 'bangke', 'banke', 'setan', 'setab', 'kampang', 'berak', 'pejoh', 'Tempek', 'bgst', 'Najis', 'ajg', 'anjeng', 'anjingg'],
            icon: '🔴'
        },
        Green: {
            textColor: '#ffffff',
            grad: 'linear-gradient(135deg, #00f260, #0575e6)',
            shadow: 'rgba(0, 242, 96, 0.4)',
            accentColor: '#00f260',
            words: ['wd', 'Wd', 'WD', 'withdraw', 'withdrawal', 'tarik', 'penarikan', 'pnarikan', 'witdraw', 'Widrow', 'widraw', 'Widrau'],
            icon: '🟢'
        },
        Yellow: {
            textColor: '#000000',
            grad: 'linear-gradient(135deg, #f9d423, #ff4e50)',
            shadow: 'rgba(249, 212, 35, 0.4)',
            accentColor: '#f9d423',
            words: ['bonus', 'claim', 'klaim', 'bonusnya', 'klaim bonus', 'bonus dong', 'clame', 'freespin', 'free spin', 'buyspin', 'buy spin', 'sketer', 'scater', 'scatter'],
            icon: '🟡'
        },
        Purple: {
            textColor: '#ffffff',
            grad: 'linear-gradient(135deg, #8e2de2, #4a00e0)',
            shadow: 'rgba(142, 45, 226, 0.4)',
            accentColor: '#8e2de2',
            words: ['batalin', 'batalkan', 'sandi', 'password', 'pasword', 'paspor', 'pasport', 'lupa sandi', 'lupa password', 'ganti password', 'reset password', 'paswod', 'Lupa id', 'lupa akun', 'lupa pw', 'lupa pin', 'paspot', 'reset deposit', 'Lupa pasword', 'Lupa password', 'reset pasword'],
            icon: '🟣'
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
        setStore(CONTAINER_OPACITY_KEY, state.containerOpacity);
    }

    // Chat Background Engine (Main Feed & Sidebars Perfectly Layered)
    function applyBackground() {
        let bgStyle = document.getElementById('lapak-chat-bg-style');
        if (!bgStyle) {
            bgStyle = document.createElement('style');
            bgStyle.id = 'lapak-chat-bg-style';
            document.head.appendChild(bgStyle);
        }

        const bgSizes = { cover: 'cover', contain: 'contain', stretch: '100% 100%', tile: 'auto', center: 'auto', span: 'cover' };
        const bgRepeats = { tile: 'repeat', default: 'no-repeat' };

        const mainBgImage = state.dashConfig.chatBgImage || '';
        const mainSizeVal = bgSizes[state.bgPosition] || 'cover';
        const mainRepeatVal = bgRepeats[state.bgPosition] || 'no-repeat';

        const sidebarBgImage = state.dashConfig.sidebarBgImage || '';
        const sidebarSizeVal = bgSizes[state.sidebarBgPosition] || 'cover';
        const sidebarRepeatVal = bgRepeats[state.sidebarBgPosition] || 'no-repeat';

        let cssContent = '';

        // 1. Background Main Feed (Visible at z-index 0, content at z-index 1)
        if (mainBgImage) {
            cssContent += `
                .css-1dbc3ly, .css-7eezsw, [data-testid="feed-container"] {
                    position: relative !important;
                    background: transparent !important;
                }
                .css-1dbc3ly::before, .css-7eezsw::before, [data-testid="feed-container"]::before {
                    content: '' !important;
                    position: absolute !important;
                    top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
                    z-index: 0 !important;
                    pointer-events: none !important;
                    background-image: url('${mainBgImage}') !important;
                    background-size: ${mainSizeVal} !important;
                    background-position: center !important;
                    background-repeat: ${mainRepeatVal} !important;
                }
            `;
        }

        // 2. Background Sidebars (css-1cmlcj3 & css-1orfco2)
        if (sidebarBgImage) {
            cssContent += `
                .css-1cmlcj3, .css-1orfco2 {
                    position: relative !important;
                    background: transparent !important;
                }
                .css-1cmlcj3::before, .css-1orfco2::before {
                    content: '' !important;
                    position: absolute !important;
                    top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
                    z-index: 0 !important;
                    pointer-events: none !important;
                    background-image: url('${sidebarBgImage}') !important;
                    background-size: ${sidebarSizeVal} !important;
                    background-position: center !important;
                    background-repeat: ${sidebarRepeatVal} !important;
                }
                .css-1cmlcj3 > *, .css-1orfco2 > * {
                    position: relative !important;
                    z-index: 1 !important;
                }
            `;
        }

        bgStyle.textContent = cssContent;
    }

    // Ultra-Fast Regex Engine with Flexible Boundaries
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
        const opacityAlpha = (state.containerOpacity / 100).toFixed(2);

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

            /* GLOBAL CSS VARIABLE OVERRIDES FOR LIVECHAT LAYOUT */
            :root {
                --sidebar-width: 450px !important;
                --chats-list-width: 450px !important;
                --details-width: 450px !important;
            }


            /* HIGH-SPECIFICITY 450px SIDEBAR OVERRIDES (EXCLUDING MINIMIZED/COLLAPSED PANELS) */
            html body .css-1cmlcj3:not([aria-hidden="true"]):not([data-state="collapsed"]):not([data-collapsed="true"]):not([class*="collapsed"]):not([class*="minimized"]),
            html body .css-1orfco2:not([aria-hidden="true"]):not([data-state="collapsed"]):not([data-collapsed="true"]):not([class*="collapsed"]):not([class*="minimized"]),
            html body [data-testid="chats-list"]:not([aria-hidden="true"]):not([data-state="collapsed"]):not([data-collapsed="true"]):not([class*="collapsed"]):not([class*="minimized"]),
            html body [data-testid="chats-list-container"]:not([aria-hidden="true"]):not([data-state="collapsed"]):not([data-collapsed="true"]):not([class*="collapsed"]):not([class*="minimized"]),
            html body [data-testid="details-panel"]:not([aria-hidden="true"]):not([data-state="collapsed"]):not([data-collapsed="true"]):not([class*="collapsed"]):not([class*="minimized"]),
            html body [data-testid="customer-details"]:not([aria-hidden="true"]):not([data-state="collapsed"]):not([data-collapsed="true"]):not([class*="collapsed"]):not([class*="minimized"]) {
                width: 450px !important;
                min-width: 450px !important;
                max-width: 450px !important;
                flex: 0 0 450px !important;
                flex-grow: 0 !important;
                flex-shrink: 0 !important;
                flex-basis: 450px !important;
            }

            /* FORCE ALL INNER CHILD CONTAINERS INSIDE ACTIVE SIDEBARS TO FILL THE 450px WIDTH */
            .css-1cmlcj3:not([aria-hidden="true"]):not([data-state="collapsed"]) > *,
            .css-1orfco2:not([aria-hidden="true"]):not([data-state="collapsed"]) > * {
                max-width: 100% !important;
                box-sizing: border-box !important;
            }

            /* ALWAYS ENSURE ACTION BAR AND ITS BUTTONS ARE 100% VISIBLE & CLICKABLE */
            [class*="lc-ActionBar-module"],
            [class*="lc-ActionBar-module"] *,
            [data-testid="action-bar"],
            [data-testid="action-bar"] * {
                opacity: 1 !important;
                visibility: visible !important;
                pointer-events: auto !important;
            }

            /* ACTION BAR NARROW VERTICAL CONTAINER (PREVENT CLIPPING OF TOP PROFILE BUTTON) */
            [class*="lc-ActionBar-module__action-bar"] {
                width: 48px !important;
                min-width: 48px !important;
                max-width: 48px !important;
                flex: 0 0 48px !important;
                background: rgba(16, 12, 28, 0.85) !important;
                border-left: 1px solid rgba(255, 255, 255, 0.06) !important;
                box-sizing: border-box !important;
                overflow: visible !important;
                z-index: 10 !important;
            }

            /* ACTION BAR ITEMS LIST (COMPACT TOP STACKING AT TOP-RIGHT) */
            [class*="lc-ActionBar-module__action-bar__items"] {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: flex-start !important;
                gap: 6px !important;
                padding: 4px 2px !important;
                width: 100% !important;
                box-sizing: border-box !important;
                overflow: visible !important;
            }

            /* ACTION BAR BUTTON WRAPPER & SPECIFIC ICON BUTTONS */
            [class*="lc-ActionBar-module__action-bar__items__button-wrapper"],
            .lc-ActionBar-module__action-bar__items__button-wrapper___sgdUc,
            .lc-ActionBar-module__action-bar__items__button-wrapper--vertical___8Aq0c {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                width: 36px !important;
                height: 36px !important;
                min-width: 36px !important;
                min-height: 36px !important;
                max-width: 36px !important;
                max-height: 36px !important;
                margin: 0 auto !important;
                padding: 0 !important;
                border-radius: 8px !important;
                transition: all 0.2s ease-in-out !important;
                background: transparent !important;
                box-sizing: border-box !important;
            }

            [class*="lc-ActionBar-module__action-bar__items__button-wrapper"]:hover,
            .lc-ActionBar-module__action-bar__items__button-wrapper___sgdUc:hover {
                background: rgba(255, 255, 255, 0.12) !important;
                transform: scale(1.08) !important;
            }

            /* INNER BUTTON & ICON CENTERING FOR TARGET CLASS */
            .lc-Button-module__btn__icon___-CG5y,
            .lc-Button-module__btn__icon--left___Xke3Q,
            .lc-Icon-module__icon___J5RH5,
            .lc-Icon-module__icon--primary___lclud,
            [class*="lc-ActionBar-module__action-bar__items__button-wrapper"] button,
            [class*="lc-ActionBar-module__action-bar__items__button-wrapper"] a,
            [class*="lc-ActionBar-module__action-bar__items__button-wrapper"] [role="button"],
            [class*="lc-ActionBar-module__action-bar__items__button-wrapper"] svg,
            [class*="lc-ActionBar-module__action-bar__items__button-wrapper"] img {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                margin: auto !important;
                opacity: 1 !important;
                visibility: visible !important;
            }

            .lc-Icon-module__icon___J5RH5,
            .lc-Button-module__btn__icon___-CG5y {
                width: 20px !important;
                height: 20px !important;
            }

            /* COMIC SANS MS FONT FOR TARGET CHAT PARAGRAPH TEXT */
            .lc-Typography-module__paragraph-sm___5KRhm,
            .privacy-masker,
            .css-1p4wsor,
            [class*="lc-Typography-module__paragraph-sm"],
            [class*="privacy-masker"],
            [class*="css-1p4wsor"] {
                font-family: 'Comic Sans MS', 'Comic Sans', cursive, sans-serif !important;
            }

            /* BENING GLOSSY BIRU MUDA TEMBUS PANDANG FOR css-3dz5hy */
            .css-3dz5hy,
            [class*="css-3dz5hy"] {
                background: linear-gradient(135deg, rgba(135, 206, 250, 0.15) 0%, rgba(0, 150, 240, 0.2) 100%) !important;
                backdrop-filter: blur(8px) !important;
                -webkit-backdrop-filter: blur(8px) !important;
                border: 1px solid rgba(135, 206, 250, 0.3) !important;
                border-radius: 12px !important;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.25) !important;
                transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
            }

            .css-3dz5hy:hover,
            [class*="css-3dz5hy"]:hover {
                background: linear-gradient(135deg, rgba(135, 206, 250, 0.22) 0%, rgba(0, 165, 255, 0.28) 100%) !important;
                border-color: rgba(135, 206, 250, 0.5) !important;
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.35) !important;
                transform: translateY(-1px) scale(1.008) !important;
            }

            /* BENING GLOSSY KUNING TEMBUS PANDANG FOR .css-1da7yod,.css-1h9c9yl,.css-jv3dry, .css-10eivaj, .css-bdqpdr, .css-1flhal4, .css-sj0k97, .css-17le0oi,.css-axqjk1, .css-1da7yod,.css-1h9c9yl*/
            .css-1da7yod,.css-1h9c9yl,.css-jv3dry, .css-10eivaj, .css-bdqpdr, .css-1flhal4, .css-sj0k97, .css-17le0oi,.css-axqjk1, .css-1da7yod, .css-1h9c9yl
            [class*="css-1da7yod"],
            .css-1h9c9yl,
            [class*="css-1h9c9yl"] {
                background: linear-gradient(135deg, rgba(255, 215, 0, 0.16) 0%, rgba(255, 175, 0, 0.22) 100%) !important;
                backdrop-filter: blur(8px) !important;
                -webkit-backdrop-filter: blur(8px) !important;
                border: 1px solid rgba(255, 215, 0, 0.35) !important;
                border-radius: 12px !important;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3) !important;
                transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
            }

            .css-1da7yod:hover,
            [class*="css-1da7yod"]:hover,
            .css-1h9c9yl:hover,
            [class*="css-1h9c9yl"]:hover {
                background: linear-gradient(135deg, rgba(255, 225, 50, 0.24) 0%, rgba(255, 190, 0, 0.3) 100%) !important;
                border-color: rgba(255, 225, 100, 0.55) !important;
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4) !important;
                transform: translateY(-1px) scale(1.008) !important;
            }

            /* STRICTLY TARGET ONLY css-1l83s7m AND css-9oh56r AND THEIR DIRECT CHILDREN */
            .css-1l83s7m *, .css-1l83s7m *::before, .css-1l83s7m *::after,
            .css-9oh56r *, .css-9oh56r *::before, .css-9oh56r *::after {
                background-color: transparent !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
            }

            /* EXCEPTION: PRESERVE HIGHLIGHT BADGES & DASHBOARD BUTTONS */
            [data-lapak-hl="1"], [class*="hl-"], #chat-hl-bubble, #chat-hl-dashboard, #chat-hl-dashboard * {
                background-color: initial;
            }

            /* APPLY TRANSPARENCY SLIDER STRICTLY TO css-1l83s7m AND css-9oh56r + FIT 450px SIDEBAR */
            .css-1l83s7m,
            .css-9oh56r {
                background-color: rgba(16, 12, 28, ${opacityAlpha}) !important;
                background-image: none !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                transition: background 0.2s ease !important;
                width: 100% !important;
                max-width: 100% !important;
                min-width: 0 !important;
                box-sizing: border-box !important;
                overflow-x: hidden !important;
                overflow-y: auto !important;
            }

            .css-1l83s7m > *,
            .css-9oh56r > * {
                max-width: 100% !important;
                box-sizing: border-box !important;
                overflow-x: hidden !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
            }

            /* ENHANCED STYLING FOR DETAILS CARDS (css-gd0tl8) FIT FOR 450px SIDEBAR */
            .css-gd0tl8,
            [class*="css-gd0tl8"] {
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                background: rgba(20, 20, 35, 0.25) !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
                border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
                border-left: 4px solid #00d4ff !important;
                border-radius: 14px !important;
                padding: 12px 16px !important;
                margin: 8px 0 !important;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35) !important;
                transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
            }

            .css-gd0tl8:hover,
            [class*="css-gd0tl8"]:hover {
                background: rgba(30, 30, 50, 0.4) !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                border-left-color: #ffd700 !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 8px 25px rgba(0, 212, 255, 0.25) !important;
            }

            .css-gd0tl8 > *,
            [class*="css-gd0tl8"] > * {
                max-width: 100% !important;
                box-sizing: border-box !important;
            }


            /* FIT css-d2wrxb INSIDE 450px SIDEBAR â€” 100% CRYSTAL CLEAR TRANSPARENT */
            .css-d2wrxb,
            [class*="css-d2wrxb"] {
                width: 100% !important;
                max-width: 100% !important;
                min-width: 0 !important;
                box-sizing: border-box !important;
                overflow-x: hidden !important;
                overflow-y: auto !important;
                text-overflow: ellipsis !important;
                padding: 6px 10px !important;
                margin: 0 !important;
                background: transparent !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
            }

            .css-d2wrxb > *,
            [class*="css-d2wrxb"] > * {
                max-width: 100% !important;
                box-sizing: border-box !important;
                overflow-x: hidden !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                background: transparent !important;
            }

            /* LIVECHAT MODE TERANG (LIGHT MODE): TULISAN HITAM BOLD ULTRA TAMPIL PADA LATAR BENING */
            html[data-theme="light"] .css-d2wrxb,
            html[data-theme="light"] [class*="css-d2wrxb"],
            body[data-theme="light"] .css-d2wrxb,
            body[data-theme="light"] [class*="css-d2wrxb"],
            .lc-light-theme .css-d2wrxb,
            .lc-light-theme [class*="css-d2wrxb"],
            [class*="light-theme"] .css-d2wrxb,
            [class*="light-theme"] [class*="css-d2wrxb"] {
                background: transparent !important;
            }

            html[data-theme="light"] .css-d2wrxb *,
            html[data-theme="light"] [class*="css-d2wrxb"] *,
            body[data-theme="light"] .css-d2wrxb *,
            body[data-theme="light"] [class*="css-d2wrxb"] *,
            .lc-light-theme .css-d2wrxb *,
            .lc-light-theme [class*="css-d2wrxb"] *,
            [class*="light-theme"] .css-d2wrxb *,
            [class*="light-theme"] [class*="css-d2wrxb"] * {
                color: #f5a623 !important;
                font-weight: 800 !important;
                opacity: 1 !important;
            }

            /* LIVECHAT MODE GELAP (DARK MODE): TULISAN PUTIH BOLD TERANG PADA LATAR BENING */
            html[data-theme="dark"] .css-d2wrxb,
            html[data-theme="dark"] [class*="css-d2wrxb"],
            body[data-theme="dark"] .css-d2wrxb,
            body[data-theme="dark"] [class*="css-d2wrxb"],
            .lc-dark-theme .css-d2wrxb,
            .lc-dark-theme [class*="css-d2wrxb"],
            [class*="dark-theme"] .css-d2wrxb,
            [class*="dark-theme"] [class*="css-d2wrxb"] {
                background: transparent !important;
            }

            html[data-theme="dark"] .css-d2wrxb *,
            html[data-theme="dark"] [class*="css-d2wrxb"] *,
            body[data-theme="dark"] .css-d2wrxb *,
            body[data-theme="dark"] [class*="css-d2wrxb"] *,
            .lc-dark-theme .css-d2wrxb *,
            .lc-dark-theme [class*="css-d2wrxb"] *,
            [class*="dark-theme"] .css-d2wrxb *,
            [class*="dark-theme"] [class*="css-d2wrxb"] * {
                color: #ffffff !important;
                font-weight: 800 !important;
                opacity: 1 !important;
            }

            /* DISTINCT ACCENT LINE FOR SIDEBARS (css-1cmlcj3 & css-1orfco2) */
            .css-1cmlcj3, .css-1orfco2 {
                background: rgba(16, 12, 28, 0.85) !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                border-right: 3px solid #7b2ffc !important;
                box-shadow: 4px 0 25px rgba(123, 47, 252, 0.2) !important;
                position: relative !important;
            }

            /* KOTAK DENGAN SISI MELENGKUNG FOR css-99u7cn chat-item mp-lined */
            .css-99u7cn,
            .chat-item,
            .mp-lined,
            [class*="css-99u7cn"] {
                border-radius: 12px !important;
            }

            /* Dashboard UI Components */
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

            /* Navigation Tabs */
            .lapak1-nav-bar { display: flex; gap: 4px; background: rgba(0, 0, 0, 0.4); padding: 4px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 14px; }
            .lapak1-tab-btn { flex: 1; padding: 8px 10px; font-size: 11px; font-weight: 700; border-radius: 8px; border: none; background: transparent; color: #8888a0; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 6px; }
            .lapak1-tab-btn:hover { color: #ffffff; background: rgba(255, 255, 255, 0.05); }
            .lapak1-tab-btn.active { background: linear-gradient(135deg, #00d4ff 0%, #7b2ffc 100%); color: #ffffff; box-shadow: 0 4px 15px rgba(0, 212, 255, 0.3); }

            /* Card Section Styling with Distinct Colored Left Borders */
            .lapak1-card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07); border-left: 4px solid #00d4ff; border-radius: 14px; padding: 14px; margin-bottom: 12px; transition: all 0.2s ease; color: #ffffff; }
            .lapak1-card:hover { border-color: rgba(255, 255, 255, 0.15); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35); }
            .lapak1-card-title { font-size: 12px; font-weight: 700; color: #e0e0ff; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; }

            /* Input Fields & Buttons */
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

    // Highlighting Logic - Per-Text-Node Highlighting Engine
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

    // Continuous Chat Scanner (Scans all message bubbles dynamically)
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

    // Debounced Observer & Event Listeners
    let highlightTimer = null;
    function scheduleHighlight() {
        if (highlightTimer) return;
        highlightTimer = setTimeout(() => {
            highlightTimer = null;
            runHighlight();
        }, 100);
    }

    const observer = new MutationObserver(() => {
        scheduleHighlight();
    });

    function initObserver() {
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    // Instantly re-run highlight on user interaction or chat switch
    window.addEventListener('popstate', scheduleHighlight);
    window.addEventListener('hashchange', scheduleHighlight);
    document.addEventListener('click', () => setTimeout(scheduleHighlight, 150));

    // Create Floating Orb
    const orb = document.createElement('div');
    orb.id = 'chat-hl-bubble';
    orb.style.cssText = `
        position: fixed; top: 0; left: 0;
        width: 58px; height: 58px;
        background: radial-gradient(circle at 30% 30%, rgba(255, 215, 0, 0.35), rgba(15, 15, 25, 0.95)) !important;
        border: 2px solid #ffd700 !important;
        border-radius: 50% !important;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        cursor: pointer; z-index: 999999;
        box-shadow: 0 0 15px rgba(255, 215, 0, 0.4), 0 8px 25px rgba(0,0,0,0.85) !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transform: translate3d(${state.orbPos.x}px, ${state.orbPos.y}px, 0);
        user-select: none;
        touch-action: none;
        overflow: hidden !important;
    `;

    orb.innerHTML = `
        <img src="${RKD_LOGO_BASE64}" style="width: 50px; height: 50px; object-fit: contain; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.8)); pointer-events: none;">
    `;

    // Create Dashboard Container
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

    // Prevent clicks inside dashboard from bubbling to document
    dash.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Dashboard Header
    const dashHeader = document.createElement('div');
    dashHeader.style.cssText = 'padding: 14px 18px; background: rgba(0,0,0,0.35); border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between;';
    dashHeader.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
            <img src="${RKD_LOGO_BASE64}" style="width:28px; height:28px; object-fit:contain; filter:drop-shadow(0 2px 5px rgba(0,0,0,0.6));">
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

    // Dashboard Content Wrapper
    const dashContent = document.createElement('div');
    dashContent.style.cssText = 'padding: 16px 18px; max-height: 500px; overflow-y: auto; box-sizing: border-box;';
    dash.appendChild(dashContent);

    function renderDashboard() {
        dashContent.innerHTML = '';

        // Navigation Tabs Bar
        const navBar = document.createElement('div');
        navBar.className = 'lapak1-nav-bar';
        navBar.innerHTML = `
            <button class="lapak1-tab-btn ${state.activeTab === 'words' ? 'active' : ''}" data-tab="words">\uD83D\uDCDD Kelompok Kata</button>
            <button class="lapak1-tab-btn ${state.activeTab === 'background' ? 'active' : ''}" data-tab="background">\uD83D\uDDBC Background</button>
            <button class="lapak1-tab-btn ${state.activeTab === 'settings' ? 'active' : ''}" data-tab="settings">\u2699\uFE0F Pengaturan</button>
        `;

        navBar.querySelectorAll('.lapak1-tab-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                state.activeTab = btn.dataset.tab;
                renderDashboard();
            };
        });

        dashContent.appendChild(navBar);

        // Tab Content Router
        if (state.activeTab === 'words') {
            renderWordsTab(dashContent);
        } else if (state.activeTab === 'background') {
            renderBackgroundTab(dashContent);
        } else if (state.activeTab === 'settings') {
            renderSettingsTab(dashContent);
        }
    }

    // TAB 1: KELOMPOK KATA
    function renderWordsTab(container) {
        // Summary Header Card
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
                <div style="font-size:24px;">\uD83C\uDFF7\uFE0F</div>
            </div>
        `;
        container.appendChild(summaryCard);

        // Color Groups Cards (With Unique Distinct Color Left Accent Borders)
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

            // Chips Wrapper
            const chipsDiv = document.createElement('div');
            chipsDiv.style.cssText = 'display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;';

            group.words.forEach((w, idx) => {
                const chip = document.createElement('span');
                chip.style.cssText = `background:rgba(255,255,255,0.06); border:1px solid ${group.accentColor}44; border-radius:12px; padding:3px 10px; font-size:11px; display:inline-flex; align-items:center; gap:6px; color:#e0e0ff; transition: all 0.2s ease;`;
                chip.innerHTML = `<span>${w}</span> <span style="cursor:pointer; color:#ff4757; font-weight:800;" title="Hapus">\u2715</span>`;
                chip.querySelector('span:last-child').onclick = (e) => {
                    e.stopPropagation();
                    group.words.splice(idx, 1);
                    saveGroups();
                };
                chipsDiv.appendChild(chip);
            });
            card.appendChild(chipsDiv);

            // Add Input Row
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

    // TAB 2: BACKGROUND CHAT (3 PANELS: FEED, SIDEBARS & TRANSPARENCY SLIDER STRICTLY FOR css-1l83s7m & css-9oh56r)
    function renderBackgroundTab(container) {
        // Panel 1: Main Chat Background (Cyan Accent Border)
        const mainBgCard = document.createElement('div');
        mainBgCard.className = 'lapak1-card';
        mainBgCard.style.borderLeft = '4px solid #00d4ff';

        mainBgCard.innerHTML = `
            <div class="lapak1-card-title">
                <span style="color:#00d4ff; font-weight:800;">ðŸ’¬ Background Utama (Feed Chat)</span>
                <span style="font-size:10px; color:#00d4ff; font-weight:700;">FEED</span>
            </div>

            <div style="margin-bottom:14px;">
                <label style="font-size:11px; color:#aaa; display:block; margin-bottom:6px;">URL Gambar Background Utama</label>
                <div style="display:flex; gap:6px;">
                    <input type="text" id="lapak1-main-bg-url" class="lapak1-input" value="${state.dashConfig.chatBgImage || ''}" placeholder="Masukkan URL Gambar Feed Utama..." style="flex:1;">
                    <button id="lapak1-main-bg-upload" class="lapak1-btn-primary">Upload</button>
                    <button id="lapak1-main-bg-remove" class="lapak1-btn-danger">âœ•</button>
                </div>
            </div>

            ${state.dashConfig.chatBgImage ? `
                <div style="margin-bottom:14px; border-radius:10px; overflow:hidden; border:1px solid rgba(0,212,255,0.3); height:85px; position:relative;">
                    <img src="${state.dashConfig.chatBgImage}" style="width:100%; height:100%; object-fit:cover;">
                </div>
            ` : ''}

            <div class="lapak1-card-title" style="margin-top:10px;">
                <span>ðŸ“ Posisi Layout (${state.bgPosition.toUpperCase()})</span>
            </div>
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px;">
                ${['cover', 'contain', 'stretch', 'tile', 'center', 'span'].map(pos => `
                    <button class="lapak1-main-pos-btn" data-pos="${pos}" style="
                        padding:8px 4px;
                        background:${state.bgPosition === pos ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255,255,255,0.03)'};
                        border:1px solid ${state.bgPosition === pos ? '#00d4ff' : 'rgba(255,255,255,0.08)'};
                        border-radius:8px;
                        color:${state.bgPosition === pos ? '#00d4ff' : '#aaa'};
                        font-size:10px; font-weight:800; cursor:pointer; text-transform:uppercase; transition:all 0.2s ease;
                    ">${pos}</button>
                `).join('')}
            </div>
        `;
        container.appendChild(mainBgCard);

        // Bind Main Bg Events
        const mainInput = mainBgCard.querySelector('#lapak1-main-bg-url');
        const mainUploadBtn = mainBgCard.querySelector('#lapak1-main-bg-upload');
        const mainRemoveBtn = mainBgCard.querySelector('#lapak1-main-bg-remove');
        const mainPosBtns = mainBgCard.querySelectorAll('.lapak1-main-pos-btn');

        mainInput.onchange = (e) => {
            e.stopPropagation();
            state.dashConfig.chatBgImage = mainInput.value.trim();
            saveConfig();
            applyBackground();
            renderDashboard();
        };

        mainRemoveBtn.onclick = (e) => {
            e.stopPropagation();
            state.dashConfig.chatBgImage = '';
            saveConfig();
            applyBackground();
            renderDashboard();
        };

        const mainFileInput = document.createElement('input');
        mainFileInput.type = 'file';
        mainFileInput.accept = 'image/*';
        mainFileInput.style.display = 'none';
        mainFileInput.onchange = (e) => {
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
        mainUploadBtn.onclick = (e) => {
            e.stopPropagation();
            mainFileInput.click();
        };

        mainPosBtns.forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                state.bgPosition = btn.dataset.pos;
                saveConfig();
                applyBackground();
                renderDashboard();
            };
        });

        // Panel 2: Background Sidebars css-1cmlcj3 & css-1orfco2 (Gold Accent Border)
        const sidebarBgCard = document.createElement('div');
        sidebarBgCard.className = 'lapak1-card';
        sidebarBgCard.style.borderLeft = '4px solid #ffd700';

        sidebarBgCard.innerHTML = `
            <div class="lapak1-card-title">
                <span style="color:#ffd700; font-weight:800;">ðŸŽ¨ Background Sidebar (css-1cmlcj3 & css-1orfco2)</span>
                <span style="font-size:10px; color:#ffd700; font-weight:700;">SIDEBARS</span>
            </div>

            <div style="margin-bottom:14px;">
                <label style="font-size:11px; color:#aaa; display:block; margin-bottom:6px;">URL Gambar Background Sidebar</label>
                <div style="display:flex; gap:6px;">
                    <input type="text" id="lapak1-sidebar-bg-url" class="lapak1-input" value="${state.dashConfig.sidebarBgImage || ''}" placeholder="Masukkan URL Gambar Sidebar..." style="flex:1;">
                    <button id="lapak1-sidebar-bg-upload" class="lapak1-btn-primary" style="background:linear-gradient(135deg, #ffd700, #ff8c00); color:#000;">Upload</button>
                    <button id="lapak1-sidebar-bg-remove" class="lapak1-btn-danger">âœ•</button>
                </div>
            </div>

            ${state.dashConfig.sidebarBgImage ? `
                <div style="margin-bottom:14px; border-radius:10px; overflow:hidden; border:1px solid rgba(255,215,0,0.3); height:85px; position:relative;">
                    <img src="${state.dashConfig.sidebarBgImage}" style="width:100%; height:100%; object-fit:cover;">
                </div>
            ` : ''}

            <div class="lapak1-card-title" style="margin-top:10px;">
                <span>ðŸ“ Posisi Layout (${state.sidebarBgPosition.toUpperCase()})</span>
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

        // Panel 3: STRICT TRANSPARENCY SLIDER CONTROL FOR css-1l83s7m & css-9oh56r (Pink/Purple Accent Border)
        const containerCard = document.createElement('div');
        containerCard.className = 'lapak1-card';
        containerCard.style.borderLeft = '4px solid #ff007f';
        containerCard.innerHTML = `
            <div class="lapak1-card-title">
                <span style="color:#ff007f; font-weight:800;">ðŸŽšï¸ Transparansi Wadah Chat (css-1l83s7m & css-9oh56r)</span>
                <span id="lapak1-opacity-val" style="font-size:11px; color:#ff007f; font-weight:800;">${state.containerOpacity}%</span>
            </div>

            <div style="margin-top:6px; margin-bottom:4px;">
                <label style="font-size:10px; color:#aaa; display:block; margin-bottom:6px;">Khusus mengatur transparansi bening wadah css-1l83s7m & css-9oh56r:</label>
                <input type="range" id="lapak1-opacity-slider" min="0" max="100" value="${state.containerOpacity}" style="width:100%; cursor:pointer; accent-color:#ff007f;">
                <div style="display:flex; justify-content:space-between; font-size:9px; color:#888; margin-top:4px;">
                    <span>0% (Bening Penuh ðŸ’Ž)</span>
                    <span>50% (Sedang)</span>
                    <span>100% (Solid Pekat)</span>
                </div>
            </div>
        `;
        container.appendChild(containerCard);

        const opacitySlider = containerCard.querySelector('#lapak1-opacity-slider');
        const opacityVal = containerCard.querySelector('#lapak1-opacity-val');

        opacitySlider.oninput = (e) => {
            e.stopPropagation();
            state.containerOpacity = parseInt(e.target.value, 10);
            opacityVal.textContent = state.containerOpacity + '%';
            setStore(CONTAINER_OPACITY_KEY, state.containerOpacity);
            updateCSS();
        };
    }

    // TAB 3: PENGATURAN & BACKUP
    function renderSettingsTab(container) {
        // SLA Notifications Panel (Purple Accent Border)
        const slaCard = document.createElement('div');
        slaCard.className = 'lapak1-card';
        slaCard.style.borderLeft = '4px solid #7b2ffc';
        slaCard.innerHTML = `
            <div class="lapak1-card-title">
                <span style="color:#a766ff; font-weight:800;">ðŸ”” Kontrol Notifikasi SLA</span>
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

        // Font Size Info Card (Cyan Accent Border)
        const fontCard = document.createElement('div');
        fontCard.className = 'lapak1-card';
        fontCard.style.borderLeft = '4px solid #00d4ff';
        fontCard.innerHTML = `
            <div class="lapak1-card-title">
                <span style="color:#00d4ff; font-weight:800;">ðŸ”¤ Ukuran Font Highlight</span>
                <span style="font-size:10px; color:#00d4ff; font-weight:700;">OTOMATIS (INHERIT)</span>
            </div>
            <div style="font-size:11px; color:#aaa; line-height:1.4;">
                Ukuran font highlight secara otomatis mengikuti ukuran font obrolan bawaan di LiveChat agar selalu rapi dan simetris.
            </div>
        `;
        container.appendChild(fontCard);

        // Backup & Restore Card (Green Accent Border)
        const backupCard = document.createElement('div');
        backupCard.className = 'lapak1-card';
        backupCard.style.borderLeft = '4px solid #00f260';
        backupCard.innerHTML = `
            <div class="lapak1-card-title">
                <span style="color:#00f260; font-weight:800;">ðŸ’¾ Backup & Restore Data</span>
                <span style="font-size:10px; color:#888;">JSON Format</span>
            </div>
            <div style="display:flex; gap:10px;">
                <button id="btnExport" class="lapak1-btn-primary" style="flex:1; padding:10px;">ðŸ“¤ Export Backup</button>
                <button id="btnImport" class="lapak1-btn-primary" style="flex:1; padding:10px; background:linear-gradient(135deg, #00f260, #0575e6);">ðŸ“¥ Import Data</button>
            </div>
        `;

        backupCard.querySelector('#btnExport').onclick = (e) => {
            e.stopPropagation();
            const data = {
                highlighter: GM_getValue(STORAGE_KEY),
                config: GM_getValue(CONFIG_KEY),
                bgPos: GM_getValue(BG_POSITION_KEY),
                sidebarPos: GM_getValue(SIDEBAR_POS_KEY),
                opacity: GM_getValue(CONTAINER_OPACITY_KEY),
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
                    if (data.opacity !== undefined) setStore(CONTAINER_OPACITY_KEY, data.opacity);
                    alert('âœ… Data Berhasil Diimport! Me-refresh halaman...');
                    location.reload();
                } catch (err) {
                    alert('âŒ Format file JSON tidak valid!');
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

    // Dynamic Drag Handling (Active only during drag)
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

    // Master Toggle Switch Event
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

    // Initialization
    function init() {
        if (document.body && !document.getElementById('chat-hl-bubble')) {
            document.body.appendChild(orb);
            document.body.appendChild(dash);
            applyBackground();
            initObserver();
            runHighlight();
            console.log('âœ¨ LAPAK1 - Crystal Clear Transparancy (Zero Blur) v6.8.0 Loaded!');
        } else if (!document.body) {
            setTimeout(init, 100);
        }
    }

    init();
})();
