import { nodes, edges, metres, plan, signedAngle, canTraverse } from "./model.js";
import { createSnapshotGate, connectIncidentFeed } from "./connection.js";
import { incident } from "./forecast.js";
import { mapMarkup, icon } from "./map.js";
import { referenceMap } from "./reference.js";
const $ = (s) => document.querySelector(s),
  root = $("#root"),
  dialog = $("#dialog");
const presenter = location.pathname === "/presenter";
const btn = (act, label, key = "", cls = "") =>
  '<button class="' +
  cls +
  '" data-act="' +
  act +
  '" aria-label="' +
  label +
  '">' +
  (key ? icon(key) : "") +
  (cls.includes("round") ? "" : label) +
  "</button>";
const brand =
  '<div class="brand"><span class="brandmark"><svg viewBox="0 0 32 32" fill="none"><path d="m4 23 8-16 4 9 4-9 7 16h-6l-2-5-3 7-5-9-3 7z" fill="currentColor"/></svg></span>Wayfind</div>';
const header =
  '<header class="top">' +
  brand +
  '<div class="right"><span class="sim">Simulation</span>' +
  btn("menu", "Options", "menu", "round") +
  "</div></header>";
let state = {
    epoch: -1,
    seq: 0,
    t: 0,
    running: false,
    preset: "fire",
    origin: 0,
    refuge: false,
  },
  last = 0,
  connected = false;
let browsing = false;
let floor = "1",
  source = "Demo walker",
  node = "start",
  pos = [...nodes.start],
  next = null,
  progress = 0,
  lastConfirmed = Date.now(),
  landmark = "start",
  locQuality = "",
  locWatch = null;
let stream = null,
  heading = null,
  headingAt = 0,
  camToken = 0,
  camStatus = "",
  inCamera = false,
  toastTimer,
  geoToken = 0;
let viewport = null,
  pan = null,
  follow = true,
  shownAt = 0,
  notice = "",
  noticeUntil = 0,
  lastRoute = "",
  frameTime = performance.now(),
  pending = 0;
let lastIncidentTime = 0,
  inbound = null;
const escapeHTML = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (k) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        k
      ],
  );
