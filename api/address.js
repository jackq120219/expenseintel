const CENSUS_BASE = 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress';

function send(res, status, payload, cache = false) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', cache ? 'public, s-maxage=86400, stale-while-revalidate=604800' : 'no-store');
  res.end(JSON.stringify(payload));
}

function clean(value, max = 180) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function geographyByName(geographies, key) {
  if (!geographies || typeof geographies !== 'object') return null;
  const direct = geographies[key];
  if (Array.isArray(direct) && direct[0]) return direct[0];
  const foundKey = Object.keys(geographies).find(k => k.toLowerCase() === key.toLowerCase());
  const value = foundKey ? geographies[foundKey] : null;
  return Array.isArray(value) && value[0] ? value[0] : null;
}

function normalizeCensusMatch(match) {
  const c = match.addressComponents || {};
  const label = clean(match.matchedAddress, 220);
  const matchedStreet = clean(label.split(',')[0], 140);
  const county = geographyByName(match.geographies, 'Counties');
  const stateGeo = geographyByName(match.geographies, 'States');
  const tract = geographyByName(match.geographies, 'Census Tracts');
  return {
    id: `census:${match.tigerLine?.tigerLineId || `${match.coordinates?.x || ''},${match.coordinates?.y || ''}`}`,
    label,
    provider: 'U.S. Census Bureau',
    verified: true,
    coordinates: {
      lat: Number(match.coordinates?.y) || null,
      lon: Number(match.coordinates?.x) || null
    },
    components: {
      street: matchedStreet,
      city: clean(c.city, 90),
      state: clean(c.state, 2).toUpperCase(),
      zip: clean(c.zip, 10),
      county: clean(county?.NAME, 100),
      stateName: clean(stateGeo?.NAME, 80),
      countyFips: clean(county?.GEOID, 8),
      tract: clean(tract?.GEOID, 20)
    }
  };
}

function parseGoogleComponent(components, wanted) {
  const item = (components || []).find(c => (c.types || []).includes(wanted));
  return item?.shortText || item?.longText || '';
}

async function googleAutocomplete(q, key, signal) {
  const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text'
    },
    body: JSON.stringify({ input: q, includedRegionCodes: ['us'], languageCode: 'en' })
  });
  if (!response.ok) throw new Error(`Google Places autocomplete ${response.status}`);
  const data = await response.json();
  return (data.suggestions || []).map(s => s.placePrediction).filter(Boolean).slice(0, 5).map(p => ({
    id: `google:${p.placeId}`,
    placeId: p.placeId,
    label: clean(p.text?.text, 220),
    provider: 'Google Places',
    verified: true,
    needsDetails: true
  }));
}

async function googleDetails(placeId, key, signal) {
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
  const response = await fetch(url, {
    signal,
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'id,formattedAddress,location,addressComponents'
    }
  });
  if (!response.ok) throw new Error(`Google Places details ${response.status}`);
  const p = await response.json();
  return {
    id: `google:${p.id || placeId}`,
    label: clean(p.formattedAddress, 220),
    provider: 'Google Places',
    verified: true,
    coordinates: { lat: Number(p.location?.latitude) || null, lon: Number(p.location?.longitude) || null },
    components: {
      street: clean(`${parseGoogleComponent(p.addressComponents, 'street_number')} ${parseGoogleComponent(p.addressComponents, 'route')}`, 140),
      city: clean(parseGoogleComponent(p.addressComponents, 'locality') || parseGoogleComponent(p.addressComponents, 'postal_town'), 90),
      state: clean(parseGoogleComponent(p.addressComponents, 'administrative_area_level_1'), 2).toUpperCase(),
      zip: clean(parseGoogleComponent(p.addressComponents, 'postal_code'), 10),
      county: clean(parseGoogleComponent(p.addressComponents, 'administrative_area_level_2'), 100),
      stateName: '', countyFips: '', tract: ''
    }
  };
}

async function censusSearch(q, signal) {
  const url = new URL(CENSUS_BASE);
  url.searchParams.set('address', q);
  url.searchParams.set('benchmark', 'Public_AR_Current');
  url.searchParams.set('vintage', 'Current_Current');
  url.searchParams.set('format', 'json');
  const response = await fetch(url, {
    signal,
    headers: { 'User-Agent': 'ExpenseIntel/1.0 (https://expenseintel.com)' }
  });
  if (!response.ok) throw new Error(`Census geocoder ${response.status}`);
  const data = await response.json();
  return (data?.result?.addressMatches || []).slice(0, 5).map(normalizeCensusMatch);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { ok: false, error: 'Method not allowed' });

  const q = clean(req.query?.q, 180);
  const placeId = clean(req.query?.placeId, 220);
  if (!q && !placeId) return send(res, 400, { ok: false, error: 'Enter a U.S. street address.' });
  if (q && q.length < 6) return send(res, 200, { ok: true, provider: 'none', suggestions: [] });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  const googleKey = process.env.GOOGLE_PLACES_API_KEY;

  try {
    if (placeId && googleKey) {
      const match = await googleDetails(placeId, googleKey, controller.signal);
      return send(res, 200, { ok: true, provider: 'google', suggestions: [match] }, true);
    }

    if (q && googleKey) {
      try {
        const suggestions = await googleAutocomplete(q, googleKey, controller.signal);
        if (suggestions.length) return send(res, 200, { ok: true, provider: 'google', suggestions }, true);
      } catch (error) {
        console.warn('Google Places unavailable; falling back to Census.', error?.message || error);
      }
    }

    const suggestions = await censusSearch(q, controller.signal);
    return send(res, 200, {
      ok: true,
      provider: 'census',
      suggestions,
      message: suggestions.length ? null : 'No verified Census match yet. Add city, state, or ZIP and try again.'
    }, true);
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    console.error('Address resolution failed:', error?.message || error);
    return send(res, timedOut ? 504 : 502, {
      ok: false,
      error: timedOut ? 'Address service timed out. Try again.' : 'Address verification is temporarily unavailable.'
    });
  } finally {
    clearTimeout(timeout);
  }
};
