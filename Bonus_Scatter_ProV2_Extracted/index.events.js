// Hide NEW badge after 7 days (July 2, 2026)
(function checkNewBadge() {
  const badge = document.getElementById('newBadge');
  if (badge) {
    const expireDate = new Date('2026-07-02T23:59:59Z').getTime();
    if (Date.now() > expireDate) {
      badge.style.display = 'none';
    }
  }
})();

async function showCenterNotif(text, duration = 3000) {
  const notif = el.centerNotif;
  if (!notif) return;
  
  // Cara paling ampuh: Pakai tag <img> langsung dengan fallback online
  const localSrc = './Dasha taran.jpg';
  const onlineSrc = 'https://i.ibb.co/h7h3Hdf/Dasha-taran.jpg';

  notif.innerHTML = `
    <img class="notif-img-el" src="${localSrc}" 
         onerror="this.src='${onlineSrc}'; this.onerror=null;"
         style="width:200px; height:300px; border-radius:25px; border:3px solid #ff99cc; 
                box-shadow:0 0 30px rgba(255,153,204,0.6); margin-bottom:15px; 
                object-fit:cover; animation:notif-pulse 2s infinite ease-in-out;">
    <div class="notif-text">${text.replace(/\n/g, '<br>')}</div>
  `;
  
  notif.classList.add('show');
  setTimeout(() => {
    notif.classList.remove('show');
  }, duration);
}

function showCustomConfirm(title, message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';

    const modal = document.createElement('div');
    modal.className = 'confirm-modal';

    const titleEl = document.createElement('div');
    titleEl.className = 'confirm-title';
    titleEl.textContent = title;

    const msgEl = document.createElement('div');
    msgEl.className = 'confirm-msg';
    msgEl.innerHTML = message.replace(/\n/g, '<br>');

    const btnContainer = document.createElement('div');
    btnContainer.className = 'confirm-buttons';

    const okBtn = document.createElement('button');
    okBtn.className = 'confirm-btn ok';
    okBtn.textContent = 'PROSES';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'confirm-btn cancel';
    cancelBtn.textContent = 'BATAL';

    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup(false);
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        cleanup(true);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        cleanup(true);
      }
    };

    const cleanup = (val) => {
      window.removeEventListener('keydown', handleKeydown);
      overlay.classList.remove('show');
      setTimeout(() => {
        overlay.remove();
        resolve(val);
      }, 300);
    };

    window.addEventListener('keydown', handleKeydown);

    okBtn.addEventListener('click', () => cleanup(true));
    cancelBtn.addEventListener('click', () => cleanup(false));

    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(okBtn);
    modal.appendChild(titleEl);
    modal.appendChild(msgEl);
    modal.appendChild(btnContainer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.classList.add('show');
    }, 10);
  });
}

