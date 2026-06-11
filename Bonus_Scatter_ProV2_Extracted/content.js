// Listener untuk pesan dari background.js setelah halaman utama dimuat
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "startProcess") {
    startProcess(
      msg.userId,
      msg.transactionId,
      msg.token,
      msg.mainTabId,
      msg.startDate,
      msg.endDate,
      msg.todayDate,
      typeof msg.expectedBetting !== 'undefined' ? msg.expectedBetting : null
    );
    sendResponse({ status: "running" });
  }
});

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Util: klik tombol Submit/OK pada datepicker jika ada, lalu tutup
async function clickCalendarSubmitIfPresent(root) {
  const submitCandidates = [
    '.jcSubmit',
    '.jcDateSubmit',
    '.jc_btn_submit',
    '.jq-submit',
    'button[type="submit"]',
    'button',
    'a'
  ];
  // Prioritaskan elemen yang berlabel Submit/OK/Apply
  let submitEl = null;
  for (const sel of submitCandidates) {
    const els = root.querySelectorAll(sel);
    for (const el of els) {
      const txt = (el.textContent || '').toLowerCase().trim();
      if (txt === 'submit' || txt === 'ok' || txt === 'apply') {
        submitEl = el;
        break;
      }
    }
    if (submitEl) break;
  }
  if (!submitEl) {
    // Fallback: coba cari berdasarkan teks secara umum
    const allClickable = root.querySelectorAll('button, a');
    for (const el of allClickable) {
      const txt = (el.textContent || '').toLowerCase();
      if (txt.includes('submit') || txt.includes('ok') || txt.includes('apply')) {
        submitEl = el;
        break;
      }
    }
  }
  if (submitEl) {
    submitEl.click();
    await delay(150);
  } else {
    // Fallback: tekan Enter pada input aktif untuk menutup
    const active = document.activeElement;
    if (active) {
      active.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      active.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    }
  }
}

// Util: temukan container kalender yang sedang tampil
function findVisibleCalendarRoot() {
  const candidates = [
    '#jcDate',
    '.jcDate',
    '.jcDateContainer',
    '.jc-date',
    '.jq-date',
    '.jcDatePopup',
    '.jcDateLayer'
  ];
  for (const sel of candidates) {
    const el = document.querySelector(sel);
    if (el && el.offsetParent !== null) return el;
  }
  return document.body;
}

// Util: cari tombol prev/next kalender
function getPrevButton(root) {
  return root.querySelector('#d_prev, .jcPrev, .jcDatePrev, .jc_btn_prev, .jq-prev, .jc-previous');
}
function getNextButton(root) {
  return root.querySelector('#d_next, .jcNext, .jcDateNext, .jc_btn_next, .jq-next, .jc-next');
}

// Util: coba set bulan/tahun via select jika tersedia
function trySelectMonthYear(root, year, month) {
  const yearSelect = root.querySelector('select.jcYear, select.jc-year, select.jq-year');
  const monthSelect = root.querySelector('select.jcMonth, select.jc-month, select.jq-month');
  let ok = false;
  if (yearSelect) {
    yearSelect.value = String(year);
    yearSelect.dispatchEvent(new Event('change', { bubbles: true }));
    ok = true;
  }
  if (monthSelect) {
    // Banyak kalender pakai 1-12 untuk bulan
    monthSelect.value = String(parseInt(month, 10));
    monthSelect.dispatchEvent(new Event('change', { bubbles: true }));
    ok = true;
  }
  return ok;
}

// Util: hitung selisih bulan
function monthsDiff(fromY, fromM, toY, toM) {
  return (toY - fromY) * 12 + (toM - fromM);
}

// Navigasi kalender ke bulan/tahun target
async function navigateCalendarTo(targetYear, targetMonth, todayYear, todayMonth) {
  const root = findVisibleCalendarRoot();
  // Coba via select terlebih dahulu
  const usedSelect = trySelectMonthYear(root, targetYear, targetMonth);
  if (usedSelect) {
    // Beri waktu render ulang
    await delay(200);
    return;
  }
  // Fallback: tombol prev/next
  const prevBtn = getPrevButton(root);
  const nextBtn = getNextButton(root);
  if (!prevBtn && !nextBtn) {
    console.warn('⚠️ Tidak menemukan tombol prev/next kalender, lanjut klik tanggal langsung.');
    return;
  }
  const diff = monthsDiff(todayYear, todayMonth, targetYear, targetMonth);
  const steps = Math.abs(diff);
  const btn = diff < 0 ? prevBtn : nextBtn;
  for (let i = 0; i < steps; i++) {
    if (btn) {
      btn.click();
      await delay(150);
    }
  }
}

