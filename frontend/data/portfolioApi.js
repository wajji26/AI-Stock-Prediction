import { API_URL } from "../config/config";
// however you store token – context / AsyncStorage etc.

export async function createPosition(payload, token) {
  const res = await fetch(`${API_URL}/api/portfolio`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // required by protect middleware
    },
    body: JSON.stringify({
      stocks: [payload], // controller expects { stocks: [...] }
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create portfolio");
  }

  return res.json(); // { message, portfolio }
}
