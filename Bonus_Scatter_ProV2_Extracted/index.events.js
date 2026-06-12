async function showCenterNotif(text, duration = 3000) {
  const notif = el.centerNotif;
  if (!notif) return;
  
  // Cara paling ampuh: Pakai tag <img> langsung dengan fallback online
  const localSrc = './Dasha taran.jpg';
  const onlineSrc = 'https://i.ibb.co/h7h3Hdf/Dasha-taran.jpg';

  notif.innerHTML = `
    <img class="notif-img-el" src="${localSrc}" 
         onerror="this.src='${onlineSrc}'; this.onerror=null;"
         style="width:180px; height:180px; border-radius:25px; border:3px solid #ff99cc; 
                box-shadow:0 0 30px rgba(255,153,204,0.6); margin-bottom:15px; 
                object-fit:cover; animation:notif-pulse 2s infinite ease-in-out;">
    <div class="notif-text">${text.replace(/\n/g, '<br>')}</div>
  `;
  
  notif.classList.add('show');
  setTimeout(() => {
    notif.classList.remove('show');
  }, duration);
}

async function playRocketAnimation(customMsg = '') {
  return new Promise((resolve) => {
    const r = el.rocket;
    const moon = el.targetMoon;
    const btn = el.sendBtn;
    const userIdEl = el.userId;
    const ticketEl = el.ticketCode;

    if (!r || !moon) {
      resolve();
      return;
    }

    // Kembalikan ke roket terbang
    r.innerHTML = '🚀';

    // 1. Position at button
    const btnRect = btn.getBoundingClientRect();
    r.style.display = 'block';
    r.style.left = `${btnRect.left + btnRect.width / 2 - 20}px`;
    r.style.top = `${btnRect.top}px`;
    r.style.transform = 'rotate(-45deg)';

    setTimeout(() => {
      // 2. Fly to UserID
      const userRect = userIdEl.getBoundingClientRect();
      r.style.transition = 'all 0.8s ease-in-out';
      r.style.left = `${userRect.left + 20}px`;
      r.style.top = `${userRect.top}px`;
      r.style.transform = 'rotate(-90deg) scale(1.2)';

      setTimeout(() => {
        // 3. Fly to TicketCode
        const ticketRect = ticketEl.getBoundingClientRect();
        r.style.left = `${ticketRect.left + 20}px`;
        r.style.top = `${ticketRect.top}px`;
        r.style.transform = 'rotate(-90deg) scale(1.4)';

        setTimeout(() => {
          // Pick up values
          const txId = ticketEl.value;
          ticketEl.value = ''; 
          el.betting.value = ''; 
          el.bulk.value = '';

          // 4. Fly to Moon (Results)
          const moonRect = moon.getBoundingClientRect();
          r.style.left = `${moonRect.left}px`;
          r.style.top = `${moonRect.top}px`;
          r.style.transform = 'rotate(135deg) scale(1)';

          setTimeout(() => {
            // 5. Impact!
            moon.textContent = '🌙'; 
            moon.classList.add('hit');
            r.style.display = 'none';
            
            // Notification
            if (customMsg) {
              showCenterNotif(customMsg);
            } else if (txId) {
              showCenterNotif(`🎯 Tiket Berhasil Di-input!\n${txId}`);
            } else {
              showCenterNotif('🎯 Antrian Berhasil Di-input!');
            }

            setTimeout(() => {
              moon.classList.remove('hit');
              resolve();
            }, 800);
          }, 1000);
        }, 1000);
      }, 800);
    }, 100);
  });
}

el.sendBtn.addEventListener('click', async () => {
  const bulkItems = parseBulk(el.bulk.value);
  const userId = normalizeUserId(el.userId.value);
  const userIdRaw = normalizeLine(el.userId.value);
  const transactionId = normalizeTicketCode(el.ticketCode.value);
  const betting = normalizeLine(el.betting.value);

  if (bulkItems.length === 0 && (!userId || !transactionId)) {
    setStatus('⚠️ Harap isi User ID dan Kode Tiket.');
    return;
  }

  // Play animation first
  el.sendBtn.disabled = true;
  el.targetMoon.textContent = '🌕'; 
  const msg = bulkItems.length > 0 ? `🎯 ${bulkItems.length} Tiket Antrian Berhasil Di-input!` : '';
  await playRocketAnimation(msg);

  if (bulkItems.length > 0) {
    postQueue(bulkItems);
  } else {
    const item = { userId, userIdRaw, transactionId };
    if (betting) item.betting = betting;
    postQueue([item]);
  }

  el.sendBtn.disabled = false;
});