/**
 * Mengatur Tanggal Mulai Pencarian pada Kalender Admin.
 * @param {string} startDate - Tanggal dalam format YYYY-MM-DD.
 * @param {string} todayDate - Tanggal hari ini dalam format YYYY-MM-DD (untuk arah nav).
 * @returns {boolean} - True jika berhasil mengklik tanggal, False jika tidak.
 */
async function setStartDateInCalendar(startDate, todayDate) {
    const [year, month, day] = startDate.split('-');
    const [ty, tm] = todayDate ? todayDate.split('-') : [year, month];
    
    // 1. Temukan dan klik input tanggal
    const startDateInput = document.querySelector('input[name="startDate"]#startDate'); 
    if (!startDateInput) {
        console.warn("⚠️ Element input 'startDate' tidak ditemukan!");
        return false;
    }
    
    // Set nilai input dan picu event agar datepicker sinkron
    startDateInput.value = startDate; 
    startDateInput.dispatchEvent(new Event('input', { bubbles: true }));
    startDateInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Pemicu Kalender: Gunakan dispatchEvent untuk meniru klik
    startDateInput.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    console.log("🗓️ Kalender Start Date dipicu.");
    
    await delay(200); // Tunggu kalender muncul

    // Navigasikan ke bulan/tahun yang benar sebelum klik hari
    await navigateCalendarTo(parseInt(year, 10), parseInt(month, 10), parseInt(ty, 10), parseInt(tm, 10));

    // 2. Cari element tanggal yang sesuai
    const targetDay = parseInt(day, 10);
    
    // Ambil semua hari pada datepicker dan pilih yang tidak disabled
    const root = findVisibleCalendarRoot();
    const allDays = Array.from(root.querySelectorAll('#jcDateMax li'));
    const dayElements = allDays.filter(el => !el.classList.contains('disabled'));

    let targetDayEl = null;

    for (const el of dayElements) {
        if (parseInt(el.textContent.trim(), 10) === targetDay) {
            targetDayEl = el;
            break;
        }
    }
    
    if (targetDayEl) {
        // 3. Klik tanggal target (robust). Jika ada duplikasi day, coba beberapa kandidat.
        const candidates = dayElements.filter(el => parseInt(el.textContent.trim(), 10) === targetDay);
        let success = false;
        for (const el of candidates) {
          el.scrollIntoView({ block: 'center', inline: 'center' });
          const toClick = el;
          toClick.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          toClick.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          toClick.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          // Pastikan input menerima perubahan
          startDateInput.dispatchEvent(new Event('input', { bubbles: true }));
          startDateInput.dispatchEvent(new Event('change', { bubbles: true }));
          // Jika plugin pakai hidden input, cek nilainya
          const hiddenDay = root.querySelector('#dateHideText');
          if (!hiddenDay || parseInt(hiddenDay.value, 10) === targetDay) {
            success = true;
            break;
          }
        }
        // Klik Submit pada kalender jika ada untuk menutup
        await clickCalendarSubmitIfPresent(root);
        // Fallback: blur input untuk menutup popup
        startDateInput.blur();
        if (success) {
          console.log(`✅ Tanggal Mulai ${startDate} berhasil diklik.`);
          return true;
        } else {
          console.warn('⚠️ Klik hari belum mengubah nilai tersembunyi, coba set manual.');
          const hiddenDay = root.querySelector('#dateHideText');
          if (hiddenDay) hiddenDay.value = String(targetDay);
          await clickCalendarSubmitIfPresent(root);
          startDateInput.blur();
          return true;
        }
    } else {
        console.error(`❌ Tanggal Mulai ${targetDay} tidak ditemukan di kalender popup. Mungkin bulan/tahun salah.`);
        return false;
    }
}


