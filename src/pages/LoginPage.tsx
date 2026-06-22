import React, { useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import { User } from '../types';
import { getUsers, saveCurrentUser } from '../utils/storage';
import { useNotification } from '../components/NotificationContext';
import Button from '../components/Button';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      showNotification('warning', 'Preencha os campos obrigatórios.');
      return;
    }

    setLoading(true);

    // Simulate short network loading for natural UX, even with localStorage
    setTimeout(() => {
      const users = getUsers();
      const foundUser = users.find(
        u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );

      setLoading(false);

      if (foundUser) {
        saveCurrentUser(foundUser);
        showNotification('success', 'Login realizado com sucesso.');
        onLoginSuccess(foundUser);
      } else {
        setError('E-mail ou senha incorretos.');
        showNotification('error', 'Erro ao salvar. E-mail ou senha incorretos.');
      }
    }, 850);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="flex justify-center">
          <div className="h-14 w-14 bg-amber-400 rounded-xl flex items-center justify-center font-extrabold text-slate-950 text-xl shadow-md select-none transform transition hover:scale-105">
            DM
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-slate-900 font-display">
          PAAD - Painel de Avaliação DeMolay
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Acompanhamento de participação e frequência institucional
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-4 shadow-md rounded-xl sm:px-10 border border-slate-200">
          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-lg">
                <div className="flex">
                  <div className="text-sm font-semibold text-rose-800">{error}</div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                E-mail institucional
              </label>
              <div className="relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-sm placeholder-slate-400 text-slate-800"
                  placeholder="exemplo@demolay.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Senha de acesso
              </label>
              <div className="relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-sm placeholder-slate-400 text-slate-800"
                  placeholder="••••••"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                loading={loading}
                disabled={loading}
                variant="primary"
                className="w-full justify-center py-3 text-sm rounded-lg"
              >
                {loading ? 'Entrando...' : 'Entrar no painel'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