async function playLightningAnimation(customMsg = '') {
  return new Promise((resolve) => {
    const moon = el.targetMoon;
    const btn = el.sendBtn;
    const userIdEl = el.userId;
    const ticketEl = el.ticketCode;

    if (!moon) { resolve(); return; }

    // Helper: get center point of an element
    function getCenter(elem) {
      const r = elem.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    // Helper: generate jagged lightning path between two points
    function generateLightningPath(x1, y1, x2, y2, segments = 8) {
      let path = `M ${x1} ${y1}`;
      const dx = (x2 - x1) / segments;
      const dy = (y2 - y1) / segments;
      for (let i = 1; i < segments; i++) {
        const jitterX = (Math.random() - 0.5) * 40;
        const jitterY = (Math.random() - 0.5) * 20;
        path += ` L ${x1 + dx * i + jitterX} ${y1 + dy * i + jitterY}`;
      }
      path += ` L ${x2} ${y2}`;
      return path;
    }

    // Helper: draw a single lightning bolt between two points
    function drawBolt(x1, y1, x2, y2, color = '#00d4ff', duration = 400) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'lightning-svg');
      svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
      svg.style.cssText = `position:fixed;inset:0;width:100%;height:100%;z-index:9998;pointer-events:none;`;
      
      // Main bolt
      const mainPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      mainPath.setAttribute('d', generateLightningPath(x1, y1, x2, y2, 10));
      mainPath.setAttribute('fill', 'none');
      mainPath.setAttribute('stroke', color);
      mainPath.setAttribute('stroke-width', '3');
      mainPath.setAttribute('stroke-linecap', 'round');
      mainPath.setAttribute('filter', 'url(#lightning-glow)');
      mainPath.style.cssText = 'animation: lightning-flash-bolt 0.3s ease-out forwards;';
      
      // Branch bolt (thinner, offset)
      const branchPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const midX = x1 + (x2 - x1) * (0.3 + Math.random() * 0.3);
      const midY = y1 + (y2 - y1) * (0.3 + Math.random() * 0.3);
      const branchEndX = midX + (Math.random() - 0.5) * 80;
      const branchEndY = midY + (Math.random() * 60);
      branchPath.setAttribute('d', generateLightningPath(midX, midY, branchEndX, branchEndY, 4));
      branchPath.setAttribute('fill', 'none');
      branchPath.setAttribute('stroke', '#ffffff');
      branchPath.setAttribute('stroke-width', '1.5');
      branchPath.setAttribute('opacity', '0.7');
      branchPath.style.cssText = 'animation: lightning-flash-bolt 0.25s ease-out 0.05s forwards;';
      
      // Glow filter
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.innerHTML = `<filter id="lightning-glow"><feGaussianBlur stdDeviation="4" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
      
      svg.appendChild(defs);
      svg.appendChild(mainPath);
      svg.appendChild(branchPath);
      document.body.appendChild(svg);
      
      setTimeout(() => svg.remove(), duration);
      return svg;
    }

    // Helper: create impact spark burst at a point
    function createImpactSparks(x, y, count = 8) {
      for (let i = 0; i < count; i++) {
        const spark = document.createElement('div');
        spark.className = 'lightning-spark';
        spark.style.left = x + 'px';
        spark.style.top = y + 'px';
        const angle = (Math.PI * 2 / count) * i + (Math.random() * 0.5);
        const dist = 20 + Math.random() * 35;
        spark.style.setProperty('--spark-dx', `${Math.cos(angle) * dist}px`);
        spark.style.setProperty('--spark-dy', `${Math.sin(angle) * dist}px`);
        document.body.appendChild(spark);
        setTimeout(() => spark.remove(), 500);
      }
    }

    // Helper: full screen flash
    function screenFlash(duration = 120) {
      const flash = document.createElement('div');
      flash.className = 'lightning-screen-flash';
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), duration);
    }

    // ===== SEQUENCE START =====
    const btnCenter = getCenter(btn);
    const userCenter = getCenter(userIdEl);
    const ticketCenter = getCenter(ticketEl);
    const moonCenter = getCenter(moon);

    // Step 1: Flash + Lightning from Button to UserID
    screenFlash(100);
    drawBolt(btnCenter.x, btnCenter.y, userCenter.x, userCenter.y, '#00d4ff', 500);
    createImpactSparks(userCenter.x, userCenter.y, 6);
    userIdEl.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.8), inset 0 0 10px rgba(0, 212, 255, 0.3)';

    setTimeout(() => {
      // Step 2: Lightning from UserID to TicketCode
      drawBolt(userCenter.x, userCenter.y, ticketCenter.x, ticketCenter.y, '#ffd700', 500);
      createImpactSparks(ticketCenter.x, ticketCenter.y, 6);
      ticketEl.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8), inset 0 0 10px rgba(255, 215, 0, 0.3)';
      userIdEl.style.boxShadow = '';

      // Pick up values
      const txId = ticketEl.value;
      ticketEl.value = '';
      el.betting.value = '';
      el.bulk.value = '';

      setTimeout(() => {
        // Step 3: BIG Lightning from TicketCode to Moon (Results)
        screenFlash(150);
        drawBolt(ticketCenter.x, ticketCenter.y, moonCenter.x, moonCenter.y, '#ffffff', 600);
        drawBolt(ticketCenter.x + 10, ticketCenter.y - 5, moonCenter.x - 10, moonCenter.y + 5, '#00d4ff', 550);
        createImpactSparks(moonCenter.x, moonCenter.y, 12);
        ticketEl.style.boxShadow = '';

        // Impact on moon
        moon.classList.add('hit');

        setTimeout(() => {
          moon.classList.remove('hit');

          // Notification
          if (customMsg) {
            showCenterNotif(customMsg);
          } else if (txId) {
            showCenterNotif(`⚡ Tiket Berhasil Di-input!\n${txId}`);
          } else {
            showCenterNotif('⚡ Antrian Berhasil Di-input!');
          }

          setTimeout(() => resolve(), 400);
        }, 600);
      }, 450);
    }, 400);
  });
}

// Keep backward compat â€” alias for sendBtn handler
const playRocketAnimation = playLightningAnimation;


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

  // Warning if betting is below 1600
  if (bulkItems.length > 0) {
    let lowBettingFound = false;
    for (const item of bulkItems) {
      if (item.betting) {
        const bVal = parseFloat(String(item.betting).replace(/[^0-9.]/g, ''));
        if (!isNaN(bVal) && bVal < 1600) {
          lowBettingFound = true;
          break;
        }
      }
    }
    if (lowBettingFound) {
      const proceed = await showCustomConfirm(
        '⚠️ PERINGATAN BETTING!',
        'Ada tiket dengan nilai betting di bawah 1.600 di dalam antrian multi input!\nApakah Anda yakin ingin melanjutkan?'
      );
      if (!proceed) return;
    }
  } else if (betting) {
    const bVal = parseFloat(betting.replace(/[^0-9.]/g, ''));
    if (!isNaN(bVal) && bVal < 1600) {
      const proceed = await showCustomConfirm(
        '⚠️ PERINGATAN BETTING!',
        `Nilai betting yang Anda masukkan (${betting}) di bawah 1.600!\nApakah Anda yakin ingin melanjutkan?`
      );
      if (!proceed) return;
    }
  }

  // Anti-Duplicate Check
  if (typeof state !== 'undefined' && state.results && state.results.length > 0) {
    if (bulkItems.length > 0) {
      let duplicateTxIds = [];
      for (const item of bulkItems) {
        const found = state.results.find(r => r.transactionId === item.transactionId);
        if (found) {
          duplicateTxIds.push(item.transactionId);
        }
      }
      if (duplicateTxIds.length > 0) {
        const listStr = duplicateTxIds.slice(0, 3).join(', ') + (duplicateTxIds.length > 3 ? '...' : '');
        const proceed = await showCustomConfirm(
          '⚠️ TIKET GANDA TERDETEKSI!',
          `Ada ${duplicateTxIds.length} tiket di multi input yang sudah pernah di-input sebelumnya:\n[${listStr}]\n\nApakah Anda yakin ingin tetap memproses ulang tiket-tiket ganda ini?`
        );
        if (!proceed) return;
      }
    } else if (transactionId) {
      const found = state.results.find(r => r.transactionId === transactionId);
      if (found) {
        const proceed = await showCustomConfirm(
          '⚠️ TIKET GANDA TERDETEKSI!',
          `Tx ID ini (${transactionId}) sudah pernah di-input sebelumnya untuk User ID: ${found.userId}.\n\nApakah Anda yakin ingin tetap memproses ulang tiket ini?`
        );
        if (!proceed) return;
      }
    }
  }

  // Play animation first
  el.sendBtn.disabled = true;
  const msg = bulkItems.length > 0 ? `🎯 ${bulkItems.length} Tiket Antrian Berhasil Di-input!` : '';
  await playRocketAnimation(msg);

  if (bulkItems.length > 0) {
    postQueue(bulkItems);
  } else {
    const isTS = (el.isTS && el.isTS.checked) || userIdRaw.toLowerCase().endsWith(' ts');
    const finalUserIdRaw = (isTS && !userIdRaw.toLowerCase().endsWith(' ts')) ? `${userIdRaw} TS` : userIdRaw;
    const item = { userId, userIdRaw: finalUserIdRaw, transactionId };
    if (isTS) item.isTS = true;
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

// Premium Black Smoke Cursor Trail
document.addEventListener('mousemove', (e) => {
  if (Math.random() < 0.4) { // Throttle generation rate for maximum performance
    const p = document.createElement('div');
    p.className = 'smoke-particle';
    const jitterX = (Math.random() - 0.5) * 6;
    const jitterY = (Math.random() - 0.5) * 6;
    p.style.left = (e.clientX + 36 + jitterX) + 'px';
    p.style.top = (e.clientY + 42 + jitterY) + 'px';
    
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
});

// ===== UPGRADE 7: AMBIENT FLOATING PARTICLES (Ultra Light) =====
// Created once on load, pure CSS animation, zero ongoing JS cost
(function initAmbientParticles() {
  const count = 10;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'ambient-particle';
    const size = 4 + Math.random() * 8; // 4px to 12px
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.animationDuration = (15 + Math.random() * 25) + 's'; // 15s to 40s
    p.style.animationDelay = (Math.random() * 20) + 's';
    document.body.appendChild(p);
  }
})();

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
      if (config.yesterdayDate) configLines.push('  yesterdayDate: "' + config.yesterdayDate + '",');
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

  const isTS = btn.dataset.isTs === 'true';
  const item = { userId, userIdRaw: isTS ? `${userId} TS` : userId, transactionId };
  if (isTS) item.isTS = true;
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

// ===== LOGIC ASISTEN CEK STATUS =====
let assistantTimer = null;
let assistantRetries = new Map();
let assistantCheckedKeys = new Set();
state.assistantRunning = false;

function stopAssistant() {
  state.assistantRunning = false;
  if (assistantTimer) {
    clearTimeout(assistantTimer);
    assistantTimer = null;
  }
  if (el.assistantBtn) {
    el.assistantBtn.textContent = '🤖 Asisten Cek';
    el.assistantBtn.classList.remove('running');
  }
  setStatus('🤖 Asisten Cek dihentikan.');
}

async function startAssistant() {
  assistantRetries.clear();
  assistantCheckedKeys.clear();
  state.assistantRunning = true;
  if (el.assistantBtn) {
    el.assistantBtn.textContent = '🛑 Hentikan Asisten';
    el.assistantBtn.classList.add('running');
  }
  setStatus('🤖 Asisten Cek dimulai...');
  runAssistantLoop();
}

function isFinalStatus(status, userId, transactionId) {
  const s = String(status || '').trim().toUpperCase();
  if (s === 'APPROVED' || s === 'REJECTED' || s === 'LIMIT') return true;
  if (s === 'NOT_FOUND' || s === 'NOT FOUND') {
    const key = `${userId}|${transactionId}`;
    const retries = assistantRetries.get(key) || 0;
    if (retries >= 2) {
      return true; // Final jika sudah diulangi 2 kali
    }
    return false; // Belum final, akan dicoba cek ulang
  }
  return false;
}

function runAssistantLoop() {
  if (!state.assistantRunning) return;

  // 1. Cari tiket yang perlu dicek statusnya (statusnya bukan final)
  const badges = Array.from(el.resultBody.querySelectorAll('.clickable-badge[data-action="verifyStatusSingle"]'));
  const candidates = badges.filter(badge => {
    const text = String(badge.textContent || '').trim().toUpperCase();
    const uId = badge.dataset.userId;
    const txId = badge.dataset.transactionId;
    const key = `${uId}|${txId}`;

    // Lewati jika sudah pernah dicek dalam putaran asisten ini
    if (assistantCheckedKeys.has(key)) return false;

    return !isFinalStatus(text, uId, txId) && text !== 'CHECKING...';
  });

  // Proses dari bawah ke atas (oldest/paling bawah dulu)
  candidates.reverse();

  if (candidates.length === 0) {
    showCenterNotif('🎉 Asisten: Semua status selesai dicek!');
    stopAssistant();
    return;
  }

  // Ambil kandidat pertama di layar
  const targetBadge = candidates[0];
  const userId = targetBadge.dataset.userId;
  const transactionId = targetBadge.dataset.transactionId;
  const currentText = String(targetBadge.textContent || '').trim().toUpperCase();

  const key = `${userId}|${transactionId}`;
  if (currentText === 'NOT_FOUND' || currentText === 'NOT FOUND') {
    const retries = assistantRetries.get(key) || 0;
    assistantRetries.set(key, retries + 1);
    setStatus(`🤖 Asisten: Mengulangi cek status ${userId} (Percobaan ${retries + 1}/2)...`);
  } else {
    setStatus(`🤖 Asisten: Mengklik cek status untuk ${userId}...`);
  }

  // Rekam status awal untuk memantau perubahan
  const currentResults = Array.isArray(state.results) ? state.results : [];
  const initialItem = currentResults.find(r => String(r.userId) === userId && String(r.transactionId) === transactionId);
  const initialStatus = initialItem ? String(initialItem.verifiedStatus || '').trim().toUpperCase() : '';

  try {
    targetBadge.scrollIntoView({ block: 'center', behavior: 'smooth' });
  } catch (e) {}
  
  // Klik tombol
  targetBadge.click();

  // Tunggu sampai status berubah di state.results
  const checkStart = Date.now();
  
  function checkStatusUpdated() {
    if (!state.assistantRunning) return;

    // Cari data terbaru di state.results
    const currentResults = Array.isArray(state.results) ? state.results : [];
    const item = currentResults.find(r => String(r.userId) === userId && String(r.transactionId) === transactionId);
    
    const status = item ? String(item.verifiedStatus || '').trim().toUpperCase() : '';
    const elapsed = Date.now() - checkStart;

    const statusChanged = (status !== initialStatus);

    if (statusChanged || elapsed > 15000) {
      // Selesai (berhasil/gagal/timeout)
      if (elapsed > 15000) {
        setStatus(`🤖 Asisten: Timeout pengecekan ${userId}. Beralih ke baris berikutnya...`);
      } else {
        setStatus(`🤖 Asisten: Status ${userId} terupdate (${status}).`);
      }

      // Masukkan ke checked keys agar tidak dicek lagi (kecuali NOT FOUND yang masih perlu diulangi)
      const isNotFound = (status === 'NOT_FOUND' || status === 'NOT FOUND');
      const isRetryingNotFound = isNotFound && !isFinalStatus(status, userId, transactionId);

      if (!isRetryingNotFound || elapsed > 15000) {
        assistantCheckedKeys.add(key);
      }

      // Jeda acak yang manusiawi (2-4 detik) sebelum baris berikutnya
      const nextDelay = 2000 + Math.random() * 2000;
      setStatus(`🤖 Asisten: Jeda ${Math.round(nextDelay/100)/10}s sebelum tiket berikutnya...`);
      
      assistantTimer = setTimeout(() => {
        runAssistantLoop();
      }, nextDelay);
    } else {
      // Masih mengecek, periksa lagi dalam 500ms
      assistantTimer = setTimeout(checkStatusUpdated, 500);
    }
  }

  // Mulai memantau perubahan
  assistantTimer = setTimeout(checkStatusUpdated, 1000);
}

if (el.assistantBtn) {
  el.assistantBtn.addEventListener('click', () => {
    if (state.assistantRunning) {
      stopAssistant();
    } else {
      startAssistant();
    }
  });
}

// ===== FLOATING UPDATE MODAL EVENT LISTENERS =====
(function initUpdateModal() {
  const modal = document.getElementById('updateModal');
  const infoBtn = document.getElementById('infoUpdateBtn');
  const closeBtn = document.getElementById('closeModalBtn');
  const infoDot = document.getElementById('infoUpdateDot');
  
  if (modal && infoBtn && closeBtn && infoDot) {
    const hideUntil = localStorage.getItem('hide_update_banner_until');
    const now = Date.now();
    
    // Show glowing dot if quiet period has expired
    if (!hideUntil || now > Number(hideUntil)) {
      infoDot.style.display = 'block';
      // Auto-popup once on page load if quiet period expired
      modal.style.display = 'flex';
    }
    
    // Click info button to open modal
    infoBtn.addEventListener('click', () => {
      modal.style.display = 'flex';
      infoDot.style.display = 'none';
    });
    
    // Close modal
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      localStorage.setItem('hide_update_banner_until', Date.now() + threeDays);
      infoDot.style.display = 'none';
    });
    
    // Close if click outside content
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        const threeDays = 3 * 24 * 60 * 60 * 1000;
        localStorage.setItem('hide_update_banner_until', Date.now() + threeDays);
        infoDot.style.display = 'none';
      }
    });
  }

  // Toggle Stats Charts Dashboard
  const toggleBtn = document.getElementById('toggleChartsBtn');
  const chartsDashboard = document.getElementById('statsChartsDashboard');
  if (toggleBtn && chartsDashboard) {
    toggleBtn.addEventListener('click', () => {
      if (chartsDashboard.style.display === 'none') {
        chartsDashboard.style.display = 'grid';
        toggleBtn.textContent = '📊 Sembunyikan Grafik';
        toggleBtn.classList.add('active');
        // Trigger redrawing to animate on open
        if (typeof state !== 'undefined' && state.results && typeof updateStats === 'function') {
          updateStats(state.results);
        }
      } else {
        chartsDashboard.style.display = 'none';
        toggleBtn.textContent = '📊 Lihat Grafik';
        toggleBtn.classList.remove('active');
      }
    });
  }
})();

