import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
export async function preview() {
  const root = resolve("dist");
  const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".woff2": "font/woff2",
    ".txt": "text/plain",
  };
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, "http://localhost").pathname;
      if (!path.startsWith("/preview/")) {
        res.writeHead(404).end();
        return;
      }
      const relative =
        decodeURIComponent(path.slice("/preview/".length)) || "index.html";
      const file = resolve(root, relative);
      if (!file.startsWith(root + sep)) {
        res.writeHead(403).end();
        return;
      }
      const data = await readFile(file);
      res.setHeader(
        "content-type",
        types[extname(file)] ?? "application/octet-stream",
      );
      res.end(data);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return {
    url: `http://127.0.0.1:${server.address().port}/preview/`,
    close: () => new Promise((r) => server.close(r)),
  };
}
