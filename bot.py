"""
Penny Stock PAPER Trading Bot  (fake money only)

    python bot.py run        -> one trading pass (GitHub Actions runs this on a schedule)
    python bot.py backtest   -> test the strategy on ~2 years of history

SAFETY: this bot can only talk to Alpaca's PAPER server. There is no live mode.
It manages its own $100 budget, no matter how much fake money the paper account has.
"""
import csv
import html
import json
import math
import os
import sys
import time
import traceback
import datetime as dt
from pathlib import Path
from zoneinfo import ZoneInfo

import pandas as pd
import yaml

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
DOCS = ROOT / "docs"
STATE_F = DATA / "state.json"
TRADES_F = DATA / "trades.csv"
EQUITY_F = DATA / "equity.csv"
LOG_F = DATA / "log.txt"
CT = ZoneInfo("America/Chicago")
TRADE_FIELDS = ["symbol", "qty", "entry_date", "entry_price", "exit_date",
                "exit_price", "pnl", "reason"]

_log_lines = []


# ----------------------------------------------------------------- helpers
def now_ct():
    return dt.datetime.now(CT)


def log(msg):
    line = f"{now_ct():%Y-%m-%d %H:%M} CT  {msg}"
    print(line)
    _log_lines.append(line)


def flush_log():
    DATA.mkdir(exist_ok=True)
    old = LOG_F.read_text().splitlines() if LOG_F.exists() else []
    LOG_F.write_text("\n".join((old + _log_lines)[-500:]) + "\n")


def load_cfg():
    return yaml.safe_load((ROOT / "config.yaml").read_text())


def load_state():
    if STATE_F.exists():
        return json.loads(STATE_F.read_text())
    return {"positions": {}, "halted": False, "halt_reason": "", "errors": 0,
            "last_entry_day": ""}


def save_state(state):
    DATA.mkdir(exist_ok=True)
    STATE_F.write_text(json.dumps(state, indent=2))


def read_trades():
    if not TRADES_F.exists():
        return []
    with TRADES_F.open() as f:
        return list(csv.DictReader(f))


def append_trade(row):
    DATA.mkdir(exist_ok=True)
    new = not TRADES_F.exists()
    with TRADES_F.open("a", newline="") as f:
        w = csv.DictWriter(f, fieldnames=TRADE_FIELDS)
        if new:
            w.writeheader()
        w.writerow(row)


def read_equity():
    if not EQUITY_F.exists():
        return []
    with EQUITY_F.open() as f:
        return [(r["time"], float(r["equity"])) for r in csv.DictReader(f)]


def append_equity(value):
    DATA.mkdir(exist_ok=True)
    new = not EQUITY_F.exists()
    with EQUITY_F.open("a", newline="") as f:
        w = csv.writer(f)
        if new:
            w.writerow(["time", "equity"])
        w.writerow([now_ct().strftime("%Y-%m-%d %H:%M"), f"{value:.2f}"])


# ------------------------------------------------- strategy (shared by live + backtest)
def check_signal(df, cfg):
    """df = completed daily bars (open/high/low/close/volume), oldest -> newest.
    Returns (passes_filters, buy_signal, note)."""
    n = cfg["sma_days"]
    if len(df) < n + 6:
        return False, False, "not enough history"
    last = df.iloc[-1]
    price = float(last["close"])
    if not (cfg["min_price"] <= price <= cfg["max_price"]):
        return False, False, f"price ${price:.2f} out of range"
    avg_vol = float(df["volume"].iloc[-n - 1:-1].mean())
    if avg_vol < cfg["min_avg_volume"]:
        return False, False, f"avg volume {avg_vol:,.0f} too low"
    moves = df["close"].pct_change().iloc[-5:].abs()
    if moves.max() > cfg["max_one_day_move"]:
        return False, False, f"moved {moves.max():.0%} in one day recently (pump risk)"
    sma = float(df["close"].iloc[-n:].mean())
    vol_ratio = float(last["volume"]) / avg_vol if avg_vol else 0
    buy = price > sma and vol_ratio >= cfg["volume_multiple"]
    note = f"close ${price:.2f} vs {n}-day avg ${sma:.2f}, volume {vol_ratio:.1f}x normal"
    return True, buy, note


