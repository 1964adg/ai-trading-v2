import requests

def is_symbol_on_binance(symbol: str) -> bool:
    url = "https://api.binance.com/api/v3/exchangeInfo"
    try:
        resp = requests.get(url, timeout=5)
        resp.raise_for_status()
        symbols = [s["symbol"] for s in resp.json()["symbols"]]
        return symbol.upper() in symbols
    except Exception:
        return False