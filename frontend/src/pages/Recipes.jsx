import { useEffect, useState } from "react";
import { API, errorText, formatTime } from "../api";
import RecipeModal from "../RecipeModal";

const LIMIT = 24;

export default function Recipes() {
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");

  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [filters, setFilters] = useState({ q: "", category: "", maxMinutes: "", withPhoto: true });

  useEffect(() => {
    fetch(`${API}/categories`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (filters.q) params.set("q", filters.q);
      if (filters.withPhoto) params.set("with_photo", "true");
      if (filters.category) params.set("category", filters.category);
      if (filters.maxMinutes) params.set("max_minutes", filters.maxMinutes);
      try {
        const res = await fetch(`${API}/recipes?${params}`);
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) setError(errorText(body, "Could not load recipes."));
        else setData(body);
      } catch {
        if (!cancelled) setError("Cannot reach the server. Is the backend running?");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [filters, page]);

  function applyFilters(change) {
    setFilters({ ...filters, ...change });
    setPage(1);
  }

  const pages = Math.max(1, Math.ceil(data.total / LIMIT));

  return (
    <div>
      <h1>All recipes</h1>
      <p className="sub">Browse real recipes. Click one to see the full steps.</p>

      <div className="filters">
        <input
          className="grow"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyFilters({ q: query.trim() })}
          placeholder="Search by name, then press Enter"
        />
        <select value={filters.category} onChange={(e) => applyFilters({ category: e.target.value })}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={filters.maxMinutes} onChange={(e) => applyFilters({ maxMinutes: e.target.value })}>
          <option value="">Any time</option>
          <option value="15">Up to 15 min</option>
          <option value="30">Up to 30 min</option>
          <option value="45">Up to 45 min</option>
          <option value="60">Up to 1 hour</option>
        </select>
        <label className="small">
  <input type="checkbox" checked={filters.withPhoto}
    onChange={(e) => applyFilters({ withPhoto: e.target.checked })} /> Only with photos
</label>
      </div>

      {error && <div className="error">{error}</div>}
      {loading && <p className="small">Loading recipes...</p>}
      {!loading && !error && data.items.length === 0 && <p>No recipes match these filters.</p>}

      <div className="grid">
        {data.items.map((r) => (
          <button className="rcard" key={r.recipe_id} onClick={() => setOpenId(r.recipe_id)}>
            {r.image_url ? (
              <img src={r.image_url} alt={r.name} loading="lazy" referrerPolicy="no-referrer" />
            ) : (
              <div className="noimg">🍽 {r.category || "Recipe"}</div>
            )}
            <div className="rbody">
              <div className="rname">{r.name}</div>
              <div className="meta">
                {r.category} · ⏱ {formatTime(r.total_minutes)}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="pager">
        <button className="primary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page} of {pages} ({data.total} recipes)</span>
        <button className="primary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
      </div>

      {openId && <RecipeModal key={openId} id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
