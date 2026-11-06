export type Persona = "momentum" | "mean-revert" | "timekeeper";
export type Side = "active" | "idle";
export type Band = "low" | "mid" | "high";
export type Outcome = "you" | "brain" | "tie";
export interface Round {
  id: string;
  work: string;
  endedAt: string | null;
}
export interface Cadence {
  minute: number;
  meanMilli: string | null;
  days: number;
}
export interface Distribution {
  low: string;
  high: string;
  count: number;
}
export interface Pick {
  side: Side;
  band: Band | null;
}
export interface BrainCall extends Pick {
  confidence: number;
  reasoning: string;
  weights: number[];
  signals: number[];
  historyThrough: string;
  sampleSize: number;
}
export interface Leg {
  round: string;
  brain: BrainCall;
  player: Pick | null;
  lockedAt: string | null;
  distribution: Distribution;
  result: {
    work: string;
    band: Band;
    winner: Outcome;
    youPoints: number;
    brainPoints: number;
    missed: boolean;
  } | null;
}
export interface Match {
  id: string;
  installation: string;
  persona: Persona;
  startedAt: string;
  legs: Leg[];
  outcome: Outcome | null;
  finishedAt: string | null;
}
export const PERSONAS: {
  id: Persona;
  name: string;
  line: string;
  description: string;
}[] = [
  {
    id: "momentum",
    name: "Momentum",
    line: "Trusts a streak.",
    description:
      "Leans into the last six settled rounds. A longer streak gets more weight.",
  },
  {
    id: "mean-revert",
    name: "Mean-revert",
    line: "Expects the comeback.",
    description:
      "Fades unusually hot or cold streaks toward the recent settled average.",
  },
  {
    id: "timekeeper",
    name: "Timekeeper",
    line: "Knows the routine.",
    description:
      "Favors the same UTC half-hour in public history, backed by recent cadence.",
  },
];
export const byId = (a: Round, b: Round) =>
  BigInt(a.id) < BigInt(b.id) ? -1 : BigInt(a.id) > BigInt(b.id) ? 1 : 0;
const clamp = (x: number, low = 0.08, high = 0.92) =>
  Math.min(high, Math.max(low, x));
const ratio = (a: bigint, b: bigint) =>
  b === 0n ? 0 : Number((a * 10000n) / b) / 10000;