function toast(msg) {
  $("#toast").textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("#toast").textContent = ""), 1800);
}
const err = () => toast("Scenario connection unavailable");
async function control(op) {
  try {
    const r = await fetch("/api/control?op=" + op, { method: "POST" });
    if (!r.ok) throw Error();
    accept(await r.json());
  } catch {
    err();
  }
}
async function refresh() {
  const r = await fetch("/api/state", { cache: "no-store" });
  if (!r.ok) throw Error();
  accept(await r.json());
}
const acceptSnapshot = createSnapshotGate();
function accept(s) {
  if (!acceptSnapshot(s)) return;
  if (s.sessionId !== state.sessionId || s.epoch !== state.epoch) {
    if (source === "Demo walker") resetPosition();
    lastRoute = "";
    notice = "";
    lastIncidentTime = s.t;
    pending = 0;
  }
  if (s.preset !== state.preset) lastRoute = currentRoute()?.id || "";
  if (source === "Demo walker" && s.t >= lastIncidentTime)
    pending += s.t - lastIncidentTime;
  lastIncidentTime = s.t;
  state = s;
  last = Date.now();
  connected = true;
  render();
}
function resetPosition() {
  inbound = null;
  browsing = false;
  node = "start";
  pos = [...nodes.start];
  next = null;
  progress = 0;
  landmark = node;
  lastConfirmed = Date.now();
  floor = "1";
  follow = true;
  viewport = null;
}
function h() {
  return incident(state.preset, state.t, state.origin, state.refuge);
}
function stale() {
  return !navigator.onLine || !connected || Date.now() - last > 4500;
}
function ambiguous() {
  return (
    source === "Live location" ||
    (source === "Confirmed landmark" && Date.now() - lastConfirmed > 90000)
  );
}
function currentRoute() {
  if (ambiguous() || stale()) return null;
  // Mid-edge routing models both endpoints with the distance still to walk.
  if (next) {
    const zone = edges.find(
      ([a, b]) => (a === node && b === next) || (a === next && b === node),
    )?.[2];
    const hazard = h(),
      candidates = [];
    for (const id of [node, next]) {
      const d = metres(pos, nodes[id]);
      if (!canTraverse(zone, state.t + d / 1.25, hazard)) continue;
      const tail = plan(id, state.t + d / 1.25, hazard);
      if (tail)
        candidates.push({
          ...tail,
          distance: tail.distance + d,
          path: ["position", ...tail.path],
        });
    }
    return candidates.sort(
      (a, b) =>
        (a.kind === "refuge") - (b.kind === "refuge") ||
        a.distance - b.distance,
    )[0];
  }
  return plan(node, state.t, h());
}
function walk(seconds) {
  let budget = seconds * 1.25;
  for (let i = 0; i < 12 && budget > 0.0001; i++) {
    const route = currentRoute(),
      target = route?.path[1];
    if (!target) break;
    const end = nodes[target],
      d = metres(pos, end);
    if (!next) {
      next = target;
      progress = 0;
    }
    if (d <= budget) {
      budget -= d;
      inbound = (Math.atan2(end[0] - pos[0], pos[1] - end[1]) * 180) / Math.PI;
      node = target;
      pos = [...end];
      next = null;
      landmark = node;
      lastConfirmed = Date.now();
    } else {
      const f = budget / d;
      pos = [pos[0] + (end[0] - pos[0]) * f, pos[1] + (end[1] - pos[1]) * f];
      budget = 0;
    }
  }
}
function guide(route) {
  if (stale()) return ["Guidance paused", "Incident feed unavailable", "info"];
  if (ambiguous())
    return [
      "Confirm your location",
      locQuality || "Select a known landmark",
      "pin",
    ];
  if (!route)
    return [
      "No verified route available",
      "Follow posted procedures and responder directions.",
      "aid",
    ];
  if (route.path.length === 1)
    return [
      route.kind === "refuge" ? "At training refuge" : "Exit reached",
      nodes[node][2] + " · Training layout",
      "exit",
    ];
  const dest = route.kind === "refuge" ? "Training refuge" : nodes[route.id][2];
  const a = nodes[route.path[1]],
    dir =
      Math.abs(a[0] - pos[0]) > Math.abs(a[1] - pos[1])
        ? a[0] > pos[0]
          ? "east"
          : "west"
        : a[1] > pos[1]
          ? "south"
          : "north";
  let maneuver = "Head " + dir;
  if (inbound !== null && source === "Demo walker") {
    const toward = (Math.atan2(a[0] - pos[0], pos[1] - a[1]) * 180) / Math.PI;
    const turn = signedAngle(toward - inbound);
    maneuver =
      Math.abs(turn) > 145
        ? "Turn around"
        : turn > 40
          ? "Turn right"
          : turn < -40
            ? "Turn left"
            : "Continue straight";
  }
  return [
    route.kind === "refuge" ? "Route to training refuge" : maneuver,
    Math.ceil(route.distance) +
      " m to " +
      dest +
      (route.kind === "refuge" ? " · No exit route" : ""),
    "up",
  ];
}
function openSheet(title, body, actions = "") {
  dialog.innerHTML =
    "<h2>" +
    title +
    "</h2>" +
    body +
    '<div class="actions">' +
    actions +
    btn("close", "Close") +
    "</div>";
  if (!dialog.open) dialog.showModal();
}
const links =
  '<p><a href="https://students.ans.org/wp-content/uploads/2016/12/2015TAMU.pdf#page=29" target="_blank" rel="noreferrer">Historical three-floor diagram · ANS 2015, p. 29</a></p><p><a href="https://ucenter.tamu.edu/facilities/memorial-student-center/" target="_blank" rel="noreferrer">MSC facility information</a></p><p>Archived event-map references (availability varies): <a href="https://clubcrawl.tamu.edu/wp-content/uploads/2026/01/ClubCrawlSpring2026-Maps_website_MSC-1stFloor.pdf" target="_blank" rel="noreferrer">TAMU first-floor reference</a> · <a href="https://clubcrawl.tamu.edu/wp-content/uploads/2026/01/ClubCrawlSpring2026-Maps_website_MSC-2ndFloor.pdf" target="_blank" rel="noreferrer">Second floor</a></p>';
