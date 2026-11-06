import { useCallback, useEffect, useRef, useState } from "react";
import { freshness, getPublic, normalize } from "./data.ts";
import type { Snapshot } from "./data.ts";
import { newMatch, predict, resolveMatch } from "./engine.ts";
import type { BrainCall, Match, Persona, Pick, Round } from "./engine.ts";

export interface WatchCall {
  round: string;
  persona: Persona;
  call: BrainCall;
  lockedAt: string;
  work: string | null;
  correct: boolean | null;
}
interface Save {
  version: 1;
  installation: string;
  match: Match | null;
  matches: Match[];
  watch: WatchCall[];
}
const KEY = "round-prophet:season:v1";
const emptySave = (): Save => ({
  version: 1,
  installation: "",
  match: null,
  matches: [],
  watch: [],
});
function validMatch(value: unknown): value is Match {
  if (!value || typeof value !== "object") return false;
  const m = value as Match;
  const uint = (v: unknown) =>
    typeof v === "string" && /^(0|[1-9]\d{0,127})$/.test(v);
  const pick = (v: unknown) =>
    !!v &&
    typeof v === "object" &&
    ["active", "idle"].includes((v as Pick).side) &&
    ((v as Pick).band === null ||
      ["low", "mid", "high"].includes((v as Pick).band!));
  if (
    typeof m.id !== "string" ||
    typeof m.installation !== "string" ||
    !["momentum", "mean-revert", "timekeeper"].includes(m.persona) ||
    !Array.isArray(m.legs) ||
    m.legs.length !== 3 ||
    !Number.isFinite(Date.parse(m.startedAt)) ||
    !(m.outcome === null || ["you", "brain", "tie"].includes(m.outcome))
  )
    return false;
  return m.legs.every((l, i) => {
    if (
      !l ||
      typeof l !== "object" ||
      !uint(l.round) ||
      !pick(l.brain) ||
      !Array.isArray(l.brain.weights) ||
      l.brain.weights.length !== 3 ||
      !l.brain.weights.every((v) => Number.isFinite(v) && v >= 0 && v <= 100) ||
      typeof l.brain.reasoning !== "string" ||
      !uint(l.brain.historyThrough) ||
      !Number.isFinite(l.brain.confidence) ||
      !Number.isFinite(l.brain.sampleSize) ||
      !l.distribution ||
      !uint(l.distribution.low) ||
      !uint(l.distribution.high) ||
      !Number.isFinite(l.distribution.count) ||
      !(l.player === null || pick(l.player))
    )
      return false;
    if (i && BigInt(l.round) !== BigInt(m.legs[0].round) + BigInt(i))
      return false;
    const r = l.result;
    return (
      r === null ||
      (!!r &&
        typeof r === "object" &&
        uint(r.work) &&
        ["low", "mid", "high"].includes(r.band) &&
        ["you", "brain", "tie"].includes(r.winner) &&
        Number.isInteger(r.youPoints) &&
        r.youPoints >= 0 &&
        r.youPoints <= 4 &&
        Number.isInteger(r.brainPoints) &&
        r.brainPoints >= 0 &&
        r.brainPoints <= 4 &&
        typeof r.missed === "boolean")
    );
  });
}
function loadSave(): Save {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null") as Save | null;
    if (
      !s ||
      s.version !== 1 ||
      typeof s.installation !== "string" ||
      !Array.isArray(s.matches) ||
      !Array.isArray(s.watch)
    )
      return emptySave();
    return {
      ...s,
      match: validMatch(s.match) ? s.match : null,
      matches: s.matches.filter(validMatch).slice(0, 30),
      watch: s.watch
        .filter(
          (w) =>
            w &&
            typeof w === "object" &&
            typeof w.round === "string" &&
            /^(0|[1-9]\d{0,127})$/.test(w.round) &&
            w.call &&
            Array.isArray(w.call.weights) &&
            w.call.weights.length === 3 &&
            w.call.weights.every(
              (v) => Number.isFinite(v) && v >= 0 && v <= 100,
            ) &&
            typeof w.call.reasoning === "string" &&
            ["active", "idle"].includes(w.call.side) &&
            (w.call.band === null ||
              ["low", "mid", "high"].includes(w.call.band)) &&
            Number.isFinite(w.call.confidence) &&
            (w.work === null ||
              (typeof w.work === "string" &&
                /^(0|[1-9]\d{0,127})$/.test(w.work))) &&
            (w.correct === null || typeof w.correct === "boolean") &&
            ["momentum", "mean-revert", "timekeeper"].includes(w.persona),
        )
        .slice(-30),
    };
  } catch {
    return emptySave();
  }
}

