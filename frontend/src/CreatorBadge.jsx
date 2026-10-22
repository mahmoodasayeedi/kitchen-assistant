import { CHANNEL_NAME, CHANNEL_URL } from "./videos";

export default function CreatorBadge() {
  return (
    <a className="creator" href={CHANNEL_URL} target="_blank" rel="noreferrer">
      <img className="creator-pic" src="/channel.png" alt={CHANNEL_NAME} />
      <span className="creator-text">
        <span className="creator-by">Recipes by</span>
        <span className="creator-name">{CHANNEL_NAME}</span>
        <span className="creator-sub">Watch on YouTube ▸</span>
      </span>
    </a>
  );
}