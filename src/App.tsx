import { useEffect, useRef, useState } from "react";
import { PERSONAS, distribution, scores } from "./engine.ts";
import type { Band, Match, Persona, Side } from "./engine.ts";
import { useGame } from "./useGame.ts";
import {
  BrainAvatar,
  HumanAvatar,
  Icon,
  WheelMark,
  WheelStage,
} from "./components/Art.tsx";
import { ShareCard } from "./components/ShareCard.tsx";
import "./styles.css";

type View = "arena" | "spectate" | "history";
const initialView = (): View =>
  ["arena", "spectate", "history"].includes(location.hash.slice(1))
    ? (location.hash.slice(1) as View)
    : "arena";
const sideName = (side: Side) => (side === "active" ? "Active" : "Idle");
const bandName = (band: Band) => band[0].toUpperCase() + band.slice(1);
const fmt = (value: string) => BigInt(value).toLocaleString("en-US");
function MatchRows({ match }: { match: Match }) {
  return (
    <ol className="match-rounds">
      {match.legs.map((l, i) => (
        <li key={l.round} className={l.result?.winner ?? ""}>
          <span>
            Round {i + 1}
            <small>#{l.round}</small>
          </span>
          <span>
            {l.result
              ? l.result.missed
                ? "Missed call"
                : l.result.winner === "tie"
                  ? "Tied calls"
                  : l.result.winner === "you"
                    ? "You win"
                    : "Brain wins"
              : match.outcome
                ? "Not needed"
                : l.player
                  ? "Call locked"
                  : "Up next"}
            <small>
              {l.result
                ? `${fmt(l.result.work)} work · ${l.result.work === "0" ? "Idle" : bandName(l.result.band)}`
                : match.outcome
                  ? "Duel ended early"
                  : l.player
                    ? `${sideName(l.player.side)}${l.player.band ? ` · ${bandName(l.player.band)}` : ""}`
                    : "Lock before settlement"}
            </small>
          </span>
          <span className="round-points">
            {l.result ? `${l.result.youPoints} : ${l.result.brainPoints}` : "·"}
          </span>
        </li>
      ))}
    </ol>
  );
}
export default function App() {
  const game = useGame();
  const [view, setView] = useState<View>(initialView);
  const [side, setSide] = useState<Side>("active");
  const [band, setBand] = useState<Band | null>(null);
  const [selectedResult, setSelectedResult] = useState<Match | null>(null);
  const [retrying, setRetrying] = useState(false);
  const help = useRef<HTMLDialogElement>(null);
  const { data, state, save, brain, round, leg } = game;
  const match = save.match;
  const active = !!match && !match.outcome;
  const score = match ? scores(match) : { you: 0, brain: 0 };
  const persona = PERSONAS.find((p) => p.id === game.persona)!;
  const dist =
    (view !== "spectate" ? leg?.distribution : null) ??
    distribution(game.knownRounds.slice(-60));
  const currentResult = match?.outcome ? match : null;
  const lastLeg = match?.legs.filter((l) => l.result).at(-1);
  const announcement = currentResult
    ? `${currentResult.outcome === "you" ? "Broke the Brain. You won." : currentResult.outcome === "brain" ? "Brain holds. You lost." : "The duel is tied."} Final score: You ${score.you}, Brain ${score.brain}.`
    : lastLeg?.result
      ? `Round ${lastLeg.round}: ${lastLeg.result.missed ? "Missed call, Brain wins." : lastLeg.result.winner === "you" ? "You win." : lastLeg.result.winner === "brain" ? "Brain wins." : "Tied calls."} Lock your next prediction before settlement.`
      : active
        ? "Duel started. Your first prediction is locked."
        : "";
  useEffect(() => {
    const handler = () => setView(initialView());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    game.setSpectating(view === "spectate");
  }, [view, game.setSpectating]);
  useEffect(() => {
    setSide(leg?.player?.side ?? "active");
    setBand(leg?.player?.band ?? null);
  }, [round, game.locked]);
  const navigate = (next: View) => {
    location.hash = next;
    setView(next);
    setSelectedResult(null);
  };
  const retry = async () => {
    setRetrying(true);
    try {
      await game.refresh(true);
    } catch {
      /* status explains failure */
    } finally {
      setRetrying(false);
    }
  };
  const settledWait =
    !!leg && !leg.result && !!data && BigInt(leg.round) <= BigInt(data.anchor);
  const last20 = game.knownRounds.slice(-20);
  const completed = save.matches;
  const record = {
    wins: completed.filter((m) => m.outcome === "you").length,
    losses: completed.filter((m) => m.outcome === "brain").length,
    draws: completed.filter((m) => m.outcome === "tie").length,
  };
  const lockLabel = game.busy
    ? "Checking the wheel…"
    : game.locked
      ? "Prediction locked"
      : settledWait
        ? "Verifying settlement…"
        : state === "connecting"
          ? "Connecting to the wheel…"
          : state !== "online"
            ? "Locks paused"
            : active
              ? "Lock this round"
              : "Lock & start duel";
  const firstScreenMessage =
    state === "offline"
      ? "The public feed is offline. Locks and scoring are paused."
      : state === "stale"
        ? "Public data is stale. Locks and scoring resume when it is fresh."
        : null;
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to game
      </a>
      <header className="site-header shell">
        <a className="brand" href="#arena" onClick={() => navigate("arena")}>
          <span className="brand-mark">
            <WheelMark />
          </span>
          <span>
            Round Prophet<span className="brand-sub">Wheel Brain Duel</span>
          </span>
        </a>
        <div className="header-actions">
          <span className="community-label">A Squeekchain community game</span>
          <button
            className="help-button"
            onClick={() => help.current?.showModal()}
            aria-label="How to play"
          >
            <Icon name="help" />
            <span>How to play</span>
          </button>
        </div>
      </header>
      <div className="nav-line">
        <div className="shell nav-inner">
          <nav aria-label="Game modes">
            <button
              aria-current={view === "arena" ? "page" : undefined}
              onClick={() => navigate("arena")}
            >
              <Icon name="bolt" />
              Duel arena
            </button>
            <button
              aria-current={view === "spectate" ? "page" : undefined}
              onClick={() => navigate("spectate")}
            >
              <Icon name="eye" />
              Spectate
            </button>
            <button
              aria-current={view === "history" ? "page" : undefined}
              onClick={() => navigate("history")}
            >
              <Icon name="history" />
              History
            </button>
          </nav>
          <span className={`freshness ${state}`} role="status">
            <span className="status-dot" />
            {state === "connecting"
              ? "Connecting"
              : state[0].toUpperCase() + state.slice(1)}
            <span className="poll-caption"> · public feed</span>
          </span>
        </div>
      </div>
      <main id="main" className="shell">
        <p className="sr-only" role="status" aria-atomic="true">
          {announcement}
        </p>
        <div className="page-heading">
          <div>
            <h1>
              {view === "arena"
                ? "You vs Wheel Brain"
                : view === "spectate"
                  ? "Let the Brain call it."
                  : "Every round tells a story."}
            </h1>
            <p>
              {view === "arena"
                ? "Beat an explainable AI over three real hamster rounds."
                : view === "spectate"
                  ? "Watch the calls as the real wheel settles them."
                  : "Your local matches and the wheel’s proven settlements."}
            </p>
          </div>
          <div className="season-record">
            <span className="record-numbers">
              {record.wins}
              <span> W</span> · {record.losses}
              <span> L</span> · {record.draws}
              <span> D</span>
            </span>
            <span>On this browser · last 30</span>
          </div>
        </div>
        {firstScreenMessage && (
          <div className={`connection-message ${state}`}>
            <span>{firstScreenMessage}</span>
            <button onClick={() => void retry()} disabled={retrying}>
              <Icon name="refresh" />
              {retrying ? "Checking…" : "Retry feed"}
            </button>
          </div>
        )}
        {!game.storageAvailable && (
          <p className="storage-notice" role="status">
            Browser storage is unavailable. Keep this tab open to keep your
            match.
          </p>
        )}
        {view !== "history" ? (
          <div className="game-layout">
            <section
              className="arena"
              aria-label={
                view === "spectate"
                  ? "Brain spectator arena"
                  : "Round duel arena"
              }
            >
              <div className="arena-top">
                <span className="round-identifier">
                  {round ? `Round #${round}` : "Finding the next round"}
                </span>
                <span className="format-label">
                  {view === "spectate" ? "Oracle mode" : "Best of three"}
                  <span className="tiny-divider" />
                  {view === "spectate"
                    ? "Watching"
                    : active
                      ? `${match.legs.filter((l) => l.result).length + 1} of 3`
                      : "First to 2"}
                </span>
                <label className="mobile-persona-control">
                  <span className="sr-only">Fight a Brain</span>
                  <select
                    aria-label="Fight a Brain on mobile"
                    value={game.persona}
                    disabled={active}
                    onChange={(e) => game.setPersona(e.target.value as Persona)}
                  >
                    {PERSONAS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {view === "arena" ? (
                <div
                  className="scoreboard"
                  aria-label={`Match score: You ${score.you}, Brain ${score.brain}`}
                >
                  <div className="fighter you-fighter">
                    <span className="avatar human">
                      <HumanAvatar />
                    </span>
                    <div>
                      <span className="fighter-name">You</span>
                      <span className="fighter-sub">Human instinct</span>
                    </div>
                    <strong className="score">{score.you}</strong>
                  </div>
                  <div className="versus">
                    <span>vs</span>
                    <div className="round-dots" aria-label="Round results">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className={
                            match?.legs[i].result?.winner ??
                            (match?.legs[i].player ? "locked" : "")
                          }
                        >
                          {match?.legs[i].result?.winner === "tie"
                            ? "="
                            : i + 1}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="fighter brain-fighter">
                    <strong className="score">{score.brain}</strong>
                    <div>
                      <span className="fighter-name">Wheel Brain</span>
                      <span className="fighter-sub">{persona.name}</span>
                    </div>
                    <span className="avatar brain">
                      <BrainAvatar />
                    </span>
                  </div>
                </div>
              ) : (
                <div className="spectator-heading">
                  <BrainAvatar />
                  <div>
                    <h2>Wheel Brain is watching.</h2>
                    <p>{persona.name} · transparent by design</p>
                  </div>
                </div>
              )}
              <div
                className={`arena-play-area ${currentResult || view === "spectate" ? "wide-play-area" : ""}`}
              >
                <WheelStage
                  locked={game.locked || view === "spectate"}
                  finished={!!currentResult}
                />
                {currentResult && view === "arena" ? (
                  <div className="result-panel">
                    <h2>
                      {currentResult.outcome === "you"
                        ? "Broke the Brain."
                        : currentResult.outcome === "brain"
                          ? "Brain holds."
                          : "Great minds. Same calls."}
                    </h2>
                    <p>
                      {currentResult.outcome === "you"
                        ? "Human instinct takes this duel. Give it a victory lap."
                        : currentResult.outcome === "brain"
                          ? "The hamster has a worthy accomplice. Try another persona."
                          : "A tied duel. Three real rounds, no invented winner."}
                    </p>
                    <ShareCard match={currentResult} />
                    <button
                      className="secondary rematch"
                      onClick={() => {
                        game.reset();
                        setBand(null);
                      }}
                    >
                      Play another duel
                      <Icon name="arrow" />
                    </button>
                  </div>
                ) : view === "spectate" ? (
                  <div className="spectator-call">
                    <div className="call-label">
                      <Icon name="lock" />
                      Brain’s public call
                    </div>
                    <div className="big-call">
                      {brain ? sideName(brain.side) : "Waiting for history"}
                      {brain?.band && <span> / {bandName(brain.band)}</span>}
                    </div>
                    <p>
                      {brain?.reasoning ??
                        "At least three proven settlements are needed before Brain can make a call."}
                    </p>
                    <span className="muted">
                      {brain
                        ? `${brain.confidence}% model lean · ${state === "online" ? "locked ahead of settlement" : "calls paused"}`
                        : "Reading the public feed"}
                    </span>
                    <button
                      className="secondary"
                      onClick={() => navigate("arena")}
                    >
                      Think you can beat it?
                      <Icon name="arrow" />
                    </button>
                  </div>
                ) : (
                  <div className="prediction-controls">
                    <div className="control-heading">
                      <h2>
                        {game.locked
                          ? "Your call is in."
                          : active
                            ? "Make your next call."
                            : "Make your first call."}
                      </h2>
                      <span>
                        {game.locked ? (
                          <>
                            <Icon name="lock" />
                            Locked
                          </>
                        ) : (
                          <>#{round ?? "…"}</>
                        )}
                      </span>
                    </div>
                    <fieldset
                      disabled={game.locked || game.busy || settledWait}
                    >
                      <legend>Will the next settled round do work?</legend>
                      <div className="side-choices">
                        <button
                          className={`side-choice ${side === "active" ? "selected" : ""}`}
                          aria-pressed={side === "active"}
                          onClick={() => setSide("active")}
                        >
                          <span className="choice-icon">
                            <Icon name="bolt" />
                          </span>
                          <span>
                            <strong>Active</strong>
                            <small>Work &gt; 0</small>
                          </span>
                          <span className="choice-check">
                            {side === "active" && (
                              <Icon name="check" size={16} />
                            )}
                          </span>
                        </button>
                        <button
                          className={`side-choice ${side === "idle" ? "selected" : ""}`}
                          aria-pressed={side === "idle"}
                          onClick={() => setSide("idle")}
                        >
                          <span className="choice-icon idle-icon">
                            <span />
                            <span />
                          </span>
                          <span>
                            <strong>Idle</strong>
                            <small>Zero work</small>
                          </span>
                          <span className="choice-check">
                            {side === "idle" && <Icon name="check" size={16} />}
                          </span>
                        </button>
                      </div>
                    </fieldset>
                    <fieldset
                      className="band-field"
                      disabled={
                        game.locked ||
                        game.busy ||
                        side === "idle" ||
                        dist.count === 0 ||
                        settledWait
                      }
                    >
                      <legend>
                        Work band <span>· optional +1 bonus</span>
                      </legend>
                      <div className="band-choices">
                        {(["low", "mid", "high"] as Band[]).map((b) => (
                          <button
                            key={b}
                            aria-pressed={band === b && side === "active"}
                            className={
                              band === b && side === "active" ? "selected" : ""
                            }
                            onClick={() => setBand(band === b ? null : b)}
                          >
                            {bandName(b)}
                            <span
                              className={`band-glyph ${b}`}
                              aria-hidden="true"
                            >
                              <i />
                              <i />
                              <i />
                            </span>
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <button
                      className="primary lock-cta"
                      disabled={!game.canLock}
                      onClick={() => void game.lock({ side, band })}
                    >
                      <Icon name={game.locked ? "check" : "lock"} />
                      {lockLabel}
                      {!game.locked && !game.busy && <Icon name="arrow" />}
                    </button>
                    <p className="lock-note">
                      {game.locked
                        ? `You called ${sideName(leg!.player!.side)}${leg!.player!.band ? ` / ${bandName(leg!.player!.band)}` : ""}. Waiting for a confirmed settlement.`
                        : side === "idle"
                          ? "Idle means exactly zero work. Bands apply to Active calls."
                          : "Correct side: 3 points. Correct work band: +1. Most points wins the round."}
                    </p>
                    {game.error && (
                      <p className="inline-error" role="alert">
                        {game.error}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="arena-bottom">
                <span>
                  <Icon name="shield" size={16} />
                  Brain only sees public history
                </span>
                <span>
                  {data
                    ? `Settled through #${data.anchor}`
                    : "Waiting for public data"}
                </span>
              </div>
            </section>
            <aside
              className="brain-panel"
              aria-label="Brain persona and explainable model"
            >
              <div className="persona-title">
                <span className="brain-emblem">
                  <BrainAvatar />
                </span>
                <div>
                  <h2>Choose your opponent</h2>
                  <p>A tiny, transparent overthinker.</p>
                </div>
              </div>
              <label className="persona-label" htmlFor="persona">
                Fight a Brain
              </label>
              <select
                id="persona"
                value={game.persona}
                disabled={active}
                onChange={(e) => game.setPersona(e.target.value as Persona)}
              >
                {PERSONAS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {active && (
                <span className="persona-locked">
                  Persona stays fixed for this duel.
                </span>
              )}
              <h3 className="persona-line">{persona.line}</h3>
              <p className="persona-description">{persona.description}</p>
              <div className="brain-call">
                <div>
                  <span>
                    {view === "spectate"
                      ? "Brain’s public call"
                      : active
                        ? "Brain’s committed call"
                        : "Brain’s next call"}
                  </span>
                  <Icon name="lock" size={16} />
                </div>
                <strong>
                  {brain ? sideName(brain.side) : "Reading history"}
                  {brain?.band && <span> / {bandName(brain.band)}</span>}
                </strong>
                <p>
                  {brain?.reasoning ??
                    "Waiting for at least three rounds with provable work totals."}
                </p>
              </div>
              <div className="weights-heading">
                <h3>Inside the Brain</h3>
                <span>Signal weights</span>
              </div>
              <div className="weight-bars">
                {["Recent streak", "Recent average", "UTC cadence"].map(
                  (label, i) => (
                    <div className="weight-row" key={label}>
                      <div>
                        <span>{label}</span>
                        <span>{brain ? `${brain.weights[i]}%` : "…"}</span>
                      </div>
                      <meter
                        min="0"
                        max="100"
                        value={brain?.weights[i] ?? 0}
                        aria-label={`${label} model weight`}
                      />
                    </div>
                  ),
                )}
              </div>
              <p className="model-note">
                {brain
                  ? `${brain.confidence}% model lean · ${brain.sampleSize} settled rounds`
                  : "Model loading"}
                <br />A heuristic, not a promise.
              </p>
              <details className="model-details">
                <summary>How this model stays fair</summary>
                <p>
                  Brain only sees the same public API. It never sees your
                  choice. All three Brain calls and work-band thresholds freeze
                  when you start a duel.
                </p>
                <p>
                  Only confirmed settlements score. No paid AI or private
                  signals.
                </p>
                <p>
                  {dist.count
                    ? `Bands use ${dist.count} positive-work rounds: Low ≤ ${fmt(dist.low)}, Mid ≤ ${fmt(dist.high)}, High > ${fmt(dist.high)}.`
                    : "Bands unlock when positive-work history is available."}
                </p>
                <p>
                  Timekeeper uses public UTC half-hour work as a cadence proxy.
                  Its model lean is not a calibrated probability.
                </p>
              </details>
            </aside>
          </div>
        ) : (
          <>
            <section className="history-section">
              <div className="section-heading">
                <h2>Your matchbook</h2>
                <span>Saved in this browser</span>
              </div>
              {completed.length ? (
                <div className="matchbook">
                  {completed.map((m) => {
                    const s = scores(m);
                    return (
                      <button
                        key={m.id}
                        className="match-history-row"
                        onClick={() => setSelectedResult(m)}
                      >
                        <span className={`result-mark ${m.outcome}`}>
                          <Icon
                            name={
                              m.outcome === "you"
                                ? "bolt"
                                : m.outcome === "brain"
                                  ? "shield"
                                  : "history"
                            }
                          />
                        </span>
                        <span>
                          <strong>
                            {m.outcome === "you"
                              ? "Broke the Brain"
                              : m.outcome === "brain"
                                ? "Brain holds"
                                : "Tied duel"}
                          </strong>
                          <small>
                            {PERSONAS.find((p) => p.id === m.persona)?.name} ·
                            rounds {m.legs[0].round}–
                            {m.legs.filter((l) => l.result).at(-1)?.round}
                          </small>
                        </span>
                        <strong>
                          {s.you} : {s.brain}
                        </strong>
                        <Icon name="arrow" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <Icon name="history" size={28} />
                  <h3>A clean matchbook.</h3>
                  <p>
                    Finish a duel to save the score and your share card here.
                  </p>
                  <button className="primary" onClick={() => navigate("arena")}>
                    Start a duel
                    <Icon name="arrow" />
                  </button>
                </div>
              )}
            </section>
            {selectedResult && (
              <section className="past-result">
                <div className="section-heading">
                  <h2>From your matchbook</h2>
                  <button
                    className="text-button"
                    onClick={() => setSelectedResult(null)}
                  >
                    Close result
                    <Icon name="close" />
                  </button>
                </div>
                <MatchRows match={selectedResult} />
                <ShareCard match={selectedResult} />
              </section>
            )}
          </>
        )}
        {view === "arena" && match && (
          <section className="round-log">
            <div className="section-heading">
              <h2>This duel</h2>
              <span>
                {match.outcome
                  ? "Final score"
                  : "Three consecutive settlements"}
              </span>
            </div>
            <MatchRows match={match} />
          </section>
        )}
        {view === "spectate" && (
          <section className="watch-history">
            <div className="section-heading">
              <h2>Brain’s call sheet</h2>
              <span>Predictions made in this browser</span>
            </div>
            {save.watch.length ? (
              <ol>
                {[...save.watch]
                  .reverse()
                  .slice(0, 12)
                  .map((w) => (
                    <li key={`${w.round}:${w.persona}`}>
                      <span>
                        #{w.round}
                        <small>
                          {PERSONAS.find((p) => p.id === w.persona)?.name}
                        </small>
                      </span>
                      <span>
                        {sideName(w.call.side)}
                        {w.call.band ? ` / ${bandName(w.call.band)}` : ""}
                      </span>
                      <span
                        className={
                          w.correct === true
                            ? "success-text"
                            : w.correct === false
                              ? "loss-text"
                              : "muted"
                        }
                      >
                        {w.work === null
                          ? "Pending"
                          : w.correct
                            ? "Correct side"
                            : "Wrong side"}
                        <small>
                          {w.work === null
                            ? "Awaiting settlement"
                            : `${fmt(w.work)} work`}
                        </small>
                      </span>
                    </li>
                  ))}
              </ol>
            ) : (
              <p className="empty-copy">
                The Brain will lock its first call when fresh public history
                arrives.
              </p>
            )}
          </section>
        )}
        <section className="history-rail" aria-label="Recent proven rounds">
          <div className="section-heading">
            <h2>Recent settled rounds</h2>
            <span>
              {last20.length
                ? `${last20.length} proven rounds`
                : "Reading settlements"}
            </span>
          </div>
          <div
            className="round-strip"
            role="region"
            aria-label="Recent round history, scroll for more"
            tabIndex={0}
          >
            {last20.length ? (
              last20.map((r) => (
                <div
                  className={`history-round ${r.work === "0" ? "idle" : "active"}`}
                  key={r.id}
                >
                  <span
                    className="history-bar"
                    style={
                      {
                        "--bar-height": `${r.work === "0" ? 8 : Math.max(16, Math.min(48, Number((BigInt(r.work) * 48n) / game.knownRounds.reduce((max, v) => (BigInt(v.work) > max ? BigInt(v.work) : max), 1n))))}px`,
                      } as React.CSSProperties
                    }
                  />
                  <strong>{r.work === "0" ? "Idle" : "Active"}</strong>
                  <span>#{r.id}</span>
                  <small>{fmt(r.work)} work</small>
                </div>
              ))
            ) : (
              <p className="empty-copy">
                Confirmed rounds will appear here. No sample rounds are mixed
                into the live game.
              </p>
            )}
          </div>
          <div className="rail-caption">
            <span>
              <i className="legend-dot active" />
              Active: work &gt; 0 <i className="legend-dot idle" />
              Idle: zero work
            </span>
            <span>Unknown work is left unscored.</span>
          </div>
        </section>
        <section className="fairness-strip">
          <span className="fairness-icon">
            <Icon name="shield" size={28} />
          </span>
          <div>
            <h2>Fair by design</h2>
            <p>Brain only sees the same public API. You bring the instinct.</p>
          </div>
          <a
            href="https://api.squeekchain.com/v1/settlements?range=now"
            target="_blank"
            rel="noreferrer"
          >
            View public settlements
            <Icon name="arrow" />
          </a>
        </section>
      </main>
      <footer className="shell">
        <a
          href="#arena"
          className="footer-brand"
          onClick={() => navigate("arena")}
        >
          <WheelMark />
          Round Prophet
        </a>
        <p>
          community game · public Squeekchain data · not financial advice · no
          real-money betting
        </p>
        <span>Small wheel. Big predictions.</span>
      </footer>
      <dialog
        ref={help}
        className="help-dialog"
        aria-labelledby="rules-title"
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const controls =
            e.currentTarget.querySelectorAll<HTMLButtonElement>("button");
          const first = controls[0],
            last = controls[controls.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }}
        onClick={(e) => {
          if (e.target === help.current) help.current.close();
        }}
      >
        <div className="dialog-heading">
          <h2 id="rules-title">Outthink the wheel.</h2>
          <button
            className="icon-button"
            aria-label="Close how to play"
            onClick={() => help.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <p>
          Challenge Wheel Brain over up to three consecutive Squeekchain rounds.
          Real rounds are about ten minutes, with settlement delays.
        </p>
        <ol className="rules-list">
          <li>
            <strong>Pick a Brain.</strong> Momentum follows streaks, Mean-revert
            fades them, Timekeeper follows public UTC cadence.
          </li>
          <li>
            <strong>Lock a side.</strong> Active is any work above zero. Idle is
            exactly zero. Add an optional band to an Active call.
          </li>
          <li>
            <strong>Let the wheel settle.</strong> Correct side earns 3 points.
            A correct Active band adds 1. More points wins that round; equal
            points tie.
          </li>
          <li>
            <strong>Take the duel.</strong> First to 2 round wins ends it early.
            After 3 rounds, the higher round-win count wins. Equal counts draw.
            Ties award no round win.
          </li>
        </ol>
        <p>
          Brain commits all three calls at the start. Lock each of your calls
          before its settlement. An uncalled round is a forfeit. Refreshing
          restores a match in this browser.
        </p>
        <p>
          Locks and scoring pause on stale or failed public data. Settled rounds
          that passed while you were away are resolved on return, including
          missed calls. Ambiguous batched work waits for proof.
        </p>
        <p>
          No money, wallet, on-chain bets, or paid AI. Match results stay on
          your browser.
        </p>
        <button className="primary" onClick={() => help.current?.close()}>
          Got it. Let’s duel.
          <Icon name="arrow" />
        </button>
      </dialog>
    </>
  );
}
