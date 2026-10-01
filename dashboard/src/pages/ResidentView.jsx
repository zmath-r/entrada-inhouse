import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { 
  LogOut, 
  QrCode, 
  Users, 
  RefreshCw, 
  ShieldCheck, 
  Clock, 
  Share2, 
  Trash2, 
  Check, 
  Copy, 
  AlertTriangle,
  DoorOpen,
  Sparkles
} from 'lucide-react';
import TermsModal from '../components/TermsModal';

const API_URL = `http://${window.location.hostname}:3000/api`;
const TOTP_DURATION = 30; // 30 segundos

export default function ResidentView({ onLogout }) {
  const [activeTab, setActiveTab] = useState('key'); // 'key' | 'invites'
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TOTP_DURATION);
  const [error, setError] = useState('');
  const [loadingKey, setLoadingKey] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [tokenType, setTokenType] = useState('ENTRY');
  const [exiting, setExiting] = useState(false);
  const [exitSuccess, setExitSuccess] = useState('');

  // Estados dos Convites
  const [invites, setInvites] = useState([]);
  const [guestName, setGuestName] = useState('');
  const [validHours, setValidHours] = useState('4');
  const [creatingInvite, setCreatingInvite] = useState(false);

  const timerRef = useRef(null);

  const getHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  // Carrega informações do perfil e LGPD
  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/me`, getHeaders());
      setUser(res.data);
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    }
  };

  // Carrega convites do morador
  const fetchInvites = async () => {
    try {
      const res = await axios.get(`${API_URL}/invites`, getHeaders());
      setInvites(res.data);
    } catch (err) {
      console.error('Erro ao carregar convites:', err);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchInvites();

    // Sincronização automática em tempo real (polling a cada 3s)
    const interval = setInterval(() => {
      fetchProfile();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Geração de Chave Dinâmica TOTP (Entrada ou Saída contextual)
  const generateTOTP = async (overrideType) => {
    if (!user?.lgpd_accepted) return;
    setLoadingKey(true);
    setError('');
    setExitSuccess('');
    try {
      const type = overrideType || (user?.is_inside === 1 ? 'EXIT' : 'ENTRY');
      const res = await axios.post(`${API_URL}/tokens/generate`, { type }, getHeaders());
      setToken(res.data.token);
      setTokenType(type);
      setTimeLeft(TOTP_DURATION);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar chave dinâmica.');
      setToken(null);
    } finally {
      setLoadingKey(false);
    }
  };

  // Liberação da Fechadura e Registro de Saída
  const handleExitStore = async () => {
    if (!user) return;
    setExiting(true);
    setError('');
    setExitSuccess('');
    try {
      const res = await axios.post(`${API_URL}/access/exit`, {
        user_id: user.id,
        method: 'APP_RESIDENT'
      });
      if (res.data?.status === 'GRANTED') {
        setExitSuccess('Porta liberada e saída registrada com sucesso! Até logo!');
        setUser(prev => prev ? { ...prev, is_inside: 0 } : prev);
        setToken(null);
        setTimeout(() => setExitSuccess(''), 6000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao registrar saída.');
    } finally {
      setExiting(false);
    }
  };

  // Gerenciamento do contador regressivo de 30s
  useEffect(() => {
    if (!token) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateTOTP(); // Auto-renovação no término dos 30s
          return TOTP_DURATION;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [token]);

  // Criação de Convite para Visitante
  const handleCreateInvite = async (e) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setCreatingInvite(true);
    setError('');
    try {
      await axios.post(`${API_URL}/invites`, {
        guest_name: guestName.trim(),
        valid_hours: parseInt(validHours, 10)
      }, getHeaders());
      setGuestName('');
      fetchInvites();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar convite.');
    } finally {
      setCreatingInvite(false);
    }
  };

  // Revogação de Convite
  const handleRevokeInvite = async (inviteId) => {
    try {
      await axios.delete(`${API_URL}/invites/${inviteId}`, getHeaders());
      fetchInvites();
    } catch (err) {
      console.error('Erro ao revogar:', err);
    }
  };

  // Copiar link do visitante
  const copyInviteLink = (inviteCode, id) => {
    const link = `${window.location.origin}/invite/${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-md mx-auto relative shadow-2xl border-x border-slate-800/60 selection:bg-blue-600">
      {/* Modal obrigatório LGPD */}
      {user && !user.lgpd_accepted && (
        <TermsModal onAccepted={fetchProfile} />
      )}

      {/* Header Mobile / PWA */}
      <header className="p-5 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
            {user?.name ? user.name.charAt(0) : 'M'}
          </div>
          <div>
            <h1 className="font-bold text-sm text-white flex items-center gap-1.5">
              <span>{user?.name || 'Morador'}</span>
              <span className="text-[10px] font-medium bg-blue-950/80 text-blue-300 border border-blue-800/60 px-2 py-0.5 rounded-full">
                Apto {user?.apartment}
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              <span className={`h-2 w-2 rounded-full ${user?.is_inside ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
              <span>{user?.is_inside ? 'Dentro do Minimercado' : 'Fora do Minimercado'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user?.is_inside === 1 && (
            <button
              onClick={handleExitStore}
              disabled={exiting}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-[11px] flex items-center gap-1 shadow-md shadow-emerald-600/30 transition-all"
              title="Registrar saída do minimercado"
            >
              <DoorOpen className="w-3.5 h-3.5" />
              <span>{exiting ? 'Saindo...' : 'Sair'}</span>
            </button>
          )}

          <button 
            onClick={onLogout}
            title="Sair do aplicativo"
            className="h-9 w-9 bg-slate-800/80 hover:bg-red-950/60 hover:text-red-400 border border-slate-700/60 rounded-xl flex items-center justify-center text-slate-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Tabs PWA */}
      <div className="flex p-1.5 bg-slate-900/60 mx-4 mt-4 rounded-2xl border border-slate-800/80 gap-1">
        <button
          onClick={() => setActiveTab('key')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all duration-200 ${
            activeTab === 'key'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <QrCode className="h-4 w-4" />
          <span>Chave Dinâmica</span>
        </button>
        <button
          onClick={() => setActiveTab('invites')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all duration-200 ${
            activeTab === 'invites'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Passes Visitante</span>
        </button>
      </div>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-4 overflow-y-auto">
        {exitSuccess && (
          <div className="bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 p-3.5 rounded-2xl mb-4 text-xs flex items-center space-x-2.5 animate-fade-in shadow-lg shadow-emerald-950/40">
            <Check className="h-5 w-5 shrink-0 text-emerald-400" />
            <span className="font-medium">{exitSuccess}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-950/60 border border-red-800/60 text-red-300 p-3.5 rounded-2xl mb-4 text-xs flex items-center space-x-2.5">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* ABA 1: CHAVE DINÂMICA TOTP */}
        {activeTab === 'key' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            {token ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full text-center shadow-xl relative overflow-hidden">
                {/* Badge Dinâmico */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                    tokenType === 'EXIT'
                      ? 'bg-emerald-950/80 border border-emerald-800/60 text-emerald-300'
                      : 'bg-blue-950/80 border border-blue-800/60 text-blue-300'
                  }`}>
                    <Sparkles className={`h-3.5 w-3.5 animate-pulse ${tokenType === 'EXIT' ? 'text-emerald-400' : 'text-blue-400'}`} />
                    <span>{tokenType === 'EXIT' ? 'Chave de Saída TOTP' : 'Chave de Entrada TOTP'}</span>
                  </div>
                  <div className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-800/50">
                    <Clock className="h-3 w-3" />
                    <span>{timeLeft}s restantes</span>
                  </div>
                </div>

                {/* Barra de Progresso Regressiva (30s) */}
                <div className="w-full bg-slate-800 rounded-full h-1.5 mb-5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-400 h-full transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${(timeLeft / TOTP_DURATION) * 100}%` }}
                  ></div>
                </div>

                {/* QR Code */}
                <div className="bg-white p-4 rounded-2xl shadow-inner inline-block relative mx-auto mb-4">
                  <QRCodeSVG value={token} size={210} level="H" />
                </div>

                <p className="font-mono text-xs font-semibold text-slate-400 tracking-wider mb-2">
                  {token}
                </p>

                <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed mb-6">
                  {tokenType === 'EXIT'
                    ? 'Aproxime este QR Code do leitor da portaria para registrar sua saída e destravar a porta.'
                    : 'Aproxime este QR Code da câmera da portaria. A chave expira em 30s contra capturas de tela.'}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => generateTOTP(tokenType)}
                    className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700/60 transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Renovar Agora</span>
                  </button>
                  <button
                    onClick={() => setToken(null)}
                    className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium rounded-xl border border-slate-800 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : user?.is_inside === 1 ? (
              <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-7 w-full text-center shadow-2xl relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

                <div className="h-20 w-20 bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/30 shadow-inner">
                  <DoorOpen className="h-10 w-10 text-amber-300" />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-800/60 text-amber-300 text-[11px] font-mono font-bold mb-3">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  <span>Você está no Minimercado</span>
                </div>

                <h2 className="text-xl font-bold text-white mb-2">Visita em Andamento</h2>
                <p className="text-xs text-slate-400 leading-relaxed mb-6 max-w-xs mx-auto">
                  Terminou suas compras? Você pode registrar sua saída destrancando a fechadura digitalmente ou aproximando a mão do sensor No-Touch na porta.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={handleExitStore}
                    disabled={exiting}
                    className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2"
                  >
                    <DoorOpen className={`h-5 w-5 ${exiting ? 'animate-bounce' : ''}`} />
                    <span>{exiting ? 'Liberando Saída...' : 'Destrancar Porta & Registrar Saída'}</span>
                  </button>

                  <button
                    onClick={() => generateTOTP('EXIT')}
                    disabled={loadingKey}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors flex items-center justify-center gap-2"
                  >
                    <QrCode className="h-4 w-4 text-amber-400" />
                    <span>Gerar QR Code de Saída para o Totem</span>
                  </button>
                </div>

                <div className="mt-6 flex items-center justify-center space-x-2 text-[11px] text-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Fluxo Livre & Conformidade Legal AVCB</span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full text-center shadow-xl">
                <div className="h-24 w-24 bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/20 shadow-inner">
                  <DoorOpen className="h-12 w-12 text-blue-400" />
                </div>

                <h2 className="text-xl font-bold text-white mb-2">Acesso ao Minimercado</h2>
                <p className="text-xs text-slate-400 leading-relaxed mb-8 max-w-xs mx-auto">
                  Gere uma chave dinâmica protegida com protocolo TOTP de renovação automática a cada 30 segundos.
                </p>

                <button
                  onClick={() => generateTOTP('ENTRY')}
                  disabled={loadingKey}
                  className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center space-x-2"
                >
                  {loadingKey ? (
                    <span>Gerando Chave Segura...</span>
                  ) : (
                    <>
                      <QrCode className="h-5 w-5" />
                      <span>Gerar QR Code Dinâmico</span>
                    </>
                  )}
                </button>

                <div className="mt-6 flex items-center justify-center space-x-2 text-[11px] text-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Protegido por Anti-Passback e LGPD</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA 2: CONVITES PARA VISITANTES (Responsabilidade Solidária) */}
        {activeTab === 'invites' && (
          <div className="space-y-4">
            {/* Box de Criação de Convite */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
              <div className="flex items-center space-x-2.5 mb-3">
                <div className="h-8 w-8 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Novo Convite Temporário</h2>
                  <p className="text-[11px] text-slate-400">Emissão de passe digital para visitante</p>
                </div>
              </div>

              {/* Termo de Responsabilidade Solidária */}
              <div className="bg-amber-950/40 border border-amber-800/40 p-3 rounded-2xl text-[11px] text-amber-200/90 leading-tight mb-4 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  <strong>Responsabilidade Solidária:</strong> Você responde integralmente perante o condomínio pelas ações do visitante que utilizar este link de entrada.
                </span>
              </div>

              <form onSubmit={handleCreateInvite} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Nome Completo do Visitante
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Drauzio Varella"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Validade do Passe
                  </label>
                  <select
                    value={validHours}
                    onChange={(e) => setValidHours(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  >
                    <option value="2">2 Horas (Acesso Rápido)</option>
                    <option value="4">4 Horas (Padrão)</option>
                    <option value="12">12 Horas (Meio Período)</option>
                    <option value="24">24 Horas (1 Dia)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={creatingInvite || !guestName.trim()}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl text-xs font-semibold text-white transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  <span>{creatingInvite ? 'Gerando Passe...' : 'Gerar Link do Visitante'}</span>
                </button>
              </form>
            </div>

            {/* Lista de Convites Emitidos */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1 mb-2.5">
                Convites Emitidos Recentemente
              </h3>

              {invites.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center text-xs text-slate-500">
                  Nenhum convite emitido até o momento.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {invites.map((inv) => {
                    const isExpired = new Date(inv.valid_until.replace(' ', 'T') + 'Z').getTime() < Date.now();
                    const isUsed = inv.used_count >= inv.max_uses;
                    const isActive = inv.status === 'ACTIVE' && !isExpired && !isUsed;

                    return (
                      <div 
                        key={inv.id} 
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-white">{inv.guest_name}</h4>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {inv.invite_code}
                            </p>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isActive 
                              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60'
                              : isUsed 
                              ? 'bg-blue-950/80 text-blue-400 border-blue-800/60'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {isActive ? 'ATIVO' : isUsed ? 'UTILIZADO' : inv.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-500" />
                            Até {new Date(inv.valid_until.replace(' ', 'T') + 'Z').toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {isActive && (
                              <button
                                onClick={() => copyInviteLink(inv.invite_code, inv.id)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium border border-slate-700/60 transition-colors flex items-center gap-1"
                              >
                                {copiedId === inv.id ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-400" />
                                    <span className="text-emerald-400">Copiado!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    <span>Copiar Link</span>
                                  </>
                                )}
                              </button>
                            )}

                            {inv.status === 'ACTIVE' && (
                              <button
                                onClick={() => handleRevokeInvite(inv.id)}
                                title="Revogar convite"
                                className="p-1.5 bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 rounded-lg border border-slate-700/60 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
