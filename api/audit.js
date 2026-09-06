'use strict';

const { readJson, sendJson, cleanText, clamp } = require('../lib/http');

const CATEGORY_RULES = [
  ['electric', 'Electricity', /(electric|electricity|power|kwh|demand charge|utility demand)/i],
  ['gas', 'Natural gas', /(natural gas|\bgas\b|therm|mcf)/i],
  ['water', 'Water / sewer', /(water|sewer|stormwater)/i],
  ['tax', 'Property tax', /(property tax|real estate tax|tax assessment|taxes)/i],
  ['insurance', 'Insurance', /(insurance|premium|property coverage|casualty)/i],
  ['rent', 'Rent / occupancy', /(base rent|minimum rent|monthly rent|annual rent|occupancy)/i],
  ['cam', 'CAM / pass-throughs', /(\bcam\b|common area|operating expense|opex|hoa|pass-through)/i],
  ['waste', 'Waste / recurring services', /(waste|trash|garbage|dumpster|recycling)/i],
  ['maintenance', 'Maintenance / service', /(maintenance|repair|service contract|preventive maintenance|janitorial|snow removal|landscap)/i],
  ['permit', 'Permits / licenses / connections', /(permit|license|inspection|impact fee|connection fee|hookup|tap fee)/i],
  ['parking', 'Parking / access', /(parking|garage|access fee)/i],
  ['telecom', 'Telecom / connectivity', /(internet|telecom|fiber|broadband|phone)/i],
];

const CASE_MAP = {
  electric: 'electric',
  gas: 'gas',
  water: 'water',
  tax: 'tax',
  insurance: 'insurance',
  waste: 'other',
  maintenance: 'other',
};

function amountFromLine(line) {
  const explicit = [...line.matchAll(/\$\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{1,2})?|[0-9]+(?:\.\d{1,2})?)/g)]
    .map((m) => Number(m[1].replace(/,/g, '')))
    .filter(Number.isFinite);
  if (explicit.length) return Math.max(...explicit);

  if (CATEGORY_RULES.some(([, , rule]) => rule.test(line))) {
    const loose = [...line.matchAll(/(?:^|\s)([0-9]{1,3}(?:,[0-9]{3})+(?:\.\d{1,2})?)(?=\s|$)/g)]
      .map((m) => Number(m[1].replace(/,/g, '')))
      .filter(Number.isFinite);
    if (loose.length) return Math.max(...loose);
  }
  return null;
}

function cadence(line) {
  if (/(one[- ]time|once|upfront|initial|deposit|move[- ]in)/i.test(line)) return { factor: 0, label: 'one-time' };
  if (/(per week|weekly|\/week|\/wk)/i.test(line)) return { factor: 52, label: 'weekly' };
  if (/(per month|monthly|\/month|\/mo\b)/i.test(line)) return { factor: 12, label: 'monthly' };
  if (/(quarterly|per quarter|\/quarter)/i.test(line)) return { factor: 4, label: 'quarterly' };
  if (/(annual|annually|per year|yearly|\/yr\b)/i.test(line)) return { factor: 1, label: 'annual' };
  return { factor: 1, label: 'assumed annual' };
}

function categoryFor(line) {
  for (const [key, label, rule] of CATEGORY_RULES) {
    if (rule.test(line)) return { key, label };
  }
  return { key: 'other', label: 'Other / uncategorized' };
}

function parseLines(text, caseModel) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => cleanText(line, 600))
    .filter((line) => line.length >= 2)
    .slice(0, 500);

  const items = [];
  for (const line of lines) {
    const amount = amountFromLine(line);
    if (amount == null || amount <= 0) continue;
    const cat = categoryFor(line);
    const c = cadence(line);
    const annual = c.factor ? amount * c.factor : 0;
    const oneTime = c.factor ? 0 : amount;
    const modeledKey = CASE_MAP[cat.key] || null;
    const modeled = modeledKey && caseModel?.categories ? Number(caseModel.categories[modeledKey]) || 0 : 0;
    const variance = modeled && annual ? annual / modeled - 1 : null;
    items.push({
      line,
      category: cat.key,
      categoryLabel: cat.label,
      amount,
      cadence: c.label,
      annualized: Math.round(annual),
      oneTime: Math.round(oneTime),
      modeledBaseline: Math.round(modeled),
      variance: variance == null ? null : clamp(variance, -0.99, 9),
    });
  }
  return items.slice(0, 120);
}

