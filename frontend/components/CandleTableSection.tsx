import React, { useState, useEffect } from 'react';
import { FaTrash } from 'react-icons/fa';

// ---- Funzioni di formattazione ----
function formatPrice(val?: number) {
  if (typeof val !== "number") return "";
  if (Math.abs(val) >= 1)
    return val.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  return val.toLocaleString('it-IT', { minimumFractionDigits: 4, maximumFractionDigits: 8 }).replace(/,?0+$/, '');
}
function formatDateTime(s: string) {
  if (!s) return "";
  const d = new Date(s);
  return d.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

// --- TYPE E API HELPERS ---
type Candle = {
  id: number;
  symbol: string;
  interval: string;
  open_time: string;
  close_time: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
};

// ---- FORM INSERIMENTO MANUALE ----
function CandleForm({ onCandleAdded }: { onCandleAdded: () => void }) {
  const [form, setForm] = useState<Omit<Candle, "id">>({
    symbol: "",
    interval: "",
    open_time: "",
    close_time: "",
    open_price: 0,
    high_price: 0,
    low_price: 0,
    close_price: 0,
    volume: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/candles/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Errore inserimento candela: " + res.status);
      setForm({
        symbol: "",
        interval: "",
        open_time: "",
        close_time: "",
        open_price: 0,
        high_price: 0,
        low_price: 0,
        close_price: 0,
        volume: 0,
      });
      onCandleAdded();
    } catch (err: any) {
      setError(err.message || "Errore imprevisto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap gap-2 items-end">
      {Object.entries(form).map(([key, value]) => (
        <div key={key} className="flex flex-col">
          <label className="text-xs text-gray-400">{key}</label>
          <input
            className="px-2 py-1 rounded bg-gray-800 text-white border border-gray-700 text-xs"
            type={typeof value === "number" ? "number" : (key.includes("time") ? "datetime-local" : "text")}
            step={typeof value === "number" ? "any" : undefined}
            value={value}
            onChange={e =>
              setForm(f => ({ ...f, [key]: (typeof value === "number" ? parseFloat(e.target.value || "0") : e.target.value) }))
            }
            required
          />
        </div>
      ))}
      <button
        type="submit"
        className="bg-green-600 hover:bg-green-700 text-white rounded px-4 py-2"
        disabled={loading}
      >
        {loading ? "Inserendo…" : "Inserisci candela"}
      </button>
      {error && <span className="text-red-400 ml-4">{error}</span>}
    </form>
  );
}

// ---- COMPONENTE PRINCIPALE ----
const CandleTableSection: React.FC = () => {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symbolFilter, setSymbolFilter] = useState('');
  const [intervalFilter, setIntervalFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Carica le candele dal backend (con filtri, NO limiti hard coded)
  const fetchCandles = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = 'http://localhost:8000/candles/';
      const searchParams = [];
      if (symbolFilter) searchParams.push(`symbol=${symbolFilter}`);
      if (intervalFilter) searchParams.push(`interval=${intervalFilter}`);
      if (searchParams.length) url += '?' + searchParams.join('&');
      const response = await fetch(url);
      const data = await response.json();
      setCandles(Array.isArray(data) ? data : data.data || []);
    } catch (err: any) {
      setError(err.message || 'Errore caricamento candele');
    } finally {
      setLoading(false);
    }
  };

  // Batch fetch (acquisizione reale da Binance)
  const doBackendFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:8000/candles/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: symbolFilter || "BTCEUR",
          interval: intervalFilter || "1h",
          limit: 1000
        })
      });
      if (!res.ok) throw new Error(`Errore fetch backend: ${res.status}`);
      await fetchCandles();
    } catch (err: any) {
      setError(err.message || "Errore fetch backend");
    } finally {
      setLoading(false);
    }
  };

  // Elimina singola candela
  const deleteCandle = async (id: number) => {
    if (!window.confirm('Vuoi eliminare questa candela?')) return;
    try {
      await fetch(`http://localhost:8000/candles/${id}`, { method: 'DELETE' });
      await fetchCandles();
    } catch (err) {
      alert('Errore eliminazione candela');
    }
  };

  // Elimina batch
  const deleteSelected = async () => {
    if (!window.confirm('Vuoi eliminare tutte le selezionate?')) return;
    for (let id of selectedIds) {
      await fetch(`http://localhost:8000/candles/${id}`, { method: 'DELETE' });
    }
    await fetchCandles();
    setSelectedIds([]);
  };

  useEffect(() => {
    fetchCandles();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
      {/* Tasti input/carica */}
      <CandleForm onCandleAdded={fetchCandles} />
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <input
          className="bg-gray-800 text-white px-2 py-1 rounded"
          placeholder="Filtro simbolo"
          value={symbolFilter}
          onChange={e => setSymbolFilter(e.target.value)}
        />
        <input
          className="bg-gray-800 text-white px-2 py-1 rounded"
          placeholder="Interval (es: 1h)"
          value={intervalFilter}
          onChange={e => setIntervalFilter(e.target.value)}
        />
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-1"
          onClick={fetchCandles}
        >
          Refresh
        </button>
        <button
          className="bg-yellow-600 hover:bg-yellow-700 text-white rounded px-4 py-1"
          onClick={doBackendFetch}
        >
          Scarica dal backend
        </button>
        <button
          className="bg-red-600 hover:bg-red-700 text-white rounded px-4 py-1"
          onClick={deleteSelected}
          disabled={selectedIds.length === 0}
        >
          Elimina selezionate
        </button>
      </div>

      {loading && <div className="text-blue-300 mb-2">Caricamento candele…</div>}
      {error && <div className="text-red-400 mb-2">{error}</div>}

      <div className="overflow-x-auto max-h-[70vh] rounded-lg border border-gray-800 shadow relative">
        <table className="table-auto w-full text-xs text-left text-gray-400">
          <thead className="sticky top-0 bg-gray-900 z-10">
            <tr>
              <th className="px-2 py-2">
                <input
                  type="checkbox"
                  checked={selectedIds.length === candles.length && candles.length > 0}
                  onChange={e =>
                    setSelectedIds(
                      e.target.checked ? candles.map(c => c.id) : []
                    )
                  }
                />
              </th>
              <th className="px-2 py-2">Symbol</th>
              <th className="px-2 py-2">Interval</th>
              <th className="px-2 py-2">Open</th>
              <th className="px-2 py-2">High</th>
              <th className="px-2 py-2">Low</th>
              <th className="px-2 py-2">Close</th>
              <th className="px-2 py-2">Volume</th>
              <th className="px-2 py-2">Open Time</th>
              <th className="px-2 py-2">Close Time</th>
              <th className="px-2 py-2">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {candles.map(candle => (
              <tr key={candle.id}>
                <td className="px-2 py-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(candle.id)}
                    onChange={e => {
                      setSelectedIds(ids =>
                        e.target.checked
                          ? [...ids, candle.id]
                          : ids.filter(id => id !== candle.id)
                      );
                    }}
                  />
                </td>
                <td className="px-2 py-1">{candle.symbol}</td>
                <td className="px-2 py-1">{candle.interval}</td>
                <td className="px-2 py-1">{formatPrice(candle.open_price)}</td>
                <td className="px-2 py-1">{formatPrice(candle.high_price)}</td>
                <td className="px-2 py-1">{formatPrice(candle.low_price)}</td>
                <td className="px-2 py-1">{formatPrice(candle.close_price)}</td>
                <td className="px-2 py-1">{formatPrice(candle.volume)}</td>
                <td className="px-2 py-1">{formatDateTime(candle.open_time)}</td>
                <td className="px-2 py-1">{formatDateTime(candle.close_time)}</td>
                <td className="px-2 py-1">
                  <button
                    title="Elimina"
                    className="p-1 text-red-400 hover:text-red-700 transition"
                    onClick={() => deleteCandle(candle.id)}
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
            {candles.length === 0 && (
              <tr>
                <td colSpan={11} className="text-center text-gray-500 py-4">
                  Nessuna candela trovata.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CandleTableSection;
