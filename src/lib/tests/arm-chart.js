// arm-chart.js — live tilt graph for the arm test (Chart.js, bundled by Vite; nothing from a CDN).
//
// Shows how far the phone has tilted from where the arm STARTED:
//   beta  (solid)   front-back tilt = fingertips sinking
//   gamma (dashed)  side roll       = palm turning inward
// The shaded band is the allowed range (+/- the single-arm limit). A line leaving the band is
// what the rule engine will call ABNORMAL, so helper, judges and developers all see the same thing.
//
// Only the pieces of Chart.js we use are registered, to keep the app small.

import { Chart, LineController, LineElement, PointElement, LinearScale, Filler } from "chart.js";

Chart.register(LineController, LineElement, PointElement, LinearScale, Filler);

const COLOURS = { beta: "#1b1320", gamma: "#5b3fd6", band: "rgba(255, 179, 0, 0.22)", bandEdge: "rgba(154, 28, 28, 0.55)" };

/**
 * createArmChart(container, { limitDeg, seconds }) -> { reset(), push(tMs, dBeta, dGamma), draw(), destroy() }
 * push() only stores a point; draw() repaints. The caller draws ~10 times a second so that
 * painting never slows down sensor handling (samples arrive ~60 times a second).
 */
export function createArmChart(container, { limitDeg, seconds }) {
  const canvas = document.createElement("canvas");
  // Decorative for screen readers: the screen states the drift in words and numbers as well.
  canvas.setAttribute("aria-hidden", "true");
  container.replaceChildren(canvas);

  const band = (y) => [{ x: 0, y }, { x: seconds, y }];
  const line = (colour, dash) => ({ data: [], borderColor: colour, borderWidth: 3, borderDash: dash, pointRadius: 0, tension: 0 });

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      datasets: [
        // Band: the upper edge fills down to the next dataset (the lower edge).
        { data: band(limitDeg), borderColor: COLOURS.bandEdge, borderWidth: 1.5, borderDash: [6, 4], pointRadius: 0, fill: "+1", backgroundColor: COLOURS.band },
        { data: band(-limitDeg), borderColor: COLOURS.bandEdge, borderWidth: 1.5, borderDash: [6, 4], pointRadius: 0 },
        line(COLOURS.beta, []),
        line(COLOURS.gamma, [8, 5])
      ]
    },
    options: {
      animation: false,           // a live signal must not be eased
      parsing: false,             // data is already {x, y}
      normalized: true,
      responsive: true,
      maintainAspectRatio: false,
      events: [],                 // no hover/tooltips: eyes are closed, and it saves work
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { type: "linear", min: 0, max: seconds, ticks: { stepSize: 2, font: { size: 14 } }, grid: { display: false } },
        y: { type: "linear", suggestedMin: -limitDeg * 1.6, suggestedMax: limitDeg * 1.6, ticks: { font: { size: 14 }, callback: (v) => v + "°" } }
      }
    }
  });

  return {
    reset() { chart.data.datasets[2].data = []; chart.data.datasets[3].data = []; chart.update("none"); },
    push(tMs, dBeta, dGamma) {
      chart.data.datasets[2].data.push({ x: tMs / 1000, y: dBeta });
      chart.data.datasets[3].data.push({ x: tMs / 1000, y: dGamma });
    },
    draw() { chart.update("none"); },
    destroy() { chart.destroy(); canvas.remove(); }
  };
}
