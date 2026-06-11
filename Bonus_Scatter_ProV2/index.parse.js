function normalizeLine(line) {
  return String(line || '').trim();
}

function normalizeUserId(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  return s.split(/\s+/)[0];
}

function normalizeTicketCode(raw) {
  return String(raw || '').replace(/\s+/g, '').trim();
}

function parseBulk(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items = [];
  for (const line of lines) {
    const parts = line
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const userIdRaw = String(parts[0] || '').trim();
    const userId = normalizeUserId(userIdRaw);
    const transactionId = normalizeTicketCode(parts[1] || '');
    const betting = parts[2];
    if (!userId || !transactionId) continue;
    const item = { userId, userIdRaw, transactionId };
    if (typeof betting !== 'undefined' && betting !== '') item.betting = betting;
    items.push(item);
  }
  return items;
}

function parseHeaderBlock(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return null;

  const canonicalMap = {
    'x-access-token': 'X-Access-Token',
    'x-agent-pkid': 'X-Agent-Pkid',
    'x-agent-role': 'X-Agent-Role',
    'x-agent-suid': 'X-Agent-Suid',
    'x-agent-user': 'X-Agent-User',
    'x-agent-userid': 'X-Agent-UserId',
  };

  const out = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes(':')) {
      const idx = line.indexOf(':');
      const kRaw = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      const k = canonicalMap[String(kRaw).toLowerCase()] || null;
      if (k && v) out[k] = v;
      continue;
    }

    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      const kRaw = parts[0].trim();
      const v = parts.slice(1).join(' ').trim();
      const k = canonicalMap[String(kRaw).toLowerCase()] || null;
      if (k && v) {
        out[k] = v;
        continue;
      }
    }

    const key = canonicalMap[String(line).toLowerCase()] || null;
    if (!key) continue;
    const value = lines[i + 1];
    if (!value) continue;
    const isHeaderKey = !!canonicalMap[String(value).toLowerCase()];
    if (isHeaderKey) continue;
    out[key] = value;
    i++;
  }

  return Object.keys(out).length ? out : null;
}

function buildConfig() {
  const cfg = {};
  const executorName = normalizeLine(el.executorName.value);
  const adminUrl = normalizeLine(el.adminUrl.value);
  const startDate = normalizeLine(el.startDate.value);
  const endDate = normalizeLine(el.endDate.value);
  const agentHeaders = String(el.agentHeaders.value || '');
  const todayDate = todayISO();

  if (executorName) cfg.executorName = executorName;
  if (adminUrl) cfg.adminUrl = adminUrl;
  if (startDate) cfg.startDate = startDate;
  if (endDate) cfg.endDate = endDate;
  cfg.todayDate = todayDate;
  cfg.processMode = 'auto';

  const parsed = parseHeaderBlock(agentHeaders);
  if (parsed) cfg.agentHeaders = parsed;

  return cfg;
}
