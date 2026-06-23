// data/calendar.js
// Fetches real PSX corporate-calendar data from our backend, which proxies the
// official PSX Data Portal (dps.psx.com.pk). See backend/src/services/calendarService.js
import { API_URL } from "../config/config";

// GET /api/calendar/earnings?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns { from, to, count, events: [{ symbol, company, type, date, time, city, periodEnd }] }
export async function fetchEarnings(from, to) {
  const qs =
    from && to
      ? `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      : "";
  const res = await fetch(`${API_URL}/api/calendar/earnings${qs}`);
  if (!res.ok) throw new Error(`earnings ${res.status}`);
  return await res.json();
}

// GET /api/calendar/dividends
// Returns { count, dividends: [{ symbol, company, sector, payout, announcedAt, bookClosure }] }
export async function fetchDividends() {
  const res = await fetch(`${API_URL}/api/calendar/dividends`);
  if (!res.ok) throw new Error(`dividends ${res.status}`);
  return await res.json();
}

// GET /api/calendar/ipo  (PSX listed-companies / listings table)
// Returns { count, listings: [{ symbol, company, sector, clearingType, shares, freeFloat, listedIn }] }
export async function fetchListings() {
  const res = await fetch(`${API_URL}/api/calendar/ipo`);
  if (!res.ok) throw new Error(`listings ${res.status}`);
  return await res.json();
}
