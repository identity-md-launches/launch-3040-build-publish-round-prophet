import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { coldHistory, fixtureApi } from "./fixtures.ts";
import { preview } from "./server.mjs";
const load = (name, env) =>
  import(process.env[env] ? pathToFileURL(process.env[env]).href : name);
const { chromium } = await load("playwright", "ROUND_PROPHET_PLAYWRIGHT");
const { default: AxeBuilder } = await load(
  "@axe-core/playwright",
  "ROUND_PROPHET_AXE",
);
await mkdir("test/scratch/browser", { recursive: true });
const server = await preview();
const browser = await chromium.launch({ headless: true });
const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`PASS ${name}`);
  } catch (e) {
    results.push({ name, passed: false, error: e.stack });
    console.error(`FAIL ${name}: ${e.message}`);
    throw e;
  }
};
let contexts = [];
async function setup(width = 390) {
  const context = await browser.newContext({
    viewport: { width, height: 844 },
    acceptDownloads: true,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  contexts.push(context);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const model = {
    rounds: coldHistory(),
    offline: false,
    stale: false,
    lag: false,
    statusCalls: 0,
    historyCalls: 0,
    statsCalls: 0,
  };
  await page.route("https://api.squeekchain.com/**", async (route) => {
    if (model.offline) {
      await route.fulfill({
        status: 503,
        body: '{"error":"synthetic-test-outage"}',
        contentType: "application/json",
      });
      return;
    }
    const path = new URL(route.request().url()).pathname;
    const f = fixtureApi(model.rounds, new Date().toISOString());
    if (model.stale) f.status.measurement.freshness = "stale";
    if (model.lag)
      f.status.generatedAt = new Date(Date.now() - 60000).toISOString();
    if (path === "/v1/status") model.statusCalls++;
    if (path === "/v1/settlements") model.historyCalls++;
    if (path === "/v1/measurement/stats") model.statsCalls++;
    const body =
      path === "/v1/status"
        ? f.status
        : path === "/v1/settlements"
          ? f.settlements
          : f.stats;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "access-control-allow-origin": "*",
        "x-squeek-settlement-source": "live",
      },
      body: JSON.stringify(body),
    });
  });
  await page.goto(server.url);
  await page.getByRole("button", { name: "Lock & start duel" }).waitFor();
  await page.waitForFunction(
    () => !document.querySelector(".lock-cta").disabled,
  );
  return { context, page, model, errors };
}
const settle = (model, work) => {
  model.rounds.push({
    id: String(model.rounds.length + 1),
    work,
    endedAt: null,
  });
};
const saved = (page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem("round-prophet:season:v1")),
  );
