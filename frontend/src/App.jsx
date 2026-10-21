import { useState } from "react";
import { CalendarDays, Camera, ChefHat, Sparkles, UtensilsCrossed } from "lucide-react";
import "./App.css";
import Landing from "./pages/Landing";
import Recipes from "./pages/Recipes";
import Chat from "./pages/Chat";
import Planner from "./pages/Planner";
import Reviewer from "./pages/Reviewer";

const GROUPS = [
  {
    title: "Core",
    tabs: [{ id: "recipes", Icon: UtensilsCrossed, label: "All recipes" }],
  },
  {
    title: "AI Utilities",
    tabs: [
      { id: "chat", Icon: Sparkles, label: "AI Recipe Generator" },
      { id: "planner", Icon: CalendarDays, label: "AI Meal Planner" },
      { id: "reviewer", Icon: Camera, label: "AI Dish Reviewer" },
    ],
  },
];

export default function App() {
  const [view, setView] = useState("landing");

  return (
    <>
      {view === "landing" && <Landing onStart={() => setView("chat")} />}

      <div hidden={view === "landing"}>
        <div className="layout">
          <aside className="sidebar">
            <button className="side-item brand" onClick={() => setView("landing")}>
              <span className="brand-mark"><ChefHat size={20} strokeWidth={2} /></span>
              <span className="side-label">Kitchen Assistant</span>
            </button>

            <nav>
              {GROUPS.map((group) => (
                <div className="side-group-block" key={group.title}>
                  <div className="side-group">{group.title}</div>
                  {group.tabs.map(({ id, Icon, label }) => (
                    <button
                      key={id}
                      className={`side-item ${view === id ? "active" : ""}`}
                      onClick={() => setView(id)}
                      title={label}
                    >
                      <Icon className="side-svg" size={20} strokeWidth={1.8} />
                      <span className="side-label">{label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </nav>

            <div className="guest-card">
              <span className="live" aria-hidden="true">
                <span className="live-ping" />
                <span className="live-dot" />
              </span>
              <div>
                <div className="guest-title">Guest Mode</div>
                <div className="guest-sub">No sign-in needed</div>
              </div>
            </div>
          </aside>

          <main className="main">
            <div hidden={view !== "recipes"}><Recipes /></div>
            <div hidden={view !== "chat"}><Chat /></div>
            <div hidden={view !== "planner"}><Planner /></div>
            <div hidden={view !== "reviewer"}><Reviewer /></div>
          </main>
        </div>
      </div>
    </>
  );
}
