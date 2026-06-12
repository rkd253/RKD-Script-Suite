function isExtensionPage() {
  try {
    return location.protocol === 'chrome-extension:' && !!(window.chrome && chrome.runtime && chrome.runtime.id);
  } catch {
    return false;
  }
}

function postQueue(txQueue) {
  if (!Array.isArray(txQueue) || txQueue.length === 0) {
    setStatus('⚠️ Data kosong. Isi User ID + Kode Tiket, atau pakai Multi input.');
    return;
  }

  const config = buildConfig();
  const payload = { action: 'queueTickets', txQueue, config, _ts: Date.now() };

  if (isExtensionPage()) {
    const send = (attempts = 3) => {
      try {
        chrome.runtime.sendMessage(payload, (response) => {
          if (chrome.runtime.lastError) {
            const err = chrome.runtime.lastError.message;
            if (attempts > 1) {
              console.warn('🔄 Mencoba kirim ulang...', attempts);
              setTimeout(() => send(attempts - 1), 500);
            } else {
              setStatus(`❌ Gagal koneksi: ${err}. Silakan REFRESH (F5) halaman ini.`);
            }
            return;
          }
          const count = response && typeof response.count === 'number' ? response.count : txQueue.length;
          setStatus(`✅ Antrian diterima. Total: ${count}.`);
        });
      } catch (e) {
        setStatus(`❌ Error: ${e.message}. Silakan Refresh (F5).`);
      }
    };
    send();
    return;
  }

  window.postMessage({ type: 'QUEUE_TICKETS', ...payload }, '*');
  setStatus(`📤 Mengirim ke bridge...`);
}

function requestRetryBonussmbInput({ userId, transactionId }, onDone) {
  const payload = { action: 'retryBonussmbInput', userId, transactionId, _ts: Date.now() };
  if (isExtensionPage()) {
    const send = (attempts = 2) => {
      chrome.runtime.sendMessage(payload, (resp) => {
        if (chrome.runtime.lastError) {
          if (attempts > 1) return setTimeout(() => send(attempts - 1), 500);
          onDone({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        onDone(resp && typeof resp === 'object' ? resp : { ok: true });
      });
    };
    send();
    return;
  }
  window.postMessage({ type: 'RETRY_BONUSSMB', ...payload }, '*');
  onDone({ ok: true });
}

function hydrateFromStorage() {
  if (!isExtensionPage()) return;
  chrome.storage.local.get(['jutawanResults', 'executorName', 'adminUrl', 'startDate', 'endDate', 'agentHeaders'], (res) => {
    if (res.executorName) el.executorName.value = String(res.executorName);
    if (res.adminUrl) el.adminUrl.value = String(res.adminUrl);
    if (res.startDate) el.startDate.value = String(res.startDate);
    if (res.endDate) el.endDate.value = String(res.endDate);

    const hdr = res.agentHeaders && typeof res.agentHeaders === 'object' ? res.agentHeaders : null;
    if (hdr) {
      const entries = Object.entries(hdr);
      if (entries.length) {
        el.agentHeaders.value = entries.map(([k, v]) => `${k}\n${v}`).join('\n');
      }
    }

    const rows = Array.isArray(res.jutawanResults) ? res.jutawanResults : [];
    renderResults(rows);
    if (rows.length > 0) setStatus(`📥 Hasil ter-load: ${rows.length} baris.`);
  });
}

function listenStorageUpdates() {
  if (!isExtensionPage()) return;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.jutawanResults) {
      renderResults(changes.jutawanResults.newValue || []);
    }
  });
}

function startResultsPollingFallback() {
  if (!isExtensionPage()) return;
  let lastLen = -1;
  setInterval(() => {
    chrome.storage.local.get(['jutawanResults'], (res) => {
      const rows = Array.isArray(res.jutawanResults) ? res.jutawanResults : [];
      if (rows.length === lastLen) return;
      lastLen = rows.length;
      renderResults(rows);
      if (rows.length > 0) setStatus(`📥 Hasil ter-update: ${rows.length} baris.`);
    });
  }, 2000);
}

function listenRuntimePush() {
  if (!isExtensionPage()) return;
  try {
    chrome.runtime.onMessage.addListener((msg) => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type !== 'RESULTS_PUSH') return;
      const rows = Array.isArray(msg.results) ? msg.results : [];
      renderResults(rows);
      if (rows.length > 0) setStatus(`📥 Hasil ter-push: ${rows.length} baris.`);
    });
  } catch {
  }
}

window.addEventListener('message', (event) => {
  const data = event && event.data ? event.data : null;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'BRIDGE_PONG') {
    state.bridgeConnected = true;
    state.bridgeUrl = data.url || '';
    setBridgeBadge('ok', `Bridge: OK (${data.title || 'tab'})`);

    if (state.bridgeUrl.includes('bonussmb.com')) {
      if (el.searchStatusBtn) el.searchStatusBtn.style.display = 'inline-block';
    } else {
      if (el.searchStatusBtn) el.searchStatusBtn.style.display = 'none';
    }
    setStatus('🔌 Bridge aktif. Siap kirim tiket.');
    return;
  }

  if (data.type === 'SCATTER_BRIDGE_READY') {
    state.bridgeReady = true;
    setBridgeBadge('ok', 'Bridge: aktif');
    setStatus('🔌 Bridge aktif. Siap kirim tiket.');
    return;
  }

  if (data.type === 'SCATTER_QUEUE_ACCEPTED') {
    const count = typeof data.count === 'number' ? data.count : 0;
    setStatus(`✅ Antrian diterima. Total antrian tersimpan: ${count}.`);
    return;
  }

  if (data.type === 'SCATTER_RESULT_BATCH') {
    const results = Array.isArray(data.results) ? data.results : [];
    state.results = results;
    renderResults(results);
    setStatus(`📥 Hasil ter-update: ${results.length} baris.`);
    return;
  }

  if (data.type === 'SCATTER_BONUSSMB_RETRY_ACK') {
    const ok = !!data.ok;
    const err = String(data.error || '').trim();
    if (ok) setStatus('✅ Permintaan input ulang dikirim.');
    else setStatus(`❌ Gagal input ulang: ${err || 'unknown'}`);
  }
});

setTimeout(() => {
  if (isExtensionPage()) {
    setBridgeBadge('ok', 'Mode: extension');
    hydrateFromStorage();
    listenStorageUpdates();
    listenRuntimePush();
    startResultsPollingFallback();
    return;
  }
  if (!state.bridgeReady) {
    setBridgeBadge('bad', 'Bridge: tidak terdeteksi');
    setStatus('⚠️ Bridge tidak terdeteksi. Pastikan ekstensi terpasang dan halaman dibuka via http://localhost atau http://127.0.0.1.');
  }
}, 1800);