const next = async (page) => {
  await page.getByRole("button", { name: "Lock this round" }).waitFor();
  await page.waitForFunction(
    () => !document.querySelector(".lock-cta").disabled,
  );
};
try {
  await check(
    "390 first screen: product, persona and primary action; 320/760/1024/1440 reflow",
    async () => {
      const { page, model } = await setup();
      for (const width of [320, 390, 760, 1024, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        await page.evaluate(() => document.fonts.ready);
        const measurements = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          width: innerWidth,
          cta: document
            .querySelector(".lock-cta")
            .getBoundingClientRect()
            .toJSON(),
        }));
        assert.ok(
          measurements.scroll <= width,
          `overflow at ${width}: ${measurements.scroll}`,
        );
        if (width === 390)
          assert.ok(
            measurements.cta.bottom <= 844,
            `CTA ends at ${measurements.cta.bottom}`,
          );
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "200%";
      });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        390,
      );
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "";
      });
      await page
        .locator(".mobile-persona-control select")
        .selectOption("timekeeper");
      assert.equal(await page.locator("#persona").inputValue(), "timekeeper");
      await page
        .locator(".mobile-persona-control select")
        .selectOption("mean-revert");
      assert.match(
        await page.locator(".persona-description").innerText(),
        /Fades/,
      );
      await page
        .locator(".mobile-persona-control select")
        .selectOption("momentum");
      await page.getByRole("button", { name: "Idle Zero work" }).click();
      assert.equal(
        await page
          .getByRole("button", { name: "High", exact: true })
          .isDisabled(),
        true,
      );
      await page.getByRole("button", { name: "Active Work > 0" }).click();
      await page.getByRole("button", { name: "High", exact: true }).click();
      assert.equal(
        await page
          .getByRole("button", { name: "High", exact: true })
          .getAttribute("aria-pressed"),
        "true",
      );
      await page.screenshot({
        path: "test/scratch/browser/arena-390.png",
        fullPage: true,
      });
      assert.ok(model.statusCalls >= 1);
    },
  );
  await check(
    "complete three-round 2–1 duel, restore locks, freeze Brain, download and copy share card",
    async () => {
      const { page, model, errors } = await setup();
      await page.getByRole("button", { name: "High", exact: true }).click();
      await page.getByRole("button", { name: "Lock & start duel" }).click();
      await page.getByRole("button", { name: "Prediction locked" }).waitFor();
      const committed = (await saved(page)).match.legs.map((l) => l.brain);
      assert.ok(
        await page.locator(".mobile-persona-control select").isDisabled(),
      );
      await page.reload();
      await page.getByRole("button", { name: "Prediction locked" }).waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "High", exact: true })
          .getAttribute("aria-pressed"),
        "true",
      );
      settle(model, "200");
      await next(page);
      assert.match(
        await page.locator(".scoreboard").getAttribute("aria-label"),
        /You 1, Brain 0/,
      );
      await page.getByRole("button", { name: "Lock this round" }).click();
      await page.getByRole("button", { name: "Prediction locked" }).waitFor();
      settle(model, "0");
      await next(page);
      assert.match(
        await page.locator(".scoreboard").getAttribute("aria-label"),
        /You 1, Brain 1/,
      );
      await page.getByRole("button", { name: "High", exact: true }).click();
      await page.getByRole("button", { name: "Lock this round" }).click();
      await page.getByRole("button", { name: "Prediction locked" }).waitFor();
      settle(model, "200");
      await page
        .getByRole("heading", { name: "Broke the Brain.", exact: true })
        .waitFor();
      const state = await saved(page);
      assert.deepEqual(
        state.match.legs.map((l) => l.brain),
        committed,
      );
      assert.equal(state.matches.length, 1);
      assert.equal(state.match.outcome, "you");
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Save share card" }).click();
      const file = await download;
      await file.saveAs("test/scratch/browser/share-card.png");
      const png = await readFile("test/scratch/browser/share-card.png");
      assert.equal(png.toString("hex", 0, 8), "89504e470d0a1a0a");
      assert.equal(png.readUInt32BE(16), 1200);
      assert.equal(png.readUInt32BE(20), 630);
      await page.getByRole("button", { name: "Copy match text" }).click();
      await page.getByText("Match text copied.", { exact: true }).waitFor();
      assert.match(
        await page.evaluate(() => navigator.clipboard.readText()),
        /2–1 on rounds 21–23/,
      );
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {writeText: async () => {
          throw new Error("Synthetic clipboard denial");
        }}});
      });
      await page.getByRole("button", { name: "Copy match text" }).click();
      const fallback = page.locator('.copy-fallback textarea');
      await fallback.waitFor();
      assert.match(await fallback.inputValue(), /2–1 on rounds 21–23/);
      await fallback.focus();
      assert.ok(
        await fallback.evaluate(
          (el) =>
            el.selectionStart === 0 && el.selectionEnd === el.value.length,
        ),
      );
      await page.screenshot({
        path: "test/scratch/browser/victory-390.png",
        fullPage: true,
      });
      await page.getByRole("button", { name: "History", exact: true }).click();
      await page
        .getByRole("button", { name: /Broke the Brain Momentum/ })
        .click();
      await page
        .getByRole("heading", { name: "From your matchbook" })
        .waitFor();
      assert.deepEqual(errors, []);
    },
  );
  await check(
    "a 2–0 duel ends early and rematch resets the arena",
    async () => {
      const { page, model } = await setup();
      await page.getByRole("button", { name: "Lock & start duel" }).click();
      await page.getByRole("button", { name: "Prediction locked" }).waitFor();
      settle(model, "200");
      await next(page);
      await page.getByRole("button", { name: "Lock this round" }).click();
      await page.getByRole("button", { name: "Prediction locked" }).waitFor();
      settle(model, "200");
      await page
        .getByRole("heading", { name: "Broke the Brain.", exact: true })
        .waitFor();
      assert.equal((await saved(page)).match.legs[2].result, null);
      assert.match(
        await page.locator(".match-rounds li").nth(2).innerText(),
        /Not needed/,
      );
      await page.getByRole("button", { name: "Play another duel" }).click();
      await page.getByRole("button", { name: "Lock & start duel" }).waitFor();
      assert.equal((await saved(page)).match, null);
    },
  );
  await check(
    "API outage pauses locks and scoring; recovery resolves a genuinely settled round",
    async () => {
      const { page, model } = await setup();
      await page.getByRole("button", { name: "Idle Zero work" }).click();
      await page.getByRole("button", { name: "Lock & start duel" }).click();
      await page.getByRole("button", { name: "Prediction locked" }).waitFor();
      await page.reload();
      await page.getByRole("button", { name: "Prediction locked" }).waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Idle Zero work" })
          .getAttribute("aria-pressed"),
        "true",
      );
      model.offline = true;
      settle(model, "0");
      await page.locator(".freshness.offline").waitFor();
      const pausedCta = await page.locator(".lock-cta").boundingBox();
      assert.ok(pausedCta.y + pausedCta.height <= 844);
      assert.equal((await saved(page)).match.legs[0].result, null);
      assert.equal(await page.locator(".lock-cta").isDisabled(), true);
      model.offline = false;
      await page.getByRole("button", { name: "Retry feed" }).click();
      await next(page);
      assert.equal((await saved(page)).match.legs[0].result.winner, "tie");
    },
  );
  await check(
    "stale measurement and old status stop locks; retry returns to Online",
    async () => {
      const { page, model } = await setup();
      model.stale = true;
      await page.locator(".freshness.stale").waitFor();
      assert.ok(await page.locator(".lock-cta").isDisabled());
      model.stale = false;
      model.lag = true;
      await page.getByRole("button", { name: "Retry feed" }).click();
      assert.ok(await page.locator(".lock-cta").isDisabled());
      model.lag = false;
      await page.getByRole("button", { name: "Retry feed" }).click();
      await page.waitForFunction(
        () => !document.querySelector(".lock-cta").disabled,
      );
    },
  );
  await check(
    "consecutive missed calls yield explicit forfeits and Brain holds",
    async () => {
      const { page, model } = await setup();
      await page.getByRole("button", { name: "Lock & start duel" }).click();
      await page.getByRole("button", { name: "Prediction locked" }).waitFor();
      settle(model, "0");
      await next(page);
      settle(model, "0");
      await page
        .getByRole("heading", { name: "Brain holds.", exact: true })
        .waitFor();
      assert.equal((await saved(page)).match.legs[1].result.missed, true);
      assert.match(
        await page.locator(".match-rounds li").nth(1).innerText(),
        /Missed call/,
      );
    },
  );
  await check(
    "three equal calls produce a draw with no fabricated winner",
    async () => {
      const { page, model } = await setup();
      await page.getByRole("button", { name: "Idle Zero work" }).click();
      await page.getByRole("button", { name: "Lock & start duel" }).click();
      await page.getByRole("button", { name: "Prediction locked" }).waitFor();
      for (let i = 0; i < 3; i++) {
        settle(model, "0");
        if (i < 2) {
          await next(page);
          await page.getByRole("button", { name: "Idle Zero work" }).click();
          await page.getByRole("button", { name: "Lock this round" }).click();
          await page
            .getByRole("button", { name: "Prediction locked" })
            .waitFor();
        }
      }
      await page
        .getByRole("heading", { name: "Great minds. Same calls.", exact: true })
        .waitFor();
      assert.equal((await saved(page)).match.outcome, "tie");
    },
  );
  await check(
    "spectator calls lock before settlement and are graded only once",
    async () => {
      const { page, model } = await setup();
      await page.getByRole("button", { name: "Spectate", exact: true }).click();
      await page.waitForFunction(
        () =>
          JSON.parse(localStorage.getItem("round-prophet:season:v1")).watch
            .length === 1,
      );
      const before = (await saved(page)).watch[0];
      settle(model, "0");
      await page.locator(".watch-history .success-text").waitFor();
      const watch = (await saved(page)).watch;
      assert.equal(watch.length, 2);
      assert.deepEqual(watch[0].call, before.call);
      assert.equal(watch[0].correct, true);
      assert.equal(watch[1].work, null);
      await page.screenshot({
        path: "test/scratch/browser/spectator-390.png",
        fullPage: true,
      });
    },
  );
  await check(
    "keyboard help dialog traps focus, Escape closes, focus returns; reduced motion and axe audit",
    async () => {
      const { page, errors } = await setup();
      const help = page.getByRole("button", { name: "How to play" });
      await help.focus();
      await page.keyboard.press("Enter");
      await page.getByRole("dialog").waitFor();
      assert.ok(await page.locator("dialog").evaluate((d) => d.open));
      for (let i = 0; i < 7; i++) {
        await page.keyboard.press("Tab");
        assert.ok(
          await page.evaluate(() => !!document.activeElement.closest("dialog")),
        );
      }
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("dialog").evaluate((d) => d.open), false);
      assert.equal(
        await help.evaluate((el) => el === document.activeElement),
        true,
      );
      await page.getByRole("button", { name: "Lock & start duel" }).click();
      await page.getByRole("button", { name: "Prediction locked" }).waitFor();
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(
        await page
          .locator(".wheel-rim")
          .evaluate((el) => getComputedStyle(el).animationName),
        "none",
      );
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      await writeFile(
        "test/scratch/browser/axe.json",
        JSON.stringify(axe.violations, null, 2),
      );
      assert.deepEqual(
        axe.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => n.target),
        })),
        [],
      );
      assert.deepEqual(errors, []);
    },
  );
  await check(
    "a round that settles during lock is rejected instead of silently moving the call",
    async () => {
      const { page, model } = await setup();
      settle(model, "0");
      await page.getByRole("button", { name: "Lock & start duel" }).click();
      await page
        .getByText(
          "That round just settled. Review the new round and lock again.",
          { exact: true },
        )
        .waitFor();
      assert.equal((await saved(page)).match, null);
      await page.getByRole("button", { name: "Lock & start duel" }).click();
      await page.getByRole("button", { name: "Prediction locked" }).waitFor();
      assert.equal((await saved(page)).match.legs[0].round, "22");
    },
  );
  await check(
    "corrupt browser storage recovers to an honest empty game",
    async () => {
      const { page } = await setup();
      await page.evaluate(() =>
        localStorage.setItem(
          "round-prophet:season:v1",
          '{"version":1,"match":"corrupt"}',
        ),
      );
      await page.reload();
      await page.waitForFunction(
        () => !document.querySelector(".lock-cta").disabled,
      );
      assert.equal((await saved(page)).match, null);
    },
  );
} finally {
  await writeFile(
    "test/scratch/browser/results.json",
    JSON.stringify(results, null, 2),
  );
  for (const context of contexts) await context.close();
  await browser.close();
  await server.close();
  console.log(
    `${results.filter((r) => r.passed).length}/${results.length} browser scenarios passed.`,
  );
}