function findClauses(text) {
  const lines = String(text || '').split(/\r?\n/).map((x) => cleanText(x, 700)).filter(Boolean);
  const out = [];
  for (const line of lines) {
    const pct = line.match(/([0-9]+(?:\.[0-9]+)?)\s*%/);
    if (!pct) continue;
    if (/(increase|escalat|cpi|annual adjustment|year over year|renewal|management fee|admin fee|late fee)/i.test(line)) {
      out.push({ percent: Number(pct[1]), line });
    }
  }
  return out.slice(0, 12);
}

function missingLayers(items, caseModel) {
  const seen = new Set(items.map((x) => x.category));
  const expected = [
    ['electric', 'Electricity'], ['gas', 'Natural gas'], ['water', 'Water / sewer'],
    ['tax', 'Property tax'], ['insurance', 'Insurance'], ['waste', 'Waste / recurring services'],
    ['cam', 'CAM / pass-throughs'], ['maintenance', 'Maintenance / service'],
  ];
  return expected
    .filter(([key]) => !seen.has(key))
    .map(([key, label]) => ({
      key,
      label,
      modeledBaseline: CASE_MAP[key] && caseModel?.categories ? Math.round(Number(caseModel.categories[CASE_MAP[key]]) || 0) : 0,
    }));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    const body = await readJson(req, 131072);
    const text = String(body.text || '').replace(/\u0000/g, '').slice(0, 80000);
    if (text.trim().length < 20) return sendJson(res, 400, { ok: false, error: 'Paste at least a few lines from a bill, quote, lease cost schedule, or operating budget.' });
    const caseModel = body.case && typeof body.case === 'object' ? body.case : null;
    const items = parseLines(text, caseModel);
    const recurring = items.reduce((sum, x) => sum + x.annualized, 0);
    const oneTime = items.reduce((sum, x) => sum + x.oneTime, 0);
    const modeled = Number(caseModel?.total) || 0;
    const realityGap = modeled && recurring ? recurring - modeled : null;
    const highFlags = items
      .filter((x) => x.variance != null && x.variance >= 0.25)
      .sort((a, b) => b.variance - a.variance)
      .slice(0, 8)
      .map((x) => ({ type: 'high', category: x.categoryLabel, message: `${x.categoryLabel} annualizes about ${Math.round(x.variance * 100)}% above the current ExpenseIntel modeled layer.` }));
    const lowFlags = items
      .filter((x) => x.variance != null && x.variance <= -0.35)
      .sort((a, b) => a.variance - b.variance)
      .slice(0, 6)
      .map((x) => ({ type: 'low', category: x.categoryLabel, message: `${x.categoryLabel} is materially below the current modeled layer; confirm scope, credits, exclusions, and billing period before treating it as a full-year comparison.` }));
    const missing = missingLayers(items, caseModel);
    const clauses = findClauses(text);
    return sendJson(res, 200, {
      ok: true,
      auditVersion: 'EI-XRAY-2026.09.1',
      summary: {
        detectedLineItems: items.length,
        detectedRecurringAnnual: Math.round(recurring),
        detectedOneTime: Math.round(oneTime),
        modeledAnnual: Math.round(modeled),
        realityGap: realityGap == null ? null : Math.round(realityGap),
        missingLayers: missing.length,
        escalationClauses: clauses.length,
      },
      items,
      missing,
      clauses,
      flags: [...highFlags, ...lowFlags],
      methodology: {
        classification: 'Deterministic text audit + ExpenseIntel location model comparison',
        warning: 'X-Ray detects dollar amounts and cost-language patterns from pasted text. It is not legal review, OCR, a contractor estimate, a tax opinion, or proof that a quote is overpriced. Verify scope, cadence, units, exclusions, and property-specific documents before acting.',
      },
    });
  } catch (error) {
    return sendJson(res, error?.status || 500, { ok: false, error: error?.message || 'Could not audit this text.' });
  }
};
