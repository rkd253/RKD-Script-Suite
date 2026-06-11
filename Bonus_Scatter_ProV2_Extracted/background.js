// background.js

// >>> START: Tambahkan URL Apps Script Anda di sini <<<
// Ganti dengan URL endpoint yang Anda dapatkan setelah deploy Apps Script
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyhynzpNM7BbAtKmAmO5oQKITrdL36IrKv6qXlVBtD9ZP6GT3_evbvVXhcJygJYN16cqA/exec';
// >>> END: Tambahkan URL Apps Script Anda di sini <<<


// Konstanta untuk kontrol loop
const DELAY_TIME = 250;
const NEXT_BTN_SELECTOR = ".detail-navigation.right";
const INITIAL_LOAD_DELAY = 1500;

// >>> PERUBAHAN UTAMA: Kontrol Paralelisme <<<
const MAX_CONCURRENT_PROCESSES = 10; // Batas maksimal proses yang berjalan bersamaan
let activeProcesses = 0; // Menghitung proses yang saat ini berjalan

let isQueueUpdating = false;

let autoPopupBlockByOpenerTabId = new Map();

function markAutoPopupBlock(openerTabId, ttlMs) {
    const id = Number(openerTabId);
    if (!Number.isFinite(id) || id <= 0) return;
    const ttl = typeof ttlMs === 'number' && Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : 12000;
    autoPopupBlockByOpenerTabId.set(id, Date.now() + ttl);
}

function shouldAutoHandlePopupForTab(tab) {
    const openerTabId = tab && typeof tab.openerTabId !== 'undefined' ? Number(tab.openerTabId) : 0;
    if (!Number.isFinite(openerTabId) || openerTabId <= 0) return false;
    const until = autoPopupBlockByOpenerTabId.get(openerTabId);
    if (!until) return false;
    if (until < Date.now()) {
        autoPopupBlockByOpenerTabId.delete(openerTabId);
        return false;
    }
    return true;
}

let resultSaveQueue = []; 
let isSaving = false; // Flag untuk memastikan hanya satu proses yang menulis ke storage
let processingKeys = new Set();
let activeProcessTimeouts = new Map();

const MAX_BONUSSMB_CONCURRENT = 5;

let bonussmbFillQueue = [];
let bonussmbQueuedKeys = new Set();
let bonussmbActiveKeys = new Set();
let bonussmbActiveCount = 0;
let bonusStatusQueue = [];
let isBonusStatusSaving = false;

const KEEPALIVE_ALARM = 'CEKBONUS_KEEPALIVE_TICK';
const KEEPALIVE_OFFSCREEN_URL = 'offscreen.html';

const BONUSSMB_AUTO_ALARM = 'CEKBONUS_BONUSSMB_TICK';

let keepAlivePort = null;

const BONUSSMB_TICKETS_URL = 'https://bonussmb.com/tickets';
const BONUSSMB_HISTORY_URL = 'https://bonussmb.com/history';

async function verifyBonussmbStatus(userId, transactionId) {
    return new Promise(async (resolve) => {
        chrome.tabs.query({ url: "*://bonussmb.com/*" }, async (tabs) => {
            let tab = tabs && tabs[0];
            let isTemporaryTab = false;
            
            if (!tab) {
                // Jika tidak ada tab bonussmb terbuka, buat tab baru di background secara temporer
                isTemporaryTab = true;
                const opened = await new Promise((resOpen) => {
                    getBestNormalWindowId((targetWindowId) => {
                        const createOpts = { url: BONUSSMB_TICKETS_URL, active: false };
                        if (targetWindowId) createOpts.windowId = targetWindowId;
                        chrome.tabs.create(createOpts, (newTab) => {
                            if (!newTab || !newTab.id) {
                                resOpen(null);
                            } else {
                                ensureTabLoaded(newTab.id, 20000).then(() => resOpen(newTab));
                            }
                        });
                    });
                });
                
                if (!opened) {
                    resolve({ ok: false, error: 'Failed to open temporary tab' });
                    return;
                }
                tab = opened;
            }
            
            const tabId = tab.id;
            const currentUrl = tab.url || tab.pendingUrl || '';
            
            // Tentukan halaman mana yang dicek pertama berdasarkan URL tab saat ini (untuk meminimalkan redirect)
            const firstUrl = currentUrl.includes('history') ? BONUSSMB_HISTORY_URL : BONUSSMB_TICKETS_URL;
            const secondUrl = firstUrl === BONUSSMB_HISTORY_URL ? BONUSSMB_TICKETS_URL : BONUSSMB_HISTORY_URL;
            
            console.log(`[BonusScatter] Verifying status for ${userId} using tab ${tabId}. Checking first: ${firstUrl}`);
            
            // Langkah A: Cek di halaman pertama
            const firstResult = await verifyOnPage(tabId, userId, transactionId, firstUrl);
            if (firstResult && firstResult.ok && firstResult.status !== 'NOT_FOUND') {
                if (isTemporaryTab) {
                    chrome.tabs.remove(tabId, () => {
                        void chrome.runtime.lastError; // Clear potential closed tab error
                    });
                }
                resolve(firstResult);
                return;
            }
            
            console.log(`[BonusScatter] Status not found on first page or failed. Checking second: ${secondUrl}`);
            
            // Langkah B: Cek di halaman kedua
            const secondResult = await verifyOnPage(tabId, userId, transactionId, secondUrl);
            if (isTemporaryTab) {
                chrome.tabs.remove(tabId, () => {
                    void chrome.runtime.lastError; // Clear potential closed tab error
                });
            }
            resolve(secondResult);
        });
    });
}

async function verifyOnPage(tabId, userId, transactionId, targetUrl) {
    return new Promise((resolve) => {
        chrome.tabs.get(tabId, async (tab) => {
            const getErr = chrome.runtime.lastError;
            if (getErr || !tab) {
                resolve({ ok: false, error: 'tab_not_found_or_closed' });
                return;
            }
            
            const currentUrl = tab.url || tab.pendingUrl || '';
            const needsRedirect = !currentUrl.includes(targetUrl);
            
            if (needsRedirect) {
                console.log(`[BonusScatter] Redirecting tab ${tabId} to ${targetUrl}`);
                chrome.tabs.update(tabId, { url: targetUrl }, () => {
                    const updateErr = chrome.runtime.lastError;
                    if (updateErr) {
                        resolve({ ok: false, error: updateErr.message });
                        return;
                    }
                    ensureTabLoaded(tabId, 15000).then(async () => {
                        const ready = await ensureBonussmbReceiver(tabId);
                        if (!ready.ok) {
                            resolve({ ok: false, error: 'receiver_not_ready_after_redirect' });
                            return;
                        }
                        sendCheckMessage(tabId, userId, transactionId, targetUrl, resolve);
                    });
                });
            } else {
                const ready = await ensureBonussmbReceiver(tabId);
                if (!ready.ok) {
                    resolve({ ok: false, error: 'receiver_not_ready' });
                    return;
                }
                sendCheckMessage(tabId, userId, transactionId, targetUrl, resolve);
            }
        });
    });
}

function sendCheckMessage(tabId, userId, transactionId, targetUrl, resolve) {
    chrome.tabs.sendMessage(tabId, { type: 'BONUSSMB_CHECK_STATUS', payload: { userId, transactionId, targetUrl } }, (resp) => {
        const err = chrome.runtime.lastError;
        if (err) resolve({ ok: false, error: err.message });
        else resolve(resp);
    });
}

async function ensureOffscreenDocument() {
    if (!chrome.offscreen || typeof chrome.offscreen.createDocument !== 'function') return;
    try {
        const has = await chrome.offscreen.hasDocument();
        if (has) return;
    } catch {
    }

    try {
        await chrome.offscreen.createDocument({
            url: KEEPALIVE_OFFSCREEN_URL,
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Menjaga service worker tetap aktif untuk memproses antrian otomatis.',
        });
    } catch {
        try {
            console.warn('[CekBonus] Gagal membuat offscreen document');
        } catch {}
    }
}

function ensureKeepAliveAlarm() {
    try {
        chrome.alarms.create(KEEPALIVE_ALARM, { periodInMinutes: 1 });
    } catch {
    }
}

function ensureBonussmbAlarm() {
    try {
        chrome.alarms.create(BONUSSMB_AUTO_ALARM, { periodInMinutes: 5 });
    } catch {
    }
}

function initAutoBackground() {
    ensureKeepAliveAlarm();
    ensureBonussmbAlarm();
    Promise.resolve(ensureOffscreenDocument()).catch(() => {});

    chrome.storage.local.get(['autoStartEnabled'], (res) => {
        const enabled = typeof res.autoStartEnabled === 'boolean' ? res.autoStartEnabled : true;
        if (enabled) startNextProcess();
    });
}

try {
    chrome.runtime.onInstalled.addListener(() => initAutoBackground());
    chrome.runtime.onStartup.addListener(() => initAutoBackground());
    chrome.runtime.onConnect.addListener((port) => {
        if (!port || port.name !== 'keepalive') return;
        keepAlivePort = port;
        try {
            port.onDisconnect.addListener(() => {
                if (keepAlivePort === port) keepAlivePort = null;
            });
        } catch {}
    });
    chrome.alarms.onAlarm.addListener((alarm) => {
        if (!alarm) return;

        if (alarm.name === KEEPALIVE_ALARM) {
            chrome.storage.local.get(['autoStartEnabled'], (res) => {
                const enabled = typeof res.autoStartEnabled === 'boolean' ? res.autoStartEnabled : true;
                if (enabled) startNextProcess();
            });
            return;
        }

        if (alarm.name === BONUSSMB_AUTO_ALARM) {
            chrome.storage.local.get(['autoStartEnabled', 'autoStatusCheck'], (res) => {
                const autoStart = typeof res.autoStartEnabled === 'boolean' ? res.autoStartEnabled : true;
                const statusCheck = typeof res.autoStatusCheck === 'boolean' ? res.autoStatusCheck : true;
                if (autoStart) {
                    processPendingBonussmbInputs();
                    if (statusCheck) {
                        processPendingBonussmbVerifications();
                    }
                }
            });
        }
    });
} catch {
}

let isVerifyingStatus = false;

