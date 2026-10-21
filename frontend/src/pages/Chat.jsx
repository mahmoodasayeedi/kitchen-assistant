import { useEffect, useRef, useState } from "react";
import { API, errorText, formatTime } from "../api";
import RecipeModal from "../RecipeModal";

const SUGGESTIONS = [
  "I'm making pasta with cream sauce for a dinner party. Give me a recipe and some tips.",
  "Do you have any ideas for a healthy breakfast that doesn't require cooking?",
  "Create a quick, budget-friendly dinner I can make in 30 minutes.",
];

// The server keeps nothing, so each request carries the history. For a recipe turn we add a
// short summary so follow-ups like "make it vegetarian" still know which recipe we mean.
function historyFor(messages) {
  return messages
    .map((m) => {
      let content = m.content;
      if (m.recipe) {
        const names = m.recipe.ingredients.map((i) => i.name).join(", ");
        content += ` [Recipe shown: ${m.recipe.title}. Ingredients: ${names}.]`;
      }
      return { role: m.role, content: content.slice(0, 1900) };
    })
    .slice(-20);
}

function RecipeCard({ recipe }) {
  return (
    <div className="airecipe">
      <span className="tag ai-badge">AI-generated · not tested by cooks</span>
      <h3>{recipe.title}</h3>
      <p className="desc">{recipe.description}</p>
      <div className="facts">
        <span>⏱ {formatTime(recipe.total_minutes)}</span>
        <span>👥 Serves {recipe.servings}</span>
        <span>📶 {recipe.difficulty}</span>
      </div>
      <h4>Ingredients</h4>
      <ul>
        {recipe.ingredients.map((ing, i) => (
          <li key={i}>{ing.amount} {ing.name}</li>
        ))}
      </ul>
      <h4>Instructions</h4>
      <ol>
        {recipe.steps.map((step, i) => <li key={i}>{step}</li>)}
      </ol>
      {recipe.tags.length > 0 && (
        <div className="tags">
          {recipe.tags.map((t) => <span className="tag" key={t}>{t}</span>)}
        </div>
      )}
      <p className="small">{recipe.safety_note}</p>
    </div>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [preview, setPreview] = useState(null);
  const [photoNote, setPhotoNote] = useState("");
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const chatBox = useRef(null);

  useEffect(() => {
    if (chatBox.current) chatBox.current.scrollTop = chatBox.current.scrollHeight;
  }, [messages, loading]);

  async function send(history, ings) {
    setError("");
    setMessages(history);
    setLoading(true);
    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyFor(history), ingredients: ings }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(errorText(data, "The assistant could not answer. Please try again."));
        return;
      }
      setMessages([
        ...history,
        { role: "assistant", content: data.reply, recipe: data.recipe, similar: data.similar || [] },
      ]);
    } catch {
      setError("Cannot reach the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  function submit(text) {
    const clean = text.trim();
    if (!clean || loading) return;
    setDraft("");
    send([...messages, { role: "user", content: clean }], ingredients);
  }

  async function uploadPhoto(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setError("");
    setPhotoNote("");
    setLoadingPhoto(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`${API}/extract-ingredients`, { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(errorText(data, "Could not read the photo."));
        return;
      }
      if (!data.is_valid_food_photo) {
        setPhotoNote("I couldn't see the ingredients clearly. Could you try another photo or enter your ingredients manually?");
        return;
      }
      setIngredients(data.ingredients);
      send(
        [
          ...messages,
          {
            role: "user",
            content: `I uploaded a photo of my fridge. I have: ${data.ingredients.join(", ")}. What can I cook?`,
          },
        ],
        data.ingredients
      );
    } catch {
      setError("Cannot reach the server. Is the backend running?");
    } finally {
      setLoadingPhoto(false);
    }
  }

  function addItem() {
    const items = newItem.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    if (items.length === 0) return;
    const next = [...ingredients];
    for (const item of items) {
      if (!next.some((i) => i.toLowerCase() === item.toLowerCase())) next.push(item);
    }
    setIngredients(next);
    setNewItem("");
  }

  function removeItem(index) {
    setIngredients(ingredients.filter((_, i) => i !== index));
  }

  const latest = [...messages].reverse().find((m) => m.role === "assistant" && m.recipe);
  const heroImg = latest && (latest.similar || []).find((r) => r.image_url)?.image_url;

  const showFridge = preview || ingredients.length > 0 || photoNote || loadingPhoto;

  return (
    <div className="chatpage">
      <h1 className="hero-title">Less Food Waste. More “Wow!” 😋</h1>
      <p className="sub">
        Turn the ingredients you already have into delicious possibilities. Upload a photo of your
        fridge or tell us what’s in your kitchen to discover matching recipes.
      </p>

      {showFridge && (
        <div className="card fridge">
          {preview && <img className="preview small-preview" src={preview} alt="Your upload" />}
          {loadingPhoto && <p className="small">Great! Let me take a look at your ingredients.</p>}
          {photoNote && <div className="note">{photoNote}</div>}
          {ingredients.length > 0 && (
            <p className="small">Here's what I found. Please check the list and correct anything that's missing or incorrect.</p>
          )}
          <div className="chips">
            {ingredients.map((item, index) => (
              <span className="chip" key={`${item}-${index}`}>
                {item}
                <button onClick={() => removeItem(index)} aria-label={`Remove ${item}`}>×</button>
              </span>
            ))}
          </div>
          <div className="row">
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              placeholder="Add or fix an ingredient (separate several with commas)"
            />
            <button className="primary" onClick={addItem}>Add</button>
          </div>
        </div>
      )}

      <div className="chatlayout">
      <div className="chatcol">
      <div className="card chatcard">
        <div className="chat" ref={chatBox}>
          {messages.length === 0 && (
            <div className="welcome">
              <h2>Hi, chef! 👋 What shall we cook today?</h2>
              <p className="small">Type your idea, or tap the 📎 button to upload a photo of your fridge or food.</p>
              <div className="suggest">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => submit(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="bubble user">{m.content}</div>
            ) : (
              <div key={i} className="msg">
                <div className="bubble assistant">{m.content}</div>
                {m.recipe && <p className="small recipe-hint">👉 Your recipe is ready on the right.</p>}
              </div>
            )
          )}
          {loading && <div className="bubble assistant">Thinking...</div>}
        </div>

        <div className="row">
          <label className="clip" title="Upload a fridge or food photo">
            📎
            <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} />
          </label>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit(draft)}
            placeholder="Ask me for a recipe, a meal idea, or cooking tips..."
          />
          <button className="primary" onClick={() => submit(draft)} disabled={loading}>Send</button>
        </div>
      </div>
      </div>

      <aside className="recipepanel">
        {!latest ? (
          <div className="panel-empty">
            <div className="panel-emoji">🍳</div>
            <p>Your recipe will appear here.</p>
          </div>
        ) : (
          <>
            {heroImg && (
              <>
                <img className="panel-photo" src={heroImg} alt="A similar dish" referrerPolicy="no-referrer" />
              </>
            )}
            <RecipeCard recipe={latest.recipe} />
            {latest.similar && latest.similar.length > 0 && (
              <div className="panel-similar">
                <h4>Discover recipes you might love...</h4>
                <div className="simrow">
                  {latest.similar.map((r) => (
                    <button className="simcard" key={r.recipe_id} onClick={() => setOpenId(r.recipe_id)}>
                      {r.image_url ? (
                        <img src={r.image_url} alt={r.name} loading="lazy" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="noimg">🍽 {r.category || "Recipe"}</div>
                      )}
                      <div className="simbody">
                        <div className="rname">{r.name}</div>
                        <div className="meta">⏱ {formatTime(r.total_minutes)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </aside>
      </div>

      {error && <div className="error">{error}</div>}
      {openId && <RecipeModal key={openId} id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
