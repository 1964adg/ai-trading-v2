import { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SymbolManager({ onChange }) {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get(`${API}/custom-symbols`).then(r => setSymbols(r.data));
  }, []);

  const handleAdd = async () => {
    setError("");
    try {
      await axios.post(`${API}/custom-symbols`, { symbol: input });
      setSymbols([...symbols, input.toUpperCase()]);
      setInput("");
      onChange([...symbols, input.toUpperCase()]);
    } catch (e) {
      setError(e?.response?.data?.detail || "Errore sconosciuto");
    }
  };

  const handleRemove = async (sym: string) => {
    await axios.delete(`${API}/custom-symbols/${sym}`);
    setSymbols(symbols.filter(s => s !== sym));
    onChange(symbols.filter(s => s !== sym));
  };

  return (
    <div className="my-4">
      <label>
        <span>Gestione crypto pair:</span>
        <input
          value={input}
          placeholder="Es: BTCUSDT"
          onChange={e => setInput(e.target.value.toUpperCase())}
        />
        <button onClick={handleAdd}>Aggiungi</button>
      </label>
      {error && <div className='text-red-500'>{error}</div>}
      <ul>
        {symbols.map(sym =>
          <li key={sym} className="flex gap-2 items-center">
            <span>{sym}</span>
            <button onClick={() => handleRemove(sym)}>❌</button>
          </li>
        )}
      </ul>
    </div>
  );
}