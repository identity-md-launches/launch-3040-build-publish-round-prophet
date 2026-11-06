import { parse } from "lossless-json";
import type { Cadence, Round } from "./engine.ts";
import { byId } from "./engine.ts";

type Obj = Record<string, unknown>;
export interface Snapshot {
  installation: string;
  anchor: string;
  cumulativeWork: string;
  generatedAt: string;
  observedAt: string;
  staleAfter: number;
  measurementFreshness: string;
  rounds: Round[];
  cadence: Cadence[];
  roundMs: number;
  nextEnd: number;
  source: string;
  historyGeneratedAt: string;
  statsGeneratedAt: string;
}
export function object(value: unknown): Obj {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Unexpected public API response.");
  return value as Obj;
}
export function integer(value: unknown): string {
  const s = String(value);
  if (!/^(0|[1-9]\d*)$/.test(s))
    throw new Error("Invalid integer in public data.");
  return s;
}
function text(value: unknown): string {
  if (typeof value !== "string") throw new Error("Missing public data.");
  return value;
}
function timestamp(value: unknown): string {
  const s = text(value);
  if (!Number.isFinite(Date.parse(s)))
    throw new Error("Invalid public timestamp.");
  return s;
}
function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Missing public history.");
  return value;
}
export function parsePublic(raw: string): Obj {
  return object(parse(raw));
}

