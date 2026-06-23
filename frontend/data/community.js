// data/community.js — client for the community ideas API (/api/ideas)
import { API_URL } from "../config/config";

function authHeaders(token, json = false) {
  const h = {};
  if (json) h["Content-Type"] = "application/json";
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function asJson(res, fallbackMsg) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || fallbackMsg);
  }
  return res.json();
}

// GET /api/ideas?sort=popular|recent&filter=all|editors
// token is optional — when present, each idea includes boostedByMe.
export async function fetchIdeas({ sort = "popular", filter = "all", token } = {}) {
  const qs = `?sort=${sort}&filter=${filter}`;
  const res = await fetch(`${API_URL}/api/ideas${qs}`, {
    headers: authHeaders(token),
  });
  return asJson(res, "Failed to load ideas");
}

export async function fetchIdea(id, token) {
  const res = await fetch(`${API_URL}/api/ideas/${id}`, {
    headers: authHeaders(token),
  });
  return asJson(res, "Failed to load idea");
}

export async function createIdea(payload, token) {
  const res = await fetch(`${API_URL}/api/ideas`, {
    method: "POST",
    headers: authHeaders(token, true),
    body: JSON.stringify(payload),
  });
  return asJson(res, "Failed to post idea");
}

export async function boostIdea(id, token) {
  const res = await fetch(`${API_URL}/api/ideas/${id}/boost`, {
    method: "POST",
    headers: authHeaders(token, true),
  });
  return asJson(res, "Failed to boost");
}

export async function addComment(id, text, token) {
  const res = await fetch(`${API_URL}/api/ideas/${id}/comments`, {
    method: "POST",
    headers: authHeaders(token, true),
    body: JSON.stringify({ text }),
  });
  return asJson(res, "Failed to comment");
}

export async function deleteIdea(id, token) {
  const res = await fetch(`${API_URL}/api/ideas/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  return asJson(res, "Failed to delete");
}

// Live chart data for a symbol's card thumbnail (closing prices).
export async function fetchSparkline(symbol) {
  const res = await fetch(
    `${API_URL}/api/stocks/psx/${encodeURIComponent(symbol)}/history?range=1mo&interval=1d`,
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.history || [])
    .map((h) => Number(h.close))
    .filter((n) => Number.isFinite(n));
}

// "3h ago" / "Jun 21" style relative time
export function timeAgo(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const d = new Date(iso);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}