async function processPendingBonussmbVerifications() {
    if (isVerifyingStatus) return;
    isVerifyingStatus = true;
    
    try {
        const getResults = () => new Promise(resolve => chrome.storage.local.get(['jutawanResults'], res => resolve(res.jutawanResults || [])));
        const checkedInThisPass = new Set();
        
        while (true) {
            const rows = await getResults();
            let candidates = rows.filter((r) => {
                if (!r) return false;
                const b = String(r.bonussmbStatus || '').trim();
                const v = String(r.verifiedStatus || '').trim();
                const txId = String(r.transactionId || '').trim();
                
                if (checkedInThisPass.has(txId)) return false;
                
                const isInputDone = (
                    b === 'Sudah input' || 
                    b.includes('sudah ada') || 
                    b.includes('Klaim Sukses') || 
                    b.includes('berhasil')
                );
                
                const isNotVerified = (v === '' || v === '-' || v === 'PENDING' || v === 'WAITING' || v === 'N/A');
                
                return isInputDone && isNotVerified;
            });

            if (candidates.length === 0) break;

            // PRIORITAS: Tiket belum pernah dicek (kosong/'-') DIDAHULUKAN.
            // Tiket WAITING/PENDING dicek TERAKHIR.
            candidates.sort((a, b) => {
                const vA = String(a.verifiedStatus || '').trim();
                const vB = String(b.verifiedStatus || '').trim();
                const isNewA = (vA === '' || vA === '-' || vA === 'N/A');
                const isNewB = (vB === '' || vB === '-' || vB === 'N/A');
                if (isNewA && !isNewB) return -1;
                if (!isNewA && isNewB) return 1;
                return 0;
            });

            const r = candidates[0];
            const txId = String(r.transactionId || '').trim();
            checkedInThisPass.add(txId);
            
            console.log(`[BonusScatter] Roket S2 processing: ${r.userId} | ${r.transactionId} (verifiedStatus: ${r.verifiedStatus || 'empty'})`);
            
            try {
                const result = await Promise.race([
                    verifyBonussmbStatus(r.userId, r.transactionId),
                    new Promise(resolve => setTimeout(() => resolve({ ok: false, error: 'TIMEOUT' }), 30000))
                ]);

                if (result && result.ok && result.status && result.status !== 'NOT_FOUND') {
                    await updateVerifiedStatusAsync(r.userId, r.transactionId, result.status, result.keterangan || '');
                    console.log(`[BonusScatter] ✅ Updated ${r.transactionId} → ${result.status}`);
                } else if (result && result.status === 'NOT_FOUND') {
                    await updateVerifiedStatusAsync(r.userId, r.transactionId, 'NOT_FOUND', '');
                } else {
                    // TIMEOUT atau error: tetap update sebagai PENDING agar tidak stuck selamanya
                    const currentV = String(r.verifiedStatus || '').trim();
                    if (currentV === '' || currentV === '-' || currentV === 'N/A') {
                        await updateVerifiedStatusAsync(r.userId, r.transactionId, 'PENDING', '');
                        console.log(`[BonusScatter] ⏰ Timeout/error for ${r.transactionId}, marked as PENDING`);
                    }
                }
            } catch (verifyErr) {
                console.error(`[BonusScatter] Verify error for ${r.transactionId}:`, verifyErr);
            }
            
            await new Promise(res => setTimeout(res, 800));
        }
    } catch (e) {
        console.error('[BonusScatter] Roket S2 Error:', e);
    } finally {
        isVerifyingStatus = false;
        console.log('[BonusScatter] Roket S2 task finished.');
    }
}

function updateVerifiedStatusAsync(userId, transactionId, status, keterangan) {
    return new Promise((resolve) => {
        const targetUid = String(userId || '').trim().toLowerCase();
        const targetTx = String(transactionId || '').trim().toLowerCase();
        
        chrome.storage.local.get(['jutawanResults'], (res) => {
            let rows = Array.isArray(res.jutawanResults) ? res.jutawanResults : [];
            let updated = false;
            rows = rows.map((r) => {
                const rUid = String(r.userId || '').trim().toLowerCase();
                const rTx = String(r.transactionId || '').trim().toLowerCase();
                if (rUid === targetUid && rTx === targetTx) {
                    r.verifiedStatus = status;
                    if (keterangan) {
                        r.verifiedKeterangan = keterangan;
                    } else if (status !== 'REJECTED') {
                        r.verifiedKeterangan = '';
                    }
                    updated = true;
                }
                return r;
            });
            if (updated) {
                chrome.storage.local.set({ jutawanResults: rows }, () => {
                    chrome.runtime.sendMessage({ type: 'RESULTS_PUSH', results: rows });
                    resolve();
                });
            } else {
                resolve();
            }
        });
    });
}

function updateVerifiedStatus(userId, transactionId, status, keterangan) {
    const targetUid = String(userId || '').trim().toLowerCase();
    const targetTx = String(transactionId || '').trim().toLowerCase();
    
    chrome.storage.local.get(['jutawanResults'], (res) => {
        let rows = Array.isArray(res.jutawanResults) ? res.jutawanResults : [];
        let updated = false;
        rows = rows.map((r) => {
            const rUid = String(r.userId || '').trim().toLowerCase();
            const rTx = String(r.transactionId || '').trim().toLowerCase();
            
            if (rUid === targetUid && rTx === targetTx) {
                r.verifiedStatus = status;
                if (keterangan) {
                    r.verifiedKeterangan = keterangan;
                } else if (status !== 'REJECTED') {
                    r.verifiedKeterangan = '';
                }
                updated = true;
            }
            return r;
        });
        if (updated) {
            chrome.storage.local.set({ jutawanResults: rows }, () => {
                // Broadcast to UI immediately
                chrome.runtime.sendMessage({ type: 'RESULTS_PUSH', results: rows });
            });
        }
    });
}

try {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        if (!changes.txQueue) return;
        const next = Array.isArray(changes.txQueue.newValue) ? changes.txQueue.newValue : [];
        if (next.length === 0) return;
        chrome.storage.local.get(['autoStartEnabled'], (res) => {
            const enabled = typeof res.autoStartEnabled === 'boolean' ? res.autoStartEnabled : true;
            if (enabled) startNextProcess();
        });
    });
} catch {
}

initAutoBackground();

function setTabAutoDiscardable(tabId, value) {
    try {
        chrome.tabs.update(tabId, { autoDiscardable: !!value }, () => {
            void chrome.runtime.lastError;
        });
    } catch {
    }
}

function ensureTabLoaded(tabId, timeoutMs) {
    const maxWait = typeof timeoutMs === 'number' ? timeoutMs : 15000;
    return new Promise((resolve) => {
        const startedAt = Date.now();
        let resolved = false;
        let timer = null;

        const finish = (ok) => {
            if (resolved) return;
            resolved = true;
            try { chrome.tabs.onUpdated.removeListener(onUpdated); } catch {}
            try { if (timer) clearInterval(timer); } catch {}
            resolve(!!ok);
        };

        const onUpdated = (updatedTabId, info) => {
            if (updatedTabId !== tabId) return;
            if (info && info.status === 'complete') finish(true);
        };

        chrome.tabs.get(tabId, (t) => {
            const err0 = chrome.runtime.lastError;
            if (!t || err0) {
                finish(false);
                return;
            }

            if (t.status === 'complete' && !t.discarded) {
                finish(true);
                return;
            }

            try {
                if (t.discarded) {
                    chrome.tabs.reload(tabId, {}, () => {
                        void chrome.runtime.lastError;
                    });
                }
            } catch {}

            chrome.tabs.onUpdated.addListener(onUpdated);
            timer = setInterval(() => {
                if (Date.now() - startedAt > maxWait) {
                    finish(false);
                    return;
                }
                chrome.tabs.get(tabId, (t2) => {
                    const err2 = chrome.runtime.lastError;
                    if (!t2 || err2) {
                        finish(false);
                        return;
                    }
                    if (t2.status === 'complete' && !t2.discarded) {
                        finish(true);
                    }
                });
            }, 600);
        });
    });
}

function ensureBonussmbReceiver(tabId) {
    return new Promise((resolve) => {
        chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError || !tab || !tab.url || !String(tab.url).startsWith('https://bonussmb.com/')) {
                resolve({ ok: false, error: 'tab_invalid' });
                return;
            }

            chrome.tabs.sendMessage(tabId, { type: 'BONUSSMB_PING' }, (resp) => {
                const pingErr = chrome.runtime.lastError;
                if (pingErr) {
                    // ignore: receiver might not exist yet
                }
                if (resp && resp.ok) {
                    resolve({ ok: true });
                    return;
                }

                chrome.scripting.executeScript(
                    {
                        target: { tabId },
                        files: ['bonussmb-content.js'],
                    },
                    () => {
                        if (chrome.runtime.lastError) {
                            resolve({ ok: false, error: chrome.runtime.lastError.message });
                            return;
                        }
                        chrome.tabs.sendMessage(tabId, { type: 'BONUSSMB_PING' }, (resp2) => {
                            const pingErr2 = chrome.runtime.lastError;
                            if (pingErr2) {
                                resolve({ ok: false, error: pingErr2.message || 'no_receiver' });
                                return;
                            }
                            if (resp2 && resp2.ok) resolve({ ok: true });
                            else resolve({ ok: false, error: 'no_receiver' });
                        });
                    }
                );
            });
        });
    });
}

