import { useState } from "react";
import { CHANNEL_NAME, CHANNEL_URL, VIDEOS } from "../videos";

export default function Channel() {
  const [playing, setPlaying] = useState(null);

  return (
    <div className="chatpage">
      <h1 className="hero-title">My Recipes 🎥</h1>
      <p className="sub">Recipes I cooked and filmed myself. Watch them here or on YouTube.</p>
      <a className="ytbtn" href={CHANNEL_URL} target="_blank" rel="noreferrer">
        Visit {CHANNEL_NAME} on YouTube
      </a>

      <div className="videogrid">
        {VIDEOS.map((v) => (
          <div className="videocard" key={v.id}>
            {playing === v.id ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1`}
                title={v.title}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <button className="thumb" onClick={() => setPlaying(v.id)} aria-label={`Play ${v.title}`}>
                <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt={v.title} loading="lazy" />
                <span className="playicon">▶</span>
              </button>
            )}
            <div className="vbody">
              <div className="vtitle">{v.title}</div>
              <a href={`https://youtu.be/${v.id}`} target="_blank" rel="noreferrer">Open on YouTube</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}