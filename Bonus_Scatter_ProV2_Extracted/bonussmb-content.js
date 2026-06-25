function setNativeValue(el, value) {
  const v = String(value ?? '');
  const proto = Object.getPrototypeOf(el);
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  if (desc && typeof desc.set === 'function') {
    desc.set.call(el, v);
  } else {
    el.value = v;
  }
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function isVisible(el) {
  if (!el) return false;
  const cs = window.getComputedStyle(el);
  if (!cs) return false;
  if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function x1(path) {
  try {
    return document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  } catch {
    return null;
  }
}

function parseNumberLike(input) {
  const s = String(input ?? '').replace(/,/g, '').trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function clampBettingValue(n) {
  if (!Number.isFinite(n)) return null;
  const v = Math.trunc(n);
  if (v < 0) return 0;
  return Math.min(v, 9999999);
}

function findInputByPlaceholder(placeholder) {
  return document.querySelector(`input[data-slot="input"][placeholder="${placeholder}"]`) ||
    document.querySelector(`input[placeholder="${placeholder}"]`);
}

function findTextareaByPlaceholder(placeholder) {
  return document.querySelector(`textarea[data-slot="textarea"][placeholder="${placeholder}"]`) ||
    document.querySelector(`textarea[placeholder="${placeholder}"]`);
}

function triggerClick(el) {
  if (!el) return;
  try {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    el.click();
  } catch (e) {
    console.error("Error triggering click:", e);
  }
}

function findElementByText(text) {
  // Gunakan XPath untuk mencari teks yang tepat
  const xpath = `//*[text()="${text}" or normalize-space(text())="${text}"]`;
  try {
    const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (result) return result;
  } catch (e) {}

  // Fallback: Cari elemen yang tidak memiliki anak dan teksnya mengandung label
  const all = Array.from(document.querySelectorAll('label, div, span, p'));
  return all.find(el => {
    if (el.children.length > 0) {
      return Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim().toLowerCase() === text.toLowerCase());
    }
    return el.textContent.trim().toLowerCase() === text.toLowerCase();
  });
}

function findReactSelectContainer(row) {
  if (!row) return null;
  const byClass = row.querySelector('[class$="-container"]') || 
                  row.querySelector('[class*="-container"]') || 
                  row.querySelector('[class*="css-"]');
  if (byClass) return byClass;
  
  const hasReactSelect = row.querySelector('[id^="react-select-"]') || 
                         row.querySelector('.select2__control') || 
                         row.querySelector('[class*="control"]');
  if (hasReactSelect) {
    return hasReactSelect.closest('[class*="-container"]') || hasReactSelect.parentElement;
  }
  return null;
}

function findSelectContainerByLabel(labelText) {
  const label = findElementByText(labelText);
  if (!label) return null;
  
  // Naik ke atas sampai 4 tingkat untuk mencari container react-select
  let current = label;
  for (let i = 0; i < 4; i++) {
    if (!current) break;
    const container = findReactSelectContainer(current);
    if (container) return container;
    current = current.parentElement;
  }
  return null;
}

function findScatterSelectRoot() {
  return findSelectContainerByLabel('Jumlah Scatter');
}

async function selectReactSelectValue(container, valueText) {
  if (!container) return false;
  const control = container.querySelector('.select2__control') || 
                  container.querySelector('[class*="-control"]') || 
                  container;
  if (!control) return false;
  const ariaDisabled = control.getAttribute('aria-disabled');
  if (ariaDisabled === 'true' || String(control.className || '').includes('-disabled')) return false;

  const clickDropdown = () => {
    const indicator = container.querySelector('[class*="indicatorContainer"]') || 
                      container.querySelector('[class*="Indicator"]') || 
                      container.querySelector('svg');
    if (indicator) {
      triggerClick(indicator);
    } else {
      triggerClick(control);
    }
  };

  clickDropdown();

  let options = await waitForOptions(1500);
  
  // Jika opsi tidak muncul (klik tertelan render React), klik sekali lagi
  if (!options.length) {
    console.log("[BonusScatter] Options empty, retrying click on dropdown...");
    clickDropdown();
    options = await waitForOptions(2000);
  }

  if (options.length) {
    const valLower = String(valueText).trim().toLowerCase();
    // Cari yang match penuh dulu, baru match sebagian
    let target = options.find((o) => String(o.textContent || '').trim().toLowerCase() === valLower);
    if (!target) {
      target = options.find((o) => String(o.textContent || '').trim().toLowerCase().includes(valLower));
    }
    if (target) {
      target.click();
      return true;
    }
  }
  return false;
}

function sleep(ms) {
  const n = Number(ms || 0);
  const scaled = Math.max(5, Math.round(n * 0.65));
  return new Promise((r) => setTimeout(r, scaled));
}

function dispatchKey(target, key) {
  const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, code: key });
  target.dispatchEvent(ev);
}

async function typeValue(el, value) {
  const text = String(value ?? '');
  try { el.focus(); } catch {}
  try {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA', ctrlKey: true, bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', code: 'KeyA', ctrlKey: true, bubbles: true }));
  } catch {}
  try {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', code: 'Backspace', bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Backspace', code: 'Backspace', bubbles: true }));
  } catch {}
  setNativeValue(el, '');
  await sleep(50);

  for (const ch of text) {
    try {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ch, code: ch, bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keypress', { key: ch, code: ch, bubbles: true }));
    } catch {}

    const next = String(el.value || '') + ch;
    setNativeValue(el, next);
    try {
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: ch, inputType: 'insertText' }));
    } catch {}

    try {
      el.dispatchEvent(new KeyboardEvent('keyup', { key: ch, code: ch, bubbles: true }));
    } catch {}
    await sleep(60);
  }

  try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch {}
  await sleep(80);
  try { el.blur(); } catch {}
}