function parseNumberLike(value) {
    const s = String(value ?? '').replace(/,/g, '').trim();
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

function deriveScatterCount(result) {
    if (typeof result?.scatterCount === 'number' && Number.isFinite(result.scatterCount)) return result.scatterCount;
    const n = parseNumberLike(result?.scatterCount);
    if (n !== null) return n;
    const title = String(result?.scatterTitle || '');
    const m = title.match(/scatter\s*[:=]\s*(\d+)/i);
    if (m && m[1]) {
        const v = parseInt(m[1], 10);
        if (Number.isFinite(v)) return v;
    }
    return null;
}

function deriveStatusCek(result) {
    const title = String(result?.scatterTitle || '').toLowerCase();
    if (title.includes('error') || title.includes('gagal') || title.includes('tidak ditemukan')) return 'Cek gagal';
    const debet = parseNumberLike(result?.debetValue);
    const scatter = deriveScatterCount(result);
    if (debet === null || scatter === null) return 'Cek gagal';
    if (debet <= 0 || scatter <= 0) return 'Cek gagal';
    return 'Sukses cek';
}

function isBonussmbFinalStatus(status) {
    const s = String(status || '').trim();
    return s === 'Sudah input' || s === 'Ticket sudah ada';
}



function enqueueBonussmbFill(finalResult) {
    const r = finalResult && typeof finalResult === 'object' ? finalResult : {};
    const statusCek = String(r.statusCek || '').trim();
    if (statusCek !== 'Sukses cek') return;
    if (isBonussmbFinalStatus(r.bonussmbStatus)) return;

    const key = `${String(r.userId)}|${String(r.transactionId)}`;
    if (!key.includes('|') || key === '|') return;
    if (bonussmbActiveKeys.has(key)) return;
    if (bonussmbQueuedKeys.has(key)) return;
    bonussmbQueuedKeys.add(key);
    bonussmbFillQueue.push(r);
    processBonussmbFillQueue();
}

function performBonussmbFill(finalResult) {
    return new Promise((resolve) => {
        const done = () => {
            try {
                resolve(true);
            } catch {
                resolve(true);
            }
        };

        const currentStatus = String(finalResult?.bonussmbStatus || '').trim();
        if (isBonussmbFinalStatus(currentStatus)) {
            done();
            return;
        }

        const payload = {
            userId: finalResult.userId,
            userIdRaw: finalResult.userIdRaw,
            transactionId: finalResult.transactionId,
            debetValue: finalResult.debetValue,
            scatterTitle: finalResult.scatterTitle,
            scatterCount: finalResult.scatterCount,
            site: 'wdbos',
            gameType: 'mahjong',
        };

        const closeTab = (tabId) => {
            try {
                chrome.tabs.remove(tabId, () => {
                    void chrome.runtime.lastError;
                });
            } catch {}
        };

        const openNewTab = () => {
            return new Promise((resolveOpen) => {
                getBestNormalWindowId((targetWindowId) => {
                    const createOpts = { url: BONUSSMB_TICKETS_URL, active: false };
                    if (targetWindowId) createOpts.windowId = targetWindowId;
                    chrome.tabs.create(createOpts, (tab) => {
                        if (!tab || !tab.id) {
                            resolveOpen({ ok: false, error: 'Gagal membuka tab bonussmb' });
                            return;
                        }
                        const tabId = tab.id;
                        setTabAutoDiscardable(tabId, false);
                        ensureTabLoaded(tabId, 20000)
                            .then(() => resolveOpen({ ok: true, tabId }))
                            .catch(() => resolveOpen({ ok: true, tabId }));
                    });
                });
            });
        };

        const maxAttempts = 3;
        const attemptFill = (attempt) => {
            openNewTab().then((opened) => {
                if (!opened.ok) {
                    enqueueBonussmbStatus(finalResult.userId, finalResult.transactionId, 'Gagal input', opened.error || 'open_tab_failed');
                    done();
                    return;
                }

                const tabId = opened.tabId;
                const finish = (status, detail, retryable) => {
                    enqueueBonussmbStatus(finalResult.userId, finalResult.transactionId, status, detail);
                    closeTab(tabId);
                    if (retryable && attempt < maxAttempts) {
                        const backoff = 400 + attempt * 350;
                        setTimeout(() => attemptFill(attempt + 1), backoff);
                        return;
                    }
                    done();
                };

                ensureBonussmbReceiver(tabId).then((ready) => {
                    if (!ready.ok) {
                        finish('Gagal input', ready.error || 'receiver_not_ready', true);
                        return;
                    }

                    chrome.tabs.sendMessage(tabId, { type: 'BONUSSMB_FILL_TICKET', payload }, (resp) => {
                        const lastErr = chrome.runtime.lastError;
                        if (lastErr) {
                            finish('Gagal input', lastErr.message || 'send_failed', true);
                            return;
                        }

                        if (resp && resp.ok) {
                            finish('Sudah input', '', false);
                            return;
                        }

                        const errText = resp && resp.error ? String(resp.error) : 'unknown';
                        const isTaken = errText.includes('The ticket code has already been taken.') || errText.toLowerCase().includes('already been taken');
                        const isTransient = errText.includes('Dialog Form Tiket') || errText.includes('Form Tiket') || errText.includes('Field belum muncul');
                        const retryable = !isTaken && isTransient;
                        finish(isTaken ? 'Ticket sudah ada' : 'Gagal input', errText, retryable);
                    });
                });
            });
        };

        attemptFill(1);
    });
}

function processBonussmbFillQueue() {
    while (bonussmbActiveCount < MAX_BONUSSMB_CONCURRENT && bonussmbFillQueue.length > 0) {
        const nextItem = bonussmbFillQueue.shift();
        if (!nextItem) break;

        const key = `${String(nextItem.userId)}|${String(nextItem.transactionId)}`;
        bonussmbQueuedKeys.delete(key);
        if (bonussmbActiveKeys.has(key)) continue;

        bonussmbActiveKeys.add(key);
        bonussmbActiveCount++;
        enqueueBonussmbStatus(nextItem.userId, nextItem.transactionId, 'Sedang input', '');

        performBonussmbFill(nextItem)
            .catch(() => {})
            .finally(() => {
                bonussmbActiveKeys.delete(key);
                if (bonussmbActiveCount > 0) bonussmbActiveCount--;
                setTimeout(() => processBonussmbFillQueue(), 120);
            });
    }
}

function processPendingBonussmbInputs() {
    chrome.storage.local.get(['jutawanResults'], (res) => {
        const rows = Array.isArray(res.jutawanResults) ? res.jutawanResults : [];
        const candidates = rows.filter((r) => {
            const statusCek = String(r?.statusCek || '').trim();
            const b = String(r?.bonussmbStatus || '').trim();
            return statusCek === 'Sukses cek' && (b === 'Pending input' || b === 'Mengulang...');
        });

        const maxPerTick = 2;
        for (const r of candidates.slice(0, maxPerTick)) {
            enqueueBonussmbFill(r);
        }
    });
}

function enqueueBonussmbStatus(userId, transactionId, status, detail) {
    bonusStatusQueue.push({ userId, transactionId, status: String(status || ''), detail: String(detail || '') });
    processBonussmbStatusQueue();
}

function processBonussmbStatusQueue() {
    if (isBonusStatusSaving || bonusStatusQueue.length === 0) return;
    if (isSaving) {
        setTimeout(() => processBonussmbStatusQueue(), 250);
        return;
    }
    isBonusStatusSaving = true;
    const items = [...bonusStatusQueue];
    bonusStatusQueue = [];

    chrome.storage.local.get(["jutawanResults"], (res) => {
        const data = Array.isArray(res.jutawanResults) ? res.jutawanResults : [];
        const indexByKey = new Map();
        for (let i = 0; i < data.length; i++) {
            const r = data[i] && typeof data[i] === 'object' ? data[i] : {};
            const key = `${String(r.userId)}|${String(r.transactionId)}`;
            if (!indexByKey.has(key)) indexByKey.set(key, i);
        }

        const pending = [];
        const next = data.map((row) => (row && typeof row === 'object' ? row : {}));

        for (const it of items) {
            const key = `${String(it.userId)}|${String(it.transactionId)}`;
            const idx = indexByKey.get(key);
            if (typeof idx !== 'number') {
                pending.push(it);
                continue;
            }
            const r = next[idx] && typeof next[idx] === 'object' ? next[idx] : {};
            next[idx] = { ...r, bonussmbStatus: it.status, bonussmbDetail: it.detail };
        }

        chrome.storage.local.set({ jutawanResults: next }, () => {
            const err = chrome.runtime.lastError;
            isBonusStatusSaving = false;

            if (err) {
                try {
                    console.error('[CekBonus] Gagal menyimpan status BONUSSMB:', err.message);
                } catch {}
                bonusStatusQueue.unshift(...items);
                setTimeout(() => processBonussmbStatusQueue(), 900);
                return;
            }

            if (pending.length > 0) {
                bonusStatusQueue.unshift(...pending);
                setTimeout(() => processBonussmbStatusQueue(), 700);
            }

            try {
                chrome.runtime.sendMessage({ type: 'RESULTS_PUSH', results: next }, () => {
                    void chrome.runtime.lastError;
                });
            } catch {}

            if (bonusStatusQueue.length > 0) processBonussmbStatusQueue();
        });
    });
}

// ----------------- FUNGSI BANTU ASINKRON -----------------

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function execScriptResult(tabId, func, args) {
    return new Promise((resolve, reject) => {
        chrome.scripting.executeScript(
            {
                target: { tabId },
                func,
                args: Array.isArray(args) ? args : [],
            },
            (results) => {
                const err = chrome.runtime.lastError;
                if (err) {
                    reject(new Error(err.message));
                    return;
                }
                resolve(results && results[0] ? results[0].result : null);
            }
        );
    });
}

async function waitForDetailReady(tabId, timeoutMs) {
    const startedAt = Date.now();
    const maxWait = typeof timeoutMs === 'number' ? timeoutMs : 6000;
    while (Date.now() - startedAt < maxWait) {
        try {
            const ok = await execScriptResult(
                tabId,
                (nextSelector) => {
                    const ready = document.readyState === 'complete' || document.readyState === 'interactive';
                    if (!ready) return false;
                    const hasRound = !!document.querySelector('.result-detail-item.round-title');
                    const hasNext = !!document.querySelector(nextSelector);
                    const hasDetail = !!document.querySelector('.result-detail-item');
                    return hasRound || hasNext || hasDetail;
                },
                [NEXT_BTN_SELECTOR]
            );
            if (ok) return true;
        } catch {
            return false;
        }
        await delay(200);
    }
    return false;
}

// ----------------- FUNGSI POSTING KE SPREADSHEET -----------------

/**
 * Mengirim hasil pengecekan ke Google Spreadsheet melalui Apps Script URL.
 */
function postToAppsScript(result) {
    // Hasil yang akan dikirim (userId, transactionId, debetValue, scatterTitle, executorName)
    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        // PENTING: mode: 'no-cors' mengatasi masalah CORS Policy
        mode: 'no-cors', 
        headers: {
            'Content-Type': 'application/json',
        },
        // Mengirim data hasil sebagai JSON string di body
        body: JSON.stringify(result)
    })
    .then(() => {
        // Dengan 'no-cors', kita hanya bisa berasumsi data terkirim
        console.log("✅ Data dikirim ke Apps Script. Cek Spreadsheet untuk konfirmasi.");
    })
    .catch(error => {
        // Jika masih ada error, kemungkinan masalah ada pada URL atau jaringan
        console.error('❌ Network error during Apps Script post (Cek URL dan Izin Anda):', error);
    });
}

    // ----------------- FUNGSI MANAJEMEN STORAGE SAVE -----------------

        /**
         * Memproses antrian penulisan data ke chrome.storage.local
         * untuk menghindari race condition.
         */
        function processSaveQueue(tabIdToClose) {
            // Hanya boleh ada satu proses penulisan yang berjalan
            if (isSaving || resultSaveQueue.length === 0) {
                return;
            }

    if (isBonusStatusSaving) {
        setTimeout(() => processSaveQueue(), 250);
        return;
    }
            
            isSaving = true; // Kunci proses penulisan

            // Ambil data dari antrian yang akan diproses
            const itemsToSave = [...resultSaveQueue]; // Salin semua item
            resultSaveQueue = []; // Kosongkan antrian, siap untuk item baru

            chrome.storage.local.get(["jutawanResults"], (res) => {
                const prev = Array.isArray(res.jutawanResults) ? res.jutawanResults : [];
                const next = [...prev];
                const indexByKey = new Map();
                for (let i = 0; i < next.length; i++) {
                    const r = next[i] && typeof next[i] === 'object' ? next[i] : {};
                    const key = `${String(r.userId)}|${String(r.transactionId)}`;
                    if (!indexByKey.has(key)) indexByKey.set(key, i);
                }

                for (const item of itemsToSave) {
                    const it = item && typeof item === 'object' ? item : {};
                    const key = `${String(it.userId)}|${String(it.transactionId)}`;
                    const idx = indexByKey.get(key);

                    if (typeof idx !== 'number') {
                        next.push(it);
                        indexByKey.set(key, next.length - 1);
                        continue;
                    }

                    const existing = next[idx] && typeof next[idx] === 'object' ? next[idx] : {};
                    const merged = { ...existing, ...it };
                    const existingB = String(existing.bonussmbStatus || '').trim();
                    const itB = String(it.bonussmbStatus || '').trim();
                    if (existingB && (itB === '' || itB === 'Pending input')) merged.bonussmbStatus = existingB;
                    const existingD = String(existing.bonussmbDetail || '').trim();
                    const itD = String(it.bonussmbDetail || '').trim();
                    if (existingD && !itD) merged.bonussmbDetail = existingD;
                    next[idx] = merged;
                }

                itemsToSave.forEach((item) => {
                    console.log("✅ Data berhasil di-queue untuk disimpan:", item);
                });

                chrome.storage.local.set({ jutawanResults: next }, () => {
                    const err = chrome.runtime.lastError;
                    if (err) {
                        try {
                            console.error('[CekBonus] Gagal menyimpan jutawanResults:', err.message);
                        } catch {}
                        resultSaveQueue.unshift(...itemsToSave);
                        isSaving = false;
                        Promise.resolve(ensureOffscreenDocument()).catch(() => {});
                        setTimeout(() => processSaveQueue(), 1200);
                        return;
                    }

                    try {
                        console.log('[CekBonus] jutawanResults tersimpan. Total:', next.length);
                    } catch {}

                    try {
                        chrome.runtime.sendMessage({ type: 'RESULTS_PUSH', results: next }, () => {
                            void chrome.runtime.lastError;
                        });
                    } catch {}

                    try {
                        itemsToSave.forEach((it) => {
                            const r = it && typeof it === 'object' ? it : null;
                            if (!r) return;
                            if (String(r.statusCek || '') !== 'Sukses cek') return;
                            enqueueBonussmbFill(r);
                        });
                    } catch {}

                    isSaving = false;

                    if (resultSaveQueue.length > 0) {
                        processSaveQueue();
                    }
                });
            });
        }

