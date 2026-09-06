'use strict';

const { readJson, sendJson, cleanText } = require('../lib/http');

const USE_RULES = [
  ['restaurant', /\brestaurant\b|commercial kitchen|food service|cafe\b|bar\b/i],
  ['industrial', /\bindustrial\b|manufactur|production plant|factory|fabrication/i],
  ['warehouse', /\bwarehouse\b|distribution|fulfillment/i],
  ['retail', /\bretail\b|storefront|shop\b/i],
  ['office', /\boffice\b|workspace/i],
  ['multifamily', /multifamily|multi[- ]family|apartments?/i],
  ['residential', /single[- ]family|\bresidential\b|\bhouse\b/i],
];

function number(raw) {
  const n = Number(String(raw || '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function excerpt(line) {
  return cleanText(line, 360);
}

function pushClaim(out, key, label, value, unit, line, confidence = 0.9, meta = {}) {
  if (value == null || value === '') return;
  out.push({
    key,
    label,
    value,
    unit: unit || null,
    confidence,
    excerpt: excerpt(line),
    ...meta,
  });
}

function useFromText(text) {
  return USE_RULES.find(([, rule]) => rule.test(text))?.[0] || null;
}

function parseDate(text) {
  const iso = text.match(/\b(20\d{2})[-\/.](0?[1-9]|1[0-2])[-\/.](0?[1-9]|[12]\d|3[01])\b/);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;
  const us = text.match(/\b(0?[1-9]|1[0-2])[\/-](0?[1-9]|[12]\d|3[01])[\/-](20\d{2})\b/);
  if (us) return `${us[3]}-${String(us[1]).padStart(2, '0')}-${String(us[2]).padStart(2, '0')}`;
  const named = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(20\d{2})\b/i);
  if (!named) return null;
  const months = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
  return `${named[3]}-${String(months[named[1].toLowerCase()]).padStart(2, '0')}-${String(named[2]).padStart(2, '0')}`;
}

function parseLine(line, claims) {
  const lower = line.toLowerCase();

  // Electrical service / load claims. Require context so ordinary counts do not become amperage.
  const amp = line.match(/\b([0-9]{2,5})\s*(?:a\b|amps?\b|amperes?\b)/i);
  if (amp && /(service|main|electric|electrical|panel|switchgear|meter|utility|capacity)/i.test(line)) {
    pushClaim(claims, 'serviceAmps', 'Electrical service', number(amp[1]), 'A', line, 0.95);
  }
  const volt = line.match(/\b(120|208|240|277|480)\s*v(?:olts?)?\b/i);
  if (volt && /(service|electric|electrical|power|phase|panel|switchgear|utility)/i.test(line)) {
    pushClaim(claims, 'voltage', 'Service voltage', number(volt[1]), 'V', line, 0.96);
  }
  if (/\b(?:three|3)[- ]?phase\b|\b3\s*φ\b/i.test(line)) pushClaim(claims, 'phase', 'Electrical phase', 3, 'phase', line, 0.98);
  if (/\b(?:single|one|1)[- ]?phase\b|\b1\s*φ\b/i.test(line)) pushClaim(claims, 'phase', 'Electrical phase', 1, 'phase', line, 0.98);

  let kw = line.match(/(?:peak|demand|connected load|design load|electrical load|load)\s*(?:of|is|=|:)?\s*([0-9][0-9,.]*)\s*kw\b/i);
  if (!kw) kw = line.match(/\b([0-9][0-9,.]*)\s*kw\b.{0,35}\b(?:peak|demand|connected|design|load)\b/i);
  if (kw) pushClaim(claims, 'peakKw', 'Project peak demand', number(kw[1]), 'kW', line, 0.95);

  // Water: distinguish design demand from known service capacity when the language allows it.
  const gpm = line.match(/\b([0-9][0-9,.]*)\s*gpm\b/i);
  if (gpm) {
    const value = number(gpm[1]);
    if (/(available|capacity|can provide|max(?:imum)?|service limit|service capacity|meter capacity)/i.test(line)) {
      pushClaim(claims, 'waterCapacity', 'Water capacity', value, 'gpm', line, 0.92);
    } else if (/(demand|design|peak|required|requires|flow)/i.test(line)) {
      pushClaim(claims, 'waterDemand', 'Water demand', value, 'gpm', line, 0.92);
    } else {
      pushClaim(claims, 'waterDemand', 'Water flow', value, 'gpm', line, 0.72, { ambiguous: true });
    }
  }

  const gpd = line.match(/\b([0-9][0-9,.]*)\s*gpd\b/i);
  if (gpd) {
    const value = number(gpd[1]);
    if (/(allowance|available|capacity|can accept|max(?:imum)?|limit|permitted discharge)/i.test(line)) {
      pushClaim(claims, 'sewerCapacity', 'Sewer allowance', value, 'gpd', line, 0.92);
    } else {
      pushClaim(claims, 'sewerDemand', 'Sewer design flow', value, 'gpd', line, /(design|demand|flow|discharge|required)/i.test(line) ? 0.92 : 0.74, { ambiguous: !/(design|demand|flow|discharge|required)/i.test(line) });
    }
  }

  const mbh = line.match(/\b([0-9][0-9,.]*)\s*mbh\b/i);
  if (mbh) {
    const value = number(mbh[1]);
    if (/(available|capacity|can provide|max(?:imum)?|service limit)/i.test(line)) {
      pushClaim(claims, 'gasCapacity', 'Gas capacity', value, 'MBH', line, 0.92);
    } else {
      pushClaim(claims, 'gasDemand', 'Gas design load', value, 'MBH', line, /(design|demand|load|connected|required)/i.test(line) ? 0.92 : 0.74, { ambiguous: !/(design|demand|load|connected|required)/i.test(line) });
    }
  }

  const occ = line.match(/\b([0-9]{1,5})\s*(?:occupants?|persons?|people|seats?)\b/i);
  if (occ && /(occupant|occupancy|seat|person|people|capacity|load)/i.test(line)) {
    pushClaim(claims, 'occupantLoad', 'Occupant load', number(occ[1]), 'people', line, 0.9);
  }

  const lead = line.match(/(?:lead time|delivery|procurement|available in|ships? in)\D{0,24}([0-9]{1,3})\s*(business\s+)?(days?|weeks?|months?)/i);
  if (lead) pushClaim(claims, 'leadTime', 'Lead time', number(lead[1]), lead[3].toLowerCase(), line, 0.88);

  const permit = line.match(/\b(?:permit|application|case|appeal|variance)\s*(?:no\.?|number|#|id|:)?\s*([A-Z0-9][A-Z0-9-]{3,})\b/i);
  if (permit) pushClaim(claims, 'permitRef', 'Permit / case reference', permit[1], null, line, 0.86);

  // Status claims: negative forms are evaluated first to avoid reading “not approved” as approval.
  let disposition = null;
  if (/\b(?:not\s+approved|denied|prohibited|not\s+permitted|disallowed|rejected)\b/i.test(line)) disposition = 'negative';
  else if (/\b(?:approved|permitted|allowed|by[- ]right|as[- ]of[- ]right)\b/i.test(line)) disposition = 'positive';
  else if (/\b(?:conditional|special use|special exception|variance required|subject to approval)\b/i.test(line)) disposition = 'conditional';
  else if (/\b(?:pending|under review|in review|application filed)\b/i.test(line)) disposition = 'pending';
  else if (/\b(?:expired|lapsed|void)\b/i.test(line)) disposition = 'expired';

  const use = useFromText(line);
  if (disposition && /(zoning|zone|use|variance|special|permitted|prohibited|by[- ]right|approval)/i.test(line)) {
    pushClaim(claims, 'zoningDisposition', 'Use / zoning disposition', disposition, null, line, 0.86, { subjectUse: use });
  } else if (disposition && /(permit|application|plan review|certificate|occupancy|inspection)/i.test(line)) {
    pushClaim(claims, 'approvalDisposition', 'Approval status', disposition, null, line, 0.84);
  }

  const amount = [...line.matchAll(/\$\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{1,2})?|[0-9]+(?:\.\d{1,2})?)/g)]
    .map((m) => number(m[1]))
    .filter((n) => n != null);
  if (amount.length && /(quote|bid|budget|estimate|allowance|contract|cost|price)/i.test(line)) {
    pushClaim(claims, 'projectAmount', 'Documented project amount', Math.max(...amount), 'USD', line, 0.82);
  }
}

function categoriesFor(text, claims) {
  const set = new Set();
  if (/(zoning|variance|special use|by[- ]right|prohibited|permitted use)/i.test(text) || claims.some((c) => c.key === 'zoningDisposition')) set.add('zoning');
  if (/(utility|electric|service|amp|voltage|phase|water|sewer|gas|gpm|gpd|mbh|kw)/i.test(text) || claims.some((c) => /serviceAmps|voltage|phase|peakKw|water|sewer|gas/.test(c.key))) set.add('utility');
  if (/(permit|plan review|inspection|certificate of occupancy|approval|building department|fire marshal)/i.test(text) || claims.some((c) => /permitRef|approvalDisposition/.test(c.key))) set.add('permit');
  if (/(environmental|phase i|phase 1|hazardous|contamination|flood|stormwater|access|easement|title|site plan)/i.test(text)) set.add('site');
  if (/(scope|responsibility|exclusion|included|contractor|subcontractor|inspection report|condition report)/i.test(text)) set.add('scope');
  if (/(quote|bid|budget|estimate|allowance|contract price|lease schedule|invoice|bill)/i.test(text) || claims.some((c) => c.key === 'projectAmount')) set.add('quote');
  return [...set];
}

function dedupeClaims(claims) {
  const seen = new Set();
  return claims.filter((c) => {
    const id = `${c.key}|${String(c.value)}|${c.unit || ''}|${c.excerpt}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  }).slice(0, 120);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  try {
    const body = await readJson(req, 160000);
    const text = String(body.text || '').replace(/\u0000/g, '').slice(0, 120000);
    if (text.trim().length < 20) return sendJson(res, 400, { ok: false, error: 'Add at least a few lines of project evidence.' });

    const lines = text.split(/\r?\n/).map((x) => cleanText(x, 900)).filter(Boolean).slice(0, 900);
    const claims = [];
    for (const line of lines) parseLine(line, claims);
    const deduped = dedupeClaims(claims);
    const categories = categoriesFor(text, deduped);
    const firstDate = parseDate(text);

    return sendJson(res, 200, {
      ok: true,
      parserVersion: 'EI-EVIDENCE-2026.09.1',
      summary: {
        linesReviewed: lines.length,
        claimsDetected: deduped.length,
        evidenceCategories: categories,
        dateDetected: firstDate,
      },
      claims: deduped,
      categories,
      detectedDate: firstDate,
      methodology: {
        classification: 'Deterministic project-evidence claim extraction',
        warning: 'Detected claims are text matches, not independent verification. Source strength, document age, scope, units and project applicability still require human review.',
      },
    });
  } catch (error) {
    return sendJson(res, error?.status || 500, { ok: false, error: error?.message || 'Could not parse project evidence.' });
  }
};
