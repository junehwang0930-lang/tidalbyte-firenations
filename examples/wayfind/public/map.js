import { nodes } from "./model.js";
export const iconPaths = {
  layers: '<path d="m3 8 9-5 9 5-9 5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  locate:
    '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.5"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>',
  refresh:
    '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1"/>',
  cam: '<path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="3.5"/>',
  aid: '<path d="M12 2 3.5 6v6c0 5 4 8 8.5 10 4.5-2 8.5-5 8.5-10V6z"/><path d="M12 7v6m0 3v.1"/>',
  turn: '<path d="M6 21v-9a5 5 0 0 1 5-5h9m-6-5 6 5-6 5"/>',
  up: '<path d="M12 21V3m-7 8 7-8 7 8"/>',
  play: '<path d="m7 4 13 8-13 8z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8 5v14m8-14v14" stroke-width="4"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0z"/><circle cx="12" cy="10" r="2"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zm6-2v16m6-14v16"/>',
  flame:
    '<path d="M13 2c1 6-4 6-3 11 2 0 4-2 4-5 4 3 6 6 4 10-2 4-9 5-12 0-3-5 1-9 3-12-1 4 0 5 1 5 0-3 4-5 3-9z" fill="currentColor" stroke="none"/>',
  exit: '<path d="M10 4H4v16h6m-1-8h12m-5-5 5 5-5 5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
};
export const icon = (key, size = 20) =>
  '<svg aria-hidden="true" width="' +
  size +
  '" height="' +
  size +
  '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
  iconPaths[key] +
  "</svg>";
const room = (x, y, w, h, label, side = "bottom") => {
  const cx = x + w / 2,
    cy = y + h / 2,
    d = 12;
  const gaps = {
    bottom: "M" + (cx - d) + " " + (y + h) + "H" + (cx + d),
    top: "M" + (cx - d) + " " + y + "H" + (cx + d),
    left: "M" + x + " " + (cy - d) + "V" + (cy + d),
    right: "M" + (x + w) + " " + (cy - d) + "V" + (cy + d),
  };
  const door =
    side === "bottom"
      ? '<path d="M' + (cx - d) + " " + (y + h) + 'v-18q17 0 20 17"/>'
      : side === "top"
        ? '<path d="M' + (cx - d) + " " + y + 'v18q17 0 20-17"/>'
        : "";
  return (
    '<rect class="room" x="' +
    x +
    '" y="' +
    y +
    '" width="' +
    w +
    '" height="' +
    h +
    '"/><path d="' +
    gaps[side] +
    '" stroke="#303b47" stroke-width="3"/><g class="door">' +
    door +
    '</g><text class="roomlabel" x="' +
    cx +
    '" y="' +
    (cy + 3) +
    '">' +
    label +
    "</text>"
  );
};
const rooms = [
  [15, 102, 85, 57, "Studio"],
  [100, 102, 90, 57, "Seminar"],
  [190, 102, 86, 57, "Office"],
  [15, 162, 104, 67, "West lounge"],
  [119, 162, 99, 67, "Forum"],
  [218, 162, 66, 67, "Café"],
  [320, 130, 62, 100, "Lobby", "left"],
  [73, 262, 65, 74, "Meeting A", "top"],
  [73, 338, 65, 49, "Studio B", "right"],
  [169, 262, 112, 92, "Gallery", "top"],
  [283, 262, 99, 92, "Exhibit hall", "top"],
  [169, 356, 111, 74, "Reading room", "left"],
  [282, 356, 100, 74, "Seminar B", "top"],
  [14, 262, 29, 124, "", "right"],
];
export function mapMarkup({
  position,
  route,
  hazard,
  preset,
  t,
  origin,
  floor,
  mini = false,
  viewport,
  hide = false,
  bearing = 0,
}) {
  const id = mini ? "mini" : "main",
    start = position;
  if (floor !== "1")
    return (
      '<div class="nomap">' +
      icon("layers", 32) +
      "<h2>" +
      (floor === "LL" ? "Lower level" : "Second floor") +
      '</h2><p>Routing coverage is available on the first-floor training layout.</p><button data-act="floor1">View first floor</button></div>'
    );
  const points = route
    ? [start, ...route.path.slice(1).map((k) => nodes[k])]
    : [];
  const path = points.map((p) => p[0] + "," + p[1]).join(" ");
  const exit = route && nodes[route.id];
  const badge = (x, y, key, color) =>
    '<g transform="translate(' +
    x +
    " " +
    y +
    ')"><rect x="-12" y="-12" width="24" height="24" rx="7" fill="' +
    color +
    '" stroke="#182a30" stroke-width="2"/><g transform="translate(-8 -8) scale(.67)" style="color:#fff">' +
    icon(key, 24) +
    "</g></g>";
  const view = viewport || "0 93 400 350";
  return (
    '<svg class="drawing" viewBox="' +
    view +
    '" role="img" aria-label="Illustrative first-floor plan with route and simulated incident"><defs><radialGradient id="fire' +
    id +
    '"><stop offset="0" stop-color="#ff8b47" stop-opacity=".47"/><stop offset=".8" stop-color="#f16d3d" stop-opacity=".11"/><stop offset="1" stop-color="#ff7544" stop-opacity=".32"/></radialGradient><pattern id="sm' +
    id +
    '" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 6 6 0" stroke="#ccd3de" opacity=".5"/></pattern></defs><path class="slab" d="M9 96H283v27h105v314H164v-11H9z"/><path d="M291 123h20M9 396v17" stroke="#303b47" stroke-width="4"/>' +
    rooms.map((a) => room(...a)).join("") +
    '<g class="draft"><path d="M15 96v-9m85 9v-9m90 9v-9m86 9v-9M14 90h262M392 132h5m-5 98h5m-5 200h5m-3-298v298"/><path d="M18 265h22m-22 6h22m-22 6h22m-22 6h22m-22 6h22m-22 6h22m-22 6h22"/></g><text class="halllabel" x="225" y="256">MAIN CONCOURSE</text>' +
    (preset === "smoke"
      ? '<rect x="163" y="231" width="125" height="28" rx="3" fill="url(#sm' +
        id +
        ')" stroke="#d2d4de" stroke-dasharray="' +
        (t < origin + 25 ? "4 3" : "none") +
        '"/>'
      : "") +
    '<circle cx="244" cy="196" r="' +
    hazard.fireRadius +
    '" fill="url(#fire' +
    id +
    ')" stroke="#ed8049" stroke-width=".9"/><circle cx="244" cy="196" r="13" fill="#e8652e" stroke="#ffb783"/><g transform="translate(234 186)" style="color:white">' +
    icon("flame", 20) +
    "</g>" +
    (route && !hide
      ? '<polyline points="' +
        path +
        '" class="pathcase"/><polyline points="' +
        path +
        '" class="route"/>' +
        badge(
          exit[0],
          exit[1],
          route.kind === "exit" ? "exit" : "aid",
          "#21836d",
        ) +
        '<text class="exitlabel" x="' +
        Math.max(42, exit[0]) +
        '" y="' +
        (exit[1] - 19) +
        '">' +
        exit[2] +
        "</text>"
      : "") +
    (!hide
      ? '<g transform="translate(' +
        start[0] +
        " " +
        start[1] +
        ')"><circle r="15" fill="#348dff" opacity=".18"/><path transform="rotate(' +
        bearing +
        ')" d="M-10-6-5-22Q0-26 5-22L10-6z" fill="#78bfff" opacity=".65"/><circle r="7.5" fill="#318dff" stroke="#eef7ff" stroke-width="2.6"/></g>'
      : "") +
    "</svg>"
  );
}
