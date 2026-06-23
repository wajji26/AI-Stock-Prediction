// data/news.js

// const SAMPLE_NEWS = [
//   {
//     id: 1,
//     title: "[Year-end edition] Daily Treasure Hunt: The Ultimate Gold Mine",
//     date: "Nov 3, 2025",
//     status: "Ongoing",
//     image: "https://i.ibb.co/2kPzdvT/goldmine.jpg", // replace with your own placeholder
//   },
//   {
//     id: 2,
//     title: "Hot Tokens Trading Arena: Trade to share up to 95,000 USDT!",
//     date: "Oct 30, 2025",
//     status: "Ongoing",
//     image: "https://i.ibb.co/hBZ7b7g/trophy.jpg",
//   },
//   {
//     id: 3,
//     title: "RLUSD Holder Fiesta: Grab a share of the 29,000 USDT Prize Pool",
//     date: "Nov 12, 2025",
//     status: "Ongoing",
//     image: "https://i.ibb.co/tb3dNFb/ripple.jpg",
//   },
//   {
//     id: 4,
//     title: "[Year-end edition] Daily Treasure Hunt: The Ultimate Gold Mine",
//     date: "Nov 3, 2025",
//     status: "Ongoing",
//     image: "https://i.ibb.co/2kPzdvT/goldmine.jpg", // replace with your own placeholder
//   },
//   {
//     id: 5,
//     title: "Hot Tokens Trading Arena: Trade to share up to 95,000 USDT!",
//     date: "Oct 30, 2025",
//     status: "Ongoing",
//     image: "https://i.ibb.co/hBZ7b7g/trophy.jpg",
//   },
//   {
//     id: 6,
//     title: "RLUSD Holder Fiesta: Grab a share of the 29,000 USDT Prize Pool",
//     date: "Nov 12, 2025",
//     status: "Ongoing",
//     image: "https://i.ibb.co/tb3dNFb/ripple.jpg",
//   },
// ];
import { API_URL } from "../config/config";

export async function fetchNews(token, symbol) {
  const qs = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
  const res = await fetch(`${API_URL}/api/news${qs}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return await res.json();
}