def position_size(price, cash, cfg):
    """Whole shares only. Limited by $ risk, $ per stock, and cash."""
    risk_per_share = price * cfg["stop_loss"]
    by_risk = cfg["risk_per_trade"] / risk_per_share if risk_per_share > 0 else 0
    by_cap = cfg["max_per_stock"] / price
    by_cash = cash / price
    return max(0, math.floor(min(by_risk, by_cap, by_cash)))


# ----------------------------------------------------------------- alpaca
def clients():
    key = os.environ.get("ALPACA_KEY")
    secret = os.environ.get("ALPACA_SECRET")
    if not key or not secret:
        sys.exit("Missing ALPACA_KEY / ALPACA_SECRET (add them as GitHub secrets).")
    from alpaca.trading.client import TradingClient
    from alpaca.data.historical import StockHistoricalDataClient
    from alpaca.data.historical.screener import ScreenerClient
    trading = TradingClient(key, secret, paper=True)          # PAPER ONLY
    if "paper-api" not in str(trading._base_url):
        sys.exit("SAFETY STOP: not connected to the paper server.")
    return trading, StockHistoricalDataClient(key, secret), ScreenerClient(key, secret)


def daily_bars(data, symbols, start, end):
    """Daily bars. Uses full-market (SIP) data, which is free when it's 15+ min old."""
    from alpaca.data.requests import StockBarsRequest
    from alpaca.data.timeframe import TimeFrame
    from alpaca.data.enums import DataFeed, Adjustment
    out = {}
    symbols = list(symbols)
    for i in range(0, len(symbols), 50):
        chunk = symbols[i:i + 50]
        req = StockBarsRequest(symbol_or_symbols=chunk, timeframe=TimeFrame.Day,
                               start=start, end=end, feed=DataFeed.SIP,
                               adjustment=Adjustment.ALL)
        df = data.get_stock_bars(req).df
        if df.empty:
            continue
        for sym in chunk:
            if sym in df.index.get_level_values(0):
                d = df.xs(sym, level=0)[["open", "high", "low", "close", "volume"]].copy()
                d.index = pd.to_datetime(d.index).tz_convert(CT).date
                out[sym] = d
    return out


def snapshots(data, symbols):
    from alpaca.data.requests import StockSnapshotRequest
    from alpaca.data.enums import DataFeed
    try:
        return data.get_stock_snapshot(
            StockSnapshotRequest(symbol_or_symbols=list(symbols), feed=DataFeed.IEX))
    except Exception as e:
        log(f"snapshot error: {e}")
        return {}


def order_price(o):
    try:
        return float(o.filled_avg_price or 0)
    except (TypeError, ValueError):
        return 0.0


def sync_positions(trading, state):
    """Match the bot's records to what Alpaca actually holds; record closed trades."""
    from alpaca.trading.requests import GetOrdersRequest
    from alpaca.trading.enums import QueryOrderStatus, OrderSide
    held = {p.symbol: p for p in trading.get_all_positions()}
    for sym, p in list(state["positions"].items()):
        if sym in held:
            ap = held[sym]
            p["qty"] = int(float(ap.qty))
            p["entry_price"] = float(ap.avg_entry_price)
            p["filled"] = True
            p["price"] = float(ap.current_price or p["entry_price"])
            continue
        if not p.get("filled"):
            o = trading.get_order_by_id(p["order_id"])
            status = str(o.status.value if hasattr(o.status, "value") else o.status)
            if status in ("new", "accepted", "pending_new", "accepted_for_bidding", "held"):
                continue  # still waiting to fill
            if status not in ("filled", "partially_filled"):
                log(f"{sym}: buy order {status}, nothing bought")
                del state["positions"][sym]
                continue
            p["entry_price"] = order_price(o) or p["entry_price"]
        # position is gone -> it was sold. Find the sell price.
        after = dt.datetime.fromisoformat(p["entry_time"])
        sells = trading.get_orders(GetOrdersRequest(
            status=QueryOrderStatus.CLOSED, symbols=[sym], side=OrderSide.SELL,
            after=after, limit=50))
        filled = [o for o in sells if order_price(o) > 0]
        qty = p["qty"]
        if filled:
            tot = sum(float(o.filled_qty) for o in filled)
            exit_price = sum(order_price(o) * float(o.filled_qty) for o in filled) / tot
            o = filled[0]
            kind = str(getattr(o.type, "value", o.type))
            reason = p.get("exit_reason") or ("stop-loss" if "stop" in kind else
                                             "take-profit" if kind == "limit" else "sold")
        else:
            exit_price, reason = p.get("price", p["entry_price"]), "closed (price unknown)"
        pnl = (exit_price - p["entry_price"]) * qty
        append_trade({"symbol": sym, "qty": qty, "entry_date": p["entry_date"],
                      "entry_price": f"{p['entry_price']:.4f}",
                      "exit_date": now_ct().strftime("%Y-%m-%d"),
                      "exit_price": f"{exit_price:.4f}", "pnl": f"{pnl:.2f}",
                      "reason": reason})
        log(f"SOLD {qty} {sym} @ ${exit_price:.2f} ({reason}), P/L ${pnl:+.2f}")
        del state["positions"][sym]