el.searchStatusBtn.addEventListener('click', () => {
  setStatus('🚀 Memulai Roket Pencari Status...');
  chrome.runtime.sendMessage({ type: 'BONUSSMB_TRIGGER_VERIFICATION' });
});

el.copyBtn.addEventListener('click', copyTSV);

if (el.searchStatusBtnHeader) {
  el.searchStatusBtnHeader.addEventListener('click', async () => {
    const btn = el.searchStatusBtnHeader;
    btn.classList.add('fly-anim');
    btn.disabled = true;
    
    showCenterNotif('🚀 Roket Pencari Status Sedang Meluncur...');
    setStatus('🚀 Meluncur ke bonussmb.com...');
    
    chrome.runtime.sendMessage({ type: 'BONUSSMB_TRIGGER_VERIFICATION' });
    
    // Reset after some time
    setTimeout(() => {
      btn.classList.remove('fly-anim');
      btn.disabled = false;
    }, 8000);
  });
}

// Cursor Star Trail Logic
document.addEventListener('mousemove', (e) => {
  const star = document.createElement('div');
  star.className = 'star-particle';
  star.style.left = e.clientX + 'px';
  star.style.top = e.clientY + 'px';
  
  // Randomize color a bit
  const colors = ['#ffffff', '#00ffff', '#ff00ff', '#ffff00', '#00ff00'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  star.style.background = color;
  star.style.boxShadow = `0 0 15px ${color}, 0 0 30px ${color}`;
  
  document.body.appendChild(star);
  
  setTimeout(() => {
    star.remove();
  }, 800);
});

// Force load signature image & Handle CSP Visibility
const signImg = document.querySelector('.rkd-sign-img');
if (signImg) {
  const tryNames = ['signature.png', 'signature.png.png', 'signature.PNG'];
  let currentTry = 0;

  function tryNext() {
    if (currentTry < tryNames.length) {
      const targetPath = chrome.runtime.getURL(tryNames[currentTry]);
      console.log('🔍 Mencoba manggil:', tryNames[currentTry]);
      signImg.src = targetPath;
      currentTry++;
    } else {
      console.error('❌ Semua nama file gagal dicoba!');
    }
  }

  signImg.onload = function() {
    this.style.display = 'block';
    this.style.opacity = '1';
    console.log('✅ Signature RKD BERHASIL Mendarat! Nama file:', tryNames[currentTry-1]);
  };
  
  signImg.onerror = function() {
    console.warn('⚠️ Gagal manggil:', tryNames[currentTry-1]);
    tryNext(); // Coba nama berikutnya
  };

  tryNext(); // Mulai percobaan pertama
}

if (el.resetUserIdBtn) {
  el.resetUserIdBtn.addEventListener('click', () => {
    el.userId.value = '';
    el.userId.focus();
    setStatus('User ID direset.');
  });
}

el.clearBtn.addEventListener('click', () => {
  state.results = [];
  renderResults([]);
  setStatus('Tabel dibersihkan.');
});

el.autoStatusCheck.addEventListener('change', (e) => {
  chrome.storage.local.set({ autoStatusCheck: e.target.checked });
  if (e.target.checked) {
    setStatus('🚀 Roket Pencari Otomatis Aktif.');
  } else {
    setStatus('🛑 Roket Pencari Otomatis Nonaktif.');
  }
});

// Load state
chrome.storage.local.get(['autoStatusCheck'], (res) => {
  if (res.autoStatusCheck !== undefined && el.autoStatusCheck) {
    el.autoStatusCheck.checked = res.autoStatusCheck;
  }
});

// ===== SAVE SETTINGS BUTTON =====
if (el.saveSettingsBtn) {
  el.saveSettingsBtn.addEventListener('click', () => {
    const config = buildConfig();
    const autoStatus = el.autoStatusCheck ? el.autoStatusCheck.checked : true;

    // Save to chrome storage
    const saveData = {
      ...config,
      autoStatusCheck: autoStatus,
    };

    chrome.storage.local.set(saveData, () => {
      setStatus('✅ Pengaturan berhasil disimpan!');

      // Generate coding/config text
      const configLines = [];
      configLines.push('// ═══════════════════════════════════════');
      configLines.push('// 💾 KONFIGURASI BONUS SCATTER PRO');
      configLines.push('// ═══════════════════════════════════════');
      configLines.push('// Disimpan: ' + new Date().toLocaleString('id-ID'));
      configLines.push('');
      configLines.push('const CONFIG = {');

      if (config.adminUrl) configLines.push('  adminUrl:      "' + config.adminUrl + '",');
      if (config.executorName) configLines.push('  executorName:  "' + config.executorName + '",');
      if (config.startDate) configLines.push('  startDate:     "' + config.startDate + '",');
      if (config.endDate) configLines.push('  endDate:       "' + config.endDate + '",');
      if (config.todayDate) configLines.push('  todayDate:     "' + config.todayDate + '",');
      configLines.push('  processMode:   "' + (config.processMode || 'auto') + '",');
      configLines.push('  autoStatusCheck: ' + autoStatus + ',');

      if (config.agentHeaders && typeof config.agentHeaders === 'object') {
        configLines.push('  agentHeaders: {');
        const entries = Object.entries(config.agentHeaders);
        entries.forEach(([key, val], i) => {
          const comma = i < entries.length - 1 ? ',' : '';
          // Mask token value for security (show first 10 chars)
          let displayVal = val;
          if (key.toLowerCase().includes('token') && val.length > 14) {
            displayVal = val.slice(0, 10) + '...' + val.slice(-4);
          }
          configLines.push('    "' + key + '": "' + displayVal + '"' + comma);
        });
        configLines.push('  }');
      }

      configLines.push('};');
      configLines.push('');
      configLines.push('// Status: ✅ Tersimpan & Aktif');

      const codeText = configLines.join('\n');

      // Display the saved config
      if (el.savedConfigCode) {
        // Apply syntax-like coloring using innerHTML
        const coloredCode = codeText
          .replace(/\/\/(.*)$/gm, '<span class="cfg-comment">//$1</span>')
          .replace(/"([^"]+)":/g, '<span class="cfg-key">"$1"</span>:')
          .replace(/:\s*"([^"]+)"/g, ': <span class="cfg-val">"$1"</span>')
          .replace(/:\s*(true|false)/g, ': <span class="cfg-val">$1</span>');

        el.savedConfigCode.innerHTML = coloredCode;
      }

      if (el.savedConfigWrap) {
        el.savedConfigWrap.style.display = 'block';
        // Re-trigger animation
        el.savedConfigWrap.style.animation = 'none';
        el.savedConfigWrap.offsetHeight; // reflow
        el.savedConfigWrap.style.animation = 'config-slide-in 0.35s ease-out';
      }

      // Store raw text for copy
      el.savedConfigWrap._rawConfigText = codeText;

      const namaEksekutor = config.executorName ? config.executorName.toUpperCase() : 'BOSKU';
      showCenterNotif(`💼 Selamat Bekerja, ${namaEksekutor}!\n💾 Pengaturan Tersimpan`);
    });
  });
}

