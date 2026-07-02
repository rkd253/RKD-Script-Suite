// bridge-scatter.js
// Menjembatani komunikasi antara halaman Scatter Check (web app)
// dan background extension menggunakan window.postMessage + chrome.storage

(function() {
  // Beri tahu halaman bahwa bridge sudah siap
  try {
    window.postMessage({ type: 'SCATTER_BRIDGE_READY' }, '*');
    // Tandai di storage bahwa bridge aktif di halaman ini (untuk debugging popup)
    try {
      chrome.storage.local.set({ scatterBridgeReady: Date.now() });
    } catch (e) {
      // ignore
    }
    try {
      console.log('[Bridge] Ready on', location.href);
    } catch (e) {}
  } catch (e) {
    // ignore
  }

  // Terima pesan dari halaman untuk mengirim antrian ke extension
  window.addEventListener('message', (event) => {
    // Catatan: content script berjalan di isolated world,
    // sehingga perbandingan event.source !== window bisa salah.
    // Terima pesan dan validasi berdasarkan struktur/type saja.
    const data = event?.data || {};
    if (!data || typeof data !== 'object') return;

    // Sinkronisasi flag auto-start dari halaman
    if (data.type === 'SET_AUTO_START') {
      try {
        const enabled = !!data.enabled;
        chrome.storage.local.set({ autoStartEnabled: enabled }, () => {
          try { console.log('[Bridge] autoStartEnabled set to', enabled); } catch {}
        });
      } catch {}
      return;
    }

    if (data.type === 'QUEUE_TICKETS') {
      const txQueue = Array.isArray(data.txQueue) ? data.txQueue : [];
      const config = data.config || {};
      try {
        console.log('[Bridge] QUEUE_TICKETS received, length =', txQueue.length);
      } catch {}

      chrome.runtime.sendMessage({ action: 'queueTickets', txQueue, config }, (resp) => {
        const lastErr = chrome.runtime.lastError;
        const ok = !lastErr;
        const count = resp && typeof resp.count === 'number' ? resp.count : txQueue.length;
        const error = lastErr ? lastErr.message : '';
        try {
          window.postMessage({ type: 'SCATTER_QUEUE_ACCEPTED', ok, count, error }, '*');
        } catch {}
      });
    }

    if (data.type === 'RETRY_BONUSSMB') {
      const userId = String(data.userId || '').trim();
      const transactionId = String(data.transactionId || '').trim();
      if (!userId || !transactionId) {
        try {
          window.postMessage({ type: 'SCATTER_BONUSSMB_RETRY_ACK', ok: false, error: 'userId/transactionId missing' }, '*');
        } catch {}
        return;
      }

      chrome.runtime.sendMessage({ action: 'retryBonussmbInput', userId, transactionId }, (resp) => {
        const lastErr = chrome.runtime.lastError;
        const ok = !!(resp && resp.ok) && !lastErr;
        const error = lastErr ? lastErr.message : resp && resp.error ? String(resp.error) : '';
        try {
          window.postMessage({ type: 'SCATTER_BONUSSMB_RETRY_ACK', userId, transactionId, ok, error }, '*');
        } catch {}
      });
    }
  });

  // Pantau perubahan hasil di storage dan kirim ke halaman
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.jutawanResults) {
      const newResults = changes.jutawanResults.newValue || [];
      try { console.log('[Bridge] Results updated:', newResults.length); } catch {}
      try {
        window.postMessage({ type: 'SCATTER_RESULT_BATCH', results: newResults }, '*');
      } catch {}
    }
  });
})();