// ----------------- MANAJEMEN ANTRIAN -----------------

            /**
            * Menyimpan hasil (lokal dan ke spreadsheet) dan memicu proses berikutnya.
             */
            function saveResult(result, tabIdToClose, executorName) {
                const statusCek = deriveStatusCek(result);
                const scatterCount = deriveScatterCount(result);
                const finalResult = {
                    ...result,
                    scatterCount: (typeof result.scatterCount === 'undefined' ? scatterCount : result.scatterCount),
                    statusCek,
        bonussmbStatus: statusCek === 'Sukses cek' ? 'Pending input' : '',
                    executorName: executorName || "Unknown"
                };
                
                // 1. Kirim ke Apps Script (Asynchronous)
                postToAppsScript(finalResult); 
                
  // 2. Tambahkan ke Antrian Penulisan Lokal (sertakan executorName)
  resultSaveQueue.push(finalResult);
                
                // 3. Mulai proses penulisan jika belum berjalan
                processSaveQueue(tabIdToClose); 
                
                // 4. Lakukan penutupan tab dan hitungan proses aktif secara terpisah
                const key = `${finalResult.userId}|${finalResult.transactionId}`;
                if (processingKeys.has(key)) processingKeys.delete(key);
                if (activeProcessTimeouts.has(key)) {
                    clearTimeout(activeProcessTimeouts.get(key));
                    activeProcessTimeouts.delete(key);
                }
                if (activeProcesses > 0) {
                    activeProcesses--; 
                    console.log(`⬅️ Proses Selesai. Proses Aktif tersisa: ${activeProcesses}/${MAX_CONCURRENT_PROCESSES}`);
                }
                
                if (tabIdToClose) {
                    // Tutup tab detail setelah proses selesai
                    chrome.tabs.remove(tabIdToClose); 
                }

                // PENTING: Mulai proses berikutnya di antrian
                startNextProcess(); 
            }


    /**
     * Membuka halaman utama transaksi untuk sebuah item.
     */
    function openMainPageForProcess(userId, transactionId, expectedBetting, token, executorName, adminUrl, startDate, endDate, todayDate) {
        // activeProcesses++; 
        // console.log(`➡️ Proses Baru Dimulai. Proses Aktif: ${activeProcesses}/${MAX_CONCURRENT_PROCESSES}`);

        const baseAdminUrl = (adminUrl || DEFAULT_ADMIN_URL).replace(/\/$/, "");
        const targetUrl = `${baseAdminUrl}/transaction-record.html`;
        chrome.tabs.create(
        {
            url: targetUrl,
            active: false // Dibuka di latar belakang
        },
        (tab) => {
            if (!tab || !tab.id) {
             // Catat error dan coba item berikutnya
                saveResult({ 
                    userId, 
                    transactionId, 
                    debetValue: "N/A", 
                    scatterTitle: "Error: Gagal membuka tab utama" 
                }, null); 
                return;
            }

            const mainTabId = tab.id; // <<< SIMPAN ID TAB UTAMA DI SINI

            // Tunggu sampai halaman loaded, lalu kirim pesan ke content.js
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                if (tabId === mainTabId && info.status === "complete") { // Gunakan mainTabId di sini
                    chrome.tabs.sendMessage(mainTabId, {
                        action: "startProcess",
                        userId: userId,
                        transactionId: transactionId,
                        token: token,
                        mainTabId: mainTabId, // <<< KIRIM ID TAB UTAMA KE CONTENT.JS
                        expectedBetting: typeof expectedBetting !== 'undefined' ? expectedBetting : null,
                        startDate: startDate,
                        endDate: endDate, // <<< BARU: Kirim Tanggal Akhir
                        todayDate: todayDate // <<< BARU: Kirim Tanggal Hari Ini
                    });
                    chrome.tabs.onUpdated.removeListener(listener); 
                }
            });
        }
    );
}

/**
 * Mengambil item berikutnya dari antrian dan memulai proses.
 * Fungsi ini sekarang akan mengisi slot proses yang kosong.
 */
function startNextProcess() {
    // ==========================================================
    // >>> PERUBAHAN: Cek ketersediaan slot <<<
    if (activeProcesses >= MAX_CONCURRENT_PROCESSES) {
        // Slot penuh, tunggu hingga proses selesai
        console.log(`⏸️ Slot penuh (${activeProcesses}/${MAX_CONCURRENT_PROCESSES}). Proses antrian ditunda.`);
        return;
    }


    // Hentikan jika ada proses lain yang sedang menulis antrian (untuk menghindari race condition)
    if (isQueueUpdating) {
        console.log(`⏸️ Antrian sedang diupdate. Menunggu...`);
        return;
    }
    // ==========================================================
    // ==========================================================
    
    chrome.storage.local.get(["txQueue", "agentHeaders", "executorName", "adminUrl", "startDate", "endDate", "todayDate", "processMode"], (res) => {
        let txQueue = res.txQueue || [];
        const agentHeaders = res.agentHeaders || null;
        const adminUrl = res.adminUrl || DEFAULT_ADMIN_URL;
        const todayDate = res.todayDate || getTodayDateString();
        const startDate = res.startDate || todayDate;
        const endDate = res.endDate || todayDate;
        const executorName = res.executorName || (agentHeaders ? agentHeaders["X-Agent-User"] : "") || "executor";
        const processMode = res.processMode || "auto";
        try {
            console.log('[CekBonus] startNextProcess build=3.1.0 mode=', processMode, 'hasToken=', hasUsableAccessToken(agentHeaders));
        } catch {}

        // Jika antrian kosong, proses selesai
        if (txQueue.length === 0) {
            console.log("✅ Semua proses batch selesai!");
            return;
        }

        // Jika ada data yang hilang
        const token = hasUsableAccessToken(agentHeaders) ? String(agentHeaders["X-Access-Token"]) : "";

        // ==========================================================
        // >>> PERUBAHAN: Proses hingga slot penuh atau antrian habis <<<
        const processesToStart = Math.min(
            txQueue.length, 
            MAX_CONCURRENT_PROCESSES - activeProcesses // Hitung slot yang benar-benar kosong
        );
        
        if (processesToStart === 0) {
             console.log(`⏸️ Slot penuh (${activeProcesses}/${MAX_CONCURRENT_PROCESSES}) atau antrian kosong.`);
             return;
        }
        // Terapkan Kunci
        isQueueUpdating = true;
        
        const itemsToProcess = txQueue.splice(0, processesToStart);

        // Simpan kembali antrian yang tersisa
        chrome.storage.local.set({ txQueue: txQueue }, () => {

                // Terapkan Kunci
            isQueueUpdating = false;

            console.log(`Starting ${processesToStart} new processes. Remaining queue: ${txQueue.length}`);
            
            itemsToProcess.forEach(currentItem => {
                const key = `${currentItem.userId}|${currentItem.transactionId}`;
                if (processingKeys.has(key)) return;
                processingKeys.add(key);
                activeProcesses++;

                // Failsafe Timeout: Jika dalam 40 detik proses tidak selesai, paksa selesai agar antrian tidak stuck
                const failsafeTimeout = setTimeout(() => {
                    if (processingKeys.has(key)) {
                        console.warn(`⏰ [Failsafe] Proses untuk ${key} melebihi batas waktu 40 detik. Memaksa selesai.`);
                        saveResult(
                            {
                                userId: currentItem.userId,
                                transactionId: currentItem.transactionId,
                                debetValue: 'N/A',
                                scatterTitle: 'Error: Timeout (40s)',
                                expectedBetting: typeof currentItem.betting !== 'undefined' ? String(currentItem.betting) : '',
                                detailBetting: '',
                            },
                            null,
                            executorName
                        );
                    }
                }, 40000);
                activeProcessTimeouts.set(key, failsafeTimeout);

                const wantsApi = String(processMode).startsWith('api');
                const canApi = hasUsableAccessToken(agentHeaders);
                const runApi = (processMode === 'auto') ? canApi : (wantsApi && canApi);

                if (runApi) {
                    processItemViaApi({
                        currentItem,
                        agentHeaders,
                        executorName,
                        adminUrl,
                        startDate,
                        endDate,
                        mode: 'api_full',
                    }).catch((e) => {
                        saveResult(
                            {
                                userId: currentItem.userId,
                                transactionId: currentItem.transactionId,
                                debetValue: 'N/A',
                                scatterTitle: `Error: ${String(e && e.message ? e.message : e)}`,
                                expectedBetting: typeof currentItem.betting !== 'undefined' ? String(currentItem.betting) : '',
                                detailBetting: '',
                            },
                            null,
                            executorName
                        );
                    });
                } else {
                    openMainPageForProcess(
                        currentItem.userId,
                        currentItem.transactionId,
                        typeof currentItem.betting !== 'undefined' ? currentItem.betting : null,
                        token,
                        executorName,
                        adminUrl,
                        startDate,
                        endDate,
                        todayDate
                    );
                }
            });
            
        });
        // ==========================================================
    });
}
// ----------------- FUNGSI SKRIP INJEKSI -----------------