def virtual_account(state, cfg):
    realized = sum(float(t["pnl"]) for t in read_trades())
    invested = sum(p["qty"] * p["entry_price"] for p in state["positions"].values())
    market = sum(p["qty"] * p.get("price", p["entry_price"])
                 for p in state["positions"].values())
    cash = cfg["starting_capital"] + realized - invested
    return cash + market, cash


def close_symbol(trading, state, sym, reason):
    from alpaca.trading.requests import GetOrdersRequest
    from alpaca.trading.enums import QueryOrderStatus
    for o in trading.get_orders(GetOrdersRequest(status=QueryOrderStatus.OPEN,
                                                 symbols=[sym], nested=False)):
        try:
            trading.cancel_order_by_id(o.id)
        except Exception as e:
            log(f"{sym}: cancel error {e}")
    time.sleep(3)
    trading.close_position(sym)
    state["positions"][sym]["exit_reason"] = reason
    log(f"Selling {sym}: {reason}")


def trading_days_held(trading, entry_date, today):
    from alpaca.trading.requests import GetCalendarRequest
    days = trading.get_calendar(GetCalendarRequest(
        start=dt.date.fromisoformat(entry_date), end=today))
    return max(0, len(days) - 1)


def find_buys(trading, data, screener, cfg, state):
    from alpaca.data.requests import MostActivesRequest
    actives = screener.get_most_actives(MostActivesRequest(top=100)).most_actives
    syms = [a.symbol for a in actives if a.symbol not in state["positions"]]
    snaps = snapshots(data, syms)
    cands = []
    for s in syms:
        sn = snaps.get(s)
        px = float(sn.latest_trade.price) if sn and sn.latest_trade else None
        if px and cfg["min_price"] * 0.8 <= px <= cfg["max_price"] * 1.2:
            cands.append(s)
    ok = []
    for s in cands:
        try:
            a = trading.get_asset(s)
            ex = str(getattr(a.exchange, "value", a.exchange))
            if a.tradable and ex in cfg["exchanges"]:
                ok.append(s)
        except Exception:
            pass
    today = now_ct().date()
    start = today - dt.timedelta(days=60)
    end = dt.datetime.combine(today, dt.time(0, 0), tzinfo=CT)  # completed days only
    bars = daily_bars(data, ok, start, end)
    watch, buys = [], []
    for s, df in bars.items():
        if (today - df.index[-1]).days > 5:
            continue  # stale data
        passes, buy, note = check_signal(df, cfg)
        if passes:
            ratio = float(df["volume"].iloc[-1] / df["volume"].iloc[-21:-1].mean())
            watch.append((ratio, s, note, buy))
    watch.sort(reverse=True)
    watch = watch[:cfg["watchlist_size"]]
    for _, s, note, buy in watch:
        log(f"watch {s}: {note}{'  -> BUY SIGNAL' if buy else ''}")
        if buy:
            buys.append(s)
    state["watchlist"] = [{"symbol": s, "note": n, "buy": b} for _, s, n, b in watch]
    return buys, snaps


