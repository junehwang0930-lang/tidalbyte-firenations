// Simplified original diagrams of major spaces, after the 2015 ANS program p.29.
// Coordinates describe relative layout only, with no route or egress metadata.
const wings = {
  1: [
    ["M17 39h129v106H17z", "Courtyard", 80, 91],
    ["M18 25h128v14H18z", "", 0, 0],
    ["M157 27h91v43h-91z", "Meeting rooms", 203, 50],
    ["M157 72h91v71h-91z", "Dining", 203, 109],
    ["M256 67h39v76h-39z", "Flag Room", 275, 110],
    ["M301 60h42v83h-42z", "Stark Galleries", 320, 104],
    ["M350 38h19v151h-19z", "", 0, 0],
    ["M15 157h82v49H15z", "Retail hall", 53, 185],
    ["M101 153h39v55h-39z", "Lounge", 119, 180],
    ["M153 156h140v48H153z", "Bookstore", 221, 185],
    ["M298 151h48v44h-48z", "Grill", 324, 177],
  ],
  2: [
    ["M15 28h125v16H15z", "", 0, 0],
    ["M18 46h122v96H18z", "Courtyard void", 79, 98],
    ["M154 45h88v66h-88z", "Gates Ballroom", 198, 81],
    ["M151 115h51v26h-51z", "Forsyth", 176, 131],
    ["M206 115h39v26h-39z", "Reynolds", 226, 131],
    ["M253 68h42v74h-42z", "Flag Room void", 274, 107],
    ["M301 68h41v74h-41z", "Gallery void", 322, 107],
    ["M16 157h121v62H16z", "Bethancourt Ballroom", 77, 191],
    ["M151 158h143v47H151z", "MSC offices", 222, 185],
    ["M299 158h45v36h-45z", "Services", 321, 180],
  ],
  LL: [
    ["M17 24h128v29H17z", "Service wing", 80, 41],
    ["M153 50h68v75h-68z", "Facilities", 187, 88],
    ["M227 49h49v33h-49z", "Media", 250, 68],
    ["M227 85h49v39h-49z", "Practice rooms", 251, 107],
    ["M283 81h57v32h-57z", "Activities", 311, 100],
    ["M344 76h34v55h-34z", "Display", 361, 108],
    ["M284 118h55v36h-55z", "Games", 311, 138],
    ["M172 132h104v48H172z", "Dining", 222, 158],
    ["M22 168h123v42H22z", "Service wing", 84, 192],
    ["M168 184h151v40H168z", "Bookstore", 244, 207],
  ],
};
export function referenceMap(floor) {
  const rooms = wings[floor] || [];
  return (
    '<svg class="drawing" role="img" aria-label="Historical MSC reference diagram" viewBox="0 0 394 250"><g fill="#303c46" stroke="#82909b" stroke-width="1.4">' +
    rooms.map(([d]) => '<path d="' + d + '"/>').join("") +
    "</g>" +
    rooms
      .map(
        ([, l, x, y]) =>
          '<text class="roomlabel" x="' +
          x +
          '" y="' +
          y +
          '">' +
          l +
          "</text>",
      )
      .join("") +
    "</svg>"
  );
}