const scriptToGetRoundCount = () => {
    const roundTitleEl = document.querySelector(".result-detail-item.round-title");
    
    if (!roundTitleEl) {
        return { totalRounds: 1, currentRound: 1 }; 
    }
    
    const text = roundTitleEl.textContent.trim();
    const match = text.match(/\/(\d+)/);
    const totalRounds = match ? parseInt(match[1], 10) : 1; 
    
    const currentMatch = text.match(/Round (\d+)/);
    const currentRound = currentMatch ? parseInt(currentMatch[1], 10) : 1;
    
    return { 
        totalRounds: totalRounds,
        currentRound: currentRound
    };
};

const DEFAULT_ADMIN_URL = "https://agent.png777.com";

function getTodayDateString() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function formatDateForQuery(dateISO) {
    const raw = String(dateISO || '').trim();
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return raw;
    const yyyy = m[1];
    const mm = String(parseInt(m[2], 10));
    const dd = String(parseInt(m[3], 10));
    return `${yyyy}-${mm}-${dd}`;
}

function buildAuthHeaders(agentHeaders) {
    const out = {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'x-requested-with': 'XMLHttpRequest',
    };
    const src = agentHeaders && typeof agentHeaders === 'object' ? agentHeaders : {};
    Object.entries(src).forEach(([k, v]) => {
        if (!k) return;
        if (typeof v === 'undefined' || v === null) return;
        const value = String(v).replace(/[\r\n]+/g, ' ').trim();
        if (!value) return;
        out[k] = value;
    });
    return out;
}

function hasUsableAccessToken(agentHeaders) {
    const src = agentHeaders && typeof agentHeaders === 'object' ? agentHeaders : {};
    return !!String(src['X-Access-Token'] || '').trim();
}

async function queryTransactionHistoryListForUser({
    baseUrl,
    userId,
    transactionId,
    startDate,
    endDate,
    agentHeaders,
    pageSize,
    maxPages,
}) {
    const base = (baseUrl || DEFAULT_ADMIN_URL).replace(/\/$/, '');
    const size = String(pageSize || 300);
    const limitPages = typeof maxPages === 'number' && maxPages > 0 ? maxPages : 1;

    const tx = String(transactionId || '');
    const headers = buildAuthHeaders(agentHeaders);

    for (let pageNo = 1; pageNo <= limitPages; pageNo++) {
        const params = new URLSearchParams({
            userId: String(userId || ''),
            pageNo: String(pageNo),
            pageSize: size,
            startDate: formatDateForQuery(startDate),
            endDate: formatDateForQuery(endDate),
            gameCategory: '',
            gameType: '',
            gameId: '',
            transactionId: tx,
        });

        const url = `${base}/game-oc/ida/transaction/history/queryTransactionHistoryListForUser?${params.toString()}`;

        const resp = await fetch(url, {
            method: 'GET',
            headers,
            credentials: 'omit',
            cache: 'no-store',
        });

        const text = await resp.text();
        let json = null;
        try {
            json = JSON.parse(text);
        } catch {
            json = null;
        }

        if (!resp.ok) {
            const message = json && json.message ? String(json.message) : `HTTP ${resp.status}`;
            throw new Error(message);
        }

        if (!json || json.success !== true) {
            const message = json && json.message ? String(json.message) : 'API response invalid';
            throw new Error(message);
        }

        const records = json?.result?.records;
        const list = Array.isArray(records) ? records : [];
        if (list.length === 0) return null;

        const matches = list.filter((r) => {
            const kid = String(r?.keteranganId || '');
            const ket = String(r?.keterangan || '');
            return (kid && kid.includes(tx)) || (ket && ket.includes(tx));
        });

        if (matches.length > 0) {
            const preferred = matches.find((r) => {
                const status = String(r?.status || '').trim();
                const dict = String(r?.status_dictText || '').trim().toLowerCase();
                return status === '03' || dict === 'betting' || dict === 'pertaruhan';
            });
            return preferred || matches[0];
        }

        const pages = Number(json?.result?.pages);
        const sizeNum = Number(json?.result?.size);
        const effectiveSize = Number.isFinite(sizeNum) && sizeNum > 0 ? sizeNum : Number(size);
        const hasMoreByPages = Number.isFinite(pages) && pages > 0 ? pageNo < pages : false;
        const hasMoreByFill = Number.isFinite(effectiveSize) && effectiveSize > 0 ? list.length >= effectiveSize : false;

        if (!hasMoreByPages && !hasMoreByFill) return null;
    }

    return null;
}

async function fetchJsonWithFallbacks({ url, method, headers, body }) {
    const resp = await fetch(url, {
        method,
        headers,
        body,
        credentials: 'omit',
        cache: 'no-store',
    });

    const text = await resp.text();
    let json = null;
    try {
        json = JSON.parse(text);
    } catch {
        json = null;
    }

    if (!resp.ok) {
        const message = json && json.message ? String(json.message) : `HTTP ${resp.status}`;
        throw new Error(message);
    }

    if (!json) {
        throw new Error('Response bukan JSON');
    }

    return json;
}

function tryExtractNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const s = value.replace(/,/g, '').trim();
        const n = Number(s);
        if (Number.isFinite(n)) return n;
    }
    return null;
}

function findFirstByKeyHints(root, keyHints) {
    const hints = (keyHints || []).map((h) => String(h).toLowerCase());
    const visited = new Set();

    function walk(node) {
        if (!node || typeof node !== 'object') return null;
        if (visited.has(node)) return null;
        visited.add(node);

        if (Array.isArray(node)) {
            for (const item of node) {
                const r = walk(item);
                if (r !== null) return r;
            }
            return null;
        }

        for (const [k, v] of Object.entries(node)) {
            const lk = String(k).toLowerCase();
            if (hints.some((h) => lk.includes(h))) {
                const n = tryExtractNumber(v);
                if (n !== null) return n;
                if (typeof v === 'string' && v.trim()) return v.trim();
            }
        }

        for (const v of Object.values(node)) {
            const r = walk(v);
            if (r !== null) return r;
        }
        return null;
    }

    return walk(root);
}

function detectScatterFromJson(root) {
    const visited = new Set();
    let found = false;
    let bestCount = null;

    function walk(node) {
        if (!node || typeof node !== 'object') return;
        if (visited.has(node)) return;
        visited.add(node);

        if (Array.isArray(node)) {
            node.forEach(walk);
            return;
        }

        for (const [k, v] of Object.entries(node)) {
            const lk = String(k).toLowerCase();
            if (lk.includes('scatter')) {
                found = true;
                const n = tryExtractNumber(v);
                if (n !== null && (bestCount === null || n > bestCount)) bestCount = n;
            }
            if (typeof v === 'string') {
                const lv = v.toLowerCase();
                if (lv.includes('scatter') || lv.includes('payout_scatter')) found = true;
            }
        }

        Object.values(node).forEach(walk);
    }

    walk(root);
    if (!found) return { found: false, title: '' };
    if (bestCount !== null) return { found: true, title: String(bestCount) };
    return { found: true, title: 'FOUND' };
}

async function getBetHistory({ gameName, tx19, token, agentHeaders }) {
    const headersBase = buildAuthHeaders(agentHeaders);
    const urlBase = 'https://public-api.u2uyu876x.com/web-api/operator-proxy/v1/History/GetBetHistory';

    const attempts = [];

    const qs1 = new URLSearchParams({ psid: tx19, sid: tx19, lang: 'en', t: token }).toString();
    attempts.push({ url: `${urlBase}?${qs1}`, method: 'GET', headers: headersBase });

    const qs2 = new URLSearchParams({ psid: tx19, sid: tx19, lang: 'en' }).toString();
    attempts.push({ url: `${urlBase}?${qs2}`, method: 'GET', headers: headersBase });

    const bodyJson = JSON.stringify({ psid: tx19, sid: tx19, lang: 'en', t: token });
    attempts.push({
        url: urlBase,
        method: 'POST',
        headers: { ...headersBase, 'content-type': 'application/json' },
        body: bodyJson,
    });

    const bodyForm = new URLSearchParams({ psid: tx19, sid: tx19, lang: 'en', t: token }).toString();
    attempts.push({
        url: urlBase,
        method: 'POST',
        headers: { ...headersBase, 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: bodyForm,
    });

    let lastErr = null;
    for (const a of attempts) {
        try {
            const json = await fetchJsonWithFallbacks(a);
            return json;
        } catch (e) {
            lastErr = e;
        }
    }

    throw lastErr || new Error('Gagal mengambil bet history');
}

async function processItemViaApi({ currentItem, agentHeaders, executorName, adminUrl, startDate, endDate, mode }) {
    const normalizedUserId = String(currentItem.userId || '').trim().split(/\s+/)[0];
    const userIdRaw = typeof currentItem.userIdRaw !== 'undefined' ? String(currentItem.userIdRaw) : '';
    const record = await queryTransactionHistoryListForUser({
        baseUrl: adminUrl,
        userId: normalizedUserId,
        transactionId: currentItem.transactionId,
        startDate,
        endDate,
        agentHeaders,
        maxPages: 1,
    });

    if (!record) {
        saveResult(
            {
                userId: normalizedUserId,
                userIdRaw,
                transactionId: currentItem.transactionId,
                debetValue: 'N/A',
                scatterTitle: 'Error: Transaksi tidak ditemukan (API)',
                expectedBetting: typeof currentItem.betting !== 'undefined' ? String(currentItem.betting) : '',
                detailBetting: '',
            },
            null,
            executorName
        );
        return;
    }

    const debetValue = typeof record.debet !== 'undefined' && record.debet !== null ? String(record.debet) : '0';
    const statusText = String(record.status_dictText || record.status || '').trim();
    const gameName = String(record.gameName || '').trim();
    const tx19 = String(currentItem.transactionId || '').slice(0, 19);
    const token = String(agentHeaders && agentHeaders["X-Access-Token"] ? agentHeaders["X-Access-Token"] : '');

    let detailBetting = '';
    let scatterTitle = statusText ? `OK: ${statusText}` : 'OK';

    if (mode === 'api_full') {
        try {
            const historyJson = await getBetHistory({ gameName, tx19, token, agentHeaders });
            const scatter = detectScatterFromJson(historyJson);
            const bettingNum = findFirstByKeyHints(historyJson, ['stake', 'betting', 'bet', 'wager', 'totalbet', 'total_bet']);
            if (bettingNum !== null) detailBetting = String(bettingNum);

            if (scatter.found) {
                scatterTitle = scatter.title ? `Scatter: ${scatter.title}` : 'Scatter: FOUND';
            } else {
                scatterTitle = 'Scatter: NONE';
            }
        } catch (e) {
            scatterTitle = `Error: DetailHistory ${String(e && e.message ? e.message : e)}`;
        }
    }

    saveResult(
        {
            userId: normalizedUserId,
            userIdRaw,
            transactionId: currentItem.transactionId,
            debetValue,
            scatterTitle,
            expectedBetting: typeof currentItem.betting !== 'undefined' ? String(currentItem.betting) : '',
            detailBetting,
            gameName,
        },
        null,
        executorName
    );
}

const HEADER_RULE_ID_BASE = 9100;
const HEADER_RULE_ID_COUNT = 12;

function getHeaderRuleIds() {
    return Array.from({ length: HEADER_RULE_ID_COUNT }, (_, i) => HEADER_RULE_ID_BASE + i);
}

function sanitizeHeaderValue(value) {
    return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
}

function getHostFromUrl(url) {
    try {
        return new URL(String(url)).hostname;
    } catch {
        return null;
    }
}

function isHistoryUrl(url) {
    const u = String(url || '');
    return u.includes('public.u2uyu876x.com/history/') ||
        u.includes('public-api.u2uyu876x.com/web-api/operator-proxy/v1/History/GetBetHistory') ||
        u.includes('agent.png777.com/keterangan-detail.html');
}

function getBestNormalWindowId(callback) {
    chrome.windows.getLastFocused({}, (win) => {
        if (win && win.type === 'normal') {
            callback(win.id);
            return;
        }
        chrome.windows.getAll({}, (wins) => {
            const normal = (wins || []).find((w) => w && w.type === 'normal');
            callback(normal ? normal.id : null);
        });
    });
}

function moveHistoryTabOutOfPopup(tabId, popupWindowId, openerTabIdForTarget) {
    const done = (targetWindowId) => {
        if (!targetWindowId) return;
        chrome.tabs.move(tabId, { windowId: targetWindowId, index: -1 }, (moved) => {
            const finalTabId = moved && moved.id ? moved.id : tabId;
            try {
                chrome.tabs.update(finalTabId, { active: false }, () => {
                    void chrome.runtime.lastError;
                });
            } catch {}
            try {
                chrome.windows.remove(popupWindowId, () => {
                    void chrome.runtime.lastError;
                });
            } catch {}
            try { console.log('[CekBonus] moved history tab out of popup', { tabId: finalTabId, popupWindowId, targetWindowId }); } catch {}
        });
    };

    if (openerTabIdForTarget) {
        chrome.tabs.get(openerTabIdForTarget, (openerTab) => {
            const wId = openerTab && openerTab.windowId;
            if (wId) {
                done(wId);
                return;
            }
            getBestNormalWindowId(done);
        });
        return;
    }

    getBestNormalWindowId(done);
}

try {
    chrome.windows.onCreated.addListener((win) => {
        if (!win || win.type !== 'popup' || !win.id) return;
        const popupWindowId = win.id;
        chrome.tabs.query({ windowId: popupWindowId }, (tabs) => {
            (tabs || []).forEach((t) => {
                const url = t && (t.url || t.pendingUrl);
                if (!isHistoryUrl(url)) return;
                if (!shouldAutoHandlePopupForTab(t)) return;
                moveHistoryTabOutOfPopup(t.id, popupWindowId, t.openerTabId);
            });
        });
    });

    chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
        const url = (info && info.url) ? info.url : (tab && (tab.url || tab.pendingUrl));
        if (!isHistoryUrl(url)) return;
        if (!tab || !tab.windowId) return;
        if (!shouldAutoHandlePopupForTab(tab)) return;
        chrome.windows.get(tab.windowId, {}, (win) => {
            if (!win || win.type !== 'popup') return;
            moveHistoryTabOutOfPopup(tabId, tab.windowId, tab.openerTabId);
        });
    });
} catch {}

