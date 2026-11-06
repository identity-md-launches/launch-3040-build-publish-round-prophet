import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { chromium } = await import(
  process.env.ROUND_PROPHET_PLAYWRIGHT
    ? pathToFileURL(process.env.ROUND_PROPHET_PLAYWRIGHT).href
    : "playwright"
);
const ticks = Array.from(
  { length: 24 },
  (_, i) => `<path d="M1010 100v22" transform="rotate(${i * 15} 1010 320)"/>`,
).join("");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#141619"/>
<circle cx="1010" cy="320" r="290" fill="#1b2118"/>
<g fill="none" stroke="#c6ef86" stroke-width="5"><circle cx="1010" cy="320" r="210"/>${ticks}</g>
<g stroke="#414e33" stroke-width="2"><path d="M1010 140v360M830 320h360M880 190l260 260M880 450l260-260"/></g>
<path d="M1000 510l-30 44h80l-30-44" fill="none" stroke="#626953" stroke-width="8"/>
<g fill="#e9bd9e"><ellipse cx="1010" cy="429" rx="86" ry="65"/><ellipse cx="978" cy="370" rx="23" ry="36" transform="rotate(-20 978 370)"/><ellipse cx="1051" cy="369" rx="23" ry="36" transform="rotate(20 1051 369)"/></g>
<g fill="#bc8380"><ellipse cx="978" cy="370" rx="11" ry="22" transform="rotate(-20 978 370)"/><ellipse cx="1051" cy="369" rx="11" ry="22" transform="rotate(20 1051 369)"/></g>
<ellipse cx="1010" cy="459" rx="46" ry="32" fill="#f7ddbd"/>
<rect x="957" y="390" width="114" height="44" rx="18" fill="#242b21"/>
<path d="M976 407h24m27 0h24" stroke="#c6ef86" stroke-width="7" stroke-linecap="round"/>
<path d="m1003 447 8 4 7-4m-7 6v7m-10 0 10 5 10-5" fill="none" stroke="#795950" stroke-width="3" stroke-linecap="round"/>
<ellipse cx="968" cy="493" rx="20" ry="9" fill="#dcad91"/><ellipse cx="1053" cy="493" rx="20" ry="9" fill="#dcad91"/>
<g font-family="Space Grotesk, sans-serif" fill="#f4f1e9"><text x="64" y="98" font-size="32" font-weight="700">Round Prophet</text>
<text x="64" y="244" font-size="64" font-weight="700" letter-spacing="-2">You vs.</text><text x="64" y="320" font-size="64" font-weight="700" letter-spacing="-2" fill="#c6ef86">Wheel Brain.</text></g>
<g font-family="DM Sans, sans-serif" fill="#a4aaa9"><text x="66" y="387" font-size="26">One wheel. Two minds. Your call.</text><text x="66" y="497" font-size="22">Real hamster rounds. Best of three.</text><text x="66" y="537" font-size="18">Community game · no real-money betting</text></g></svg>`;
await writeFile("public/social-card.svg", svg);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  const dm = (await readFile("public/fonts/dm-sans-latin.woff2")).toString(
    "base64",
  );
  const space = (
    await readFile("public/fonts/space-grotesk-latin.woff2")
  ).toString("base64");
  await page.setContent(
    `<style>@font-face{font-family:'DM Sans';src:url(data:font/woff2;base64,${dm});font-weight:400 700}@font-face{font-family:'Space Grotesk';src:url(data:font/woff2;base64,${space});font-weight:400 700}body{margin:0}</style>${svg}`,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "public/social-card.png" });
  console.log("Generated original 1200 × 630 social card.");
} finally {
  await browser.close();
}