def enter(trading, cfg, state, sym, snap, cash):
    from alpaca.trading.requests import MarketOrderRequest, TakeProfitRequest, StopLossRequest
    from alpaca.trading.enums import OrderSide, TimeInForce, OrderClass
    if not snap or not snap.latest_trade:
        log(f"{sym}: no live price, skipped")
        return 0
    age = now_ct() - snap.latest_trade.timestamp.astimezone(CT)
    if age > dt.timedelta(minutes=15):
        log(f"{sym}: price is stale ({age}), skipped")
        return 0
    price = float(snap.latest_trade.price)
    q = snap.latest_quote
    if q and q.bid_price and q.ask_price and q.ask_price > q.bid_price:
        mid = (q.ask_price + q.bid_price) / 2
        spread = (q.ask_price - q.bid_price) / mid
        if spread > cfg["max_spread"]:
            log(f"{sym}: spread {spread:.1%} too wide, skipped")
            return 0
    qty = position_size(price, cash, cfg)
    if qty < 1:
        log(f"{sym}: can't afford a position within the risk limits, skipped")
        return 0
    tp = round(price * (1 + cfg["take_profit"]), 2)
    sl = round(price * (1 - cfg["stop_loss"]), 2)
    order = trading.submit_order(MarketOrderRequest(
        symbol=sym, qty=qty, side=OrderSide.BUY, time_in_force=TimeInForce.GTC,
        order_class=OrderClass.BRACKET,
        take_profit=TakeProfitRequest(limit_price=tp),
        stop_loss=StopLossRequest(stop_price=sl)))
    state["positions"][sym] = {
        "qty": qty, "entry_price": price, "price": price, "stop": sl, "target": tp,
        "entry_date": now_ct().strftime("%Y-%m-%d"),
        "entry_time": now_ct().isoformat(), "order_id": str(order.id), "filled": False}
    log(f"BUY {qty} {sym} @ ~${price:.2f} (stop ${sl}, target ${tp})")
    return qty * price


def run():
    cfg = load_cfg()
    state = load_state()
    try:
        trading, data, screener = clients()
        clock = trading.get_clock()
        sync_positions(trading, state)
        equity, cash = virtual_account(state, cfg)
        today = now_ct().date()
        hist = read_equity()
        peak = max([cfg["starting_capital"]] + [e for _, e in hist] + [equity])
        before_today = [e for t, e in hist if t[:10] < today.isoformat()]
        day_start = before_today[-1] if before_today else cfg["starting_capital"]
        log(f"Run: market {'OPEN' if clock.is_open else 'closed'}, "
            f"equity ${equity:.2f}, cash ${cash:.2f}, positions {len(state['positions'])}")

        if not state["halted"] and equity <= peak - cfg["max_drawdown"]:
            state["halted"] = True
            state["halt_reason"] = (f"Max drawdown hit: ${equity:.2f} is "
                                    f"${peak - equity:.2f} below the ${peak:.2f} peak")
            log("KILL SWITCH: " + state["halt_reason"])
            if clock.is_open:
                for sym in list(state["positions"]):
                    if state["positions"][sym].get("filled"):
                        close_symbol(trading, state, sym, "kill switch")

        if clock.is_open:
            for sym, p in list(state["positions"].items()):
                if p.get("filled") and trading_days_held(trading, p["entry_date"], today) >= cfg["max_hold_days"]:
                    close_symbol(trading, state, sym, f"held {cfg['max_hold_days']} days")

            reasons = []
            if state["halted"]:
                reasons.append("bot is halted")
            if cfg.get("paused"):
                reasons.append("paused in config.yaml")
            if equity <= day_start - cfg["daily_loss_limit"]:
                reasons.append(f"daily loss limit (${day_start - equity:.2f} down today)")
            if state.get("last_entry_day") == today.isoformat():
                reasons.append("already looked for buys today")
            if len(state["positions"]) >= cfg["max_positions"]:
                reasons.append("max positions held")
            if reasons:
                log("No new buys: " + "; ".join(reasons))
            else:
                state["last_entry_day"] = today.isoformat()
                buys, snaps = find_buys(trading, data, screener, cfg, state)
                if not buys:
                    log("No buy signals today")
                for sym in buys:
                    if len(state["positions"]) >= cfg["max_positions"]:
                        break
                    cash -= enter(trading, cfg, state, sym, snaps.get(sym), cash)
            time.sleep(5)
            sync_positions(trading, state)

        equity, cash = virtual_account(state, cfg)
        append_equity(equity)
        state["errors"] = 0
        state["last_run"] = now_ct().strftime("%Y-%m-%d %H:%M CT")
        try:
            build_dashboard(cfg, state, data)
        except Exception as e:
            log(f"dashboard error: {e}")
    except Exception as e:
        state["errors"] = state.get("errors", 0) + 1
        log(f"ERROR ({state['errors']} in a row): {e}")
        traceback.print_exc()
        if state["errors"] >= 3 and not state["halted"]:
            state["halted"] = True
            state["halt_reason"] = "3 errors in a row (kill switch)"
            log("KILL SWITCH: 3 errors in a row")
    finally:
        save_state(state)
        flush_log()