function updateAuthHeaderRules() {
    chrome.storage.local.get(["agentHeaders", "adminUrl"], (res) => {
        const agentHeaders = res.agentHeaders || null;
        const adminHost = getHostFromUrl(res.adminUrl || DEFAULT_ADMIN_URL);

        const removeRuleIds = getHeaderRuleIds();

        if (!agentHeaders || !agentHeaders["X-Access-Token"]) {
            chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules: [] });
            return;
        }

        const requestHeaders = Object.entries(agentHeaders)
            .filter(([k, v]) => typeof k === 'string' && k.length > 0 && typeof v !== 'undefined' && v !== null)
            .map(([k, v]) => ({ header: k, operation: 'set', value: sanitizeHeaderValue(v) }))
            .filter((h) => h.value.length > 0);

        if (requestHeaders.length === 0) {
            chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules: [] });
            return;
        }

        const domains = [
            adminHost,
            'agent.png777.com',
            'public.u2uyu876x.com',
            'public-api.u2uyu876x.com',
            'script.google.com',
        ].filter(Boolean);

        const uniqueDomains = Array.from(new Set(domains));

        const addRules = uniqueDomains.slice(0, HEADER_RULE_ID_COUNT).map((domain, idx) => ({
            id: HEADER_RULE_ID_BASE + idx,
            priority: 1,
            action: {
                type: 'modifyHeaders',
                requestHeaders,
            },
            condition: {
                urlFilter: `||${domain}^`,
                resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'fetch'],
            },
        }));

        chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
    });
}

try {
    chrome.runtime.onInstalled.addListener(updateAuthHeaderRules);
    chrome.runtime.onStartup.addListener(updateAuthHeaderRules);
} catch (e) {
}

const scriptToVerifyInitialTxId = (transactionId) => {
    const headerEls = document.querySelectorAll(".header-item-value");
    let currentTx = "";
    headerEls.forEach((el) => {
        if (el.textContent.trim().length >= 19) {
            currentTx = el.textContent.trim().slice(0, 19);
        }
    });
    if (currentTx) return currentTx === transactionId.slice(0, 19);
    try {
        const tx19 = String(transactionId || '').slice(0, 19);
        const href = String(location && location.href ? location.href : '');
        if (href.includes(tx19)) return true;
        const bodyText = document.body && document.body.innerText ? String(document.body.innerText) : '';
        if (bodyText && bodyText.includes(tx19)) return true;
    } catch {}
    return false;
};

const scriptToClickNext = (selector) => {
    const nextBtn = document.querySelector(selector);
    if (nextBtn) nextBtn.click();
    return nextBtn ? true : false;
};

const scriptToCheckScatter = (transactionId, userId, debetValue, expectedBetting) => {
    // Helper: parsing jumlah dengan dukungan format lokal
    const parseAmount = (raw) => {
        if (!raw) return NaN;
        let s = String(raw).trim();
        // buang semua kecuali angka, titik, koma
        s = s.replace(/[^0-9.,]/g, '');
        const hasComma = s.includes(',');
        const hasDot = s.includes('.');
        if (hasComma && hasDot) {
            // Asumsikan ',' sebagai ribuan, '.' sebagai desimal
            s = s.replace(/,/g, '');
            return parseFloat(s);
        } else if (hasComma && !hasDot) {
            // Asumsikan ',' sebagai desimal, '.' sebagai ribuan
            s = s.replace(/\./g, '');
            s = s.replace(/,/g, '.');
            return parseFloat(s);
        }
        // Hanya titik atau hanya angka
        s = s.replace(/,/g, '');
        return parseFloat(s);
    };

    // Coba cari nominal betting dari halaman detail (heuristik umum)
    const findDetailBetAmount = () => {
        // Heuristik komprehensif untuk menemukan nominal taruhan di halaman detail
        const labelRegex = /(stake|bet( amount)?|betting|taruhan|pertaruhan|total bet|base bet|nilai taruhan)/i;
        const numberRegex = /([0-9][0-9.,]*)/;

        // 1) Coba cari elemen dengan teks label + angka dalam satu node
        const primarySelectors = [
            '.result-detail-item',
            '.result-detail',
            '.detail-item',
            '.payout-item-label',
            '.payout-item-container',
            '.bet-amount',
            '.stake-amount'
        ];
        for (const sel of primarySelectors) {
            const nodes = document.querySelectorAll(sel);
            for (const n of nodes) {
                const txt = (n.textContent || '').trim();
                if (!txt) continue;
                if (/round\b/i.test(txt) || /time\b/i.test(txt) || /id\b/i.test(txt)) continue;
                const m1 = txt.match(new RegExp(labelRegex.source + "\\s*[:=]?\\s*" + numberRegex.source, 'i'));
                if (m1 && m1[2]) return m1[2];
            }
        }

        // 2) Cari pasangan label->nilai (sibling) seperti tabel/row
        const pairSelectors = 'tr, .row, .detail-row, .result-row';
        const rows = document.querySelectorAll(pairSelectors);
        for (const row of rows) {
            const children = Array.from(row.children || []);
            for (let i = 0; i < children.length; i++) {
                const c = children[i];
                const txt = (c.textContent || '').trim();
                if (!txt) continue;
                if (labelRegex.test(txt)) {
                    // Nilai bisa di node yang sama atau sibling berikutnya
                    const sameNum = txt.match(numberRegex);
                    if (sameNum && sameNum[1]) return sameNum[1];
                    const next = children[i + 1] || c.nextElementSibling;
                    if (next) {
                        const nextTxt = (next.textContent || '').trim();
                        const m2 = nextTxt.match(numberRegex);
                        if (m2 && m2[1]) return m2[1];
                    }
                }
            }
        }

        // 3) Pencarian global pada innerText (fallback terakhir berbasis label)
        const bodyText = (document.body && document.body.innerText) ? document.body.innerText : '';
        if (bodyText) {
            const m3 = bodyText.match(new RegExp(labelRegex.source + "[^0-9]*" + numberRegex.source, 'i'));
            if (m3 && m3[2]) return m3[2];
        }

        return null;
    };

    const scatterEls = document.querySelectorAll('.sprite-symbol.payout_scatter');
    const scatterEl = scatterEls && scatterEls[0] ? scatterEls[0] : null;
    if (!scatterEl) {
        try {
            const text = document.body && document.body.innerText ? String(document.body.innerText) : '';
            const m = text.match(/scatter\s*[:=]?\s*(\d{1,3})/i);
            if (m && m[1]) {
                return {
                    status: 'foundAndSaved',
                    result: {
                        userId,
                        transactionId,
                        debetValue,
                        scatterTitle: `Scatter: ${m[1]}`,
                        scatterCount: parseInt(m[1], 10),
                        expectedBetting: (typeof expectedBetting !== 'undefined' && expectedBetting !== null) ? String(expectedBetting).trim() : '',
                        detailBetting: '',
                    }
                };
            }
        } catch {}
        return { status: 'notFound' };
    }

    const payoutContainer = scatterEl.closest('.payout-item-container');
    let scatterCount = scatterEls ? scatterEls.length : 0;
    let scatterTitle = scatterCount > 0 ? `Scatter: ${scatterCount}` : 'Scatter: FOUND';

    if (payoutContainer) {
        const payoutTitleEl = payoutContainer.querySelector('.payout-item-label .payout-item-title');
        
        if (payoutTitleEl) {
            const rawTitle = payoutTitleEl.textContent.trim();

            // Prefer angka dari title (mis: "3x") dibanding hitungan elemen DOM
            const normalized = rawTitle.replace(/x/gi, ' ').trim();
            const mNum = normalized.match(/(\d{1,3})/);
            if (mNum && mNum[1]) {
                const n = parseInt(mNum[1], 10);
                if (Number.isFinite(n) && n >= 0) {
                    scatterCount = n;
                }
            }

            scatterTitle = rawTitle;
            
            // Hapus karakter 'x' (case insensitive)
            if (scatterTitle.length > 0) {
                scatterTitle = scatterTitle.replace(/x/gi, '').trim();
            }
            
            if (scatterTitle === '') {
                scatterTitle = scatterCount > 0 ? `Scatter: ${scatterCount}` : 'Scatter: FOUND';
            }
        } else {
            scatterTitle = scatterCount > 0 ? `Scatter: ${scatterCount}` : 'Scatter: FOUND';
        }
    } else {
        scatterTitle = scatterCount > 0 ? `Scatter: ${scatterCount}` : 'Scatter: FOUND';
    }

    // Bandingkan nominal betting: debetValue (tabel utama) vs detail page
    const detailBetRaw = findDetailBetAmount();
    const detailBetNum = parseAmount(detailBetRaw);
    const expectedNum = typeof expectedBetting !== 'undefined' && expectedBetting !== null ? parseAmount(expectedBetting) : NaN;
    const debetNum = parseAmount(debetValue);
    const epsilon = 0.0001;

    // Prefer compare dengan expected betting dari web jika tersedia, else fallback ke debet
    if (!isNaN(detailBetNum)) {
        // Ada nominal di halaman detail, bandingkan seperti biasa
        if (!isNaN(expectedNum)) {
            if (Math.abs(expectedNum - detailBetNum) > epsilon) {
                const expStr = String(expectedBetting).trim();
                const detailStr = String(detailBetRaw || detailBetNum).trim();
                scatterTitle = `Gagal (nominal betting salah) | Web: ${expStr} vs Detail: ${detailStr}`;
            }
        } else if (!isNaN(debetNum)) {
            if (Math.abs(debetNum - detailBetNum) > epsilon) {
                const debetStr = String(debetValue).trim();
                const detailStr = String(detailBetRaw || detailBetNum).trim();
                scatterTitle = `Gagal (nominal betting salah) | Tabel: ${debetStr} vs Detail: ${detailStr}`;
            }
        }
    } else {
        // Tidak menemukan nominal di halaman detail. Jika Web vs Tabel berbeda, anggap gagal.
        if (!isNaN(expectedNum) && !isNaN(debetNum)) {
            if (Math.abs(expectedNum - debetNum) > epsilon) {
                const expStr = String(expectedBetting).trim();
                const debetStr = String(debetValue).trim();
                scatterTitle = `Gagal (nominal berbeda) | Web: ${expStr} vs Tabel: ${debetStr} | Detail: ?`;
            }
        } else if (!isNaN(expectedNum) && isNaN(debetNum)) {
            // Expected ada tapi tidak bisa verifikasi, tandai sebagai gagal agar tidak false-positive
            scatterTitle = `Gagal (nominal detail tidak ditemukan)`;
        }
    }

    return {
        status: 'foundAndSaved',
        result: { 
            userId, 
            transactionId, 
            debetValue, 
            scatterTitle,
            scatterCount: scatterCount,
            // Sertakan expectedBetting agar popup bisa menampilkan Betting (Web)
            expectedBetting: (typeof expectedBetting !== 'undefined' && expectedBetting !== null) ? String(expectedBetting).trim() : '',
            detailBetting: (detailBetRaw ? String(detailBetRaw).trim() : (!isNaN(detailBetNum) ? String(detailBetNum) : ''))
        }
    };
};

