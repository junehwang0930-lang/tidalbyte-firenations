import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

type Snapshot = {
  t: number;
  running: boolean;
  preset: "fire" | "smoke" | "blocked";
  refuge: boolean;
  seq: number;
  epoch: number;
};
export function Presenter({
  initial,
  onAction,
}: {
  initial: Snapshot;
  onAction: (s: string) => void;
}) {
  const [state, setState] = useState(initial);
  useEffect(() => {
    const handler = (event: Event) =>
      setState((event as CustomEvent<Snapshot>).detail);
    window.addEventListener("wayfind-incident", handler);
    return () => window.removeEventListener("wayfind-incident", handler);
  }, []);
  const local = ["localhost", "127.0.0.1"].includes(location.hostname);
  const options = [
    ["fire", "Nearby fire"],
    ["smoke", "Forecast smoke"],
    ["blocked", "Blocked exits"],
  ];
  return (
    <main className="present">
      <span className="chip">Presenter</span>
      <h1>Incident controls</h1>
      <p>Run the shared incident. Each phone keeps its own position.</p>
      <section className="panel">
        <h2>Scenario clock</h2>
        <p id="clock">
          {state.running ? "Running" : "Paused"} · {Math.floor(state.t)} s
        </p>
        {["Start", "Pause", "Reset"].map((label) => (
          <button key={label} onClick={() => onAction(label.toLowerCase())}>
            {label}
          </button>
        ))}
      </section>
      <section className="panel">
        <h2>Incident presets</h2>
        {options.map(([id, label]) => (
          <button
            key={id}
            aria-pressed={state.preset === id}
            className={state.preset === id ? "primary" : ""}
            onClick={() => onAction(id)}
          >
            {label}
          </button>
        ))}
        <p id="preset">Active: {state.preset}</p>
        {state.preset === "blocked" && (
          <button
            aria-pressed={state.refuge}
            onClick={() => onAction("refuge")}
          >
            {state.refuge ? "Disable" : "Enable"} fictional refuge
          </button>
        )}
      </section>
      <section className="panel">
        <h2>Open on a phone</h2>
        <img
          className="qr"
          alt="QR code for occupant view"
          src={"/api/qr.svg?url=" + encodeURIComponent(location.origin + "/")}
        />
        <small>
          {local
            ? "Open this page using your phone-accessible HTTPS address before sharing the QR code."
            : location.origin}
        </small>
        <a href="/">Open occupant map</a>
      </section>
    </main>
  );
}
export function mountPresenter(
  element: HTMLElement,
  initial: Snapshot,
  onAction: (s: string) => void,
) {
  createRoot(element).render(
    <Presenter initial={initial} onAction={onAction} />,
  );
}