function getComboboxTarget(container) {
  if (!container) return null;
  return (
    container.querySelector('input[id^="react-select-"][id$="-input"]') ||
    container.querySelector('input.select2__input') ||
    container.querySelector('[role="combobox"]') ||
    container.querySelector('input')
  );
}

async function openReactSelect(container) {
  if (!container) return false;
  const control = container.querySelector('.select2__control') || 
                  container.querySelector('[class*="-control"]') || 
                  container;
  if (!control) return false;
  const ariaDisabled = control.getAttribute('aria-disabled');
  if (ariaDisabled === 'true' || String(control.className || '').includes('-disabled')) return false;
  
  // Klik tombol indikator panah bawah di sebelah kanan jika ditemukan
  const indicator = container.querySelector('[class*="indicatorContainer"]') || 
                    container.querySelector('[class*="Indicator"]') || 
                    container.querySelector('svg');
  if (indicator) {
    triggerClick(indicator);
  } else {
    triggerClick(control);
  }
  await sleep(80);
  const target = getComboboxTarget(container);
  if (target) {
    try { target.focus(); } catch {}
  }
  return true;
}

async function selectByKeyboard(container, { down = 1, up = 0 } = {}) {
  const opened = await openReactSelect(container);
  if (!opened) return false;
  const target = getComboboxTarget(container) || container;
  for (let i = 0; i < down; i++) {
    dispatchKey(target, 'ArrowDown');
    await sleep(60);
  }
  for (let i = 0; i < up; i++) {
    dispatchKey(target, 'ArrowUp');
    await sleep(60);
  }
  dispatchKey(target, 'Enter');
  await sleep(80);
  return true;
}

function findTambahDataTrigger() {
  const triggers = Array.from(document.querySelectorAll('button[data-slot="dialog-trigger"], [data-slot="dialog-trigger"]'));
  const bySlot = triggers.find((el) => isVisible(el));
  if (bySlot) return bySlot;

  const keywords = ['tambah data', 'tambah', 'add', 'create', 'new', 'buat'];

  const buttons = Array.from(document.querySelectorAll('button'));
  const matchBtn = buttons.find((el) => {
    const t = String(el.textContent || '').trim().toLowerCase();
    if (!t) return false;
    if (!isVisible(el)) return false;
    return keywords.some((k) => t.includes(k));
  });
  if (matchBtn) return matchBtn;

  const labelled = buttons.find((el) => {
    const aria = String(el.getAttribute('aria-label') || '').trim().toLowerCase();
    const title = String(el.getAttribute('title') || '').trim().toLowerCase();
    if (!isVisible(el)) return false;
    return keywords.some((k) => aria.includes(k) || title.includes(k));
  });
  if (labelled) return labelled;

  const divs = Array.from(document.querySelectorAll('div'));
  const matchDiv = divs.find((el) => {
    const t = String(el.textContent || '').trim().toLowerCase();
    if (!t) return false;
    if (!isVisible(el)) return false;
    return keywords.some((k) => t.includes(k));
  });
  if (matchDiv) return matchDiv.closest('button') || matchDiv;
  return null;
}

async function ensureFormOpen() {
  const bodyText = String(document.body && document.body.innerText ? document.body.innerText : '');
  const looksLikeLanding = bodyText.includes('Setiap hari adalah peluang baru') || bodyText.includes('SMBGROUP');
  if (looksLikeLanding) return false;

  const hasFormTitle = () => {
    const title = Array.from(document.querySelectorAll('div')).find((d) => String(d.textContent || '').trim() === 'Form Tiket');
    return !!title;
  };

  if (hasFormTitle()) return true;

  const started = Date.now();
  let clicked = false;
  while (Date.now() - started < 20000) {
    if (hasFormTitle()) return true;
    const userInput = findInputByPlaceholder('User ID');
    const kodeInput = findInputByPlaceholder('Kode Tiket');
    if (userInput && kodeInput && isVisible(userInput) && isVisible(kodeInput)) return true;

    const trigger = findTambahDataTrigger();
    if (trigger && isVisible(trigger)) {
      try { trigger.scrollIntoView({ block: 'center' }); } catch {}
      try { trigger.click(); } catch {}
      clicked = true;
    }

    if (!clicked && Date.now() - started > 4000) {
      try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch {
        try { window.scrollTo(0, 0); } catch {}
      }
    }

    await sleep(250);
  }
  return false;
}

function getFormElement() {
  const titleEl = Array.from(document.querySelectorAll('div')).find((d) => String(d.textContent || '').trim() === 'Form Tiket');
  if (titleEl) {
    const root = titleEl.closest('[role="dialog"]') || titleEl.closest('div');
    const form = root ? root.querySelector('form') : null;
    if (form) return form;
  }
  const formFallback = Array.from(document.querySelectorAll('form')).find((f) => {
    const t = String(f.textContent || '');
    return t.includes('User ID') && t.includes('Kode Tiket');
  });
  return formFallback || null;
}

