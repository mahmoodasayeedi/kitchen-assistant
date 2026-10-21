import { useState } from "react";
import "./App.css";
import Landing from "./pages/Landing";
import Recipes from "./pages/Recipes";
import Chat from "./pages/Chat";
import Planner from "./pages/Planner";
import Reviewer from "./pages/Reviewer";

const TABS = [
  { id: "recipes", icon: "🍽️", label: "Recipe Collection" },
  { id: "chat", icon: "✨", label: "AI Recipe Finder" },
  { id: "planner", icon: "📅", label: "AI Meal Planner" },
  { id: "reviewer", icon: "📸", label: "AI Dish Reviewer" },
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
              <span className="side-icon">🍳</span>
              <span className="side-label">Kitchen Home</span>
            </button>
            <nav>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`side-item ${view === tab.id ? "active" : ""}`}
                  onClick={() => setView(tab.id)}
                  title={tab.label}
                >
                  <span className="side-icon">{tab.icon}</span>
                  <span className="side-label">{tab.label}</span>
                </button>
              ))}
            </nav>
            <p className="side-foot">No sign-in needed.</p>
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
