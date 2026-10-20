import { useState } from "react";
import "./App.css";
import Landing from "./pages/Landing";
import Recipes from "./pages/Recipes";
import Chat from "./pages/Chat";

export default function App() {
  const [view, setView] = useState("landing");

  return (
    <>
      {view === "landing" && <Landing onStart={() => setView("chat")} />}

      <div hidden={view === "landing"}>
        <div className="layout">
          <aside className="sidebar">
            <button className="brand" onClick={() => setView("landing")}>🍳 Kitchen Assistant</button>
            <nav>
              <button className={`nav ${view === "recipes" ? "active" : ""}`} onClick={() => setView("recipes")}>
                All recipes
              </button>
              <button className={`nav ${view === "chat" ? "active" : ""}`} onClick={() => setView("chat")}>
                My AI chat assistant
              </button>
            </nav>
            <p className="side-note">No sign-in needed.</p>
          </aside>
          <main className="main">
            <div hidden={view !== "recipes"}><Recipes /></div>
            <div hidden={view !== "chat"}><Chat /></div>
          </main>
        </div>
      </div>
    </>
  );
}