function getControlsFromForm(formEl) {
  if (!formEl) return { situs: null, tipe: null, scatter: null, saveBtn: null };
  
  // Ambil semua elemen div di dalam form yang merupakan container React-Select
  const containers = Array.from(formEl.querySelectorAll('div')).filter(el => {
    const className = String(el.className || '');
    const hasContainerClass = className.includes('-container') || className.includes('container');
    const hasControl = el.querySelector('[class*="control"]') || el.querySelector('.select2__control');
    return hasContainerClass && hasControl;
  });

  const situs = containers[0] || null;
  const tipe = containers[1] || null;
  const scatter = findSelectContainerByLabel("Jumlah Scatter");

  const btns = Array.from(formEl.querySelectorAll('button'));
  const saveBtn = btns.find((b) => String(b.textContent || '').trim().toLowerCase() === 'simpan') ||
    btns.find((b) => b.getAttribute('data-slot') === 'button') ||
    null;

  return { situs, tipe, scatter, saveBtn };
}

function findSaveButton(formEl) {
  const root = (formEl && (formEl.closest('[role="dialog"]') || formEl.closest('div'))) || document;
  const buttons = Array.from(root.querySelectorAll('button'));
  const isClickable = (b) => {
    if (!b) return false;
    if (b.disabled) return false;
    const ariaDisabled = b.getAttribute('aria-disabled');
    if (ariaDisabled === 'true') return false;
    return isVisible(b);
  };
  const byText = buttons.find((b) => isClickable(b) && String(b.textContent || '').trim().toLowerCase() === 'simpan');
  if (byText) return byText;
  const bySlot = buttons.find((b) => isClickable(b) && b.getAttribute('data-slot') === 'button');
  if (bySlot) return bySlot;
  const byType = buttons.find((b) => isClickable(b) && b.getAttribute('type') === 'submit');
  if (byType) return byType;
  return null;
}

async function waitForTicketSaveResponse(timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const text = String(document.body && document.body.innerText ? document.body.innerText : '');
    if (text.includes('The ticket code has already been taken.') || text.toLowerCase().includes('already been taken')) {
      return { ok: false, code: 'ticket_taken', error: 'The ticket code has already been taken.' };
    }
    if (text.includes('maksimal klaim') || text.includes('sudah mencapai maksimal') || text.includes('mencapai maksimal klaim')) {
      return { ok: false, code: 'limit_reached', error: 'User ID ini sudah mencapai maksimal klaim 2 kali untuk Livechat!' };
    }
    await sleep(150);
  }
  return { ok: true };
}

async function waitForOptions(timeout = 500) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const opts = Array.from(document.querySelectorAll('[role="option"], .select2__option'))
      .filter((o) => o && o.offsetParent !== null);
    if (opts.length > 0) return opts;
    await sleep(5);
  }
  return [];
}

async function clickArrowDownAndSelect(ctrl) {
  try {
    if (!ctrl) return false;
    const control = ctrl.querySelector('.select2__control') || 
                    ctrl.querySelector('[class*="-control"]') || 
                    ctrl;
    const ariaDisabled = control.getAttribute('aria-disabled');
    if (ariaDisabled === 'true' || String(control.className || '').includes('-disabled')) return false;

    // Klik tombol indikator panah bawah di sebelah kanan jika ditemukan
    const indicator = ctrl.querySelector('[class*="indicatorContainer"]') || 
                      ctrl.querySelector('[class*="Indicator"]') || 
                      ctrl.querySelector('svg');
    if (indicator) {
      triggerClick(indicator);
    } else {
      triggerClick(control);
    }
    await sleep(80);

    const inner = control.querySelector('input, [role="combobox"]');
    const target = inner || control;
    if (inner) {
      try { inner.focus(); } catch {}
    }
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await sleep(120);

    const opts = await waitForOptions(800);
    if (opts.length) {
      opts[0].click();
      return true;
    }
  } catch {}
  return false;
}

async function waitForActive(el, timeout = 1500) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (el && el.offsetParent !== null) {
      const control = el.querySelector('.select2__control') || 
                      el.querySelector('[class*="-control"]') || 
                      el;
      const ariaDisabled = control.getAttribute('aria-disabled');
      if (ariaDisabled !== 'true' && !String(control.className || '').includes('-disabled')) return true;
    }
    await sleep(20);
  }
  return false;
}

async function fillScatterByKeyboard(container, scatterValue) {
  if (!container) return false;
  if (!await waitForActive(container, 7000)) return false;

  const control = container.querySelector('.select2__control') || container;
  control.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  control.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  control.click();
  await sleep(100);

  const input = container.querySelector('input, [role="combobox"]');
  if (input) {
    try { input.focus(); } catch {}
  }
  const target = input || control;
  const val = parseInt(scatterValue, 10);
  if (val === 3) {
    dispatchKey(target, 'ArrowUp');
    await sleep(80);
    dispatchKey(target, 'ArrowUp');
    await sleep(80);
    dispatchKey(target, 'ArrowUp');
    await sleep(80);
    dispatchKey(target, 'Enter');
    await sleep(80);
    return true;
  }
  if (val === 4) {
    dispatchKey(target, 'ArrowUp');
    await sleep(80);
    dispatchKey(target, 'ArrowUp');
    await sleep(80);
    dispatchKey(target, 'Enter');
    await sleep(80);
    return true;
  }
  if (val === 5) {
    dispatchKey(target, 'ArrowUp');
    await sleep(80);
    dispatchKey(target, 'Enter');
    await sleep(80);
    return true;
  }

  const arrowDownTimes = Math.max(0, val - 3);
  for (let i = 0; i < arrowDownTimes; i++) {
    dispatchKey(target, 'ArrowDown');
    await sleep(120);
  }
  dispatchKey(target, 'Enter');
  await sleep(80);
  return true;
}

