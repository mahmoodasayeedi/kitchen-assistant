import { useEffect, useRef, useState } from "react";
import { API, errorText, formatTime } from "../api";
import RecipeModal from "../RecipeModal";

export default function Chat() {
  const [ingredients, setIngredients] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [preview, setPreview] = useState(null);
  const [photoNote, setPhotoNote] = useState("");
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [chat, setChat] = useState([]);
  const [draft, setDraft] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState("");
  const chatBox = useRef(null);

  useEffect(() => {
    if (chatBox.current) chatBox.current.scrollTop = chatBox.current.scrollHeight;
  }, [chat, loadingChat]);

  async function sendChat(history, ings) {
    setError("");
    setChat(history);
    setLoadingChat(true);
    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-20), ingredients: ings }),
         shown: recipes.map((r) => ({ recipe_id: r.recipe_id, name: r.name })),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(errorText(data, "The assistant could not answer. Please try again."));
        return;
      }
      setChat([...history, { role: "assistant", content: data.reply }]);
      if (data.recipes.length > 0) setRecipes(data.recipes);
    } catch {
      setError("Cannot reach the server. Is the backend running?");
    } finally {
      setLoadingChat(false);
    }
  }

  async function uploadPhoto(e) {
    const file = e.target.files[0];
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
        setPhotoNote(data.reason);
        return;
      }
      setIngredients(data.ingredients);
      setRecipes([]);
      sendChat(
        [{ role: "user", content: "I uploaded a photo of my fridge. What can I cook?" }],
        data.ingredients
      );
    } catch {
      setError("Cannot reach the server. Is the backend running?");
    } finally {
      setLoadingPhoto(false);
    }
  }

 function addItem() {
  const items = newItem
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length === 0) return;
  const next = [...ingredients];
  for (const item of items) {
    if (!next.some((i) => i.toLowerCase() === item.toLowerCase())) next.push(item);
  }
  setIngredients(next);
  if (chat.length === 0 && next.length > 0) {
  sendChat(
    [{ role: "user", content: `I have: ${next.join(", ")}. What can I cook?` }],
    next
  );
}
  setNewItem("");
}

  function removeItem(index) {
    setIngredients(ingredients.filter((_, i) => i !== index));
  }

  function submitMessage() {
    const text = draft.trim();
    if (!text || loadingChat) return;
    setDraft("");
    sendChat([...chat, { role: "user", content: text }], ingredients);
  }

  const showFridge = preview || ingredients.length > 0 || photoNote || loadingPhoto;

  return (
    <div>
      <h1>My AI chat assistant</h1>

      <div className="chatlayout">
      <div className="chatcol">
      <div className="card chatcard">
        {showFridge && (
          <div className="fridge">
            {preview && <img className="preview small-preview" src={preview} alt="Your upload" />}
            {loadingPhoto && <p className="small">Great! Let me take a look at your ingredients.</p>}
            {photoNote && <div className="note">{photoNote} I couldn't see the ingredients clearly. Could you try another photo or enter your ingredients manually?</div>}
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
                placeholder="Add or fix an ingredient"
              />
              <button className="primary" onClick={addItem}>Add</button>
            </div>
          </div>
        )}

        <div className="chat" ref={chatBox}>
          <div className="bubble assistant">
          Hi, chef! 👋 Ready to turn what’s in your kitchen into something delicious? 🍳<br></br>
          📎 Upload a photo of your fridge, pantry, or ingredients, and I’ll help you discover what you can cook with what you already have.
          </div>
          {chat.map((m, i) => (
            <div key={i} className={`bubble ${m.role}`}>{m.content}</div>
          ))}
          {loadingChat && <div className="bubble assistant">Thinking...</div>}
        </div>

        <div className="row">
          <label className="clip" title="Upload a fridge or food photo">
            📎
            <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} />
          </label>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitMessage()}
            placeholder="Type your message, for example: 30 minutes, beginner, no restrictions"
          />
          <button className="primary" onClick={submitMessage} disabled={loadingChat}>Send</button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      </div>

      <aside className="results">
        <h2>Recipes for you</h2>
        {recipes.length === 0 && <p className="small">Recipes the assistant suggests will appear here.</p>}
      {recipes.map((r) => (
        <div className="card result" key={r.recipe_id}>
          {r.image_url ? (
            <img className="thumb" src={r.image_url} alt={r.name} referrerPolicy="no-referrer" />
          ) : (
            <div className="thumb noimg">🍽 {r.category || "Recipe"}</div>
          )}
          <div>
            <strong>{r.name}</strong>
            <div className="tags">
              {r.can_cook_now && <span className="tag ok">You can cook this now</span>}
              {r.category && <span className="tag">{r.category}</span>}
              <span className="tag">⏱ {formatTime(r.total_minutes)}</span>
              {r.calories != null && <span className="tag">{Math.round(r.calories)} kcal</span>}
            </div>
            <p className="small have">You have: {r.have.length ? r.have.join(", ") : "nothing from this recipe"}</p>
            {r.to_buy.length > 0 && <p className="small buy">To buy: {r.to_buy.join(", ")}</p>}
            <button className="link" onClick={() => setOpenId(r.recipe_id)}>View recipe</button>
          </div>
        </div>
      ))}
      </aside>
      </div>

      {openId && <RecipeModal key={openId} id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
