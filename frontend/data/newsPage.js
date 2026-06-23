import { API_URL } from "../config/config";

export async function fetchNewsDetails(token, id) {
  const res = await fetch(`${API_URL}/api/news/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return await res.json();
}
