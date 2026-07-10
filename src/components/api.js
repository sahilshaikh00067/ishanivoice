// ===============================
// 🔧 CENTRAL API CONFIG
// ===============================

export const BASE = "http://127.0.0.1:8000/api";

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  return res.json();
}