/**
 * Mengatur Tanggal Akhir Pencarian pada Kalender Admin.
 * @param {string} endDate - Tanggal dalam format YYYY-MM-DD.
 * @param {string} todayDate - Tanggal hari ini dalam format YYYY-MM-DD (untuk arah nav).
 * @returns {boolean} - True jika berhasil mengklik tanggal, False jika tidak.
 */
async function setEndDateInCalendar(endDate, todayDate) {
    const [year, month, day] = endDate.split('-');
    const [ty, tm] = todayDate ? todayDate.split('-') : [year, month];
    
    // 1. Temukan dan klik input tanggal untuk memicu kalender
    const endDateInput = document.querySelector('input[name="endDate"]#endDate'); 
    if (!endDateInput) {
        console.warn("⚠️ Element input 'endDate' tidak ditemukan!");
        return false;
    }
    
    // Set nilai input dan picu event agar datepicker sinkron
    endDateInput.value = endDate; 
    endDateInput.dispatchEvent(new Event('input', { bubbles: true }));
    endDateInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Pemicu Kalender: Gunakan dispatchEvent untuk meniru klik
    endDateInput.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    console.log("🗓️ Kalender End Date dipicu.");
    
    await delay(200); // Tunggu kalender muncul

    // Navigasikan ke bulan/tahun yang benar sebelum klik hari
    await navigateCalendarTo(parseInt(year, 10), parseInt(month, 10), parseInt(ty, 10), parseInt(tm, 10));

    // 2. Cari element tanggal yang sesuai
    const targetDay = parseInt(day, 10); 
    
    // Ambil semua hari pada datepicker dan pilih yang tidak disabled
    const root = findVisibleCalendarRoot();
    const allDays = Array.from(root.querySelectorAll('#jcDateMax li'));
    const dayElements = allDays.filter(el => !el.classList.contains('disabled'));
    
    let targetDayEl = null;

    for (const el of dayElements) {
        if (parseInt(el.textContent.trim(), 10) === targetDay) {
            targetDayEl = el;
            break;
        }
    }
    
    if (targetDayEl) {
        // 3. Klik tanggal target (robust). Jika ada duplikasi day, coba beberapa kandidat.
        const candidates = dayElements.filter(el => parseInt(el.textContent.trim(), 10) === targetDay);
        let success = false;
        for (const el of candidates) {
          el.scrollIntoView({ block: 'center', inline: 'center' });
          const toClick = el;
          toClick.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          toClick.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          toClick.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          // Pastikan input menerima perubahan
          endDateInput.dispatchEvent(new Event('input', { bubbles: true }));
          endDateInput.dispatchEvent(new Event('change', { bubbles: true }));
          // Jika plugin pakai hidden input, cek nilainya
          const hiddenDay = root.querySelector('#dateHideText');
          if (!hiddenDay || parseInt(hiddenDay.value, 10) === targetDay) {
            success = true;
            break;
          }
        }
        // Klik Submit pada kalender jika ada untuk menutup
        await clickCalendarSubmitIfPresent(root);
        // Fallback: blur input untuk menutup popup
        endDateInput.blur();
        if (success) {
          console.log(`✅ Tanggal Akhir ${endDate} berhasil diklik.`);
          return true;
        } else {
          console.warn('⚠️ Klik hari belum mengubah nilai tersembunyi, coba set manual.');
          const hiddenDay = root.querySelector('#dateHideText');
          if (hiddenDay) hiddenDay.value = String(targetDay);
          await clickCalendarSubmitIfPresent(root);
          endDateInput.blur();
          return true;
        }
    } else {
        console.error(`❌ Tanggal Akhir ${targetDay} tidak ditemukan di kalender popup. Mungkin bulan/tahun salah.`);
        return false;
    }
}


