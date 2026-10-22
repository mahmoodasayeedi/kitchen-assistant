import { CHANNEL_NAME, CHANNEL_URL } from "./videos";

export default function CreatorAvatar() {
  return (
    <a className="hero-avatar" href={CHANNEL_URL} target="_blank" rel="noreferrer" title="Watch on YouTube">
      <img src="/channel.png" alt={CHANNEL_NAME} />
      <span className="hero-avatar-name">{CHANNEL_NAME}</span>
    </a>
  );
}