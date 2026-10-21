import { useEffect, useState } from "react";
import { API, errorText } from "../api";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

const SUB_LABELS = [
  ["presentation", "Presentation"],
  ["recipe_match", "Recipe Match"],
  ["color_appearance", "Color & Appearance"],
  ["plating_portion", "Plating & Portion"],
  ["ingredients", "Ingredients"],
];

function tone(score) {
  if (score >= 8) return "good";
  if (score >= 5) return "ok";
  return "low";
}

function ReviewView({ review }) {
  const pct = Math.round(review.score * 10);
  return (
    <div className="review">
      <div className="stephead"><span className="stepnum">2</span> AI analyzes and gives feedback</div>

      <div className="review-grid">
        <div className="scorecol">
          <div className={`ring ${tone(review.score)}`} style={{ "--pct": `${pct}%` }}>
            <div className="ring-inner">
              <span className="ring-num">{review.score}</span>
              <span className="ring-of">/10</span>
            </div>
          </div>
          <div className="ring-label">Overall Score</div>
          <div className={`ring-headline ${tone(review.score)}`}>{review.headline || "Nice work!"}</div>
        </div>

        <div className="subscores">
          <div className="subtitle">Sub scores</div>
          {SUB_LABELS.map(([key, label]) => {
            const v = review.sub_scores[key];
            return (
              <div className="subrow" key={key}>
                <span className="sublabel">{label}</span>
                <div className="bar"><div className={`barfill ${tone(v)}`} style={{ width: `${v * 10}%` }} /></div>
                <span className="subval">{v}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="feedback-grid">
        <div className="fbox strengths">
          <h4>✅ Strengths</h4>
          <ul>{review.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
        <div className="fbox improve">
          <h4>💡 Improvements</h4>
          <ul>{review.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      </div>

      <div className="stephead"><span className="stepnum">3</span> Tips for next time</div>
      <div className="tipsrow">
        <ul>{review.tips.map((s, i) => <li key={i}>{s}</li>)}</ul>
        <div className="disclaimer">
          This review is based on appearance and recipe match only. We can't judge taste or food
          safety, so check meat, poultry and eggs with a thermometer.
        </div>
      </div>
    </div>
  );
}

export default function Reviewer() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dish, setDish] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function pick(f) {
    setReview(null);
    setNote("");
    setError("");
    if (!f) return;
    if (!ALLOWED.includes(f.type)) {
      setError("Please choose a JPEG, PNG or WebP image.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("That image is too large (max 5 MB).");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function runReview() {
    if (!file || loading) return;
    setError("");
    setNote("");
    setReview(null);
    setLoading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("dish", dish.trim().slice(0, 100));
      body.append("notes", notes.trim().slice(0, 300));
      const res = await fetch(`${API}/review-dish`, { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(errorText(data, "Could not review the photo. Please try again."));
        return;
      }
      if (!data.is_valid_food_photo) {
        setNote(data.reason || "I couldn't see a prepared dish in that photo. Try another one.");
        return;
      }
      setReview(data);
    } catch {
      setError("Cannot reach the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chatpage">
      <h1 className="hero-title">How did your dish turn out? 🎉</h1>
      <p className="sub">
        Upload a photo of the dish you cooked and get friendly, honest feedback with tips to make it even better.
      </p>

      <div className="chatlayout">
        <div className="chatcol">
          <div className="card uploadcard">
            <div className="stephead"><span className="stepnum">1</span> Upload your dish photo</div>
            <label
              className="dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pick(e.dataTransfer.files[0]);
              }}
            >
              {preview ? (
                <img className="dish-preview" src={preview} alt="Your dish" />
              ) : (
                <div className="drop-empty">
                  <div className="panel-emoji">📸</div>
                  <strong>Drop a photo here, or click to choose</strong>
                  <span className="small">JPEG, PNG or WebP, up to 5 MB</span>
                </div>
              )}
              <input
                type="file"
                hidden
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  pick(e.target.files[0]);
                  e.target.value = "";
                }}
              />
            </label>

            <label className="fieldlabel">Recipe name (optional)</label>
            <input
              className="dish-input"
              value={dish}
              maxLength={100}
              onChange={(e) => setDish(e.target.value)}
              placeholder="e.g. Mediterranean Veggie Bowl"
            />
            <label className="fieldlabel">Add notes (optional)</label>
            <textarea
              className="dish-input"
              rows={2}
              value={notes}
              maxLength={300}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. I used less oil and cooked for guests"
            />
            <button className="primary review-btn" onClick={runReview} disabled={!file || loading}>
              {loading ? "Reviewing your dish..." : "Review my dish"}
            </button>
            {note && <div className="note">{note}</div>}
            {error && <div className="error">{error}</div>}
          </div>
        </div>

        <aside className="recipepanel">
          {review ? (
            <ReviewView review={review} />
          ) : (
            <div className="panel-empty">
              <div className="panel-emoji">🍽️</div>
              <p>Your review will appear here.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
