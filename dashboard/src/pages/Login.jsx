import React, { useState } from 'react';
import axios from 'axios';
import { Lock, User, Shield, ArrowRight } from 'lucide-react';

const API_URL = `http://${window.location.hostname}:3000/api`;

export default function Login({ onLogin }) {
  const [apartment, setApartment] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { apartment, password });
      onLogin(response.data.token, response.data.user.role);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (apt, pass) => {
    setApartment(apt);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 text-white selection:bg-blue-600">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute -top-20 -left-20 w-44 h-44 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Shield className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">SmartCondo</h2>
          <p className="text-slate-400 text-xs mt-1">Acesso Inteligente ao Minimercado</p>
        </div>

        {error && (
          <div className="bg-red-950/60 border border-red-800/60 text-red-300 p-3.5 rounded-2xl mb-6 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Unidade / Usuário</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="Ex: 101 ou Master"
                className="pl-10 block w-full bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Senha</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-slate-500" />
              </div>
              <input
                type="password"
                placeholder="••••••••"
                className="pl-10 block w-full bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.99] disabled:opacity-50 transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2"
          >
            <span>{loading ? 'Autenticando...' : 'Entrar no Sistema'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Atalhos Rápidos para Teste */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider text-center font-bold mb-3">
            Atalhos para Simulação
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => quickFill('101', 'morador123')}
              className="p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 rounded-xl text-left transition-colors"
            >
              <div className="text-[11px] font-bold text-white">Morador (101)</div>
              <div className="text-[10px] text-slate-400">Jose Matheus</div>
            </button>
            <button
              type="button"
              onClick={() => quickFill('Master', 'admin123')}
              className="p-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 rounded-xl text-left transition-colors"
            >
              <div className="text-[11px] font-bold text-white">Síndico (Master)</div>
              <div className="text-[10px] text-slate-400">Admin Geral</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
