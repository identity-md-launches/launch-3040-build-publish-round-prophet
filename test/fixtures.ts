// Synthetic API fixtures for deterministic tests only. Never imported by the site.
import type { Round } from "../src/engine.ts";
export const fixtureTime = "2026-11-06T09:30:00.000Z";
export const makeHistory = (work: string[]): Round[] =>
  work.map((w, i) => ({ id: String(i + 1), work: w, endedAt: null }));
export const coldHistory = () =>
  makeHistory(["20", "40", "60", "80", "100", "120", ...Array(14).fill("0")]);
export function fixtureApi(rounds = coldHistory(), date = fixtureTime) {
  const anchor = rounds.at(-1)!.id;
  let cumulative = 0n;
  const events = rounds.map((r) => {
    const before = cumulative;
    cumulative += BigInt(r.work);
    return {
      previousSettledThroughRound: (BigInt(r.id) - 1n).toString(),
      settledThroughRound: r.id,
      workAdded: r.work,
      cumulativeWork: cumulative.toString(),
      confirmationStatus: "safe",
      blockTimestamp: date,
      previous: before.toString(),
    };
  });
  return {
    status: {
      installationId: "synthetic-test-installation",
      generatedAt: date,
      builder: {
        status: "available",
        anchor: {
          settledThroughRound: anchor,
          cumulativeWork: cumulative.toString(),
        },
      },
      measurement: {
        freshness: "online",
        observedAt: date,
        staleAfterSeconds: 120,
      },
    },
    settlements: {
      installationId: "synthetic-test-installation",
      status: "available",
      generatedAt: date,
      recentSettlements: events,
      recentRounds: rounds.map((r) => ({
        roundId: r.id,
        endAt: date,
        sqkMintedBaseUnits: "0",
      })),
      mining: {
        nextRound: {
          round: (BigInt(anchor) + 1n).toString(),
          endsAt: new Date(Date.parse(date) + 600000).toISOString(),
        },
        recentCheckpoints: [],
      },
    },
    stats: {
      installationId: "synthetic-test-installation",
      generatedAt: date,
      window: { roundSeconds: 600 },
      activity: {
        typicalDay: Array.from({ length: 48 }, (_, i) => ({
          startMinuteUtc: i * 30,
          meanWorkMilli: "0",
          observedDayCount: 2,
        })),
      },
    },
  };
}
