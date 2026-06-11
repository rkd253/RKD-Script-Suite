function isErrorScatterTitle(title) {
  const t = String(title || '').toLowerCase();
  return t.includes('tidak ditemukan') || t.startsWith('error') || t.includes('gagal');
}

function getStatusCek(row) {
  if (row && typeof row.statusCek === 'string' && row.statusCek.trim()) return row.statusCek;
  const t = String(row?.scatterTitle || '').toLowerCase();
  if (!t) return 'Pending';
  if (
    t.includes('tidak ditemukan') ||
    t.startsWith('error') ||
    t.includes('gagal') ||
    t.includes('scatter: none') ||
    t.includes('scatter tidak ditemukan')
  )
    return 'Cek gagal';
  return 'Sukses cek';
}

function shouldShowRetryCheck(row) {
  return getStatusCek(row) === 'Cek gagal' || isErrorScatterTitle(row?.scatterTitle);
}

function getScatterDisplay(row) {
  if (typeof row?.scatterCount === 'number' && Number.isFinite(row.scatterCount)) return String(row.scatterCount);
  const title = String(row?.scatterTitle || '');
  const m = title.match(/scatter\s*[:=]\s*(\d+)/i);
  if (m && m[1]) return m[1];
  return title;
}

function getBonusSmbStatus(row) {
  const s = String(row?.bonussmbStatus || '').trim();
  const d = String(row?.bonussmbDetail || '').trim();
  if (!s && !d) return '-';
  if (d) return s ? `${s}: ${d}` : d;
  return s;
}

function getBonusSmbTag(row) {
  const s = String(row?.bonussmbStatus || '').trim();
  if (!s) return null;
  if (s === 'Sudah input' || s === 'APPROVED') return { mode: 'ok', text: s };
  if (s === 'REJECTED') return { mode: 'bad', text: s };
  if (s === 'Ticket sudah ada') return { mode: 'warn', text: 'Ticket sudah ada' };
  if (s === 'Batas claim') return { mode: 'bad', text: 'Limit Claim' };
  if (s === 'Sedang input') return { mode: 'warn', text: 'Sedang input' };
  if (s === 'Mengulang...') return { mode: 'warn', text: 'Mengulang...' };
  if (s === 'Gagal input') return { mode: 'warn', text: 'Gagal input' };
  return { mode: 'warn', text: s };
}

function shouldShowRetryInput(row) {
  return String(row?.bonussmbStatus || '').trim() === 'Gagal input';
}

function createTd(text, className) {
  const td = document.createElement('td');
  if (className) td.className = className;
  td.textContent = String(text ?? '');
  return td;
}

