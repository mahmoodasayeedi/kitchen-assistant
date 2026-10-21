import { useEffect, useRef, useState } from "react";
import { API, errorText, formatTime } from "../api";

const SUGGESTIONS = [
  "Plan breakfast only for 3 days.",
  "A 5-day dinner plan that is budget-friendly.",
  "Full week, all three meals, vegetarian.",
];

const MEAL_LABEL = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };

// The server keeps nothing, so a short summary of the plan travels with the history.
// That lets the assistant edit it when the user says "swap Day 2 dinner".
function historyFor(messages) {
  return messages
    .map((m) => {
      let content = m.content;
      if (m.plan) {
        const summary = m.plan.days
          .map((d) => `Day ${d.day}: ` + d.meals.map((x) => `${x.type} ${x.title}`).join("; "))
          .join(" | ");
        content += ` [Plan shown: ${summary}]`;
      }
      return { role: m.role, content: content.slice(0, 1900) };
    })
    .slice(-20);
}

function PlanView({ plan }) {
  return (
    <div className="plan">
      <div className="plan-head">
        <h3>{plan.title}</h3>
        <button className="primary" onClick={() => window.print()}>🖨 Print plan</button>
      </div>
      {plan.days.map((d) => (
        <div className="dayblock" key={d.day}>
          <div className="daytitle">Day {d.day}</div>
          <div className="daymeals">
            {d.meals.map((m, i) => (
              <div className={`meal ${m.type}`} key={i}>
                <div className="mealtype">{MEAL_LABEL[m.type] || m.type}</div>
                <div className="mealname">{m.title}</div>
                <div className="mealdesc">{m.description}</div>
                <div className="mealtime">⏱ {formatTime(m.total_minutes)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <p className="small">AI-generated plan. Check ingredients and allergies before cooking.</p>
    </div>
  );
}

export default function Planner() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatBox = useRef(null);

  useEffect(() => {
    if (chatBox.current) chatBox.current.scrollTop = chatBox.current.scrollHeight;
  }, [messages, loading]);

  async function send(history) {
    setError("");
    setMessages(history);
    setLoading(true);
    try {
      const res = await fetch(`${API}/meal-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyFor(history), ingredients: [] }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(errorText(data, "The planner could not answer. Please try again."));
        return;
      }
      setMessages([...history, { role: "assistant", content: data.reply, plan: data.plan }]);
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
    send([...messages, { role: "user", content: clean }]);
  }

  const latest = [...messages].reverse().find((m) => m.role === "assistant" && m.plan);

  return (
    <div className="chatpage">
      <h1 className="hero-title">Plan your week, the easy way 🗓️</h1>
      <p className="sub">
        Tell me how many days and which meals you need, plus any dietary wishes, and I'll build your meal plan.
      </p>

      <div className="chatlayout">
        <div className="chatcol">
          <div className="card chatcard">
            <div className="chat" ref={chatBox}>
              {messages.length === 0 && (
                <div className="welcome">
                  <h2>Hi, chef! 👋 Let's plan your meals.</h2>
                  <p className="small">How many days should I plan, and which meals: breakfast, lunch, dinner?</p>
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
                    {m.plan && <p className="small recipe-hint">👉 Your plan is ready on the right.</p>}
                  </div>
                )
              )}
              {loading && <div className="bubble assistant">Planning...</div>}
            </div>
            <div className="row">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit(draft)}
                placeholder="For example: dinners for 4 days, no fish"
              />
              <button className="primary" onClick={() => submit(draft)} disabled={loading}>Send</button>
            </div>
          </div>
          {error && <div className="error">{error}</div>}
        </div>

        <aside className="recipepanel">
          {latest ? (
            <PlanView plan={latest.plan} />
          ) : (
            <div className="panel-empty">
              <div className="panel-emoji">🗓️</div>
              <p>Your meal plan will appear here.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