# ----------------------------------------------------------------- backtest
def simulate(bars, dates, cfg):
    cash = float(cfg["starting_capital"])
    cost = cfg["trade_cost"]
    pos, trades, curve = {}, [], []
    peak, halted, prev_eq = cash, False, cash
    for i, d in enumerate(dates):
        day_eq_start = prev_eq
        # 1) buys at today's open, from yesterday's signals
        if not halted and i > 0 and len(pos) < cfg["max_positions"]:
            if prev_eq > peak - cfg["max_drawdown"] and not (
                    len(curve) > 1 and curve[-1] <= curve[-2] - cfg["daily_loss_limit"]):
                picks = []
                for s, df in bars.items():
                    if s in pos or d not in df.index:
                        continue
                    hist = df.loc[:dates[i - 1]]
                    if len(hist) < 30 or hist.index[-1] != dates[i - 1]:
                        continue
                    passes, buy, _ = check_signal(hist.iloc[-40:], cfg)
                    if buy:
                        ratio = hist["volume"].iloc[-1] / hist["volume"].iloc[-21:-1].mean()
                        picks.append((ratio, s))
                for _, s in sorted(picks, reverse=True):
                    if len(pos) >= cfg["max_positions"]:
                        break
                    o = float(bars[s].loc[d, "open"])
                    fill = o * (1 + cost)
                    qty = position_size(fill, cash, cfg)
                    if qty < 1:
                        continue
                    cash -= qty * fill
                    pos[s] = {"qty": qty, "entry": fill, "date": d, "held": 0,
                              "stop": o * (1 - cfg["stop_loss"]),
                              "target": o * (1 + cfg["take_profit"])}
        # 2) exits during the day (stop checked first = cautious)
        for s, p in list(pos.items()):
            df = bars[s]
            if d not in df.index:
                continue
            b = df.loc[d]
            if p["date"] != d:
                p["held"] += 1
            exit_px, why = None, ""
            if b["low"] <= p["stop"]:
                exit_px, why = min(b["open"], p["stop"]), "stop-loss"
            elif b["high"] >= p["target"]:
                exit_px, why = max(b["open"], p["target"]), "take-profit"
            elif p["held"] >= cfg["max_hold_days"]:
                exit_px, why = b["close"], "time"
            if exit_px is not None:
                net = exit_px * (1 - cost)
                cash += p["qty"] * net
                trades.append({"symbol": s, "pnl": (net - p["entry"]) * p["qty"],
                               "reason": why, "entry_date": p["date"], "exit_date": d})
                del pos[s]
        eq = cash
        for s, p in pos.items():
            df = bars[s]
            last = df.loc[:d]["close"]
            eq += p["qty"] * float(last.iloc[-1] if len(last) else p["entry"])
        curve.append(eq)
        prev_eq = eq
        peak = max(peak, eq)
        if eq <= peak - cfg["max_drawdown"] and not halted:
            halted = True
            trades.append({"symbol": "-", "pnl": 0, "reason": f"KILL SWITCH on {d}",
                           "entry_date": d, "exit_date": d})
            for s, p in list(pos.items()):
                px = float(bars[s].loc[:d]["close"].iloc[-1]) * (1 - cost)
                cash += p["qty"] * px
                trades.append({"symbol": s, "pnl": (px - p["entry"]) * p["qty"],
                               "reason": "kill switch", "entry_date": p["date"], "exit_date": d})
                del pos[s]
    return curve, trades


def stats(curve, trades, start):
    real = [t for t in trades if t["symbol"] != "-"]
    wins = [t["pnl"] for t in real if t["pnl"] > 0]
    losses = [t["pnl"] for t in real if t["pnl"] <= 0]
    peak, mdd = start, 0
    for e in curve:
        peak = max(peak, e)
        mdd = max(mdd, peak - e)
    return {"end": curve[-1] if curve else start, "trades": len(real),
            "win_rate": len(wins) / len(real) if real else 0,
            "avg_win": sum(wins) / len(wins) if wins else 0,
            "avg_loss": sum(losses) / len(losses) if losses else 0,
            "max_dd": mdd, "halted": any(t["symbol"] == "-" for t in trades)}


