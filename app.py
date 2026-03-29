from flask import Flask, jsonify
from flask_cors import CORS
import random
import math
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

random.seed(42)

def generate_price_series(start_price, days=30, volatility=0.02):
    prices = [start_price]
    for _ in range(days - 1):
        change = random.gauss(0.0003, volatility)
        prices.append(round(prices[-1] * (1 + change), 2))
    return prices

STOCKS = {
    "AAPL":  {"name": "Apple Inc.",          "price": 189.45, "vol": 0.018},
    "MSFT":  {"name": "Microsoft Corp.",     "price": 415.20, "vol": 0.016},
    "GOOGL": {"name": "Alphabet Inc.",       "price": 178.90, "vol": 0.020},
    "NVDA":  {"name": "NVIDIA Corp.",        "price": 875.30, "vol": 0.035},
    "AMZN":  {"name": "Amazon.com Inc.",     "price": 198.70, "vol": 0.022},
    "TSLA":  {"name": "Tesla Inc.",          "price": 241.10, "vol": 0.045},
    "META":  {"name": "Meta Platforms",      "price": 513.80, "vol": 0.028},
    "BRK":   {"name": "Berkshire Hathaway", "price": 612.40, "vol": 0.012},
}

PORTFOLIO = {
    "AAPL":  {"shares": 50,  "avg_cost": 165.30},
    "MSFT":  {"shares": 30,  "avg_cost": 380.10},
    "NVDA":  {"shares": 15,  "avg_cost": 620.00},
    "TSLA":  {"shares": 20,  "avg_cost": 210.50},
    "GOOGL": {"shares": 25,  "avg_cost": 155.00},
}

INDICES = {
    "S&P 500":  {"value": 5248.50, "change": 0.58},
    "NASDAQ":   {"value": 16432.80, "change": 0.92},
    "DOW JONES":{"value": 39387.30, "change": 0.34},
    "VIX":      {"value": 14.32,    "change": -3.21},
}

@app.route("/api/portfolio", methods=["GET"])
def get_portfolio():
    holdings = []
    total_value = 0
    total_cost = 0

    for ticker, pos in PORTFOLIO.items():
        stock = STOCKS[ticker]
        current_price = stock["price"] * (1 + random.gauss(0, 0.005))
        current_price = round(current_price, 2)
        value = round(current_price * pos["shares"], 2)
        cost = round(pos["avg_cost"] * pos["shares"], 2)
        pnl = round(value - cost, 2)
        pnl_pct = round((pnl / cost) * 100, 2)

        total_value += value
        total_cost += cost

        holdings.append({
            "ticker": ticker,
            "name": stock["name"],
            "shares": pos["shares"],
            "avg_cost": pos["avg_cost"],
            "current_price": current_price,
            "value": value,
            "pnl": pnl,
            "pnl_pct": pnl_pct,
        })

    total_pnl = round(total_value - total_cost, 2)
    total_pnl_pct = round((total_pnl / total_cost) * 100, 2)
    cash = 12450.00
    daily_change = round(random.uniform(-1200, 1800), 2)

    return jsonify({
        "total_value": round(total_value + cash, 2),
        "invested": round(total_cost, 2),
        "total_pnl": total_pnl,
        "total_pnl_pct": total_pnl_pct,
        "cash": cash,
        "daily_change": daily_change,
        "daily_change_pct": round((daily_change / (total_value + cash)) * 100, 2),
        "holdings": sorted(holdings, key=lambda x: x["value"], reverse=True),
    })

@app.route("/api/chart/<ticker>", methods=["GET"])
def get_chart(ticker):
    stock = STOCKS.get(ticker.upper())
    if not stock:
        return jsonify({"error": "Ticker not found"}), 404

    days = 30
    prices = generate_price_series(stock["price"] * 0.88, days, stock["vol"])
    dates = [(datetime.today() - timedelta(days=days - i - 1)).strftime("%d/%m") for i in range(days)]

    return jsonify({
        "ticker": ticker.upper(),
        "name": stock["name"],
        "dates": dates,
        "prices": prices,
        "current": prices[-1],
        "change": round(prices[-1] - prices[0], 2),
        "change_pct": round(((prices[-1] - prices[0]) / prices[0]) * 100, 2),
    })

@app.route("/api/movers", methods=["GET"])
def get_movers():
    movers = []
    for ticker, data in STOCKS.items():
        change_pct = round(random.gauss(0.2, 1.8), 2)
        price = round(data["price"] * (1 + change_pct / 100), 2)
        movers.append({
            "ticker": ticker,
            "name": data["name"],
            "price": price,
            "change_pct": change_pct,
            "volume": f"{random.randint(15, 95)}.{random.randint(1,9)}M",
        })
    movers.sort(key=lambda x: abs(x["change_pct"]), reverse=True)
    return jsonify(movers[:6])

@app.route("/api/indices", methods=["GET"])
def get_indices():
    result = []
    for name, data in INDICES.items():
        change = round(data["change"] + random.gauss(0, 0.1), 2)
        result.append({
            "name": name,
            "value": round(data["value"] * (1 + change / 100), 2),
            "change": change,
        })
    return jsonify(result)

@app.route("/api/allocation", methods=["GET"])
def get_allocation():
    labels, values, colors = [], [], []
    color_palette = ["#C9A84C", "#E8C96C", "#A07830", "#D4B468", "#8B6520", "#F0DC90"]
    total = sum(
        STOCKS[t]["price"] * p["shares"]
        for t, p in PORTFOLIO.items()
        if t in STOCKS
    )
    for i, (ticker, pos) in enumerate(PORTFOLIO.items()):
        val = STOCKS[ticker]["price"] * pos["shares"]
        labels.append(ticker)
        values.append(round((val / total) * 100, 1))
        colors.append(color_palette[i % len(color_palette)])
    labels.append("Cash")
    values.append(round((12450 / (total + 12450)) * 100, 1))
    colors.append("#555566")
    return jsonify({"labels": labels, "values": values, "colors": colors})

@app.route("/api/transactions", methods=["GET"])
def get_transactions():
    txns = [
        {"date": "28/03", "type": "BUY",  "ticker": "NVDA", "shares": 5,   "price": 862.10, "total": 4310.50},
        {"date": "25/03", "type": "SELL", "ticker": "TSLA", "shares": 10,  "price": 248.90, "total": 2489.00},
        {"date": "22/03", "type": "BUY",  "ticker": "AAPL", "shares": 15,  "price": 183.20, "total": 2748.00},
        {"date": "18/03", "type": "BUY",  "ticker": "MSFT", "shares": 8,   "price": 408.50, "total": 3268.00},
        {"date": "14/03", "type": "SELL", "ticker": "GOOGL","shares": 12,  "price": 171.30, "total": 2055.60},
    ]
    return jsonify(txns)

if __name__ == "__main__":
    app.run(debug=True, port=5000)