// ----------------- FUNGSI KONTROL ASINKRON -----------------

const executeFinalScatterCheck = (tabId, transactionId, userId, debetValue, expectedBetting, executorName) => {
    console.log("🎯 Round terakhir tercapai. Menjalankan cek Scatter.");
    
    chrome.scripting.executeScript(
        {
            target: { tabId: tabId },
            func: scriptToCheckScatter,
            args: [transactionId, userId, debetValue, expectedBetting] 
        },
        (results) => {
            const resultData = results[0] ? results[0].result : { status: "error" };
            
            if (resultData.status === "foundAndSaved" && resultData.result) {
                // PENYIMPANAN DATA BERHASIL
                saveResult(resultData.result, tabId, executorName);
            } else {
                console.log("❌ Scatter tidak ditemukan. Menutup tab.");
                // Catat transaksi tidak ditemukan 
                saveResult({ 
                    userId, 
                    transactionId, 
                    debetValue, 
                    scatterTitle: "Scatter tidak ditemukan" 
                }, tabId);
            }
        }
    );
}

const runNextClickLoop = (tabId, transactionId, userId, debetValue, expectedBetting, currentRound, totalRounds, executorName) => {
    
    if (currentRound >= totalRounds) {
        // Panggil dengan executorName
        return executeFinalScatterCheck(tabId, transactionId, userId, debetValue, expectedBetting, executorName); 
    }

    console.log(`🔄 Mengklik Next (Iterasi ${currentRound}/${totalRounds - 1})...`);
    
    chrome.scripting.executeScript(
        {
            target: { tabId: tabId },
            func: scriptToClickNext, 
            args: [NEXT_BTN_SELECTOR]
        },
        (clickResult) => {
            const clicked = clickResult[0] ? clickResult[0].result : false;
            if (clicked) {
                const nextRound = currentRound + 1;
                const nextDelay = (nextRound >= totalRounds) ? 1200 : DELAY_TIME; 

                setTimeout(() => {
                    runNextClickLoop(tabId, transactionId, userId, debetValue, expectedBetting, nextRound, totalRounds, executorName);
                }, nextDelay); 
            } else {
                console.log("🛑 Tombol Next hilang prematur. Menghentikan loop dan cek Scatter.");
                executeFinalScatterCheck(tabId, transactionId, userId, debetValue, expectedBetting, executorName);
            }
        }
    );
};


const startRoundBasedProcess = async (tabId, transactionId, userId, debetValue, expectedBetting, executorName) => {

    const ready = await waitForDetailReady(tabId, 6500);
    if (!ready) {
        await delay(INITIAL_LOAD_DELAY);
    }
    
    chrome.scripting.executeScript(
        {
            target: { tabId: tabId },
            func: scriptToGetRoundCount
        },
        (results) => {
            if (chrome.runtime.lastError) {
                console.error("Kesalahan saat mengambil Round Count:", chrome.runtime.lastError.message);
                chrome.tabs.remove(tabId);
                startNextProcess(); 
                return;
            }
            
            const roundData = results[0] ? results[0].result : { totalRounds: 1, currentRound: 1 };
            const totalRounds = roundData.totalRounds;
            const currentRound = roundData.currentRound;

            chrome.scripting.executeScript(
                {
                    target: { tabId: tabId },
                    func: scriptToVerifyInitialTxId,
                    args: [transactionId]
                },
                (idResults) => {
                    if (chrome.runtime.lastError) {
                        console.error("Kesalahan saat verifikasi ID Transaksi:", chrome.runtime.lastError.message);
                        chrome.tabs.remove(tabId);
                        startNextProcess(); 
                        return;
                    }
                    
                    const idMatch = idResults[0] ? idResults[0].result : false;
                    
                    if (!idMatch) {
                        console.error("🛑 Gagal verifikasi Transaction ID di Round 1. Menutup tab.");
                        saveResult({ 
                            userId, 
                            transactionId, 
                            debetValue, 
                            scatterTitle: "Gagal verifikasi ID di detail" 
                        }, tabId);
                        return;
                    }

                    console.log(`✅ ID Transaksi terverifikasi. Round ditemukan: Total ${totalRounds}, Perlu ${totalRounds - currentRound} klik Next.`);
                    runNextClickLoop(tabId, transactionId, userId, debetValue, expectedBetting, currentRound, totalRounds, executorName);
                }
            );
        }
    );
};


chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'BONUSSMB_TRIGGER_VERIFICATION') {
        processPendingBonussmbVerifications();
        sendResponse({ ok: true });
        return true;
    }

    if (msg.type === 'BONUSSMB_VERIFY_SINGLE') {
        const userId = String(msg.payload?.userId || '').trim();
        const transactionId = String(msg.payload?.transactionId || '').trim();
        if (!userId || !transactionId) {
            sendResponse({ ok: false, error: 'userId/transactionId missing' });
            return false;
        }
        
        console.log(`[BonusScatter] Manual status check requested for ${userId} | ${transactionId}`);
        
        // Respond immediately to prevent message port closure in Chrome!
        sendResponse({ ok: true, status: 'checking' });
        
        // Execute verification asynchronously in the background
        verifyBonussmbStatus(userId, transactionId).then(async (result) => {
            if (result && result.ok && result.status && result.status !== 'NOT_FOUND') {
                await updateVerifiedStatusAsync(userId, transactionId, result.status, result.keterangan || '');
            } else if (result && result.status === 'NOT_FOUND') {
                await updateVerifiedStatusAsync(userId, transactionId, 'NOT_FOUND', '');
            }
        }).catch((e) => {
            console.error('[BonusScatter] Manual status check failed:', e);
        });
        
        return false;
    }

    if (msg.action === 'keepAlive') {
        sendResponse({ ok: true, ts: Date.now() });
        return false;
    }
    
    // ====== 1. Handler Baru: Mulai Proses Batch ======
    if (msg.action === "startBatchProcess") {
        startNextProcess();
        sendResponse({ status: "started" });
        return true;
    }

    if (msg.action === "queueTickets") {
        const txQueue = Array.isArray(msg.txQueue) ? msg.txQueue : [];
        const config = msg.config || {};

        chrome.storage.local.get(['jutawanResults', 'txQueue'], (res) => {
            const existingResults = Array.isArray(res.jutawanResults) ? res.jutawanResults : [];
            const successIds = new Set(
                existingResults
                    .filter((r) => {
                        const title = String(r.scatterTitle || '').toLowerCase();
                        const isError = title.includes('tidak ditemukan') || title.startsWith('error') || title.includes('gagal');
                        return !isError;
                    })
                    .map((r) => String(r.transactionId))
            );

            const bonussmbDoneIds = new Set(
                existingResults
                    .filter((r) => {
                        const s = String(r?.bonussmbStatus || '').trim();
                        return s === 'Sudah input' || s === 'Ticket sudah ada';
                    })
                    .map((r) => String(r.transactionId))
            );

            let existingQueue = Array.isArray(res.txQueue) ? res.txQueue : [];
            existingQueue = existingQueue.filter((q) => !successIds.has(String(q.transactionId)));
            const existingMap = new Map(existingQueue.map((q) => [`${q.userId}|${q.transactionId}`, q]));

            (Array.isArray(txQueue) ? txQueue : []).forEach((q) => {
                if (successIds.has(String(q.transactionId))) return;
                if (bonussmbDoneIds.has(String(q.transactionId))) return;
                const key = `${q.userId}|${q.transactionId}`;
                if (existingMap.has(key)) {
                    const merged = { ...existingMap.get(key), ...q };
                    existingMap.set(key, merged);
                } else {
                    existingMap.set(key, q);
                }
            });

            const finalQueue = Array.from(existingMap.values());
            const nextResults = [...existingResults];
            const indexByKey = new Map();
            for (let i = 0; i < nextResults.length; i++) {
                const r = nextResults[i] && typeof nextResults[i] === 'object' ? nextResults[i] : {};
                const key = `${String(r.userId)}|${String(r.transactionId)}`;
                if (!indexByKey.has(key)) indexByKey.set(key, i);
            }

            for (const q of finalQueue) {
                const userId = String(q.userId || '').trim();
                const transactionId = String(q.transactionId || '').trim();
                if (!userId || !transactionId) continue;
                const key = `${userId}|${transactionId}`;
                if (indexByKey.has(key)) {
                    const idx = indexByKey.get(key);
                    const r = nextResults[idx] && typeof nextResults[idx] === 'object' ? nextResults[idx] : {};
                    const merged = { ...r };
                    if (!merged.userIdRaw && typeof q.userIdRaw !== 'undefined') merged.userIdRaw = String(q.userIdRaw);
                    if (!merged.expectedBetting && typeof q.betting !== 'undefined' && q.betting !== '') merged.expectedBetting = String(q.betting);
                    if (!merged.statusCek) merged.statusCek = 'Pending';
                    nextResults[idx] = merged;
                    continue;
                }

                nextResults.push({
                    userId,
                    userIdRaw: typeof q.userIdRaw !== 'undefined' ? String(q.userIdRaw) : userId,
                    transactionId,
                    debetValue: '',
                    scatterTitle: '',
                    scatterCount: null,
                    statusCek: 'Pending',
                    expectedBetting: typeof q.betting !== 'undefined' ? String(q.betting) : '',
                    detailBetting: '',
                    bonussmbStatus: '',
                    bonussmbDetail: '',
                });
                indexByKey.set(key, nextResults.length - 1);
            }

            const toSave = { txQueue: finalQueue, jutawanResults: nextResults };
            ['executorName','adminUrl','startDate','endDate','todayDate','agentHeaders','processMode'].forEach((k) => {
                if (typeof config[k] !== 'undefined') toSave[k] = config[k];
            });

            chrome.storage.local.set(toSave, () => {
                startNextProcess();
                sendResponse({ status: 'accepted', count: finalQueue.length });
            });
        });

        return true;
    }

    if (msg.action === 'retryBonussmbInput') {
        const userId = String(msg.userId || '').trim();
        const transactionId = String(msg.transactionId || '').trim();
        if (!userId || !transactionId) {
            sendResponse({ ok: false, error: 'userId/transactionId missing' });
            return false;
        }

        const key = `${userId}|${transactionId}`;
        enqueueBonussmbStatus(userId, transactionId, 'Mengulang...', '');

        chrome.storage.local.get(['jutawanResults'], (res) => {
            const rows = Array.isArray(res.jutawanResults) ? res.jutawanResults : [];
            const found = rows.find((r) => String(r?.userId || '') === userId && String(r?.transactionId || '') === transactionId);
            if (!found) {
                enqueueBonussmbStatus(userId, transactionId, 'Gagal input', 'Data hasil tidak ditemukan');
                sendResponse({ ok: false, error: 'result_not_found' });
                return;
            }

            const b = String(found?.bonussmbStatus || '').trim();
            if (b === 'Sudah input' || b === 'Ticket sudah ada') {
                sendResponse({ ok: false, error: 'bonussmb_already_done' });
                return;
            }

            const statusCek = deriveStatusCek(found);
            if (statusCek !== 'Sukses cek') {
                enqueueBonussmbStatus(userId, transactionId, 'Gagal input', 'Status cek belum sukses');
                sendResponse({ ok: false, error: 'cek_not_success' });
                return;
            }

            enqueueBonussmbFill({ ...found, bonussmbStatus: 'Mengulang...' });
            sendResponse({ ok: true });
        });

        return true;
    }
    
    // ====== 2. Buka tab link detail ======
    if (msg.action === "openLink") {
        chrome.tabs.create({ url: msg.url, active: false }, (tab) => {
            if (tab && tab.id) {
                sendResponse({ tabId: tab.id });
            } else {
                console.error("Gagal membuat tab baru:", msg.url);
                sendResponse({ error: "Tab tidak dapat dibuat" });
            }
        });
        return true;
    }

    if (msg.action === "openLinkInSameWindow") {
        const openerTabId = msg.openerTabId;
        const url = msg.url;
        if (!openerTabId || !url) {
            sendResponse({ error: "openerTabId/url missing" });
            return false;
        }
        chrome.tabs.get(openerTabId, (openerTab) => {
            const windowId = openerTab && openerTab.windowId;
            let finalUrl = url;
            try {
                finalUrl = new URL(String(url), openerTab && openerTab.url ? openerTab.url : undefined).toString();
            } catch {}
            chrome.tabs.create({ url: finalUrl, active: false, windowId }, (tab) => {
                if (tab && tab.id) {
                    sendResponse({ tabId: tab.id });
                } else {
                    sendResponse({ error: "Tab tidak dapat dibuat" });
                }
            });
        });
        return true;
    }

    if (msg.action === "installWindowOpenInterceptor") {
        const openerTabId = msg.openerTabId;
        const nonce = msg.nonce;
        if (!openerTabId || !nonce) {
            sendResponse({ error: "openerTabId/nonce missing" });
            return false;
        }

        markAutoPopupBlock(openerTabId, 15000);

        chrome.scripting.executeScript(
            {
                target: { tabId: openerTabId },
                world: 'MAIN',
                func: (nonceValue) => {
                    try {
                        const KEY = '__CEKBONUS_WINDOW_OPEN_INSTALLED__';
                        if (window[KEY]) return;
                        window[KEY] = true;
                        const originalOpen = window.open;

                        window.open = function (url, target, features) {
                            try {
                                window.postMessage({ type: 'CEKBONUS_WINDOW_OPEN', nonce: nonceValue, url: String(url || '') }, '*');
                            } catch {}
                            try {
                                return null;
                            } catch {
                                return null;
                            }
                        };

                        window.addEventListener(
                            'message',
                            (ev) => {
                                try {
                                    if (!ev || !ev.data || typeof ev.data !== 'object') return;
                                    if (ev.data.type !== 'CEKBONUS_RESTORE_WINDOW_OPEN') return;
                                    if (ev.data.nonce !== nonceValue) return;
                                    window.open = originalOpen;
                                    window[KEY] = false;
                                } catch {}
                            },
                            true
                        );
                    } catch {}
                },
                args: [nonce],
            },
            () => {
                if (chrome.runtime.lastError) {
                    sendResponse({ error: chrome.runtime.lastError.message });
                } else {
                    sendResponse({ status: 'ok' });
                }
            }
        );
        return true;
    }

    if (msg.action === "captureNextHistoryTab") {
        const openerTabId = msg.openerTabId;
        const timeoutMs = typeof msg.timeoutMs === 'number' ? msg.timeoutMs : 8000;
        if (!openerTabId) {
            sendResponse({ error: "openerTabId missing" });
            return false;
        }

        markAutoPopupBlock(openerTabId, Math.max(12000, timeoutMs + 3000));

        const startedAt = Date.now();
        let resolved = false;

        const finish = (payload) => {
            if (resolved) return;
            resolved = true;
            try { chrome.tabs.onCreated.removeListener(onCreated); } catch {}
            try { chrome.tabs.onUpdated.removeListener(onUpdated); } catch {}
            try { clearTimeout(timer); } catch {}
            sendResponse(payload);
        };

        const normalizeAndFinish = (tabId, url) => {
            chrome.tabs.get(tabId, (t) => {
                const wId = t && t.windowId;
                if (!wId) {
                    finish({ tabId, url });
                    return;
                }
                chrome.windows.get(wId, {}, (win) => {
                    if (win && win.type === 'popup') {
                        moveHistoryTabOutOfPopup(tabId, wId, openerTabId);
                        setTimeout(() => {
                            finish({ tabId, url });
                        }, 200);
                        return;
                    }
                    try {
                        chrome.tabs.update(tabId, { active: false }, () => {
                            void chrome.runtime.lastError;
                        });
                    } catch {}
                    finish({ tabId, url });
                });
            });
        };

        const onCreated = (tab) => {
            if (resolved) return;
            const tabId = tab && tab.id;
            if (!tabId) return;
            if (Date.now() - startedAt > timeoutMs) return;
            const url = tab.url || tab.pendingUrl;
            if (isHistoryUrl(url)) {
                normalizeAndFinish(tabId, url);
            }
        };

        const onUpdated = (tabId, info, tab) => {
            if (resolved) return;
            if (Date.now() - startedAt > timeoutMs) return;
            const url = info && info.url ? info.url : (tab && tab.url);
            if (isHistoryUrl(url)) {
                normalizeAndFinish(tabId, url);
            }
        };

        chrome.tabs.onCreated.addListener(onCreated);
        chrome.tabs.onUpdated.addListener(onUpdated);

        const timer = setTimeout(() => {
            if (!resolved) {
                finish({ error: `timeout after ${Date.now() - startedAt}ms` });
            }
        }, timeoutMs);

        return true;
    }

    // ====== 3. Eksekusi Script di Tab Detail (Titik Awal Proses Loop) ======
    if (msg.action === "executeScriptInTab") {
        const { tabId, transactionId, userId, debetValue, expectedBetting, mainTabId } = msg;

        // Ambil executorName dari storage untuk memulai proses
        chrome.storage.local.get("executorName", (res) => {
            const executorName = res.executorName;
             // Panggil proses utama dengan executorName
            startRoundBasedProcess(tabId, transactionId, userId, debetValue, expectedBetting, executorName);
        });
        
        sendResponse({ status: "processStarted" }); 
        return true; 
    }
    // ====== 5. Handler Baru: Tutup Tab dari content.js ======
    if (msg.action === "closeTab") {
        if (msg.tabId) {
            chrome.tabs.remove(msg.tabId, () => {
                console.log(`Tab utama ID ${msg.tabId} berhasil ditutup.`);
            });
        }
        sendResponse({ status: "closing" }); 
        return true; 
    }
    
    // ====== 4. Handler Error dari content.js ======
   if (msg.action === "processError") {
    // ... (Logika error)
    // Catat error dan pindah ke proses berikutnya
    chrome.storage.local.get("executorName", (res) => {
        const executorName = res.executorName;
         // Catat error dan pindah ke proses berikutnya, kirim executorName
        saveResult({ 
            userId: msg.userId, 
            transactionId: msg.transactionId, 
            debetValue: "N/A", 
            scatterTitle: `Error: ${msg.error}`
        }, sender.tab.id, executorName); 
    });
    return true;
}
});

// Mulai proses segera saat antrian di storage berubah
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.agentHeaders || changes.adminUrl) {
        updateAuthHeaderRules();
    }
    if (changes.txQueue) {
        chrome.storage.local.get(["txQueue", "agentHeaders", "executorName", "adminUrl", "startDate", "endDate"], (res) => {
            const hasQueue = Array.isArray(res.txQueue) && res.txQueue.length > 0;
            const cfgOk = !!(res.agentHeaders && res.agentHeaders["X-Access-Token"]);
            if (hasQueue && cfgOk) {
                startNextProcess();
            }
        });
    }
});
