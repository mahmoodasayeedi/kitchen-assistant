// Set VITE_API_URL on Vercel; falls back to the local backend.
export const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export function errorText(data, fallback) {
  if (data && typeof data.detail === "string") return data.detail;
  return fallback;
}

export function formatTime(minutes) {
  if (minutes == null) return "Time not listed";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
