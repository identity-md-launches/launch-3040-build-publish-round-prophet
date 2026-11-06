import { readdir, stat, writeFile, lstat, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
const limit = 8 * 1024 * 1024;
const artifactLimit = 2 * 1024 * 1024;
const reportPath = "artifacts/submission-budget.json";
const omitted = new Set([
  ".git",
  ".github",
  ".imd",
  "node_modules",
  ".npm",
  ".vite",
  ".cache",
  "coverage",
]);
const files = [];
async function walk(dir = ".") {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name),
      name = relative(".", path).split("\\").join("/");
    if (
      omitted.has(entry.name) ||
      entry.name.startsWith(".env") ||
      name === "test/scratch"
    )
      continue;
    if (entry.isSymbolicLink())
      throw new Error(`Unexpected symlink in submission: ${name}`);
    if (entry.isDirectory()) await walk(path);
    else if (name !== reportPath) {
      if (/\.(tgz|zip|tar|gz)$/.test(name))
        throw new Error(`Unexpected packaging archive: ${name}`);
      files.push({ path: name, bytes: (await stat(path)).size });
    }
  }
}
await walk();
files.sort((a, b) => a.path.localeCompare(b.path));
files.push({ path: reportPath, bytes: 0 });
const ignoredPathBudget = {
  "**/node_modules/": 0,
  "**/.npm/": 0,
  "**/.vite/": 0,
  "**/.cache/": 0,
  "**/coverage/": 0,
  "/test/scratch/": 0,
};
let serialized = "";
for (let i = 0; i < 10; i++) {
  const total = files.reduce((n, f) => n + f.bytes, 0);
  const report = {
    limitBytes: limit,
    addedBytes: total,
    remainingBytes: limit - total,
    fileCount: files.length,
    artifactBytes: files
      .filter((f) => f.path.startsWith("artifacts/"))
      .reduce((n, f) => n + f.bytes, 0),
    includedPathBudget: { "/artifacts/**": artifactLimit },
    distBytes: files
      .filter((f) => f.path.startsWith("dist/"))
      .reduce((n, f) => n + f.bytes, 0),
    ignoredPathBudget,
    files,
  };
  serialized = JSON.stringify(report, null, 2) + "\n";
  const size = Buffer.byteLength(serialized);
  if (files.at(-1).bytes === size) break;
  files.at(-1).bytes = size;
}
await writeFile(reportPath, serialized);
const total = files.reduce((n, f) => n + f.bytes, 0);
if (total > limit) throw new Error(`Submission exceeds 8 MiB: ${total} bytes`);
const artifactBytes = files
  .filter((f) => f.path.startsWith("artifacts/"))
  .reduce((n, f) => n + f.bytes, 0);
if (artifactBytes > artifactLimit)
  throw new Error(
    `Artifacts exceed explicit 2 MiB path budget: ${artifactBytes} bytes`,
  );
const html = await readFile("dist/index.html", "utf8");
for (const match of html.matchAll(
  /(?:src|href|content)="(\.\/[^"?#]+)(?:[?#][^"]*)?"/g,
))
  await lstat(join("dist", match[1]));
if (/(?:src|href)="\/(?!\/)/.test(html))
  throw new Error("Root-relative asset in export");
console.log(
  `${files.length} files; ${total.toLocaleString("en-US")} / ${limit.toLocaleString("en-US")} bytes. Relative export assets exist. No symlinks or dependency archives included.`,
);