export function distribution(rounds: Round[]): Distribution {
  const work = rounds
    .map((r) => BigInt(r.work))
    .filter((w) => w > 0n)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return {
    low: (work[Math.max(0, Math.ceil(work.length / 3) - 1)] ?? 0n).toString(),
    high: (
      work[Math.max(0, Math.ceil((work.length * 2) / 3) - 1)] ?? 0n
    ).toString(),
    count: work.length,
  };
}
export function bandOf(work: string, dist: Distribution): Band {
  return BigInt(work) <= BigInt(dist.low)
    ? "low"
    : BigInt(work) <= BigInt(dist.high)
      ? "mid"
      : "high";
}
export function predict(
  persona: Persona,
  history: Round[],
  cadence: Cadence[],
  targetEnd: number,
): BrainCall {
  const rounds = [...history].sort(byId).slice(-60);
  if (rounds.length < 3)
    throw new Error("At least three proven rounds are needed.");
  const latest = rounds.slice(-6);
  const base = rounds.filter((r) => BigInt(r.work) > 0n).length / rounds.length;
  const recent =
    latest.filter((r) => BigInt(r.work) > 0n).length / latest.length;
  const latestActive = BigInt(rounds.at(-1)!.work) > 0n;
  let streak = 0;
  for (
    let i = rounds.length - 1;
    i >= 0 && BigInt(rounds[i].work) > 0n === latestActive;
    i--
  )
    streak++;
  const streakSignal = clamp(
    recent + (latestActive ? 1 : -1) * Math.min(streak, 6) * 0.035,
  );
  const averageSignal =
    persona === "mean-revert" ? clamp(base + (base - recent) * 0.7) : base;
  const date = new Date(targetEnd - 1);
  const minute =
    Math.floor((date.getUTCHours() * 60 + date.getUTCMinutes()) / 30) * 30;
  const bucket = cadence.find(
    (c) => c.minute === minute && c.days > 0 && c.meanMilli !== null,
  );
  const active = rounds.map((r) => BigInt(r.work)).filter((w) => w > 0n);
  const mean = active.length
    ? active.reduce((a, b) => a + b, 0n) / BigInt(active.length)
    : 0n;
  const clockSignal =
    bucket && mean > 0n
      ? clamp(ratio(BigInt(bucket.meanMilli!), mean * 3000n))
      : base;
  let weights =
    persona === "momentum"
      ? [Math.min(65, 48 + streak * 2), 32, 0]
      : persona === "mean-revert"
        ? [15, 65, 20]
        : [20, 20, 60];
  if (persona === "momentum") weights[2] = 100 - weights[0] - weights[1];
  if (!bucket) {
    weights[1] += weights[2];
    weights[2] = 0;
  }
  const signals = [streakSignal, averageSignal, clockSignal];
  const probability = clamp(
    signals.reduce((v, s, i) => v + (s * weights[i]) / 100, 0),
  );
  const side: Side = probability >= 0.5 ? "active" : "idle";
  const expected =
    persona === "momentum"
      ? (mean * 115n) / 100n
      : persona === "mean-revert"
        ? (mean * 85n) / 100n
        : mean;
  const band =
    side === "active"
      ? bandOf(expected.toString(), distribution(rounds))
      : null;
  const reasoning =
    persona === "momentum"
      ? `${streak} ${latestActive ? "active" : "idle"} in a row. Recent activity is ${Math.round(recent * 100)}%; I’m following the streak.`
      : persona === "mean-revert"
        ? `Recent activity is ${Math.round(recent * 100)}% against a ${Math.round(base * 100)}% baseline. I’m fading the gap toward the average.`
        : bucket
          ? `${bucket.days} observed days in this UTC half-hour. I’m weighting that cadence alongside recent rounds.`
          : "No history for this UTC half-hour yet. I’m falling back to the recent settled average.";
  return {
    side,
    band,
    confidence: Math.round(
      (side === "active" ? probability : 1 - probability) * 100,
    ),
    reasoning,
    weights,
    signals: signals.map((s) => Math.round(s * 100)),
    historyThrough: rounds.at(-1)!.id,
    sampleSize: rounds.length,
  };
}
export function points(pick: Pick | null, work: string, dist: Distribution) {
  if (!pick || pick.side !== (BigInt(work) > 0n ? "active" : "idle")) return 0;
  return (
    3 +
    (pick.side === "active" &&
    pick.band !== null &&
    pick.band === bandOf(work, dist)
      ? 1
      : 0)
  );
}
export function scores(match: Match) {
  return {
    you: match.legs.filter((l) => l.result?.winner === "you").length,
    brain: match.legs.filter((l) => l.result?.winner === "brain").length,
  };
}
export function newMatch(
  installation: string,
  persona: Persona,
  anchor: string,
  history: Round[],
  cadence: Cadence[],
  firstEnd: number,
  roundMs: number,
  pick: Pick,
  now: string,
): Match {
  const dist = distribution([...history].sort(byId).slice(-60));
  return {
    id: `${installation}:${anchor}:${now}`,
    installation,
    persona,
    startedAt: now,
    outcome: null,
    finishedAt: null,
    legs: Array.from({ length: 3 }, (_, i) => ({
      round: (BigInt(anchor) + BigInt(i + 1)).toString(),
      brain: predict(persona, history, cadence, firstEnd + i * roundMs),
      player: i === 0 ? pick : null,
      lockedAt: i === 0 ? now : null,
      distribution: dist,
      result: null,
    })),
  };
}
export function resolveMatch(
  match: Match,
  anchor: string,
  rounds: Round[],
  now: string,
): Match {
  if (match.outcome) return match;
  const next: Match = { ...match, legs: match.legs.map((l) => ({ ...l })) };
  for (const leg of next.legs) {
    if (leg.result) continue;
    if (BigInt(leg.round) > BigInt(anchor)) break;
    const round = rounds.find((r) => r.id === leg.round);
    if (!round) break; // A batched or missing ledger entry is never guessed.
    const youPoints = points(leg.player, round.work, leg.distribution);
    const brainPoints = points(leg.brain, round.work, leg.distribution);
    const winner =
      leg.player === null
        ? "brain"
        : youPoints > brainPoints
          ? "you"
          : brainPoints > youPoints
            ? "brain"
            : "tie";
    leg.result = {
      work: round.work,
      band: bandOf(round.work, leg.distribution),
      winner,
      youPoints,
      brainPoints,
      missed: leg.player === null,
    };
    const score = scores(next);
    if (
      score.you === 2 ||
      score.brain === 2 ||
      next.legs.every((l) => l.result)
    ) {
      next.outcome =
        score.you > score.brain
          ? "you"
          : score.brain > score.you
            ? "brain"
            : "tie";
      next.finishedAt = now;
      break;
    }
  }
  return next;
}
export function shareText(match: Match): string {
  const score = scores(match);
  const last =
    match.legs.filter((l) => l.result).at(-1)?.round ?? match.legs[0].round;
  const name = PERSONAS.find((p) => p.id === match.persona)!.name;
  return `I ${match.outcome === "you" ? "beat" : match.outcome === "brain" ? "faced" : "tied"} Wheel Brain (${name}) ${score.you}–${score.brain} on rounds ${match.legs[0].round}–${last}. ${match.outcome === "you" ? "Broke the Brain." : match.outcome === "brain" ? "Brain holds." : "Great minds, same calls."} Round Prophet · community game · no real-money betting.`;
}
