import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
const root = fileURLToPath(new URL("./public/", import.meta.url));
const require = createRequire(import.meta.url);
const QR = require("./public/vendor/QRCode/index.js");
const streams = new Set();
const sessionId = randomUUID();
let seq = 0,
  epoch = 0,
  clock = 0,
  started = null,
  preset = "fire",
  origin = 0,
  refuge = false;
const time = () =>
  clock + (started === null ? 0 : (Date.now() - started) / 1000);
const snapshot = () => ({
  sessionId,
  epoch,
  seq,
  t: time(),
  running: started !== null,
  preset,
  origin,
  refuge,
  timestamp: Date.now(),
  incidentId: "walk-" + epoch,
  eventId: epoch + "-" + seq,
  floor: "1",
  zone: {
    fire: "fire-room",
    smoke: "east-hall",
    blocked: "east-door,west-door",
  }[preset],
  source: "illustrative-zone-model",
});
function broadcast() {
  for (const res of streams)
    res.write("data: " + JSON.stringify(snapshot()) + "\n\n");
}
setInterval(broadcast, 1000).unref();
function handle(req, res) {
  const url = new URL(req.url, "http://localhost");
  const json = (code, obj) => {
    res.writeHead(code, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    res.end(JSON.stringify(obj));
  };
  if (req.method === "GET" && url.pathname === "/api/state")
    return json(200, snapshot());
  if (req.method === "GET" && url.pathname === "/api/events") {
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      "x-accel-buffering": "no",
      connection: "keep-alive",
    });
    streams.add(res);
    res.write("data: " + JSON.stringify(snapshot()) + "\n\n");
    res.on("close", () => streams.delete(res));
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/control") {
    if (req.headers.origin !== undefined) {
      try {
        const origin = new URL(req.headers.origin);
        // Permit the documented HTTPS reverse proxy to forward to local HTTP.
        if (!["http:", "https:"].includes(origin.protocol) || origin.host !== req.headers.host)
          return json(403, { error: "Origin not allowed" });
      } catch {
        return json(403, { error: "Origin not allowed" });
      }
    }
    const op = url.searchParams.get("op");
    if (op === "reset") {
      epoch++;
      clock = 0;
      started = null;
      preset = "fire";
      origin = 0;
      refuge = false;
    } else if (op === "start") {
      started ??= Date.now();
    } else if (op === "pause") {
      clock = time();
      started = null;
    } else if (["fire", "smoke", "blocked"].includes(op)) {
      preset = op;
      origin = time();
      refuge = false;
    } else if (op === "refuge") {
      refuge = !refuge;
    } else return json(400, { error: "Unknown control" });
    seq++;
    broadcast();
    return json(200, snapshot());
  }
  if (req.method === "GET" && url.pathname === "/api/qr.svg") {
    const value = url.searchParams.get("url") || "";
    if (!/^https?:\/\//.test(value) || value.length > 250)
      return json(400, { error: "Invalid URL" });
    const qr = new QR(-1, 1);
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++)
        if (qr.isDark(y, x)) d += "M" + (x + 4) + " " + (y + 4) + "h1v1h-1z";
    res.writeHead(200, { "content-type": "image/svg+xml" });
    return res.end(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
        (n + 8) +
        " " +
        (n + 8) +
        '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d="' +
        d +
        '"/></svg>',
    );
  }
  const file =
    url.pathname === "/" || url.pathname === "/presenter"
      ? "index.html"
      : url.pathname.slice(1);
  if (req.method !== "GET" || !/^([a-zA-Z0-9_-]+\.)+(js|css|html)$/.test(file))
    return json(404, {});
  const f = path.join(
    root,
    file === "presenter.js" ? "compiled/presenter.js" : file,
  );
  if (!fs.existsSync(f)) return json(404, {});
  res.writeHead(200, {
    "content-type":
      { ".js": "text/javascript", ".css": "text/css", ".html": "text/html" }[
        path.extname(f)
      ] + "; charset=utf-8",
    "cache-control": "no-cache",
  });
  fs.createReadStream(f).pipe(res);
}
const tls = process.env.TLS_CERT && process.env.TLS_KEY;
const server = tls
  ? https.createServer(
      {
        cert: fs.readFileSync(process.env.TLS_CERT),
        key: fs.readFileSync(process.env.TLS_KEY),
      },
      handle,
    )
  : http.createServer(handle);
server.listen(
  Number(process.env.PORT || 4173),
  process.env.HOST || "127.0.0.1",
  () =>
    console.log(
      "Wayfind: " +
        (tls ? "https" : "http") +
        "://" +
        (process.env.HOST || "127.0.0.1") +
        ":" +
        server.address().port +
        "  |  Presenter: /presenter",
    ),
);