function renderResults(results) {
  const rows = Array.isArray(results) ? results : [];
  state.results = rows;
  el.resultBody.innerHTML = '';

  const rowsToRender = [...rows].reverse();

  if (rowsToRender.length === 0) {
    el.resultBody.innerHTML = '<tr><td colspan="6">Belum ada data</td></tr>';
    updateStats(rows);
    return;
  }

  for (const r of rowsToRender) {
    const tr = document.createElement('tr');
    const error = isErrorScatterTitle(r.scatterTitle);
    const statusCek = getStatusCek(r);
    const scatterDisplay = getScatterDisplay(r);
    const bonussmbText = getBonusSmbStatus(r);
    const bonussmbTag = getBonusSmbTag(r);

    tr.appendChild(createTd(r.userId || ''));
    tr.appendChild(createTd(r.transactionId || '', 'mono'));
    tr.appendChild(createTd(r.debetValue || ''));
    tr.appendChild(createTd(scatterDisplay || ''));

    const statusTd = document.createElement('td');
    const statusWrap = document.createElement('div');
    statusWrap.className = 'statusCell';

    const statusText = document.createElement('div');
    statusText.textContent = statusCek;
    statusText.style.color = error ? 'var(--danger)' : 'var(--success)';
    statusWrap.appendChild(statusText);

    if (shouldShowRetryCheck(r)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn small secondary';
      btn.textContent = 'Cek ulang';
      btn.dataset.action = 'retryCheck';
      btn.dataset.userId = String(r.userId || '');
      btn.dataset.transactionId = String(r.transactionId || '');
      if (typeof r.expectedBetting !== 'undefined' && r.expectedBetting !== null && String(r.expectedBetting).trim()) {
        btn.dataset.betting = String(r.expectedBetting);
      }
      statusWrap.appendChild(btn);
    }

    statusTd.appendChild(statusWrap);
    tr.appendChild(statusTd);

    const bonusTd = document.createElement('td');
    if (shouldShowRetryInput(r) || bonussmbTag) {
      const wrap = document.createElement('div');
      wrap.className = 'bonusCell';

      if (bonussmbTag) {
        const tagEl = document.createElement('div');
        tagEl.className = `bonussmbTag ${bonussmbTag.mode}`;
        tagEl.innerHTML = `<span class="dot ${bonussmbTag.mode === 'ok' ? 'ok' : ''}"></span><span>${bonussmbTag.text}</span>`;
        wrap.appendChild(tagEl);
      }

      if (bonussmbText && bonussmbText !== '-' && bonussmbText !== (bonussmbTag ? bonussmbTag.text : '')) {
        const textEl = document.createElement('div');
        textEl.textContent = bonussmbText;
        textEl.style.fontSize = '11px';
        textEl.style.opacity = '0.7';
        wrap.appendChild(textEl);
      }

      if (shouldShowRetryInput(r)) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn small secondary';
        btn.textContent = 'Input ulang';
        btn.dataset.action = 'retryBonussmbInput';
        btn.dataset.userId = String(r.userId || '');
        btn.dataset.transactionId = String(r.transactionId || '');
        wrap.appendChild(btn);
      }

      bonusTd.appendChild(wrap);
    } else {
      bonusTd.textContent = bonussmbText;
    }
    tr.appendChild(bonusTd);

    const verifiedTd = document.createElement('td');
    const vStatus = String(r?.verifiedStatus || '-').trim();
    if (vStatus === 'APPROVED') {
      verifiedTd.innerHTML = `<span class="badge ok clickable-badge" data-action="verifyStatusSingle" data-user-id="${r.userId || ''}" data-transaction-id="${r.transactionId || ''}" title="Klik untuk cek status terbaru">APPROVED</span>`;
      tr.classList.add('tr-approved');
    } else if (vStatus === 'REJECTED') {
      const ket = String(r?.verifiedKeterangan || '').trim();
      const badgeHtml = `<span class="badge bad clickable-badge" data-action="verifyStatusSingle" data-user-id="${r.userId || ''}" data-transaction-id="${r.transactionId || ''}" title="Klik untuk cek status terbaru">REJECTED</span>`;
      if (ket) {
        verifiedTd.innerHTML = `
          <div class="verified-wrapper">
            ${badgeHtml}
            <div class="rejected-keterangan">${ket}</div>
          </div>
        `;
      } else {
        verifiedTd.innerHTML = badgeHtml;
      }
      tr.classList.add('tr-rejected');
    } else if (vStatus === 'WAITING' || vStatus === 'PENDING' || vStatus === 'PROCESS' || vStatus === '-') {
      const isWaiting = (vStatus === 'WAITING' || vStatus === 'PROCESS');
      const displayStatus = isWaiting ? 'WAITING' : (vStatus === '-' ? '-' : 'PENDING');
      const badgeClass = isWaiting ? 'badge status-waiting' : (vStatus === '-' ? 'badge secondary' : 'badge warn');
      verifiedTd.innerHTML = `<span class="${badgeClass} clickable-badge" data-action="verifyStatusSingle" data-user-id="${r.userId || ''}" data-transaction-id="${r.transactionId || ''}" title="Klik untuk cek status terbaru">${displayStatus}</span>`;
      if (isWaiting) tr.classList.add('tr-waiting');
      else if (vStatus === 'PENDING') tr.classList.add('tr-pending');
    } else {
      verifiedTd.textContent = vStatus;
    }
    tr.appendChild(verifiedTd);

    // Tombol Hapus (X)
    const actionTd = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn small danger';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = 'Hapus baris ini';
    deleteBtn.dataset.action = 'deleteRow';
    deleteBtn.dataset.userId = String(r.userId || '');
    deleteBtn.dataset.transactionId = String(r.transactionId || '');
    actionTd.appendChild(deleteBtn);
    tr.appendChild(actionTd);

    el.resultBody.appendChild(tr);
  }

  // Update stats
  updateStats(rows);
}

// ===== STATS COUNTER =====
function updateStats(rows) {
  const data = Array.isArray(rows) ? rows : [];
  let total = data.length;
  let approved = 0;
  let rejected = 0;
  let pending = 0;
  let suksesCek = 0;

  for (const r of data) {
    const vStatus = String(r?.verifiedStatus || '').trim();
    const statusCek = getStatusCek(r);

    if (vStatus === 'APPROVED') approved++;
    else if (vStatus === 'REJECTED') rejected++;
    else if (vStatus === 'WAITING' || vStatus === 'PENDING' || vStatus === 'PROCESS' || vStatus === '-' || vStatus === '') pending++;

    if (statusCek === 'Sukses cek') suksesCek++;
  }

  if (el.statTotal) el.statTotal.textContent = String(total);
  if (el.statApproved) el.statApproved.textContent = String(approved);
  if (el.statRejected) el.statRejected.textContent = String(rejected);
  if (el.statPending) el.statPending.textContent = String(pending);
  if (el.statSuksesCek) el.statSuksesCek.textContent = String(suksesCek);
}

// ===== STATS COUNTER =====

function copyTSV() {
  const rows = Array.isArray(state.results) ? state.results : [];
  if (rows.length === 0) {
    setStatus('⚠️ Tidak ada hasil untuk disalin.');
    return;
  }
  let tsv = '';
  for (const r of rows) {
    const cols = [
      String(r.userId || ''),
      String(r.transactionId || ''),
      String(r.debetValue || ''),
      String(r.scatterTitle || ''),
      typeof r.expectedBetting !== 'undefined' ? String(r.expectedBetting) : '',
      typeof r.detailBetting !== 'undefined' ? String(r.detailBetting) : '',
    ];
    tsv += cols.join('\t') + '\n';
  }
  navigator.clipboard
    .writeText(tsv)
    .then(() => setStatus(`📋 ${rows.length} baris berhasil disalin.`))
    .catch(() => setStatus('❌ Gagal menyalin ke clipboard.'));
}
