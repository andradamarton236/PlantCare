import { useState } from 'react';
import { Leaf, User, Mail, Lock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../services/api';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Vă rugăm completați toate câmpurile');
      return;
    }
    if (formData.username.length < 3) {
      setError('Numele de utilizator trebuie să aibă minim 3 caractere');
      return;
    }
    if (formData.password.length < 6) {
      setError('Parola trebuie să aibă minim 6 caractere');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Parolele nu coincid');
      return;
    }

    try {
      setLoading(true);
      await registerUser(formData.username, formData.email, formData.password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Crearea contului a eșuat');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900 flex items-center justify-center p-4">
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 p-8 w-full max-w-md">
        <button onClick={() => navigate('/login')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Înapoi la login
        </button>

        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-4 rounded-2xl mb-4 shadow-lg shadow-green-500/50">
            <Leaf className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Creează Cont</h1>
          <p className="text-gray-400 mt-2">Alătură-te comunității PlantCare</p>
        </div>

        {success ? (
          <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-4 text-center">
            <p className="text-green-400 font-semibold mb-1">Cont creat cu succes!</p>
            <p className="text-gray-400 text-sm">Redirecționare către login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-3 text-red-400 text-sm">{error}</div>}

            <Field icon={<User className="w-5 h-5" />} label="Nume utilizator" name="username" value={formData.username} onChange={handleChange} placeholder="Alegeți un nume" />
            <Field icon={<Mail className="w-5 h-5" />} label="Email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="adresa@email.com" />
            <Field icon={<Lock className="w-5 h-5" />} label="Parolă" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Minim 6 caractere" />
            <Field icon={<Lock className="w-5 h-5" />} label="Confirmă parola" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="Reintroduceți parola" />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 rounded-xl transition duration-200 shadow-lg shadow-green-500/50 hover:shadow-xl hover:shadow-green-500/60 transform hover:scale-[1.02] disabled:transform-none"
            >
              {loading ? 'Se creează contul...' : 'Creează cont'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ icon, label, name, value, onChange, placeholder, type = 'text' }: {
  icon: React.ReactNode;
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>
        <input
          type={type}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          className="w-full pl-11 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-white placeholder-gray-400"
          placeholder={placeholder}
          required
        />
      </div>
    </div>
  );
}
