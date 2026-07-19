import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Leaf, LogOut, AlertCircle, RefreshCcw, Trash2 } from 'lucide-react';
import { getHistory, deleteHistoryItem, HistoryItem } from '../services/api';

interface HistoryProps {
  onLogout: () => void;
}

function pct(value?: number) {
  if (typeof value !== 'number') return '0.00%';
  return `${(value * 100).toFixed(2)}%`;
}

export default function History({ onLogout }: HistoryProps) {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getHistory();
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu s-a putut încărca istoricul.');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (value: string) => {
    return new Date(value).toLocaleString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm('Sigur dorești să ștergi această scanare din istoric?');
    if (!confirmed) return;

    try {
      setError('');
      await deleteHistoryItem(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu s-a putut șterge înregistrarea.');
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900">
      <div className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-2 rounded-xl shadow-lg shadow-green-500/50">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Istoric scanări</h1>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/30 rounded-xl transition backdrop-blur-sm border border-red-500/30">
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Ieșire</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white transition group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Înapoi la scanare
          </button>

          <button onClick={loadHistory} className="flex items-center gap-2 px-4 py-2 text-green-400 hover:text-green-300 bg-green-900/20 hover:bg-green-900/30 rounded-xl transition backdrop-blur-sm border border-green-500/30">
            <RefreshCcw className="w-5 h-5" />
            Reîncarcă
          </button>
        </div>

        {error && <div className="mb-6 bg-red-900/30 border border-red-500/50 rounded-xl p-3 text-red-400 text-sm">{error}</div>}

        {loading ? (
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 p-12 text-center text-gray-300">
            Se încarcă istoricul...
          </div>
        ) : history.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 p-12 text-center">
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center backdrop-blur-sm border border-green-500/30">
              <Leaf className="w-12 h-12 text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Nicio scanare salvată</h2>
            <p className="text-gray-400 mb-6">Începeți prin a scana prima plantă</p>
            <button onClick={() => navigate('/')} className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl transition shadow-lg shadow-green-500/50 font-semibold transform hover:scale-[1.02]">
              Scanează acum
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {history.map((item) => (
              <div key={item.id} className="group bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-700/50 overflow-hidden hover:shadow-2xl hover:border-green-500/30 transition transform hover:scale-[1.02]">
                <div className="h-32 bg-gray-900/50 flex items-center justify-center border-b border-gray-700/50">
                  <Leaf className="w-12 h-12 text-green-400" />
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-white">{item.plant}</h3>
                    {item.warning && <AlertCircle className="w-5 h-5 text-yellow-400" />}
                  </div>

                  <p className="text-gray-300 text-sm mb-2">Boală: <span className="text-red-400">{item.disease}</span></p>
                  <p className="text-gray-400 text-sm mb-1">Încredere plantă: {pct(item.plant_confidence)}</p>
                  <p className="text-gray-400 text-sm mb-3">Încredere boală: {pct(item.disease_confidence)}</p>

                  {item.warning && (
                    <div className="mb-3 text-xs text-yellow-300 bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-2">
                      {item.warning}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {formatDateTime(item.created_at)}
                    </div>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex items-center gap-1 px-3 py-2 text-xs text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/30 rounded-lg transition border border-red-500/30"
                      title="Șterge din istoric"
                    >
                      <Trash2 className="w-4 h-4" />
                      Șterge
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
