// ===============================
// 🔧 CENTRAL API CONFIG
// ===============================

export const BASE = "https://latestvoice.vercel.app/api";

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  return res.json();
}