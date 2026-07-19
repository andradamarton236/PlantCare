import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Calendar, Leaf, LogOut, RefreshCcw, Search, ShieldCheck, Users, Activity, Database } from 'lucide-react';
import { getAdminStats, AdminStats, AdminUser, AdminPrediction } from '../services/api';

interface AdminProps {
  onLogout: () => void;
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function pct(value?: number) {
  if (typeof value !== 'number') return '0.00%';
  return `${(value * 100).toFixed(2)}%`;
}

function StatCard({ icon, title, value, subtitle }: { icon: ReactNode; title: string; value: string | number; subtitle: string }) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-5 shadow-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400">
          {icon}
        </div>
      </div>
    </div>
  );
}

function SimpleBar({ label, value, max }: { label: string; value: number; max: number }) {
  const width = max > 0 ? Math.max(8, (value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="text-green-300 font-semibold">{value}</span>
      </div>
      <div className="h-2 bg-gray-900/70 rounded-full overflow-hidden border border-gray-700/50">
        <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function Admin({ onLogout }: AdminProps) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const loadStats = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAdminStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu s-au putut încărca statisticile admin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!stats) return [] as AdminUser[];
    const q = query.trim().toLowerCase();
    if (!q) return stats.users;
    return stats.users.filter((user) =>
      user.username.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q)
    );
  }, [stats, query]);

  const maxUserScans = Math.max(1, ...(stats?.users.map((u) => u.predictions_count) || [1]));
  const maxPlantCount = Math.max(1, ...(stats?.top_plants.map((p) => p.count) || [1]));
  const maxDiseaseCount = Math.max(1, ...(stats?.top_diseases.map((d) => d.count) || [1]));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900">
      <div className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-2 rounded-xl shadow-lg shadow-green-500/50">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Panou Admin</h1>
              <p className="text-xs text-gray-400">Statistici utilizatori și scanări PlantCare AI</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/30 rounded-xl transition backdrop-blur-sm border border-red-500/30">
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Ieșire</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white transition group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Înapoi la scanare
          </button>

          <button onClick={loadStats} className="flex items-center justify-center gap-2 px-4 py-2 text-green-400 hover:text-green-300 bg-green-900/20 hover:bg-green-900/30 rounded-xl transition backdrop-blur-sm border border-green-500/30">
            <RefreshCcw className="w-5 h-5" />
            Reîncarcă statistici
          </button>
        </div>

        {error && <div className="mb-6 bg-red-900/30 border border-red-500/50 rounded-xl p-3 text-red-400 text-sm">{error}</div>}

        {loading ? (
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 p-12 text-center text-gray-300">
            Se încarcă statisticile...
          </div>
        ) : stats ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<Users className="w-6 h-6" />} title="Utilizatori" value={stats.total_users} subtitle="conturi create în aplicație" />
              <StatCard icon={<Activity className="w-6 h-6" />} title="Scanări" value={stats.total_predictions} subtitle="predicții salvate în istoric" />
              <StatCard icon={<Leaf className="w-6 h-6" />} title="Plante detectate" value={stats.total_detected_plants} subtitle="specii distincte în istoric" />
              <StatCard icon={<Database className="w-6 h-6" />} title="Boli detectate" value={stats.total_detected_diseases} subtitle="boli distincte în istoric" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-5 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-green-400" />
                  <h2 className="text-xl font-bold text-white">Top plante detectate</h2>
                </div>
                <div className="space-y-4">
                  {stats.top_plants.length === 0 ? <p className="text-gray-400">Nu există scanări încă.</p> : stats.top_plants.map((item) => (
                    <SimpleBar key={item.plant} label={item.plant} value={item.count} max={maxPlantCount} />
                  ))}
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-5 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-xl font-bold text-white">Top boli detectate</h2>
                </div>
                <div className="space-y-4">
                  {stats.top_diseases.length === 0 ? <p className="text-gray-400">Nu există scanări încă.</p> : stats.top_diseases.map((item) => (
                    <SimpleBar key={item.disease} label={item.disease} value={item.count} max={maxDiseaseCount} />
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-5 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-400" />
                  <h2 className="text-xl font-bold text-white">Utilizatori și număr scanări</h2>
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Caută username sau email..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-900/60 border border-gray-700/60 text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-green-500/60"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-gray-400 border-b border-gray-700/70">
                    <tr>
                      <th className="py-3 pr-4">ID</th>
                      <th className="py-3 pr-4">Username</th>
                      <th className="py-3 pr-4">Email</th>
                      <th className="py-3 pr-4">Creat la</th>
                      <th className="py-3 pr-4">Scanări</th>
                      <th className="py-3 pr-4">Grafic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-800/80 text-gray-200">
                        <td className="py-3 pr-4 text-gray-400">#{user.id}</td>
                        <td className="py-3 pr-4 font-semibold text-white">{user.username}</td>
                        <td className="py-3 pr-4 text-gray-300">{user.email}</td>
                        <td className="py-3 pr-4 text-gray-400">{formatDateTime(user.created_at)}</td>
                        <td className="py-3 pr-4 text-green-300 font-semibold">{user.predictions_count}</td>
                        <td className="py-3 pr-4 min-w-40">
                          <div className="h-2 bg-gray-900/70 rounded-full overflow-hidden border border-gray-700/50">
                            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400" style={{ width: `${Math.max(5, (user.predictions_count / maxUserScans) * 100)}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-green-400" />
                <h2 className="text-xl font-bold text-white">Ultimele predicții</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-gray-400 border-b border-gray-700/70">
                    <tr>
                      <th className="py-3 pr-4">Utilizator</th>
                      <th className="py-3 pr-4">Plantă</th>
                      <th className="py-3 pr-4">Boală</th>
                      <th className="py-3 pr-4">Încredere</th>
                      <th className="py-3 pr-4">Data și ora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_predictions.map((item: AdminPrediction) => (
                      <tr key={item.id} className="border-b border-gray-800/80 text-gray-200">
                        <td className="py-3 pr-4">{item.username || `User #${item.user_id}`}</td>
                        <td className="py-3 pr-4 text-green-300 font-semibold">{item.plant}</td>
                        <td className="py-3 pr-4 text-red-300">{item.disease}</td>
                        <td className="py-3 pr-4 text-gray-400">{pct(item.plant_confidence)} / {pct(item.disease_confidence)}</td>
                        <td className="py-3 pr-4 text-gray-400">{formatDateTime(item.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {stats.recent_predictions.length === 0 && <p className="text-gray-400 py-4">Nu există predicții salvate.</p>}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
