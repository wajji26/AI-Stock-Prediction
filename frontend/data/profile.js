// data/profile.js
import { API_URL } from "../config/config";

// const SAMPLE_PROFILE = {
//   emailMasked: "user***@****",
//   uid: "UID: 506397710",
//   region: "StockPort Global",
//   verified: false,
//   tier: "Standard",
//   recentlyUsed: [
//     { id: "watchlist", label: "Watchlist", icon: "eye-outline" },
//     { id: "deposits", label: "Deposits", icon: "card-outline" },
//     { id: "reports", label: "Reports", icon: "document-text-outline" },
//   ],
// };

export async function fetchProfile(token, router) {
  try {
    const res = await fetch(`${API_URL}/api/users/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      router.replace("/login");
      return;
    }

    // const text = await res.text();
    // console.log("STATUS:", res.status);
    // console.log("CONTENT-TYPE:", res.headers.get("content-type"));
    // console.log("BODY (first 400 chars):", text.slice(0, 400));

    return await res.json();
  } catch (err) {
    console.log("Network error:", err);
  }
}