// ===== COPY CONFIG BUTTON =====
if (el.copyConfigBtn) {
  el.copyConfigBtn.addEventListener('click', () => {
    const rawText = el.savedConfigWrap && el.savedConfigWrap._rawConfigText
      ? el.savedConfigWrap._rawConfigText
      : (el.savedConfigCode ? el.savedConfigCode.textContent : '');

    if (!rawText) {
      setStatus('⚠️ Tidak ada konfigurasi untuk disalin.');
      return;
    }

    navigator.clipboard.writeText(rawText)
      .then(() => {
        setStatus('📋 Konfigurasi berhasil disalin ke clipboard!');
        el.copyConfigBtn.textContent = '✅ Tersalin!';
        setTimeout(() => {
          el.copyConfigBtn.textContent = '📋 Salin';
        }, 2000);
      })
      .catch(() => {
        setStatus('❌ Gagal menyalin konfigurasi.');
      });
  });
}

el.resultBody.addEventListener('click', (ev) => {
  const btn = ev.target && ev.target.closest ? ev.target.closest('button[data-action="retryBonussmbInput"]') : null;
  if (!btn) return;

  const userId = String(btn.dataset.userId || '').trim();
  const transactionId = String(btn.dataset.transactionId || '').trim();
  if (!userId || !transactionId) {
    setStatus('❌ Tidak bisa input ulang: data userId/txId kosong.');
    return;
  }

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Mengulang...';

  requestRetryBonussmbInput({ userId, transactionId }, (resp) => {
    const ok = !!resp?.ok;
    const err = String(resp?.error || '').trim();
    if (ok) setStatus('✅ Permintaan input ulang dikirim.');
    else setStatus(`❌ Gagal input ulang: ${err || 'unknown'}`);
    btn.disabled = false;
    btn.textContent = originalText;
  });
});