export function useGame() {
  const [data, setData] = useState<Snapshot | null>(null);
  const dataRef = useRef<Snapshot | null>(null);
  const cache = useRef<{
    settlements: Awaited<ReturnType<typeof getPublic>> | null;
    stats: Awaited<ReturnType<typeof getPublic>> | null;
    historyAt: number;
    statsAt: number;
  }>({ settlements: null, stats: null, historyAt: 0, statsAt: 0 });
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [save, setSave] = useState(loadSave);
  const saveRef = useRef(save);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [persona, setPersona] = useState<Persona>(
    save.match?.persona ?? "momentum",
  );
  const [spectating, setSpectating] = useState(false);
  const inFlight = useRef<Promise<Snapshot> | null>(null);
  const controllers = useRef(new Set<AbortController>());

  useEffect(() => {
    saveRef.current = save;
    try {
      localStorage.setItem(KEY, JSON.stringify(save));
    } catch {
      setStorageAvailable(false);
    }
  }, [save]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const refresh = useCallback((force = false): Promise<Snapshot> => {
    if (inFlight.current && !force) return inFlight.current;
    const run = async () => {
      const controller = new AbortController();
      controllers.current.add(controller);
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const status = await getPublic("/v1/status", controller.signal);
        const prev = dataRef.current;
        const rawBuilder = status.data.builder as
          | { anchor?: { settledThroughRound?: unknown } }
          | undefined;
        const rawAnchor = String(rawBuilder?.anchor?.settledThroughRound ?? "");
        const changed =
          prev?.anchor !== rawAnchor ||
          prev?.installation !== status.data.installationId;
        const t = Date.now();
        const [settlements, stats] = await Promise.all([
          force ||
          changed ||
          !cache.current.settlements ||
          t - cache.current.historyAt > 10000
            ? getPublic("/v1/settlements?range=now", controller.signal).then(
                (r) => {
                  cache.current.settlements = r;
                  cache.current.historyAt = t;
                  return r;
                },
              )
            : cache.current.settlements,
          force ||
          !cache.current.stats ||
          t - cache.current.statsAt > 60000 ||
          changed
            ? getPublic(
                "/v1/measurement/stats?range=7d",
                controller.signal,
              ).then((r) => {
                cache.current.stats = r;
                cache.current.statsAt = t;
                return r;
              })
            : cache.current.stats,
        ]);
        if (
          prev &&
          prev.installation === status.data.installationId &&
          /^\d+$/.test(rawAnchor) &&
          BigInt(rawAnchor) < BigInt(prev.anchor)
        )
          throw new Error(
            "Settlement anchor moved backwards. Waiting for consistent public data.",
          );
        const next = normalize(
          status.data,
          settlements.data,
          stats.data,
          prev && prev.installation === status.data.installationId
            ? prev.rounds
            : [],
          settlements.source,
        );
        // A slow older request cannot overwrite a newer confirmed anchor.
        if (
          dataRef.current?.installation === next.installation &&
          BigInt(dataRef.current.anchor) > BigInt(next.anchor)
        )
          return dataRef.current;
        dataRef.current = next;
        setData(next);
        setFailed(false);
        setError("");
        setNow(Date.now());
        return next;
      } catch (e) {
        if (!controller.signal.aborted || !document.hidden) {
          setFailed(true);
          setError(
            e instanceof Error ? e.message : "Unable to reach the public API.",
          );
        }
        throw e;
      } finally {
        clearTimeout(timeout);
        controllers.current.delete(controller);
      }
    };
    const promise = run();
    inFlight.current = promise;
    void promise
      .finally(() => {
        if (inFlight.current === promise) inFlight.current = null;
      })
      .catch(() => {});
    return promise;
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        await refresh();
      } catch {
        /* visible recovery next poll */
      }
      if (!stopped) timer = setTimeout(poll, 2000);
    };
    void poll();
    const onVisible = () => {
      if (!document.hidden) void refresh(true).catch(() => {});
    };
    window.addEventListener("online", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      controllers.current.forEach((c) => c.abort());
      window.removeEventListener("online", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const state = freshness(data, now, failed);
  useEffect(() => {
    if (!data || state !== "online") return;
    setSave((prev) => {
      if (prev.installation && prev.installation !== data.installation)
        return {
          ...emptySave(),
          installation: data.installation,
          matches: prev.matches,
        };
      let match = prev.match;
      let matches = prev.matches;
      if (match && !match.outcome) {
        const resolved = resolveMatch(
          match,
          data.anchor,
          data.rounds,
          new Date().toISOString(),
        );
        if (JSON.stringify(resolved) !== JSON.stringify(match))
          match = resolved;
        if (match.outcome && !matches.some((m) => m.id === match!.id))
          matches = [match, ...matches].slice(0, 30);
      }
      let watch = prev.watch.map((w) => {
        const r = data.rounds.find((r) => r.id === w.round);
        return w.work === null && BigInt(w.round) <= BigInt(data.anchor) && r
          ? {
              ...w,
              work: r.work,
              correct:
                w.call.side === (BigInt(r.work) > 0n ? "active" : "idle"),
            }
          : w;
      });
      const next = (BigInt(data.anchor) + 1n).toString();
      if (
        spectating &&
        data.rounds.length >= 3 &&
        !watch.some((w) => w.round === next && w.persona === persona)
      )
        watch = [
          ...watch,
          {
            round: next,
            persona,
            call: predict(persona, data.rounds, data.cadence, data.nextEnd),
            lockedAt: new Date().toISOString(),
            work: null,
            correct: null,
          },
        ].slice(-30);
      if (
        prev.installation === data.installation &&
        match === prev.match &&
        matches === prev.matches &&
        JSON.stringify(watch) === JSON.stringify(prev.watch)
      )
        return prev;
      return {
        version: 1,
        installation: data.installation,
        match,
        matches,
        watch,
      };
    });
  }, [data, state, persona, spectating]);

  const lock = async (pick: Pick) => {
    if (busy) return;
    const expectedAnchor = dataRef.current?.anchor;
    const expectedInstallation = dataRef.current?.installation;
    setBusy(true);
    setError("");
    try {
      const fresh = await refresh(true);
      if (
        freshness(fresh, Date.now(), false) !== "online" ||
        fresh.rounds.length < 3
      )
        throw new Error(
          "Fresh confirmed history is required. Try again when Online.",
        );
      const current = saveRef.current.match;
      const stamp = new Date().toISOString();
      if (!current || current.outcome) {
        if (
          expectedAnchor !== fresh.anchor ||
          expectedInstallation !== fresh.installation
        )
          throw new Error(
            "That round just settled. Review the new round and lock again.",
          );
        const match = newMatch(
          fresh.installation,
          persona,
          fresh.anchor,
          fresh.rounds,
          fresh.cadence,
          fresh.nextEnd,
          fresh.roundMs,
          { ...pick, band: pick.side === "idle" ? null : pick.band },
          stamp,
        );
        setSave((s) => ({ ...s, installation: fresh.installation, match }));
      } else {
        const leg = current.legs.find((l) => !l.result);
        if (!leg || leg.player) throw new Error("This call is already locked.");
        if (
          current.installation !== fresh.installation ||
          BigInt(leg.round) <= BigInt(fresh.anchor)
        )
          throw new Error(
            "That round just settled. Wait for the score to update.",
          );
        setSave((s) =>
          s.match?.id === current.id
            ? {
                ...s,
                match: {
                  ...current,
                  legs: current.legs.map((l) =>
                    l.round === leg.round
                      ? {
                          ...l,
                          player: {
                            ...pick,
                            band: pick.side === "idle" ? null : pick.band,
                          },
                          lockedAt: stamp,
                        }
                      : l,
                  ),
                },
              }
            : s,
        );
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to lock this call. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const reset = () => {
    setSave((s) => ({ ...s, match: null }));
    setError("");
  };
  const activeMatch = save.match;
  const leg =
    activeMatch && !activeMatch.outcome
      ? activeMatch.legs.find((l) => !l.result)
      : null;
  const preview =
    data && data.rounds.length >= 3
      ? predict(persona, data.rounds, data.cadence, data.nextEnd)
      : null;
  const watchCall = [...save.watch]
    .reverse()
    .find(
      (w) =>
        w.persona === persona &&
        w.work === null &&
        data &&
        BigInt(w.round) > BigInt(data.anchor),
    );
  const brain = spectating
    ? (watchCall?.call ?? preview)
    : (leg?.brain ?? preview);
  const round =
    (!spectating ? leg?.round : null) ??
    (data ? (BigInt(data.anchor) + 1n).toString() : null);
  const locked = Boolean(leg?.player);
  const canLock =
    state === "online" &&
    !!brain &&
    !locked &&
    !busy &&
    !activeMatch?.outcome &&
    (!leg || (!!data && BigInt(leg.round) > BigInt(data.anchor)));
  const knownRounds: Round[] = data?.rounds ?? [];
  return {
    data,
    state,
    error,
    now,
    save,
    persona,
    setPersona,
    spectating,
    setSpectating,
    storageAvailable,
    busy,
    lock,
    reset,
    refresh,
    brain,
    round,
    leg,
    locked,
    canLock,
    knownRounds,
  };
}