// A ledger boundary proves a cumulative value at an exact round. Two consecutive
// boundaries prove that round's work; equal boundaries prove every intervening zero.
// Positive work over multiple rounds cannot be safely split and stays unknown.
export function provenRounds(
  status: Obj,
  settlements: Obj,
  previous: Round[] = [],
): Round[] {
  const anchor = object(object(status.builder).anchor);
  const through = BigInt(integer(anchor.settledThroughRound));
  const boundaries = new Map<string, bigint>();
  const known = new Map<string, Round>();
  const ends = new Map<string, string>();
  const addBoundary = (id: string, work: string) => {
    if (BigInt(id) > through) return;
    const value = BigInt(work);
    if (boundaries.has(id) && boundaries.get(id) !== value)
      throw new Error("Public ledgers disagree. Locks are paused.");
    boundaries.set(id, value);
  };
  const addRound = (r: Round) => {
    if (BigInt(r.id) > through) return;
    if (known.has(r.id) && known.get(r.id)!.work !== r.work)
      throw new Error("A confirmed round changed. Locks are paused.");
    known.set(r.id, r);
  };
  previous.forEach(addRound);
  const recentRounds = settlements.recentRounds;
  if (Array.isArray(recentRounds))
    for (const item of recentRounds) {
      const r = object(item);
      ends.set(integer(r.roundId), timestamp(r.endAt));
    }
  for (const item of list(settlements.recentSettlements)) {
    const s = object(item);
    if (s.confirmationStatus !== "safe" && s.confirmationStatus !== "finalized")
      continue;
    const end = integer(s.settledThroughRound),
      start = integer(s.previousSettledThroughRound);
    const work = integer(s.workAdded),
      cumulative = integer(s.cumulativeWork);
    if (BigInt(work) > BigInt(cumulative) || BigInt(end) <= BigInt(start))
      throw new Error("Invalid settlement ledger.");
    addBoundary(end, cumulative);
    addBoundary(start, (BigInt(cumulative) - BigInt(work)).toString());
  }
  const mining = settlements.mining ? object(settlements.mining) : null;
  if (mining && Array.isArray(mining.recentCheckpoints))
    for (const item of mining.recentCheckpoints) {
      const c = object(item);
      if (
        c.confirmationStatus === "safe" ||
        c.confirmationStatus === "finalized"
      )
        addBoundary(integer(c.throughRound), integer(c.cumulativeWork));
    }
  addBoundary(through.toString(), integer(anchor.cumulativeWork));
  const sorted = [...boundaries.entries()].sort((a, b) =>
    BigInt(a[0]) < BigInt(b[0]) ? -1 : 1,
  );
  for (let i = 1; i < sorted.length; i++) {
    const [start, before] = sorted[i - 1],
      [end, after] = sorted[i];
    const gap = BigInt(end) - BigInt(start),
      delta = after - before;
    if (delta < 0n) throw new Error("Public cumulative work moved backwards.");
    if (gap === 1n)
      addRound({
        id: end,
        work: delta.toString(),
        endedAt: ends.get(end) ?? null,
      });
    else if (delta === 0n) {
      for (
        let r = BigInt(end) - (gap > 256n ? 256n : gap) + 1n;
        r <= BigInt(end);
        r++
      )
        addRound({
          id: r.toString(),
          work: "0",
          endedAt: ends.get(r.toString()) ?? null,
        });
    }
  }
  return [...known.values()].sort(byId).slice(-256);
}
export function normalize(
  status: Obj,
  settlements: Obj,
  stats: Obj,
  previous: Round[],
  source: string,
): Snapshot {
  const installation = text(status.installationId);
  if (
    installation !== settlements.installationId ||
    installation !== stats.installationId
  )
    throw new Error("Public API installations disagree.");
  if (
    object(status.builder).status !== "available" ||
    settlements.status !== "available"
  )
    throw new Error("Settlement service unavailable.");
  const anchor = object(object(status.builder).anchor),
    measurement = object(status.measurement);
  const window = object(stats.window),
    activity = object(stats.activity);
  const roundSeconds = Number(integer(window.roundSeconds));
  if (roundSeconds < 1 || roundSeconds > 86400)
    throw new Error("Invalid round duration.");
  const roundMs = roundSeconds * 1000;
  const next = object(object(settlements.mining).nextRound);
  const anchorId = integer(anchor.settledThroughRound);
  // The API's nextRound gives a clock origin, even when mining trails the builder.
  const difference = BigInt(anchorId) + 1n - BigInt(integer(next.round));
  if (difference < -1000n || difference > 1000n)
    throw new Error("Round clock is out of sync.");
  const nextEnd =
    Date.parse(timestamp(next.endsAt)) + Number(difference) * roundMs;
  return {
    installation,
    anchor: anchorId,
    cumulativeWork: integer(anchor.cumulativeWork),
    generatedAt: timestamp(status.generatedAt),
    observedAt: timestamp(measurement.observedAt),
    staleAfter: Number(integer(measurement.staleAfterSeconds)),
    measurementFreshness: text(measurement.freshness),
    rounds: provenRounds(status, settlements, previous),
    roundMs,
    nextEnd,
    cadence: list(activity.typicalDay).map((item) => {
      const b = object(item);
      return {
        minute: Number(integer(b.startMinuteUtc)),
        meanMilli: b.meanWorkMilli === null ? null : integer(b.meanWorkMilli),
        days: Number(integer(b.observedDayCount)),
      };
    }),
    source,
    historyGeneratedAt: timestamp(settlements.generatedAt),
    statsGeneratedAt: timestamp(stats.generatedAt),
  };
}
export function freshness(
  data: Snapshot | null,
  now: number,
  failed: boolean,
): "online" | "stale" | "offline" | "connecting" {
  if (failed) return "offline";
  if (!data) return "connecting";
  if (data.measurementFreshness === "offline") return "offline";
  if (
    data.measurementFreshness !== "online" ||
    data.source !== "live" ||
    now - Date.parse(data.generatedAt) > 15000 ||
    now - Date.parse(data.observedAt) > data.staleAfter * 1000 ||
    now - Date.parse(data.historyGeneratedAt) > 120000 ||
    now - Date.parse(data.statsGeneratedAt) > 300000 ||
    Date.parse(data.generatedAt) > now + 30000
  )
    return "stale";
  return "online";
}
export const API = "https://api.squeekchain.com";
export async function getPublic(path: string, signal: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, { signal, cache: "no-store" });
  } catch {
    throw new Error(
      "Unable to reach public Squeekchain data. Retrying automatically.",
    );
  }
  if (!response.ok) throw new Error(`Public API returned ${response.status}.`);
  return {
    data: parsePublic(await response.text()),
    source: response.headers.get("x-squeek-settlement-source") ?? "live",
  };
}