async function startProcess(userId, transactionId, token, mainTabId, startDate, endDate, todayDate, expectedBettingFromMsg) {
  userId = String(userId || '').trim().split(/\s+/)[0];
  try {
    console.log('[CekBonus] startProcess build=3.1.0 first-click=enabled');
  } catch {}
  console.log("Memulai proses:", { userId, transactionId, token, startDate, endDate, todayDate, expectedBettingFromMsg });

// 1. LOGIKA MANIPULASI START DATE (Selesai Sepenuhnya)

  if (startDate && startDate !== todayDate) {
      console.log("Memulai manipulasi kalender untuk Start Date...");
      const setSuccess = await setStartDateInCalendar(startDate, todayDate);
      if (!setSuccess) {
          console.warn("Proses lanjut tanpa set Tanggal Mulai karena gagal klik kalender.");
      }
      // Tunggu sebentar setelah set tanggal selesai
      await delay(100); 
  } else if (startDate === todayDate) {
      console.log("Tanggal Mulai adalah hari ini. Lewati manipulasi kalender (Start Date).");
  }
  // 2. LOGIKA MANIPULASI END DATE (Selesai Sepenuhnya)
  // ==========================================================
  if (endDate && endDate !== todayDate) { 
      console.log("Memulai manipulasi kalender untuk End Date...");
      const setSuccess = await setEndDateInCalendar(endDate, todayDate); 
      if (!setSuccess) {
          console.warn("Proses lanjut tanpa set Tanggal Akhir karena gagal klik kalender.");
      }
      // Tunggu sebentar setelah set tanggal selesai
      await delay(100); 
  } else if (endDate === todayDate) {
      console.log("Tanggal Akhir adalah hari ini. Lewati manipulasi kalender (End Date).");
  }
  // 3. LOGIKA INPUT DATA & PENCARIAN

  const userInput = document.querySelector('[name="userId"]');
  const txInput = document.querySelector('[name="transactionId"]');

  if (!userInput || !txInput) {
    alert("❌ Tidak menemukan field input userId atau transactionId di halaman!");
    return;
  }

  userInput.value = userId;
  
  txInput.value = transactionId;

  const searchBtn = document.querySelector(".success-button.langWord.jq-after-search");
  if (searchBtn) searchBtn.click();
  else {
    alert("❌ Tombol pencarian tidak ditemukan!");
    return;
  }

  async function clickFirstIfPresent() {
    const firstBtn =
      document.querySelector("li.first[data-pageindex='first'] a") ||
      document.querySelector("a.langWord[data-lang='first']") ||
      document.querySelector("li.first[data-pageindex='first']");
    if (!firstBtn) return false;
    try {
      const originalHref = firstBtn.getAttribute('href') || '';
      const isJsUrl = originalHref.toLowerCase().startsWith('javascript:');
      
      if (isJsUrl && originalHref.includes('__doPostBack')) {
        const match = originalHref.match(/__doPostBack\('(.*?)'/);
        if (match && match[1]) {
          const eventTarget = match[1];
          const form = document.getElementById('aspnetForm') || document.querySelector('form');
          const targetInput = document.getElementById('__EVENTTARGET') || document.querySelector('input[name="__EVENTTARGET"]');
          const argInput = document.getElementById('__EVENTARGUMENT') || document.querySelector('input[name="__EVENTARGUMENT"]');
          
          if (form && targetInput) {
            console.log("🚀 Form-based __doPostBack submission for First page:", eventTarget);
            targetInput.value = eventTarget;
            if (argInput) argInput.value = '';
            form.submit();
            return true;
          }
        }
      }
      
      // Fallback standard click if not a javascript:__doPostBack href
      if (typeof firstBtn.click === 'function') {
        firstBtn.click();
        return true;
      }
      firstBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      return true;
    } catch (e) {
      console.warn("clickFirstIfPresent error:", e);
      return false;
    }
  }

  function isVisible(el) {
    if (!el) return false;
    const cs = window.getComputedStyle(el);
    if (!cs) return false;
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return (r.width > 0 && r.height > 0);
  }

  function hasMeaningfulRows() {
    return Array.from(document.querySelectorAll('tbody.transaction-record-html tr')).some((r) => {
      const kid = r.querySelector("[data-changekey='keteranganId']");
      const txt = String(kid && kid.textContent ? kid.textContent : '').trim();
      return txt.length > 0;
    });
  }

  function tableShowsNoData() {
    if (hasMeaningfulRows()) return false;
    const noMore = document.querySelector('.no-more');
    if (noMore && isVisible(noMore)) {
      const t = String(noMore.textContent || '').toLowerCase();
      if (t.includes('no data') || t.includes('tidak ada data') || t.includes('belum ada data')) return true;
    }
    const totalEl = document.querySelector('.totel-nums');
    if (totalEl) {
      const n = parseInt(String(totalEl.textContent || '').trim(), 10);
      if (Number.isFinite(n) && n === 0) return true;
    }
    const candidates = Array.from(document.querySelectorAll('table, .transaction-record-table, .transaction-record-search'));
    const roots = candidates.length ? candidates : [document.body];
    for (const r of roots) {
      const t = String(r && r.textContent ? r.textContent : '').toLowerCase();
      if (t.includes('no data') || t.includes('tidak ada data') || t.includes('belum ada data')) return true;
    }
    return false;
  }

  function extractGameNameFromKeterangan(keterangan) {
    const text = String(keterangan || '').trim();
    if (!text) return null;
    const colonIdx = text.indexOf(':');
    if (colonIdx >= 0) {
      const after = text.slice(colonIdx + 1);
      const m = after.match(/^(\w+)/);
      if (m && m[1]) return m[1];
    }
    const m2 = text.match(/\b(\d{1,4})\b/);
    return m2 ? m2[1] : null;
  }

  console.log("🔍 Menunggu hasil...");

  const waitStart = Date.now();
  while (Date.now() - waitStart < 8000) {
    if (hasMeaningfulRows()) break;
    if (tableShowsNoData()) break;
    await delay(150);
  }

  const tx19 = transactionId.slice(0, 19);

  let debetValue = "0";
  let gameName = null;

  if (tableShowsNoData()) {
    const didFirst = await clickFirstIfPresent();
    console.log("⏮️ No Data terdeteksi. Klik First:", didFirst);
    // Poll fast instead of static 2-second delay
    const afterStart = Date.now();
    while (Date.now() - afterStart < 6000) {
      if (hasMeaningfulRows()) break;
      await delay(150);
    }
  }

  const txFull = String(transactionId);

  const linkEls = Array.from(document.querySelectorAll('a.jq-keterangan-link'));
  if (linkEls.length > 0) {
    const matched = [];
    for (const link of linkEls) {
      const txt = String(link.textContent || '');
      const isMatch = txt.includes(txFull) || txt.includes(tx19);
      if (!isMatch) continue;
      const row = link.closest('tr');
      if (!row) continue;
      const statusEl = row.querySelector("[data-changekey='status']");
      const statusText = String(statusEl && statusEl.textContent ? statusEl.textContent : '').trim().toLowerCase();
      const statusKey = String(link.dataset && link.dataset.statuskey ? link.dataset.statuskey : '').trim();
      matched.push({ link, row, statusText, statusKey });
    }

    if (matched.length > 0) {
      const bettingPick =
        matched.find((m) => m.statusKey === '03') ||
        matched.find((m) => m.statusText.includes('pertaruhan') || m.statusText.includes('betting')) ||
        null;
      const payoutPick =
        matched.find((m) => m.statusKey === '04') ||
        matched.find((m) => m.statusText.includes('pembayaran') || m.statusText.includes('payout')) ||
        null;

      const debetRow = bettingPick ? bettingPick.row : (payoutPick ? payoutPick.row : matched[0].row);
      const openPick = payoutPick || bettingPick || matched[0];

      const debetEl = debetRow.querySelector("[data-changekey='debet']");
      debetValue = String(debetEl && debetEl.textContent ? debetEl.textContent : '').trim() || '0';
      gameName = (openPick.link.dataset && openPick.link.dataset.gamename) ? String(openPick.link.dataset.gamename).trim() : null;

      if (!bettingPick) {
        chrome.runtime.sendMessage({
          action: "processError",
          userId,
          transactionId,
          error: "Transaksi ditemukan, tapi baris Pertaruhan/Betting (03) tidak ditemukan"
        });
        return;
      }

      if (!gameName) {
        chrome.runtime.sendMessage({
          action: "processError",
          userId,
          transactionId,
          error: "Gagal mendapatkan Game Name"
        });
        return;
      }

      console.log("🧮 Debet:", debetValue);

      let expectedBetting = null;
      if (expectedBettingFromMsg !== null && typeof expectedBettingFromMsg !== 'undefined') {
        expectedBetting = expectedBettingFromMsg;
      }

      const openedFromClick = await clickLinkCaptureUrlThenOpenTab(openPick.link, mainTabId);
      const capture = openedFromClick && openedFromClick.tabId
        ? openedFromClick
        : await clickLinkAndCaptureHistoryTab(openPick.link, mainTabId);

      if (capture && capture.tabId) {
        chrome.runtime.sendMessage({
          action: "executeScriptInTab",
          tabId: capture.tabId,
          transactionId,
          userId,
          debetValue,
          expectedBetting,
          mainTabId: mainTabId
        });
        chrome.runtime.sendMessage({ action: "closeTab", tabId: mainTabId });
        return;
      }

      if (!token) {
        chrome.runtime.sendMessage({
          action: "processError",
          userId,
          transactionId,
          error: "Gagal membuka detail via klik (First/Payout). Token kosong untuk fallback URL."
        });
        return;
      }

      const linkUrl = `https://public.u2uyu876x.com/history/${gameName}.html?psid=${tx19}&sid=${tx19}&api=public-api.u2uyu876x.com%252Fweb-api%252Foperator-proxy%252Fv1%252FHistory%252FGetBetHistory&lang=en&t=${token}`;
      await openAndProcessLink(linkUrl, userId, transactionId, debetValue, expectedBetting, mainTabId);
      return;
    }
  }

  const recordRows = Array.from(document.querySelectorAll('tbody.transaction-record-html tr'));
  const meaningfulRows = recordRows.filter((r) => {
    const kid = r.querySelector("[data-changekey='keteranganId']");
    return !!String(kid && kid.textContent ? kid.textContent : '').trim();
  });

  if (meaningfulRows.length === 0) {
    if (tableShowsNoData()) {
      chrome.runtime.sendMessage({
        action: "processError",
        userId,
        transactionId,
        error: "Transaksi tidak ditemukan (No data setelah First)"
      });
      return;
    }
  }

  let found = false;

  if (meaningfulRows.length > 0) {
    for (const row of meaningfulRows) {
      const statusEl = row.querySelector("[data-changekey='status']");
      const kidEl = row.querySelector("[data-changekey='keteranganId']");
      const debetEl = row.querySelector("[data-changekey='debet']");
      const ketEl = row.querySelector("[data-changekey='keterangan']");

      const statusText = String(statusEl && statusEl.textContent ? statusEl.textContent : '').trim().toLowerCase();
      const kidText = String(kidEl && kidEl.textContent ? kidEl.textContent : '').trim();
      const ketText = String(ketEl && ketEl.textContent ? ketEl.textContent : '').trim();

      const statusOk = statusText === 'betting' || statusText === 'pertaruhan' || statusText.includes('betting');
      const idOk = kidText.includes(txFull) || kidText.includes(tx19);

      if (statusOk && idOk) {
        debetValue = String(debetEl && debetEl.textContent ? debetEl.textContent : '').trim() || '0';
        gameName = extractGameNameFromKeterangan(ketText);
        found = true;
        break;
      }
    }
  }

  if (!found) {
    let allLinkEls = document.querySelectorAll(".jq-keterangan-link");
    for (const link of allLinkEls) {
      const row = link.closest('tr');
      if (!row) continue;
      const statusEl = row.querySelector("[data-changekey='status']");
      if (!String(link.textContent || '').includes(tx19)) continue;
      const statusText = String(statusEl && statusEl.textContent ? statusEl.textContent : '').trim().toLowerCase();
      const statusOk = statusText === 'pertaruhan' || statusText.includes('betting');
      if (!statusOk) continue;
      const debetEl = row.querySelector("[data-changekey='debet']");
      debetValue = String(debetEl && debetEl.textContent ? debetEl.textContent : '').trim() || '0';
      gameName = link.dataset.gamename || null;
      found = true;
      break;
    }
  }

  if (!found) {
    chrome.runtime.sendMessage({
      action: "processError",
      userId: userId,
      transactionId: transactionId,
      error: "Transaksi tidak ditemukan di tabel (setelah First)"
    });
    return;
  }

  // 4. Pengecekan Game Name
if (!gameName) {
      chrome.runtime.sendMessage({ 
          action: "processError", 
          userId: userId,
          transactionId: transactionId,
          error: "Gagal mendapatkan Game Name" 
      });
      return;
  }

  console.log("🧮 Debet:", debetValue);

  // Ambil nominal betting: utamakan dari background, fallback storage
  let expectedBetting = null;
  if (expectedBettingFromMsg !== null && typeof expectedBettingFromMsg !== 'undefined') {
    expectedBetting = expectedBettingFromMsg;
    console.log("✅ expectedBetting dari background:", expectedBetting);
  } else {
    try {
      const res = await new Promise((resolve) => {
        chrome.storage.local.get(["txQueue"], (r) => resolve(r));
      });
      const q = Array.isArray(res.txQueue) ? res.txQueue : [];
      const item = q.find((it) => String(it.transactionId) === String(transactionId));
      if (item && typeof item.betting !== "undefined" && item.betting !== null) {
        expectedBetting = item.betting;
        console.log("✅ expectedBetting dari storage:", expectedBetting);
      } else {
        console.warn("⚠️ expectedBetting tidak ditemukan di storage untuk", transactionId);
      }
    } catch (e) {
      console.warn("⚠️ Gagal membaca txQueue dari storage:", e);
    }
  }

  // Lanjutkan ke proses buka tab detail 
  const linkUrl = `https://public.u2uyu876x.com/history/${gameName}.html?psid=${tx19}&sid=${tx19}&api=public-api.u2uyu876x.com%252Fweb-api%252Foperator-proxy%252Fv1%252FHistory%252FGetBetHistory&lang=en&t=${token}`;
  console.log(`🌐 Membuka link untuk Game ID: ${gameName}`);

  await openAndProcessLink(linkUrl, userId, transactionId, debetValue, expectedBetting, mainTabId);
}

async function openAndProcessLink(linkUrl, userId, transactionId, debetValue, expectedBetting, mainTabId) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "openLink", url: linkUrl }, async (response) => {
      if (!response || !response.tabId) {
        alert("❌ Gagal membuka halaman detail transaksi.");
        resolve(false); 
        return;
      }

      const detailTabId = response.tabId;
      
      // Eksekusi script di tab detail
      chrome.runtime.sendMessage({ 
          action: "executeScriptInTab", 
          tabId: detailTabId, 
          transactionId, 
          userId, 
          debetValue,
          expectedBetting,
          mainTabId: mainTabId 
      });
      
      // Tutup Tab Utama SEGERA setelah tab detail berhasil dibuka
      chrome.runtime.sendMessage({ action: "closeTab", tabId: mainTabId }); 
      
      resolve(true); 
    });
  });
}