def backtest():
    cfg = load_cfg()
    _, data, screener = clients()
    from alpaca.data.requests import MostActivesRequest
    syms = [a.symbol for a in screener.get_most_actives(MostActivesRequest(top=100)).most_actives]
    end = now_ct() - dt.timedelta(minutes=20)
    start = end.date() - dt.timedelta(days=760)
    log(f"Backtest: downloading 2 years of data for {len(syms)} active stocks + IWM")
    bars = daily_bars(data, syms, start, end)
    iwm = daily_bars(data, ["IWM"], start, end)["IWM"]
    dates = list(iwm.index)
    cut = int(len(dates) * 0.7)
    results = []
    for name, ds in (("Build period (first 70%)", dates[:cut]),
                     ("Unseen test period (last 30%)", dates[cut:])):
        curve, trades = simulate(bars, ds, cfg)
        st = stats(curve, trades, cfg["starting_capital"])
        bench = [cfg["starting_capital"] * float(iwm.loc[d, "close"]) /
                 float(iwm.loc[ds[0], "close"]) for d in ds]
        results.append((name, ds, curve, bench, st, trades))
        log(f"{name}: ${st['end']:.2f} vs IWM ${bench[-1]:.2f}, "
            f"{st['trades']} trades, win rate {st['win_rate']:.0%}")
    write_backtest_page(cfg, results, len(bars))
    flush_log()


# ----------------------------------------------------------------- web pages
CSS = """
body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0f1419;color:#e6e6e6;
margin:0;padding:16px;max-width:900px;margin:auto}
h1{font-size:1.4em;margin:.2em 0}h2{font-size:1.1em;margin-top:1.6em;color:#9ecbff}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
.tile{background:#1a2129;border-radius:10px;padding:12px}.tile b{display:block;font-size:1.4em}
.tile span{color:#9aa4ae;font-size:.85em}.pos{color:#4cd38a}.neg{color:#ff6b6b}
table{width:100%;border-collapse:collapse;font-size:.9em}td,th{padding:6px;border-bottom:1px solid #2a323b;
text-align:left}th{color:#9aa4ae;font-weight:500}.badge{padding:3px 10px;border-radius:12px;font-weight:600}
.on{background:#123d27;color:#4cd38a}.off{background:#4a1c1c;color:#ff8a8a}.pause{background:#4a3b12;color:#ffd166}
pre{background:#1a2129;padding:10px;border-radius:8px;white-space:pre-wrap;font-size:.8em}
a{color:#9ecbff}.note{color:#9aa4ae;font-size:.85em}svg{width:100%;height:auto;background:#1a2129;border-radius:10px}
"""


def money(x):
    cls = "pos" if x > 0 else "neg" if x < 0 else ""
    return f'<span class="{cls}">{"+" if x > 0 else ""}${x:,.2f}</span>'


