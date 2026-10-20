const IMAGES = [
  { src: "/food/dish1.jpg", alt: "Cooked dish 1" },
  { src: "/food/dish2.jpg", alt: "Cooked dish 2" },
  { src: "/food/dish3.jpg", alt: "Cooked dish 3" },
  { src: "/food/dish4.jpg", alt: "Cooked dish 4" },
  { src: "/food/dish5.jpg", alt: "Cooked dish 5" },
  { src: "/food/dish6.jpg", alt: "Cooked dish 6" },
  { src: "/food/dish7.jpg", alt: "Cooked dish 7" },
  { src: "/food/dish8.jpg", alt: "Cooked dish 8" },
];

export default function Landing({ onStart }) {
  const loop = [...IMAGES, ...IMAGES];

  return (
    <div className="landing">
      <img
        className="banner"
        src="/food/banner.jpg"
        alt="Fresh ingredients on a kitchen counter"
        onError={(e) => (e.currentTarget.style.display = "none")}
      />

      <header className="landing-head">
        <h1>From Fridge to Fabulous!</h1>
        <p className="tagline">Your ingredients. Your preferences. Your next delicious meal.</p>
        <p className="about">
          Upload a photo of your fridge, discover personalised recipes, and cook something amazing
          with help from AI.
        </p>
      </header>

      <div className="carousel">
        <div className="track">
          {loop.map((img, i) => (
            <img
              key={i}
              className="slide"
              src={img.src}
              alt={i < IMAGES.length ? img.alt : ""}
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          ))}
        </div>
      </div>

      <button className="primary start" onClick={onStart}>Let's Get Cooking! →</button>
      <p className="credits">Free to explore · No sign-up required</p>
    </div>
  );
}