function getFieldStateSnapshot() {
  const siteVal = document.querySelector("div:has(> .select2__single-value)");
  const siteText = (() => {
    const el = Array.from(document.querySelectorAll('.select2__single-value')).find((x) => {
      const t = String(x.textContent || '').trim().toLowerCase();
      return t === 'wdbos' || t === 'mahjong' || t.length > 0;
    });
    return el ? String(el.textContent || '').trim() : '';
  })();

  const claimRow = Array.from(document.querySelectorAll('div')).find((d) => String(d.textContent || '').trim() === 'Klaim melalui');
  const claimText = claimRow ? String((claimRow.closest('.flex') || claimRow.parentElement)?.textContent || '').trim() : '';

  const hasBet = !!(document.querySelector('input[placeholder="#######"]') || Array.from(document.querySelectorAll('input')).find((i) => i.getAttribute('placeholder') === '#######'));
  const scatterRoot = findScatterSelectRoot();
  const scatterDisabled = scatterRoot ? isScatterDisabled() : true;

  return {
    siteText,
    claimText,
    hasBet,
    hasScatter: !!scatterRoot,
    scatterDisabled,
  };
}

async function selectScatterValue(scatter) {
  const container = findScatterSelectRoot();
  if (!container) return false;
  const desired = String(scatter);
  const byClick = await selectReactSelectValue(container, desired);
  if (byClick) return true;

  const val = parseInt(desired, 10);
  if (val === 3) return selectByKeyboard(container, { up: 3, down: 0 });
  if (val === 4) return selectByKeyboard(container, { up: 2, down: 0 });
  if (val === 5) return selectByKeyboard(container, { up: 1, down: 0 });
  return selectByKeyboard(container, { down: 1, up: 0 });
}

function isScatterDisabled() {
  const root = findScatterSelectRoot();
  if (!root) return true;
  const control = root.querySelector('.select2__control');
  if (!control) return true;
  const ariaDisabled = control.getAttribute('aria-disabled');
  return ariaDisabled === 'true' || control.className.includes('--is-disabled') || root.className.includes('select2--is-disabled');
}

async function waitScatterEnabled(timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (!isScatterDisabled()) return true;
    await sleep(200);
  }
  return false;
}

async function fillTicket(payload) {
  const userId = String(payload.userIdRaw || payload.userId || '').trim();
  const kodeTiket = String(payload.transactionId || '').trim();
  const scatterCount = typeof payload.scatterCount === 'number' ? payload.scatterCount : parseNumberLike(payload.scatterCount);
  const debet = clampBettingValue(parseNumberLike(payload.debetValue));

  const opened = await ensureFormOpen();
  if (!opened) {
    const bodyText = String(document.body && document.body.innerText ? document.body.innerText : '');
    const looksLikeLanding = bodyText.includes('Setiap hari adalah peluang baru') || bodyText.includes('SMBGROUP');
    return { ok: false, error: looksLikeLanding ? 'Belum login / bukan halaman Ticket Management' : 'Dialog Form Tiket tidak bisa dibuka' };
  }

  const formEl = getFormElement();
  const { situs, tipe, scatter } = getControlsFromForm(formEl);

  const userInput = (formEl && formEl.querySelector('input[placeholder="User ID"]')) || findInputByPlaceholder('User ID');
  const kodeInput = (formEl && formEl.querySelector('input[placeholder="Kode Tiket"]')) || findInputByPlaceholder('Kode Tiket');
  if (!userInput || !kodeInput) {
    return { ok: false, error: 'Form Tiket tidak ditemukan / selector berubah' };
  }

  if (situs) {
    const ok = await clickArrowDownAndSelect(situs);
    if (!ok) {
      const desiredSite = String(payload.site || 'wdbos');
      await selectReactSelectValue(situs, desiredSite);
    }
    console.log("[BonusScatter] Situs selected, waiting 1200ms for React rendering...");
    await sleep(1200);
  }

  if (tipe) {
    // Cari ulang elemen Tipe Games agar tidak menggunakan referensi DOM yang usang (stale) setelah render ulang Situs
    const activeTipe = findSelectContainerByLabel("Tipe Games") || tipe;

    // Wait for Tipe Games dropdown to become active (it depends on Situs selection)
    const tipeReady = await waitForActive(activeTipe, 8000);
    if (!tipeReady) {
      console.warn('[BonusScatter] Tipe Games dropdown still disabled after 8s, trying anyway...');
    }
    await sleep(200);

    let tipeSelected = false;
    const desiredType = String(payload.gameType || 'mahjong').trim();

    // Strategy 1: Try direct text match first (most reliable)
    if (desiredType) {
      tipeSelected = await selectReactSelectValue(activeTipe, desiredType);
    }

    // Strategy 2: Try clickArrowDownAndSelect (selects first option)
    if (!tipeSelected) {
      tipeSelected = await clickArrowDownAndSelect(activeTipe);
    }

    // Strategy 3: Retry with longer wait if still not selected
    if (!tipeSelected) {
      await sleep(500);
      const retryReady = await waitForActive(activeTipe, 5000);
      if (retryReady) {
        tipeSelected = await clickArrowDownAndSelect(activeTipe);
        if (!tipeSelected && desiredType) {
          tipeSelected = await selectReactSelectValue(activeTipe, desiredType);
        }
      }
    }

    // Strategy 4: Keyboard navigation as last resort
    if (!tipeSelected) {
      console.warn('[BonusScatter] All Tipe Games strategies failed, trying keyboard...');
      tipeSelected = await selectByKeyboard(activeTipe, { down: 1, up: 0 });
    }

    if (!tipeSelected) {
      console.error('[BonusScatter] Failed to select Tipe Games after all strategies');
    }
    await sleep(100);
  }

  const claimWaitStart = Date.now();
  while (Date.now() - claimWaitStart < 12000) {
    const t = String(document.body && document.body.innerText ? document.body.innerText : '');
    if (!t.includes('Loading konfigurasi klaim')) break;
    await sleep(250);
  }

  let bettingInput = null;
  let scatterRootNow = null;
  const settleStart = Date.now();
  while (Date.now() - settleStart < 5000) {
    bettingInput = (formEl && formEl.querySelector('input[placeholder="#######"]')) ||
      document.querySelector('input[placeholder="#######"]') ||
      Array.from(document.querySelectorAll('input')).find((i) => i.getAttribute('placeholder') === '#######');
    scatterRootNow = findScatterSelectRoot();
    if (bettingInput && scatterRootNow) break;
    await sleep(250);
  }

  if (!bettingInput || !scatterRootNow) {
    const missing = [!bettingInput ? 'Bettingan' : null, !scatterRootNow ? 'Jumlah Scatter' : null].filter(Boolean);
    const snap = getFieldStateSnapshot();
    return { ok: false, error: `Field belum muncul: ${missing.join(', ')} | site=${snap.siteText} | scatterDisabled=${snap.scatterDisabled} | claim=${snap.claimText}` };
  }

  setNativeValue(userInput, userId);
  setNativeValue(kodeInput, kodeTiket);
  if (debet !== null) {
    await typeValue(bettingInput, String(debet));
  }

  if (scatterCount !== null) {
    const enabled = await waitScatterEnabled(12000);
    if (!enabled) {
      return { ok: false, error: 'Jumlah Scatter masih terkunci (pastikan bettingan valid & konfigurasi klaim sudah selesai)' };
    }
  }

  if (scatterCount !== null) {
    await new Promise((r) => setTimeout(r, 200));
    const ok = await fillScatterByKeyboard(scatterRootNow, scatterCount);
    if (!ok) {
      await selectScatterValue(scatterCount);
    }
  }

  await sleep(250);
  const saveBtn = findSaveButton(formEl);
  if (saveBtn) {
    try { saveBtn.scrollIntoView({ block: 'center' }); } catch {}
    try { saveBtn.click(); } catch {}
    const resp = await waitForTicketSaveResponse(3000);
    if (!resp.ok) return resp;
    return { ok: true, saved: true };
  }

  return { ok: false, error: 'Tombol Simpan tidak ditemukan / tidak bisa diklik' };
}