def svg_chart(labels, series):
    """series = [(name, color, values)] sharing the same x labels."""
    W, H, P = 800, 300, 40
    vals = [v for _, _, s in series for v in s if v is not None]
    if len(labels) < 2 or not vals:
        return '<p class="note">Chart appears after a few runs.</p>'
    lo, hi = min(vals), max(vals)
    if hi - lo < 1:
        lo, hi = lo - 1, hi + 1
    x = lambda i: P + i * (W - 2 * P) / (len(labels) - 1)
    y = lambda v: H - P - (v - lo) * (H - 2 * P) / (hi - lo)
    out = [f'<svg viewBox="0 0 {W} {H}">']
    for k in range(5):
        v = lo + (hi - lo) * k / 4
        out.append(f'<line x1="{P}" x2="{W-P}" y1="{y(v):.1f}" y2="{y(v):.1f}" stroke="#2a323b"/>'
                   f'<text x="2" y="{y(v)+4:.1f}" fill="#9aa4ae" font-size="11">${v:.0f}</text>')
    for i in (0, len(labels) - 1):
        out.append(f'<text x="{x(i)-(0 if i==0 else 70):.1f}" y="{H-10}" fill="#9aa4ae" '
                   f'font-size="11">{html.escape(str(labels[i]))}</text>')
    for j, (name, color, s) in enumerate(series):
        pts = " ".join(f"{x(i):.1f},{y(v):.1f}" for i, v in enumerate(s) if v is not None)
        out.append(f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="2.5"/>')
        out.append(f'<rect x="{P+j*170}" y="8" width="12" height="12" fill="{color}"/>'
                   f'<text x="{P+18+j*170}" y="19" fill="#e6e6e6" font-size="13">{name}</text>')
    out.append("</svg>")
    return "".join(out)


def page(title, body):
    return (f'<!doctype html><html><head><meta charset="utf-8">'
            f'<meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<title>{title}</title><style>{CSS}</style></head><body>{body}</body></html>')


def build_dashboard(cfg, state, data):
    DOCS.mkdir(exist_ok=True)
    start = cfg["starting_capital"]
    equity, cash = virtual_account(state, cfg)
    hist = read_equity()
    trades = read_trades()
    labels = [t for t, _ in hist]
    eq_vals = [e for _, e in hist]
    iwm_vals = [None] * len(hist)
    iwm_ret = None
    if hist and data is not None:
        try:
            first = dt.date.fromisoformat(hist[0][0][:10])
            iwm = daily_bars(data, ["IWM"], first - dt.timedelta(days=7),
                             now_ct() - dt.timedelta(minutes=20)).get("IWM")
            if iwm is not None and len(iwm):
                base = float(iwm.loc[:first]["close"].iloc[-1]) if len(iwm.loc[:first]) else float(iwm["close"].iloc[0])
                for i, (t, _) in enumerate(hist):
                    c = iwm.loc[:dt.date.fromisoformat(t[:10])]["close"]
                    iwm_vals[i] = start * float(c.iloc[-1]) / base if len(c) else start
                iwm_ret = iwm_vals[-1] - start
        except Exception as e:
            log(f"IWM chart error: {e}")
    pnls = [float(t["pnl"]) for t in trades]
    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p <= 0]
    peak, mdd = start, 0
    for e in eq_vals:
        peak = max(peak, e)
        mdd = max(mdd, peak - e)
    if state.get("halted"):
        badge = f'<span class="badge off">STOPPED</span> {html.escape(state.get("halt_reason",""))}'
    elif cfg.get("paused"):
        badge = '<span class="badge pause">PAUSED</span> no new buys'
    else:
        badge = '<span class="badge on">ACTIVE</span>'
    tiles = [
        ("Fake account value", f"${equity:,.2f}"),
        ("Profit / loss", money(equity - start)),
        ("If you'd just held IWM", money(iwm_ret) if iwm_ret is not None else "—"),
        ("Cash", f"${cash:,.2f}"),
        ("Trades closed", str(len(pnls))),
        ("Win rate", f"{len(wins)/len(pnls):.0%}" if pnls else "—"),
        ("Avg win / avg loss", f"{money(sum(wins)/len(wins)) if wins else '—'} / "
                               f"{money(sum(losses)/len(losses)) if losses else '—'}"),
        ("Biggest loss", money(min(pnls)) if pnls else "—"),
        ("Max drawdown", f"${mdd:,.2f}"),
    ]
    tiles_html = "".join(f'<div class="tile"><span>{a}</span><b>{b}</b></div>' for a, b in tiles)
    pos_rows = "".join(
        f"<tr><td><b>{s}</b></td><td>{p['qty']}</td><td>${p['entry_price']:.2f}</td>"
        f"<td>${p.get('price', p['entry_price']):.2f}</td>"
        f"<td>{money((p.get('price', p['entry_price']) - p['entry_price']) * p['qty'])}</td>"
        f"<td>${p['stop']:.2f} / ${p['target']:.2f}</td><td>{p['entry_date']}"
        f"{'' if p.get('filled') else ' (waiting to fill)'}</td></tr>"
        for s, p in state["positions"].items()) or '<tr><td colspan="7">None right now</td></tr>'
    trade_rows = "".join(
        f"<tr><td>{t['exit_date']}</td><td><b>{t['symbol']}</b></td><td>{t['qty']}</td>"
        f"<td>${float(t['entry_price']):.2f}</td><td>${float(t['exit_price']):.2f}</td>"
        f"<td>{money(float(t['pnl']))}</td><td>{t['reason']}</td></tr>"
        for t in reversed(trades[-50:])) or '<tr><td colspan="7">No closed trades yet</td></tr>'
    watch_rows = "".join(
        f"<tr><td><b>{w['symbol']}</b></td><td>{html.escape(w['note'])}</td>"
        f"<td>{'BUY' if w['buy'] else ''}</td></tr>"
        for w in state.get("watchlist", [])) or '<tr><td colspan="3">Made on the first market-day run</td></tr>'
    logs = LOG_F.read_text().splitlines()[-40:] if LOG_F.exists() else []
    logs += _log_lines
    body = f"""
<h1>Penny Stock Paper Bot</h1>
<p>{badge}<br><span class="note">FAKE MONEY ONLY &middot; last run {state.get('last_run','—')}
&middot; <a href="backtest.html">Backtest results</a></span></p>
<div class="tiles">{tiles_html}</div>
<h2>Fake account value vs. just holding IWM</h2>
{svg_chart(labels, [("Bot", "#4cd38a", eq_vals), ("IWM (buy & hold)", "#9ecbff", iwm_vals)])}
<h2>Open positions</h2>
<table><tr><th>Stock</th><th>Shares</th><th>Bought</th><th>Now</th><th>P/L</th><th>Stop / target</th><th>Date</th></tr>{pos_rows}</table>
<h2>Closed trades</h2>
<table><tr><th>Date</th><th>Stock</th><th>Shares</th><th>Buy</th><th>Sell</th><th>P/L</th><th>Why</th></tr>{trade_rows}</table>
<h2>Today's watchlist</h2>
<table><tr><th>Stock</th><th>Why it's on the list</th><th></th></tr>{watch_rows}</table>
<h2>Bot log</h2><pre>{html.escape(chr(10).join(logs[-40:]))}</pre>
<p class="note">Rules: stocks $1–$5 on NYSE/Nasdaq, buy above the 20-day average on 1.5x volume,
sell at +8% / -4% / 5 days. Max 3 stocks, $35 each, $2 risk per trade, stop for the day at -$5,
stop completely at -$15 from peak.</p>"""
    (DOCS / "index.html").write_text(page("Penny Bot", body))