function helpFields() {
  return (
    "<p>Building context: Memorial Student Center<br>Layout: fictional training fixture<br>Floor / landmark: " +
    (source === "Live location" ? "Unknown" : "1 / " + nodes[landmark][2]) +
    "<br>Position source: " +
    source +
    "<br>Last confirmation: " +
    (source === "Live location"
      ? "Unknown"
      : new Date(lastConfirmed).toLocaleTimeString()) +
    "</p>"
  );
}
function stopGeo() {
  geoToken++;
  if (locWatch !== null) navigator.geolocation?.clearWatch(locWatch);
  locWatch = null;
}
function locate() {
  stopGeo();
  const token = geoToken;
  source = "Live location";
  locQuality = "This training map has no geographic calibration.";
  pending = 0;
  openLandmarks();
  if (navigator.geolocation)
    locWatch = navigator.geolocation.watchPosition(
      (fix) => {
        if (token !== geoToken) return;
        locQuality =
          "Device accuracy ±" +
          Math.round(fix.coords.accuracy) +
          " m · uncalibrated map";
        if (dialog.open && dialog.dataset.mode === "locate") openLandmarks();
        render();
      },
      () => {
        if (token === geoToken) {
          locQuality = "Device position unavailable";
          render();
        }
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 9000 },
    );
  render();
}
function openLandmarks() {
  openSheet(
    "Confirm your location",
    "<p>" +
      escapeHTML(locQuality) +
      " Pick a landmark for the fictional training walk.</p>",
    ["start", "j", "east", "west"]
      .map((n) => btn("land-" + n, nodes[n][2]))
      .join(""),
  );
  dialog.dataset.mode = "locate";
}
function orientation(e) {
  let a = e.webkitCompassHeading;
  if (!(Number.isFinite(a) && a >= 0) && e.absolute && Number.isFinite(e.alpha))
    a = 360 - e.alpha;
  if (!Number.isFinite(a) || a < 0) return;
  const raw = a + (screen.orientation?.angle ?? window.orientation ?? 0);
  heading =
    heading === null ? raw : heading + signedAngle(raw - heading) * 0.55;
  headingAt = Date.now();
  cameraContent();
}
function stopCamera() {
  camToken++;
  inCamera = false;
  $("#mini").replaceChildren();
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  window.removeEventListener("deviceorientation", orientation);
  window.removeEventListener("deviceorientationabsolute", orientation);
  heading = null;
  $("#camera").hidden = true;
  $("#video").srcObject = null;
}
async function camera() {
  const token = ++camToken;
  inCamera = true;
  camStatus = "Opening camera…";
  $("#camera").hidden = false;
  render();
  const orient = window.DeviceOrientationEvent;
  let permission;
  try {
    permission = orient?.requestPermission
      ? orient.requestPermission()
      : Promise.resolve("granted");
  } catch {
    permission = Promise.resolve("denied");
  }
  Promise.resolve(permission)
    .then((p) => {
      if (p === "granted" && token === camToken) {
        window.addEventListener("deviceorientation", orientation);
        window.addEventListener("deviceorientationabsolute", orientation);
      }
    })
    .catch(() => {});
  try {
    const media = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    if (token !== camToken) {
      media.getTracks().forEach((t) => t.stop());
      return;
    }
    stream = media;
    $("#video").srcObject = stream;
    await $("#video").play();
    camStatus = "";
  } catch {
    if (token === camToken) camStatus = "Camera preview · Camera unavailable";
  }
  render();
}
function cameraContent() {
  if (!inCamera) return;
  const route = currentRoute(),
    target = route?.path[1],
    g = guide(route);
  $("#camtitle").textContent = g[0];
  $("#camdetail").textContent = g[1];
  const arrow = $("#arrow");
  let msg = camStatus || "";
  if (!msg && !route) msg = g[0];
  if (!msg && !target) msg = g[0];
  if (!msg && (heading === null || Date.now() - headingAt > 5000))
    msg = "Heading unavailable";
  arrow.hidden = !!msg;
  if (!msg) {
    const p = nodes[target],
      bearing = (Math.atan2(p[0] - pos[0], pos[1] - p[1]) * 180) / Math.PI;
    const angle = signedAngle(bearing - heading);
    arrow.textContent = Math.abs(angle) > 55 ? (angle > 0 ? "›" : "‹") : "↑";
    arrow.style.transform =
      "rotate(" + (Math.abs(angle) > 55 ? 0 : angle) + "deg)";
  }
  $("#camstatus").textContent = msg || "Training waypoint";
  $("#mini").innerHTML = mapMarkup(mapArgs(route, true));
}
function mapArgs(route, mini = false) {
  const n = nodes[route?.path[1]];
  const bearing =
    source === "Demo walker" && n
      ? (Math.atan2(n[0] - pos[0], pos[1] - n[1]) * 180) / Math.PI
      : (heading ?? 0);
  return {
    bearing,
    position: pos,
    route,
    hazard: h(),
    preset: state.preset,
    t: state.t,
    origin: state.origin,
    floor: mini ? "1" : floor,
    mini,
    hide: ambiguous(),
    viewport: mini ? null : viewport?.join(" "),
  };
}
function init() {
  if (presenter) {
    root.innerHTML = header + '<div id="presenter"></div>';
    import("/presenter.js").then(({ mountPresenter }) =>
      mountPresenter($("#presenter"), state, control),
    );
    return;
  }
  root.innerHTML =
    '<div class="shell">' +
    header +
    '<main class="stage"><div class="head"><div><h1>Memorial Student Center</h1><p class="sub" id="subtitle"></p></div><div class="floor" aria-label="Viewed floor">' +
    ["LL", "1", "2"].map((f) => btn("floor" + f, f)).join("") +
    '</div></div><div class="banner" id="banner" role="status"></div><div id="field" class="field" tabindex="0" aria-label="Training map. Arrow keys pan; plus and minus zoom."></div><div class="legend"><span>Route</span><span>Fire</span></div><div class="tools">' +
    btn("center", "Recenter map", "locate", "round") +
    btn("refresh", "Refresh incident", "refresh", "round") +
    '</div><section class="dock"><div class="maneuver" id="maneuver"></div><div><h2 id="guide"></h2><small id="detail"></small></div>' +
    btn("camera", "Camera", "cam", "action primary") +
    '</section><section class="camera" id="camera" hidden><video id="video" autoplay muted playsinline></video><div class="camtop"><span class="sim">Simulation</span>' +
    btn("map", "Map", "map") +
    '</div><div class="cammsg"><h2 id="camtitle"></h2><p id="camdetail"></p><b id="arrow" class="arrow"></b><p id="camstatus"></p></div><div class="minimap" id="mini"></div><section class="dock"><strong>Camera guidance</strong>' +
    btn("map", "Return to map", "map", "action") +
    '</section></section></main><footer class="foot"><button data-act="source"><span id="source" class="status"></span></button><button data-act="toggle" id="toggle"></button>' +
    btn("help", "Emergency help", "aid") +
    "</footer></div>";
  installPan();
}
function render() {
  if (presenter) {
    window.dispatchEvent(
      new CustomEvent("wayfind-incident", { detail: state }),
    );
    return;
  }
  const historical = browsing || floor !== "1";
  const route = currentRoute(),
    g = historical
      ? ["MSC floor reference", "2015 layout · Routing unavailable", "layers"]
      : guide(route);
  if (lastRoute && route && route.id !== lastRoute) {
    notice =
      state.preset === "smoke"
        ? "Route updated · smoke forecast ahead"
        : "Route updated";
    noticeUntil = Date.now() + 5000;
  }
  lastRoute = route?.id || "";
  $("#banner").textContent = historical
    ? "Historical reference · No navigation"
    : noticeUntil > Date.now()
      ? notice
      : state.preset === "smoke"
        ? "Smoke forecast · East hall"
        : state.preset === "blocked"
          ? "No exit route available"
          : "";
  $("#subtitle").textContent =
    (floor === "1"
      ? "First floor"
      : floor === "2"
        ? "Second floor"
        : "Lower level") +
    (historical ? " · Historical layout" : " · Training layout");
  document.querySelectorAll(".floor button").forEach((b) => {
    const selected = b.dataset.act === "floor" + floor;
    b.classList.toggle("sel", selected);
    b.setAttribute("aria-pressed", String(selected));
  });
  $("#field").innerHTML = historical
    ? referenceMap(floor)
    : mapMarkup(mapArgs(route));
  $(".dock .action").dataset.act = historical ? "walkview" : "camera";
  $(".dock .action").innerHTML = historical
    ? icon("map") + "Demo map"
    : icon("cam") + "Camera";
  $(".dock .action").setAttribute(
    "aria-label",
    historical ? "View first floor" : "Camera",
  );
  $(".legend").hidden = historical;
  $("#guide").textContent = g[0];
  $("#detail").textContent = g[1];
  $("#maneuver").innerHTML = icon(g[2]);
  if (route?.path[1])
    $("#maneuver svg").style.transform =
      "rotate(" + mapArgs(route).bearing + "deg)";
  $("#source").textContent = source;
  $("#toggle").innerHTML =
    icon(state.running ? "pause" : "play", 16) +
    (state.running ? "Pause" : "Start") +
    " replay";
  cameraContent();
}
function installPan() {
  const field = $("#field"),
    pts = new Map();
  const base = () => viewport || [0, 93, 400, 350];
  function adjust(dx, dy, scale = 1) {
    let [x, y, w, h] = base();
    const factor = Math.max(160 / w, Math.min(750 / w, scale)),
      u = Math.max(w / field.clientWidth, h / field.clientHeight);
    viewport = [
      x + (w - w * factor) / 2 - dx * u,
      y + (h - h * factor) / 2 - dy * u,
      w * factor,
      h * factor,
    ];
    follow = false;
    render();
  }
  const measure = () => {
    let [[x, y], [a, b] = [x, y]] = [...pts.values()];
    return [(x + a) / 2, (y + b) / 2, Math.hypot(x - a, y - b)];
  };
  field.onpointerdown = (e) => {
    if (e.target.closest("button")) return;
    field.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    pan = measure();
  };
  field.onpointermove = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    const v = measure();
    adjust(v[0] - pan[0], v[1] - pan[1], v[2] && pan[2] ? pan[2] / v[2] : 1);
    pan = v;
  };
  field.onpointerup = field.onpointercancel = (e) => {
    pts.delete(e.pointerId);
    pan = pts.size ? measure() : null;
  };
  field.onwheel = (e) => {
    e.preventDefault();
    adjust(0, 0, e.deltaY > 0 ? 1.12 : 0.9);
  };
  field.addEventListener("keydown", (e) => {
    const k = {
      ArrowLeft: [20, 0],
      ArrowRight: [-20, 0],
      ArrowUp: [0, 20],
      ArrowDown: [0, -20],
      "+": [0, 0, 0.85],
      "-": [0, 0, 1.15],
    }[e.key];
    if (k) {
      e.preventDefault();
      adjust(...k);
    }
  });
}
function action(a) {
  if (a === "menu") {
    openSheet(
      "Wayfind options",
      "<p>Fictional training layout for the Memorial Student Center demo. Fire and smoke use an illustrative zone forecast.</p>",
      (presenter
        ? ""
        : btn("locate", "Locate me", "pin") +
          btn("source", "Position source")) +
        (presenter ? "" : btn("reference", "Browse MSC plans", "layers")) +
        btn("details", "Scenario details", "info") +
        '<a class="linkbtn" href="/presenter" target="_blank" rel="noopener">Presenter controls</a>',
    );
    return;
  }
  if (a === "reference") {
    browsing = true;
    dialog.close();
    render();
    return;
  }
  if (a === "walkview") {
    browsing = false;
    floor = "1";
    render();
    return;
  }
  if (a === "close") {
    dialog.close();
    return;
  }
  if (a === "details") {
    openSheet(
      "Scenario details",
      "<p>All doors, exits and refuges on this training layout are fictional. The first floor supports routing. The other floors are browse-only. The smoke preset predicts East Hall exposure 25 seconds after activation. The forecast uses a deterministic demo model.</p>" +
        links,
    );
    return;
  }
  if (a === "source") {
    openSheet(
      "Position source",
      "<p>Choose how to position the walker on the training layout.</p>",
      btn("replay", "Demo walker", "play") +
        btn("locate", "Locate me", "pin") +
        btn("landmarks", "Confirm landmark"),
    );
    return;
  }
  if (a === "locate") {
    locate();
    return;
  }
  if (a === "landmarks") {
    openLandmarks();
    return;
  }
  if (a.startsWith("land-")) {
    stopGeo();
    source = "Confirmed landmark";
    node = a.slice(5);
    landmark = node;
    pos = [...nodes[node]];
    next = null;
    lastConfirmed = Date.now();
    pending = 0;
    floor = "1";
    dialog.close();
    render();
    return;
  }
  if (a === "replay") {
    stopGeo();
    source = "Demo walker";
    pending = 0;
    resetPosition();
    dialog.close();
    render();
    return;
  }
  if (a === "help") {
    openSheet(
      "Emergency help",
      helpFields(),
      btn("call", "Call 911 · Demo") + btn("ping", "Ping for help · Demo"),
    );
    return;
  }
  if (a === "call") {
    openSheet(
      "Call 911 · Demo",
      "<p>Call preview only. No call placed or message sent.</p>",
    );
    return;
  }
  if (a === "ping") {
    openSheet(
      "Preview help request",
      helpFields(),
      btn("simulate", "Simulate request") + btn("help", "Cancel"),
    );
    return;
  }
  if (a === "simulate") {
    openSheet("Demo complete", "<p>No call placed or message sent.</p>");
    return;
  }
  if (a.startsWith("floor")) {
    floor = a.slice(5);
    viewport = null;
    render();
    return;
  }
  if (a === "center") {
    browsing = false;
    floor = "1";
    follow = true;
    viewport = [pos[0] - 160, pos[1] - 140, 320, 280];
    render();
    return;
  }
  if (a === "refresh") {
    refresh()
      .then(() => toast("Incident refreshed"))
      .catch(err);
    return;
  }
  if (a === "camera") {
    camera();
    return;
  }
  if (a === "map") {
    stopCamera();
    render();
    return;
  }
  if (a === "toggle") {
    if (source !== "Demo walker") {
      stopGeo();
      source = "Demo walker";
      resetPosition();
      pending = 0;
    }
    control(state.running ? "pause" : "start");
    return;
  }
  if (
    ["start", "pause", "reset", "fire", "smoke", "blocked", "refuge"].includes(
      a,
    )
  )
    control(a);
}
init();
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (b) action(b.dataset.act);
});
dialog.addEventListener("close", () => {
  dialog.dataset.mode = "";
});
connectIncidentFeed({
  onSnapshot: accept,
  onError: () => { connected = false; render(); },
  onSuspend: () => {
    connected = false;
    stopGeo();
    if (inCamera) stopCamera();
  },
  onResume: () => { frameTime = performance.now(); refresh().catch(err); },
});
refresh().catch(err);
setInterval(() => {
  if (presenter) return;
  const now = performance.now(),
    dt = Math.min((now - frameTime) / 1000, 0.5);
  frameTime = now;
  if (source === "Demo walker" && !stale() && pending > 0) {
    const delta = Math.min(pending, dt * 1.25);
    pending -= delta;
    walk(delta);
    if (follow && viewport) {
      viewport[0] = pos[0] - viewport[2] / 2;
      viewport[1] = pos[1] - viewport[3] / 2;
    }
    render();
  } else if (now - shownAt > 700) {
    render();
    shownAt = now;
  }
}, 100);