function injectRocketSearchButton() {
  if (document.getElementById('rocketSearchBtn')) return;
  if (!document.body) {
    setTimeout(injectRocketSearchButton, 100);
    return;
  }
  
  const btn = document.createElement('div');
  btn.id = 'rocketSearchBtn';
  btn.innerHTML = '🚀';
  btn.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 65px;
    height: 65px;
    background: linear-gradient(135deg, #ffd700, #ff8c00);
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 35px;
    cursor: pointer;
    box-shadow: 0 0 25px rgba(255, 215, 0, 0.7);
    z-index: 2147483647;
    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    user-select: none;
  `;
  
  btn.title = 'Roket Pencari Status';
  
  btn.onmouseover = () => btn.style.transform = 'scale(1.1) rotate(-10deg)';
  btn.onmouseout = () => btn.style.transform = 'scale(1) rotate(0deg)';
  
  btn.onclick = async () => {
    btn.style.transform = 'scale(0.8) translateY(-10px)';
    setTimeout(() => btn.style.transform = 'scale(1) translateY(0)', 200);
    
    // Trigger background verification
    chrome.runtime.sendMessage({ type: 'BONUSSMB_TRIGGER_VERIFICATION' });
    
    // Visual feedback
    const originalText = btn.innerHTML;
    btn.innerHTML = '🔍';
    setTimeout(() => btn.innerHTML = originalText, 2000);
  };
  
  document.body.appendChild(btn);
  console.log('[BonusScatter] Rocket button injected.');
}

// Aggressive injection
if (location.href.includes('bonussmb.com')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectRocketSearchButton);
  } else {
    injectRocketSearchButton();
  }
  // Also interval check in case of SPA navigation
  setInterval(injectRocketSearchButton, 2000);
}

async function ensureTargetPage(targetUrl) {
  if (location.href.includes(targetUrl)) return true;
  
  const keywords = targetUrl.includes('history') ? ['history', 'riwayat'] : ['ticket', 'tiket'];
  const elements = Array.from(document.querySelectorAll('a, button, [role="button"], span, div.flex'));
  
  const match = elements.find(el => {
    if (!isVisible(el)) return false;
    const t = el.textContent.toLowerCase();
    const href = (el.getAttribute && el.getAttribute('href')) || '';
    return keywords.some(k => t.includes(k) || href.includes(k));
  });

  if (match) {
    console.log('[BonusScatter] Clicking tab:', match.textContent);
    match.click();
    await sleep(1500);
    if (location.href.includes(targetUrl)) return true;
  }

  console.log('[BonusScatter] Hard redirecting to:', targetUrl);
  location.href = targetUrl;
  return false;
}

function getKeteranganValue(foundRow, ticketCode, userId) {
  try {
    // ===== METODE 1: Cari kolom KETERANGAN via header tabel =====
    const table = foundRow.closest('table');
    if (table) {
      // Scan SEMUA baris untuk menemukan header (bisa di thead, bisa di tr pertama)
      const allRows = Array.from(table.querySelectorAll('tr'));
      let ketIdx = -1;
      
      for (const headerRow of allRows) {
        const cells = Array.from(headerRow.querySelectorAll('th, td'));
        for (let i = 0; i < cells.length; i++) {
          const text = cells[i].innerText.toLowerCase().trim();
          if (text.includes('keterangan') || text.includes('note') || text.includes('reason') || text.includes('remark')) {
            ketIdx = i;
            break;
          }
        }
        if (ketIdx >= 0) break;
      }
      
      if (ketIdx >= 0) {
        const dataCells = Array.from(foundRow.querySelectorAll('td'));
        if (dataCells[ketIdx]) {
          const val = dataCells[ketIdx].innerText.trim();
          if (val && val !== '-' && val.length > 1) {
            console.log('🔍 Keterangan found via header index:', ketIdx, '→', val);
            return val;
          }
        }
      }
    }

    // ===== METODE 2: Scan kolom terakhir (Keterangan biasanya di kolom paling kanan) =====
    const dataCells = Array.from(foundRow.querySelectorAll('td'));
    if (dataCells.length > 0) {
      // Cek 2 kolom terakhir (keterangan biasanya di paling kanan)
      for (let i = dataCells.length - 1; i >= Math.max(0, dataCells.length - 3); i--) {
        const val = dataCells[i].innerText.trim();
        if (!val || val === '-' || val.length < 2) continue;
        const lower = val.toLowerCase();
        // Pastikan ini BUKAN status / angka / tanggal
        if (lower === 'approved' || lower === 'rejected' || lower === 'waiting' || lower === 'pending') continue;
        if (/^[\d.,\s]+$/.test(val)) continue; // Murni angka
        if (/^\d{2,4}[-\/]/.test(val)) continue; // Tanggal
        if (lower.startsWith('rp') || lower.includes('idr')) continue; // Uang
        // Ini kemungkinan besar keterangan!
        console.log('🔍 Keterangan found via last-column scan, col', i, '→', val);
        return val;
      }
    }

    // ===== METODE 3: Heuristic filter semua teks di baris =====
    const textElements = Array.from(foundRow.querySelectorAll('td'))
      .map(el => el.innerText.trim())
      .filter(t => t.length > 1);
    
    for (const t of textElements) {
      const lower = t.toLowerCase();
      if (t.length > 100) continue;
      if (t.includes(ticketCode) || ticketCode.includes(t)) continue;
      if (userId && (lower.includes(userId.toLowerCase()) || userId.toLowerCase().includes(lower))) continue;
      if (lower.includes('approved') || lower.includes('rejected') || lower.includes('pending') || 
          lower.includes('waiting') || lower.includes('livechat') || t === '-') continue;
      if (lower.includes('rp') || lower.includes('idr') || lower.startsWith('x') || /^[\d.,x\s+]+$/i.test(t)) continue;
      if (lower.includes('mahjong') || lower.includes('lapak') || lower.includes('wdbos') || lower.includes('slot')) continue;
      if (/\d{2,4}[-\/]\d{2}/.test(t)) continue;
      if (lower.includes(':') && /\d{2}:\d{2}/.test(t)) continue; // Hanya filter waktu, bukan semua teks dengan ':'
      
      console.log('🔍 Keterangan found via heuristic:', t);
      return t;
    }
  } catch (e) {
    console.warn('Gagal ekstrak keterangan:', e);
  }
  return '';
}

async function checkStatusGeneric(payload) {
  const userId = String(payload.userId || '').trim();
  const ticketCode = String(payload.transactionId || '').trim();
  const targetUrl = payload.targetUrl || '';
  
  // Ensure we are on the correct page
  const onTarget = await ensureTargetPage(targetUrl);
  if (!onTarget) return { ok: false, error: 'Redirecting...' };
  await sleep(150);

  // 1. Find search input
  let searchInput = document.querySelector('input[placeholder*="Search"]') || 
                    document.querySelector('input[type="text"]') ||
                    document.querySelector('.search-input input') ||
                    document.querySelector('input[name="search"]');

  if (!searchInput) {
    const ctrlF = Array.from(document.querySelectorAll('kbd, span, div')).find(el => el.textContent.includes('Ctrl F'));
    if (ctrlF) searchInput = ctrlF.parentElement.querySelector('input');
  }

  if (!searchInput) {
    return { ok: false, error: 'Search input not found' };
  }

  // 2. Clear search lama dan ketik kode tiket baru
  console.log('[BonusScatter] Searching ticket:', ticketCode);
  setNativeValue(searchInput, '');
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(50);

  setNativeValue(searchInput, ticketCode);
  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  searchInput.dispatchEvent(new Event('change', { bubbles: true }));
  searchInput.focus();
  
  // Trigger search via button or Enter key
  const searchBtn = document.querySelector('button.search-btn') || 
                    Array.from(document.querySelectorAll('button')).find(b => {
                      const t = b.textContent.toLowerCase();
                      return t.includes('search') || t.includes('cari');
                    });
  
  if (searchBtn) {
    searchBtn.click();
  } else {
    ['keydown', 'keypress', 'keyup'].forEach(et => {
      searchInput.dispatchEvent(new KeyboardEvent(et, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    });
  }
  
  await sleep(400);

  // 3. Find the row with the ticket code
  const findRow = () => {
    const allRows = Array.from(document.querySelectorAll('tr, [role="row"], .table-row, .ant-table-row'));
    for (const row of allRows) {
      if (row.innerText.includes(ticketCode)) return row;
    }
    const allElements = document.querySelectorAll('td, span, div, p, a');
    for (const el of allElements) {
      if (el.children.length === 0 && el.innerText.trim() === ticketCode) {
        return el.closest('tr') || el.closest('[role="row"]') || el.parentElement;
      }
    }
    return null;
  };

  let foundRow = findRow();
  
  if (!foundRow) {
    // Fast retry loop: max 5 attempts × 250ms = 1.25s
    for (let i = 0; i < 5; i++) {
      await sleep(250);
      foundRow = findRow();
      if (foundRow) break;
    }
  }

  if (!foundRow) {
    const emptyMsg = 
      document.querySelector('.ant-empty-description') || 
      document.querySelector('.no-data') ||
      Array.from(document.querySelectorAll('div, span, p')).find(el => {
        const t = el.innerText;
        return t.includes('out of 0') || t.includes('No data') || t.includes('tidak ditemukan');
      });

    if (emptyMsg) {
      return { ok: true, status: 'NOT_FOUND', detail: 'Tiket tidak ditemukan di web' };
    }

    return { ok: false, error: 'Row not found on page' };
  }

  // 4. Extract status
  const fullRowText = foundRow.innerText.toUpperCase();
  let status = 'PENDING';
  
  if (fullRowText.includes('APPROVED') || fullRowText.includes('SUKSES') || fullRowText.includes('BERHASIL') || fullRowText.includes('DITERIMA')) {
    status = 'APPROVED';
  } else if (fullRowText.includes('REJECTED') || fullRowText.includes('TOLAK') || fullRowText.includes('GAGAL')) {
    status = 'REJECTED';
  } else if (fullRowText.includes('WAITING') || fullRowText.includes('PROCESS') || fullRowText.includes('ANTRI') || fullRowText.includes('MENUNGGU')) {
    status = 'WAITING';
  } else if (fullRowText.includes('PENDING')) {
    status = 'PENDING';
  }

  console.log('[BonusScatter] Found Status:', status, 'for ticket:', ticketCode);
  return { ok: true, status, keterangan: status === 'REJECTED' ? getKeteranganValue(foundRow, ticketCode, userId) : '' };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'BONUSSMB_PING') {
    sendResponse({ ok: true });
    return;
  }
  if (msg.type === 'BONUSSMB_CHECK_STATUS') {
    Promise.resolve(checkStatusGeneric(msg.payload || {})).then(sendResponse);
    return true;
  }
  if (msg.type === 'BONUSSMB_COUNT_CLAIMS') {
    Promise.resolve(countUserClaims(msg.payload || {})).then(sendResponse);
    return true;
  }
  if (msg.type !== 'BONUSSMB_FILL_TICKET') return;
  Promise.resolve(fillTicket(msg.payload || {})).then(sendResponse);
  return true;
});

// ===== COUNT USER CLAIMS ON HISTORY PAGE =====
function isDataRow(row) {
  if (row.querySelector('th')) return false;
  const className = String(row.className || '').toLowerCase();
  if (className.includes('header') || className.includes('footer') || className.includes('pagination') || className.includes('filter')) {
    return false;
  }
  if (row.querySelectorAll('td').length === 0) return false;
  return true;
}

function isDateToday(dateStr) {
  if (!dateStr) return false;
  const cleanStr = dateStr.trim().toLowerCase();
  if (!cleanStr || cleanStr === '-') return false;

  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const mNum = String(now.getMonth() + 1);
  const dd = String(now.getDate()).padStart(2, '0');
  const dNum = String(now.getDate());

  // Check formats like YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY
  const ymd1 = `${yyyy}-${mm}-${dd}`;
  const ymd2 = `${yyyy}/${mm}/${dd}`;
  const dmy1 = `${dd}-${mm}-${yyyy}`;
  const dmy2 = `${dd}/${mm}/${yyyy}`;
  
  if (cleanStr.includes(ymd1) || cleanStr.includes(ymd2) || cleanStr.includes(dmy1) || cleanStr.includes(dmy2)) {
    return true;
  }

  // Indonesian / English month names
  const monthsEng = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const monthsInd = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
  const monthsEngShort = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthsIndShort = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des'];

  const curMonthIdx = now.getMonth();
  const mMatches = [
    monthsEng[curMonthIdx],
    monthsInd[curMonthIdx],
    monthsEngShort[curMonthIdx],
    monthsIndShort[curMonthIdx]
  ];

  for (const m of mMatches) {
    if (cleanStr.includes(m)) {
      const dayRegex = new RegExp(`\\b${dNum}\\b|\\b${dd}\\b`);
      if (dayRegex.test(cleanStr)) {
        return true;
      }
    }
  }

  const regex1 = new RegExp(`\\b${dNum}[-\\/]${mNum}[-\\/]${yyyy}\\b`);
  const regex2 = new RegExp(`\\b${yyyy}[-\\/]${mNum}[-\\/]${dNum}\\b`);
  if (regex1.test(cleanStr) || regex2.test(cleanStr)) {
    return true;
  }

  return false;
}

async function countUserClaims(payload) {
  const userId = String(payload.userId || '').trim().toLowerCase();
  if (!userId) return { ok: false, error: 'userId kosong', count: 0 };

  try {
    // Ensure we are on the history page
    if (!location.href.includes('history')) {
      return { ok: false, error: 'Bukan halaman history', count: 0 };
    }

    await sleep(300);

    // Find search input
    let searchInput = document.querySelector('input[placeholder*="Search"]') ||
                      document.querySelector('input[type="text"]') ||
                      document.querySelector('input[name="search"]');

    if (!searchInput) {
      // Try fallback: search all visible inputs
      const inputs = Array.from(document.querySelectorAll('input')).filter(i => isVisible(i) && i.type !== 'hidden');
      searchInput = inputs[0] || null;
    }

    if (searchInput) {
      // Search by userId
      setNativeValue(searchInput, '');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(50);

      setNativeValue(searchInput, userId);
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      searchInput.focus();

      // Trigger search
      const searchBtn = document.querySelector('button.search-btn') ||
                        Array.from(document.querySelectorAll('button')).find(b => {
                          const t = b.textContent.toLowerCase();
                          return t.includes('search') || t.includes('cari');
                        });

      if (searchBtn) {
        searchBtn.click();
      } else {
        ['keydown', 'keypress', 'keyup'].forEach(et => {
          searchInput.dispatchEvent(new KeyboardEvent(et, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        });
      }

      // Wait dynamically for search results to load
      const startSearchWait = Date.now();
      await sleep(400);

      while (Date.now() - startSearchWait < 8000) {
        const allRows = Array.from(document.querySelectorAll('tr, [role="row"], .table-row, .ant-table-row'));
        const dataRows = allRows.filter(isDataRow);

        let hasUnmatchedRow = false;
        for (const row of dataRows) {
          const rowText = String(row.innerText || '').toLowerCase();
          if (!rowText.includes(userId)) {
            hasUnmatchedRow = true;
            break;
          }
        }

        const bodyText = String(document.body && document.body.innerText ? document.body.innerText : '').toLowerCase();
        const hasEmptyIndicator = bodyText.includes('no results') || 
                                   bodyText.includes('no data') || 
                                   bodyText.includes('tidak ditemukan') ||
                                   bodyText.includes('showing 1 - 0 out of 0') ||
                                   bodyText.includes('showing 0 - 0') ||
                                   bodyText.includes('showing 0 to 0') ||
                                   bodyText.includes('tidak ada data');

        const isSpinnerVisible = !!(
          document.querySelector('.spinner, .loading, [class*="spinner"], [class*="loading"]') ||
          bodyText.includes('loading...') ||
          bodyText.includes('memuat...')
        );

        if ((dataRows.length > 0 && !hasUnmatchedRow && !isSpinnerVisible) || (hasEmptyIndicator && !isSpinnerVisible)) {
          break;
        }
        await sleep(200);
      }
    }

    // Count rows that match the userId and are from TODAY and NOT REJECTED
    const allRows = Array.from(document.querySelectorAll('tr, [role="row"], .table-row, .ant-table-row'));
    const dataRows = allRows.filter(isDataRow);
    
    let count = 0;
    const matchedTxIds = [];

    // Find date column index
    let dateColIdx = -1;
    const headerRow = Array.from(document.querySelectorAll('tr')).find(row => row.querySelector('th'));
    if (headerRow) {
      const ths = Array.from(headerRow.querySelectorAll('th'));
      for (let i = 0; i < ths.length; i++) {
        const text = ths[i].innerText.toLowerCase().trim();
        if (text === 'tanggal' || text === 'date' || text === 'tgl' || text === 'created at' || text === 'waktu') {
          dateColIdx = i;
          break;
        }
      }
    }

    // Find status column index
    let statusColIdx = -1;
    if (headerRow) {
      const ths = Array.from(headerRow.querySelectorAll('th'));
      for (let i = 0; i < ths.length; i++) {
        const text = ths[i].innerText.toLowerCase().trim();
        if (text === 'status' || text === 'state' || text === 'hasil') {
          statusColIdx = i;
          break;
        }
      }
    }

    for (const row of dataRows) {
      const rowText = String(row.innerText || '').toLowerCase();
      
      if (rowText.includes(userId)) {
        // 1. Check Date
        let dateText = '';
        if (dateColIdx >= 0) {
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells[dateColIdx]) {
            dateText = cells[dateColIdx].innerText;
          }
        } else {
          dateText = row.innerText;
        }

        if (!isDateToday(dateText)) {
          continue;
        }

        // 2. Check Status
        let statusText = '';
        if (statusColIdx >= 0) {
          const cells = Array.from(row.querySelectorAll('td'));
          if (cells[statusColIdx]) {
            statusText = cells[statusColIdx].innerText.toLowerCase();
          }
        } else {
          statusText = rowText;
        }

        const isRejected = statusText.includes('reject') || 
                           statusText.includes('tolak') || 
                           statusText.includes('gagal');

        if (isRejected) {
          continue;
        }

        count++;

        // Try to extract txId
        const cells = Array.from(row.querySelectorAll('td'));
        for (const cell of cells) {
          const txt = cell.innerText.trim();
          if (/^\d{10,}$/.test(txt.replace(/\s/g, ''))) {
            matchedTxIds.push(txt.replace(/\s/g, ''));
            break;
          }
        }
      }
    }

    console.log(`[BonusScatter] Claim count for ${userId} today: ${count} (rows matched: ${count}, txIds: ${matchedTxIds.join(',')})`);
    return { ok: true, count: count, txIds: matchedTxIds };
  } catch (e) {
    console.error('[BonusScatter] countUserClaims error:', e);
    return { ok: false, error: e.message || 'unknown', count: 0 };
  }
}