def write_backtest_page(cfg, results, n_syms):
    DOCS.mkdir(exist_ok=True)
    parts = [f"<h1>Backtest results</h1><p class='note'>Run {now_ct():%Y-%m-%d %H:%M} CT on "
             f"{n_syms} stocks. Starts with ${cfg['starting_capital']} in each period, charges "
             f"{cfg['trade_cost']:.1%} per buy and per sell. <a href='index.html'>Back to dashboard</a></p>"]
    for name, ds, curve, bench, st, trades in results:
        tiles = [("Bot ended with", f"${st['end']:,.2f}"),
                 ("IWM buy & hold", f"${bench[-1]:,.2f}"),
                 ("Trades", str(st["trades"])),
                 ("Win rate", f"{st['win_rate']:.0%}"),
                 ("Avg win / loss", f"{money(st['avg_win'])} / {money(st['avg_loss'])}"),
                 ("Max drawdown", f"${st['max_dd']:,.2f}")]
        parts.append(f"<h2>{name}: {ds[0]} to {ds[-1]}</h2>")
        if st["halted"]:
            parts.append("<p class='neg'>The kill switch (-$15 from peak) triggered in this period.</p>")
        parts.append('<div class="tiles">' + "".join(
            f'<div class="tile"><span>{a}</span><b>{b}</b></div>' for a, b in tiles) + "</div>")
        parts.append(svg_chart([str(d) for d in ds],
                               [("Bot", "#4cd38a", curve), ("IWM", "#9ecbff", bench)]))
    test = results[-1][4]
    verdict = ("beat" if test["end"] > results[-1][3][-1] else "did NOT beat")
    parts.append(f"<h2>Honest read</h2><p>On the unseen test period the bot {verdict} simply "
                 "holding IWM. Caution: this test only uses stocks that are popular <i>today</i>, "
                 "so it skips penny stocks that collapsed or got delisted. Real results are "
                 "usually worse than a backtest. Treat the paper-trading results over 2–3 months "
                 "as the real test.</p>")
    (DOCS / "backtest.html").write_text(page("Backtest", "".join(parts)))


# ----------------------------------------------------------------- main
if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "run"
    if mode == "backtest":
        backtest()
    else:
        run()
