import { useEffect, useRef, useState } from "react";
import { PERSONAS, scores, shareText } from "../engine.ts";
import type { Match } from "../engine.ts";
import { Icon } from "./Art.tsx";
export function ShareCard({ match }: { match: Match }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [message, setMessage] = useState("");
  const [manual, setManual] = useState(false);
  const score = scores(match),
    text = shareText(match);
  const title =
    match.outcome === "you"
      ? "Broke the Brain."
      : match.outcome === "brain"
        ? "Brain holds."
        : "Great minds. Same calls.";
  useEffect(() => {
    let cancelled = false;
    const draw = async () => {
      await document.fonts.ready;
      if (cancelled) return;
      const ctx = canvas.current?.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#141619";
      ctx.fillRect(0, 0, 1200, 630);
      ctx.fillStyle = "#20261b";
      ctx.beginPath();
      ctx.arc(1040, 320, 270, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#c6ef86";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(1030, 320, 208, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(1030 + Math.cos(a) * 195, 320 + Math.sin(a) * 195);
        ctx.lineTo(1030 + Math.cos(a) * 220, 320 + Math.sin(a) * 220);
        ctx.stroke();
      }
      ctx.fillStyle = "#f4f1e9";
      ctx.font = '700 30px "Space Grotesk",sans-serif';
      ctx.fillText("Round Prophet", 64, 80);
      ctx.fillStyle = "#c6ef86";
      ctx.font = '700 64px "Space Grotesk",sans-serif';
      ctx.fillText(title, 64, 205, 1050);
      ctx.fillStyle = "#f4f1e9";
      ctx.font = '700 124px "Space Grotesk",sans-serif';
      ctx.fillText(`${score.you} : ${score.brain}`, 64, 365);
      ctx.font = '400 28px "DM Sans",sans-serif';
      ctx.fillText(
        `You vs Wheel Brain · ${PERSONAS.find((p) => p.id === match.persona)!.name}`,
        64,
        430,
      );
      ctx.fillStyle = "#b2b5ad";
      ctx.font = '400 24px "DM Sans",sans-serif';
      const last = match.legs.filter((l) => l.result).at(-1)!.round;
      ctx.fillText(`Rounds ${match.legs[0].round}–${last}`, 64, 478, 1060);
      ctx.fillStyle = "#626953";
      ctx.fillRect(64, 526, 1072, 1);
      ctx.fillStyle = "#b2b5ad";
      ctx.font = '400 21px "DM Sans",sans-serif';
      ctx.fillText(
        "Community game · real wheel data · no real-money betting",
        64,
        574,
      );
    };
    void draw();
    return () => {
      cancelled = true;
    };
  }, [match, title, score.you, score.brain]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Match text copied.");
    } catch {
      setManual(true);
      setMessage("Copy the match text below.");
    }
  };
  const download = () => {
    try {
      const link = document.createElement("a");
      link.download = `round-prophet-${match.legs[0].round}.png`;
      link.href = canvas.current!.toDataURL("image/png");
      link.click();
      setMessage("Share card downloaded.");
    } catch {
      setMessage("Unable to export the card. Copy your match text instead.");
    }
  };
  return (
    <div className="share-result">
      <canvas
        ref={canvas}
        width="1200"
        height="630"
        aria-label={`Share card: ${text}`}
        role="img"
      />
      <div className="share-actions">
        <button className="primary" onClick={download}>
          <Icon name="download" />
          Save share card
        </button>
        <button className="secondary" onClick={() => void copy()}>
          <Icon name="copy" />
          Copy match text
        </button>
      </div>
      {manual && (
        <label className="copy-fallback">
          Match text
          <textarea readOnly value={text} onFocus={(e) => e.target.select()} />
        </label>
      )}
      <p className="feedback" role="status">
        {message}
      </p>
    </div>
  );
}
