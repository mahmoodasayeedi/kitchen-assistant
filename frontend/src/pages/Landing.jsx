import { useEffect, useRef, useState } from "react";

const IMAGES = [
  { src: "/food/dish1.jpg", alt: "Cooked dish 1" },
  { src: "/food/dish2.jpg", alt: "Cooked dish 2" },
  { src: "/food/dish3.jpg", alt: "Cooked dish 3" },
  { src: "/food/dish4.jpg", alt: "Cooked dish 4" },
  { src: "/food/dish5.jpg", alt: "Cooked dish 5" },
  { src: "/food/dish6.jpg", alt: "Cooked dish 6" },
  { src: "/food/dish7.jpg", alt: "Cooked dish 7" },
  { src: "/food/dish8.jpg", alt: "Cooked dish 8" },
  { src: "/food/dish9.jpg", alt: "Cooked dish 9" },
];

const N = IMAGES.length;
const AUTOPLAY_MS = 3500;
const DRAG_THRESHOLD = 50;

// Shortest signed distance (in panels) from the active panel, so the wall wraps around.
function offsetOf(index, active) {
  let d = index - active;
  if (d > N / 2) d -= N;
  if (d < -N / 2) d += N;
  return d;
}

function ConcaveWall() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const startX = useRef(null);

  const next = () => setActive((a) => (a + 1) % N);
  const prev = () => setActive((a) => (a - 1 + N) % N);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (paused || reduce) return;
    const id = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused]);

  function onPointerDown(e) {
    startX.current = e.clientX;
    setPaused(true);
  }

  function onPointerUp(e) {
    if (startX.current !== null) {
      const dx = e.clientX - startX.current;
      if (dx > DRAG_THRESHOLD) prev();
      else if (dx < -DRAG_THRESHOLD) next();
    }
    startX.current = null;
  }

  function onKeyDown(e) {
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  }

  return (
    <div
      className="wall"
      tabIndex={0}
      role="group"
      aria-label="Photos of cooked dishes"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false);
        startX.current = null;
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
    >
      <div className="stage">
        {IMAGES.map((img, i) => {
          const d = offsetOf(i, active);
          const abs = Math.abs(d);
          return (
            <img
              key={img.src}
              className="panel"
              src={img.src}
              alt={img.alt}
              draggable={false}
              style={{
                "--d": d,
                opacity: Math.max(0, 1 - abs * 0.32),
                zIndex: 100 - Math.round(abs),
                filter: `brightness(${1 - Math.min(abs, 3) * 0.12})`,
              }}
              onError={(e) => (e.currentTarget.style.visibility = "hidden")}
            />
          );
        })}
      </div>
      <button className="wall-btn left" onClick={prev} aria-label="Previous photo">‹</button>
      <button className="wall-btn right" onClick={next} aria-label="Next photo">›</button>
    </div>
  );
}

export default function Landing({ onStart }) {
  return (
    <div className="landing">
      <header className="landing-head">
        <h1 aria-label="From Fridge to Fabulous!">
          {["From", "Fridge", "to", "Fabulous!"].map((word, i) => (
            <span key={word} className="word" style={{ animationDelay: `${i * 0.18}s` }} aria-hidden="true">
              {word}
            </span>
          ))}
        </h1>
        <p className="tagline">Your ingredients. Your preferences. Your next delicious meal.</p>
        <p className="about">
          Upload a photo of your fridge, discover personalised recipes, and cook something amazing
          with help from AI.
        </p>
      </header>

      <ConcaveWall />

      <button className="primary start" onClick={onStart}>Let's Get Cooking! →</button>
      <p className="credits">Free to explore · No sign-up required</p>
    </div>
  );
}
