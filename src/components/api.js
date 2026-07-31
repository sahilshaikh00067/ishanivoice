export const BASE = "https://ishanivoice.onrender.com/api";

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  return res.json();
}