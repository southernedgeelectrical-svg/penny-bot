# Tablet — Command Center — design reference

This is a design mockup created in a visual design tool, exported as a
standalone page. Treat it as a REFERENCE MOCKUP, not production code:
the markup and inline styles carry the design's precise values — colors,
font sizes, spacing, radii, shadows, layout — which an implementation
should replicate faithfully in its own components and styling system
rather than copy wholesale.

## Contents

- `Tablet.dc.html` — the artboard (a Design Component: an `<x-dc>`
  template + a small logic class). The values to replicate live in its
  inline `style="…"` attributes and the `<helmet><style>` block.
- `support.js`, `vendor/react*.js` — the runtime that renders the
  component in a browser; not part of the design.

## Viewing

Serve the folder (e.g. `python3 -m http.server`) and open `Tablet.dc.html`;
some browsers block the scripts over file://.

## Command center (docs/index.html)

Every bot run fills `command_center.html` with the latest data and writes it to
`docs/index.html` (serve `docs/` with GitHub Pages). It's a HUD-style page:

- **Left — system vitals:** account value, cash and performance vs. IWM with
  sparklines, a drawdown-budget gauge (how much of the kill-switch limit is used),
  and open positions.
- **Center — core orb:** an animated particle sphere showing the bot's state
  (Idle / Holding / Paused / Halted, plus Listening / Speaking during voice).
  The **Paper Trading / Backtest** toggle switches the whole HUD (blue ↔ magenta)
  between live paper results and the latest backtest (`data/backtest.json`).
- **Right — skills + voice:** quick buttons (run on GitHub Actions, edit/pause
  config, trade history, equity chart, bot terminal, rules), **tap to talk**
  (browser speech recognition + spoken replies; try "status", "positions",
  "profit", "watchlist", "backtest") or type a command, and today's watchlist.
- **Bottom bar:** last run, a scrolling log ticker and the terminal (full log).

To change the look, edit `command_center.html`; the data is injected where
`/*__DATA__*/` appears.