el.resultBody.addEventListener('click', (ev) => {
  const btn = ev.target && ev.target.closest ? ev.target.closest('button[data-action="retryCheck"]') : null;
  if (!btn) return;

  const userId = String(btn.dataset.userId || '').trim();
  const transactionId = String(btn.dataset.transactionId || '').trim();
  const betting = String(btn.dataset.betting || '').trim();
  if (!userId || !transactionId) {
    setStatus('❌ Tidak bisa cek ulang: data userId/txId kosong.');
    return;
  }

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Mengulang...';

  const item = { userId, userIdRaw: userId, transactionId };
  if (betting) item.betting = betting;
  postQueue([item]);

  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = originalText;
  }, 1200);
});
el.resultBody.addEventListener('click', (ev) => {
  const btn = ev.target && ev.target.closest ? ev.target.closest('button[data-action="deleteRow"]') : null;
  if (!btn) return;

  const userId = String(btn.dataset.userId || '').trim();
  const transactionId = String(btn.dataset.transactionId || '').trim();
  if (!userId || !transactionId) return;

  if (!confirm(`Hapus baris tiket ${transactionId} dari antrian?`)) return;

  chrome.storage.local.get(['jutawanResults', 'txQueue'], (res) => {
    let results = Array.isArray(res.jutawanResults) ? res.jutawanResults : [];
    let queue = Array.isArray(res.txQueue) ? res.txQueue : [];

    // Filter out the item
    results = results.filter(r => !(String(r.userId) === userId && String(r.transactionId) === transactionId));
    queue = queue.filter(r => !(String(r.userId) === userId && String(r.transactionId) === transactionId));

    chrome.storage.local.set({ jutawanResults: results, txQueue: queue }, () => {
      state.results = results;
      renderResults(results);
      setStatus(`🗑️ Tiket ${transactionId} berhasil dihapus.`);
    });
  });
});

el.resultBody.addEventListener('click', (ev) => {
  const badge = ev.target && ev.target.closest ? ev.target.closest('.clickable-badge[data-action="verifyStatusSingle"]') : null;
  if (!badge) return;

  const userId = String(badge.dataset.userId || '').trim();
  const transactionId = String(badge.dataset.transactionId || '').trim();
  if (!userId || !transactionId) return;

  const originalText = badge.textContent;
  badge.style.pointerEvents = 'none';
  badge.textContent = 'Checking...';
  setStatus(`⏳ Memeriksa status untuk ${userId}...`);

  chrome.runtime.sendMessage({ type: 'BONUSSMB_VERIFY_SINGLE', payload: { userId, transactionId } }, (resp) => {
    const err = chrome.runtime.lastError;
    
    // Failsafe timeout to restore pointer events and badge text after 15 seconds if storage doesn't change
    setTimeout(() => {
      badge.style.pointerEvents = 'auto';
      if (badge.textContent === 'Checking...') {
        badge.textContent = originalText;
      }
    }, 15000);

    if (err) {
      // Ignore Chrome port closed error as the service worker continues verifying in background!
      console.warn('Ignore port error as storage event will update UI:', err.message);
      setStatus(`⏳ Sedang diproses di background. Mohon tunggu beberapa detik...`);
    } else if (resp && resp.ok) {
      setStatus(`⏳ Sedang mencari status untuk ${userId} di bonussmb.com...`);
    }
  });
});