async function clickLinkAndCaptureHistoryTab(linkEl, openerTabId) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'captureNextHistoryTab', openerTabId, timeoutMs: 9000 },
      (capture) => {
        resolve(capture);
      }
    );

    try {
      linkEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
      linkEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
      linkEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    } catch {}
  });
}

async function clickLinkCaptureUrlThenOpenTab(linkEl, openerTabId) {
  const nonce = `${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const waitForUrl = () =>
    new Promise((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        try { window.removeEventListener('message', onMsg, true); } catch {}
        resolve(null);
      }, 8000);

      const onMsg = (event) => {
        try {
          const data = event && event.data ? event.data : null;
          if (!data || typeof data !== 'object') return;
          if (data.type !== 'CEKBONUS_WINDOW_OPEN') return;
          if (data.nonce !== nonce) return;
          const url = String(data.url || '');
          if (!url) return;
          if (done) return;
          done = true;
          clearTimeout(timer);
          try { window.removeEventListener('message', onMsg, true); } catch {}
          resolve(url);
        } catch {}
      };

      window.addEventListener('message', onMsg, true);
    });

  const install = await new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'installWindowOpenInterceptor', openerTabId, nonce },
      (res) => resolve(res)
    );
  });

  if (!install || install.error) {
    return null;
  }

  const urlPromise = waitForUrl();
  try {
    linkEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    linkEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    linkEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  } catch {}

  const url = await urlPromise;

  try {
    window.postMessage({ type: 'CEKBONUS_RESTORE_WINDOW_OPEN', nonce }, '*');
  } catch {}

  if (!url) return null;

  let absUrl = url;
  try {
    absUrl = new URL(url, location.href).toString();
  } catch {}

  if (String(absUrl).startsWith('chrome-extension://')) {
    return null;
  }

  const opened = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'openLinkInSameWindow', openerTabId, url: absUrl }, (res) => resolve(res));
  });

  if (opened && opened.tabId) {
    return { tabId: opened.tabId, url };
  }

  return null;
}
