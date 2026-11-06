import test from "node:test";
import assert from "node:assert/strict";
import {
  bandOf,
  distribution,
  newMatch,
  points,
  predict,
  resolveMatch,
  scores,
  shareText,
} from "../src/engine.ts";
import {
  freshness,
  integer,
  normalize,
  parsePublic,
  provenRounds,
  roundClosesAt,
} from "../src/data.ts";
import {
  coldHistory,
  fixtureApi,
  fixtureTime,
  makeHistory,
} from "./fixtures.ts";
import type { Match, Pick } from "../src/engine.ts";

const call: Pick = { side: "active", band: "high" };
const start = () =>
  newMatch(
    "synthetic-test-installation",
    "momentum",
    "20",
    coldHistory(),
    [],
    Date.parse(fixtureTime),
    600000,
    call,
    fixtureTime,
  );
test("unquoted integers beyond Number precision are preserved exactly", () => {
  const parsed = parsePublic(
    '{"round":900719925474099312345,"work":"18446744073709551615"}',
  );
  assert.equal(integer(parsed.round), "900719925474099312345");
  assert.equal(integer(parsed.work), "18446744073709551615");
  assert.throws(() => integer("3.5"));
});
test("proven ledger history includes exact active rounds and confirmed zeros", () => {
  const f = fixtureApi();
  assert.deepEqual(
    provenRounds(f.status, f.settlements).map((r) => r.work),
    coldHistory().map((r) => r.work),
  );
});
test("zero issuance does not imply zero work and positive batches are never split", () => {
  const f = fixtureApi();
  f.settlements.recentSettlements = [
    {
      ...f.settlements.recentSettlements[0],
      previousSettledThroughRound: "0",
      settledThroughRound: "20",
      workAdded: "420",
      cumulativeWork: "420",
    },
  ];
  assert.equal(provenRounds(f.status, f.settlements).length, 0);
});
test("equal cumulative boundaries prove intervening zero rounds, capped at 256", () => {
  const f = fixtureApi(makeHistory(Array(300).fill("0")));
  f.settlements.recentSettlements = [
    {
      ...f.settlements.recentSettlements[0],
      previousSettledThroughRound: "0",
      settledThroughRound: "300",
    },
  ];
  assert.equal(provenRounds(f.status, f.settlements).length, 256);
});
test("future settlements do not bypass the status anchor", () => {
  const f = fixtureApi();
  f.status.builder.anchor.settledThroughRound = "19";
  assert.ok(
    provenRounds(f.status, f.settlements).every((r) => BigInt(r.id) <= 19n),
  );
});
test("conflicting ledger boundaries and changed proven work stop data processing", () => {
  const f = fixtureApi();
  f.settlements.recentSettlements[1].cumulativeWork = "61";
  assert.throws(() => provenRounds(f.status, f.settlements), /disagree/);
  const g = fixtureApi();
  assert.throws(
    () =>
      provenRounds(g.status, g.settlements, [
        { id: "1", work: "999", endedAt: null },
      ]),
    /changed/,
  );
});
test("installations must agree before a snapshot can score", () => {
  const f = fixtureApi();
  f.stats.installationId = "different-test-installation";
  assert.throws(
    () => normalize(f.status, f.settlements, f.stats, [], "live"),
    /installations disagree/,
  );
});
test("freshness stops on failures, stale measurement, cached history or old status", () => {
  const f = fixtureApi();
  const s = normalize(f.status, f.settlements, f.stats, [], "live"),
    now = Date.parse(fixtureTime);
  assert.equal(freshness(s, now, false), "online");
  assert.equal(freshness(s, now, true), "offline");
  assert.equal(freshness(s, now + 55000, false), "online");
  assert.equal(freshness(s, now + 120001, false), "stale");
  assert.equal(
    freshness({ ...s, measurementFreshness: "stale" }, now, false),
    "stale",
  );
  assert.equal(
    freshness({ ...s, source: "durable-cache" }, now, false),
    "stale",
  );
  assert.equal(freshness(null, now, false), "connecting");
});
test("status age follows the API window while measurement age stays independently checked", () => {
  const f = fixtureApi();
  const s = normalize(f.status, f.settlements, f.stats, [], "live");
  const now = Date.parse(fixtureTime);
  const ago = (ms: number) => new Date(now - ms).toISOString();
  for (const age of [16000, 55000, 60000, 119999, 120000])
    assert.equal(freshness({ ...s, generatedAt: ago(age) }, now, false), "online");
  assert.equal(freshness({ ...s, generatedAt: ago(120001) }, now, false), "stale");
  assert.equal(freshness({ ...s, observedAt: ago(120001) }, now, false), "stale");
  assert.equal(freshness({ ...s, staleAfter: 45, generatedAt: ago(45000) }, now, false), "online");
  assert.equal(freshness({ ...s, staleAfter: 45, generatedAt: ago(45001) }, now, false), "stale");
  assert.equal(freshness({ ...s, historyGeneratedAt: ago(120001) }, now, false), "stale");
  assert.equal(freshness({ ...s, statsGeneratedAt: ago(300001) }, now, false), "stale");
  assert.equal(freshness({ ...s, generatedAt: new Date(now + 30001).toISOString() }, now, false), "stale");
});
test("round deadlines use the API clock for consecutive legs with bigint-safe identifiers", () => {
  const f = fixtureApi();
  const s = normalize(f.status, f.settlements, f.stats, [], "live");
  assert.equal(roundClosesAt(s, "21"), s.nextEnd);
  assert.equal(roundClosesAt(s, "22"), s.nextEnd + s.roundMs);
  assert.equal(roundClosesAt(s, "23"), s.nextEnd + s.roundMs * 2);
  const huge = { ...s, anchor: "900719925474099312345" };
  assert.equal(roundClosesAt(huge, "900719925474099312346"), s.nextEnd);
  assert.equal(roundClosesAt(huge, "900719925474099312347"), s.nextEnd + s.roundMs);
  assert.ok(Number.isNaN(roundClosesAt(huge, "21")));
});
test("quantile bands use positive work, exact bigint values and inclusive ties", () => {
  const d = distribution(
    makeHistory(["0", "10", "20", "30", "40", "50", "60"]),
  );
  assert.deepEqual(d, { low: "20", high: "40", count: 6 });
  assert.equal(bandOf("20", d), "low");
  assert.equal(bandOf("21", d), "mid");
  assert.equal(bandOf("41", d), "high");
  const huge = distribution(
    makeHistory(["9007199254740993", "9007199254740994", "9007199254740995"]),
  );
  assert.equal(bandOf("9007199254740994", huge), "mid");
});
test("personas are deterministic, explainable and normalize weights to 100", () => {
  for (const persona of ["momentum", "mean-revert", "timekeeper"] as const) {
    const a = predict(persona, coldHistory(), [], Date.parse(fixtureTime));
    assert.deepEqual(
      a,
      predict(persona, coldHistory(), [], Date.parse(fixtureTime)),
    );
    assert.equal(
      a.weights.reduce((a, b) => a + b, 0),
      100,
    );
    assert.equal(a.weights[2], 0);
    assert.equal(a.historyThrough, "20");
    assert.ok(a.reasoning.length > 20);
  }
  assert.equal(predict("momentum", coldHistory(), [], 0).side, "idle");
  assert.throws(() => predict("momentum", [], [], 0));
});
test("side scoring dominates the band and idle never earns a band point", () => {
  const d = { low: "20", high: "80", count: 6 };
  assert.equal(points(call, "100", d), 4);
  assert.equal(points({ side: "idle", band: "high" }, "100", d), 0);
  assert.equal(points({ side: "idle", band: "low" }, "0", d), 3);
  assert.equal(points({ side: "active", band: null }, "100", d), 3);
});
test("Brain precommits three calls without changing history or the original pick", () => {
  const h = coldHistory(),
    before = JSON.stringify(h),
    m = start();
  assert.equal(JSON.stringify(h), before);
  assert.equal(m.legs.length, 3);
  assert.deepEqual(
    m.legs.map((l) => l.round),
    ["21", "22", "23"],
  );
  assert.ok(m.legs.every((l) => l.brain.historyThrough === "20"));
  assert.equal(m.legs[1].player, null);
});
function withPick(m: Match, index: number, pick: Pick): Match {
  return {
    ...m,
    legs: m.legs.map((l, i) =>
      i === index ? { ...l, player: pick, lockedAt: fixtureTime } : l,
    ),
  };
}
test("first to two wins ends the duel in two confirmed rounds", () => {
  let m = resolveMatch(
    start(),
    "21",
    [{ id: "21", work: "200", endedAt: null }],
    fixtureTime,
  );
  assert.deepEqual(scores(m), { you: 1, brain: 0 });
  assert.equal(m.outcome, null);
  m = withPick(m, 1, call);
  m = resolveMatch(
    m,
    "22",
    [{ id: "22", work: "200", endedAt: null }],
    fixtureTime,
  );
  assert.equal(m.outcome, "you");
  assert.equal(m.legs[2].result, null);
  assert.match(shareText(m), /2–0 on rounds 21–22/);
});
test("a three-round 2–1 match resolves once and shares its exact range", () => {
  let m = resolveMatch(
    start(),
    "21",
    [{ id: "21", work: "200", endedAt: null }],
    fixtureTime,
  );
  m = resolveMatch(
    withPick(m, 1, call),
    "22",
    [{ id: "22", work: "0", endedAt: null }],
    fixtureTime,
  );
  m = resolveMatch(
    withPick(m, 2, call),
    "23",
    [{ id: "23", work: "200", endedAt: null }],
    fixtureTime,
  );
  assert.deepEqual(scores(m), { you: 2, brain: 1 });
  assert.equal(m.outcome, "you");
  assert.match(shareText(m), /2–1 on rounds 21–23/);
  assert.deepEqual(resolveMatch(m, "23", [], fixtureTime), m);
});
test("equal calls draw after three rounds; no winner is fabricated", () => {
  let m = start();
  m = {
    ...m,
    legs: m.legs.map((l) => ({
      ...l,
      player: { side: "idle", band: null },
      lockedAt: fixtureTime,
    })),
  };
  m = resolveMatch(
    m,
    "23",
    ["21", "22", "23"].map((id) => ({ id, work: "0", endedAt: null })),
    fixtureTime,
  );
  assert.equal(m.outcome, "tie");
  assert.deepEqual(scores(m), { you: 0, brain: 0 });
});
test("unlocked consecutive rounds are explicit forfeits; unknown work stays pending", () => {
  let m = start();
  assert.equal(resolveMatch(m, "23", [], fixtureTime).legs[0].result, null);
  m = resolveMatch(
    m,
    "23",
    ["21", "22", "23"].map((id) => ({ id, work: "0", endedAt: null })),
    fixtureTime,
  );
  assert.equal(m.outcome, "brain");
  assert.equal(m.legs[1].result?.missed, true);
});
test("anchor must advance before any available history is scored", () => {
  const m = start();
  assert.equal(
    resolveMatch(
      m,
      "20",
      [{ id: "21", work: "200", endedAt: null }],
      fixtureTime,
    ).legs[0].result,
    null,
  );
});
