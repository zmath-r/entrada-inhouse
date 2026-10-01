import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Activity, 
  Users, 
  Settings, 
  LogOut, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Download, 
  Search, 
  LockOpen, 
  Key, 
  QrCode, 
  Cpu, 
  ShieldCheck, 
  Clock, 
  DoorOpen, 
  User, 
  Building2,
  Check,
  Radio,
  Copy,
  ExternalLink,
  Shield,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff
} from 'lucide-react';

const API_URL = `http://${window.location.hostname}:3000/api`;

export default function AdminDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('monitor'); // 'monitor' | 'users' | 'settings'
  const [logs, setLogs] = useState([]);
  const [telemetry, setTelemetry] = useState({ status: 'OFFLINE', last_ping: null });
  const [metrics, setMetrics] = useState({
    today_entries: 0,
    current_occupancy: 0,
    max_capacity: 6,
    occupants: [],
    active_passes: 0,
    security_alerts: 0
  });
  const [pendingUsers, setPendingUsers] = useState([]);
  const [residents, setResidents] = useState([]);
  const [expandedResidents, setExpandedResidents] = useState({});
  const [copiedCode, setCopiedCode] = useState(null);
  const [revokingId, setRevokingId] = useState(null);
  const [config, setConfig] = useState({ name: 'SmartCondo Base', topology: 'VERTICAL' });
  const [showIp, setShowIp] = useState(() => {
    const saved = localStorage.getItem('admin_show_ip');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleShowIp = () => {
    setShowIp(prev => {
      const next = !prev;
      localStorage.setItem('admin_show_ip', String(next));
      return next;
    });
  };

  const toggleResidentExpand = (residentId) => {
    setExpandedResidents(prev => ({
      ...prev,
      [residentId]: !prev[residentId]
    }));
  };

  const allExpanded = residents.length > 0 && residents.every(r => expandedResidents[r.id]);

  const toggleAllResidents = () => {
    if (allExpanded) {
      setExpandedResidents({});
    } else {
      const next = {};
      residents.forEach(r => { next[r.id] = true; });
      setExpandedResidents(next);
    }
  };
  
  // Filtros da Tabela
  const [filterType, setFilterType] = useState('all'); // 'all' | 'moradores' | 'visitantes' | 'negados'
  const [searchTerm, setSearchTerm] = useState('');
  
  // Feedback do Botão de Abertura Remota
  const [isOpeningGate, setIsOpeningGate] = useState(false);
  const [gateSuccess, setGateSuccess] = useState(false);
  const [isPinging, setIsPinging] = useState(false);

  const getHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const fetchData = async () => {
    try {
      const [logsRes, telRes, usersRes, configRes, metricsRes, residentsRes] = await Promise.all([
        axios.get(`${API_URL}/logs`, getHeaders()),
        axios.get(`${API_URL}/telemetry`, getHeaders()),
        axios.get(`${API_URL}/users/pending`, getHeaders()),
        axios.get(`${API_URL}/config`, getHeaders()),
        axios.get(`${API_URL}/monitoring/metrics`, getHeaders()),
        axios.get(`${API_URL}/admin/residents`, getHeaders())
      ]);

      setLogs(logsRes.data || []);
      setTelemetry(telRes.data || { status: 'OFFLINE' });
      setPendingUsers(usersRes.data || []);
      if (configRes.data) setConfig(configRes.data);
      if (metricsRes.data) setMetrics(metricsRes.data);
      if (residentsRes.data) setResidents(residentsRes.data);
    } catch (err) {
      console.error('Erro ao buscar telemetria:', err);
    }
  };

  const handleCopyLink = (inviteCode) => {
    const url = `${window.location.origin}/invite/${inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(inviteCode);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleRevokeInvite = async (inviteId) => {
    if (!confirm('Deseja realmente revogar este passe de visitante?')) return;
    setRevokingId(inviteId);
    try {
      await axios.delete(`${API_URL}/admin/invites/${inviteId}`, getHeaders());
      fetchData();
    } catch (err) {
      alert('Erro ao revogar passe de visitante.');
    } finally {
      setRevokingId(null);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000); // Polling a cada 4s
    return () => clearInterval(interval);
  }, []);

  // Abertura Remota da Catraca (Bypass do Síndico)
  const handleRemoteOverride = async () => {
    setIsOpeningGate(true);
    try {
      await axios.post(`${API_URL}/hardware/remote-override`, {}, getHeaders());
      setGateSuccess(true);
      fetchData();
      setTimeout(() => {
        setGateSuccess(false);
        setIsOpeningGate(false);
      }, 3000);
    } catch (err) {
      alert('Falha ao disparar liberação remota.');
      setIsOpeningGate(false);
    }
  };

  const [isSimulatingExit, setIsSimulatingExit] = useState(false);
  const [exitOverrideSuccess, setExitOverrideSuccess] = useState(false);

  // Simulação de Saída Livre / Botoeira No-Touch Remota
  const handleExitOverride = async () => {
    setIsSimulatingExit(true);
    try {
      await axios.post(`${API_URL}/access/exit`, { method: 'BOTOEIRA_VIRTUAL_ADMIN' });
      setExitOverrideSuccess(true);
      fetchData();
      setTimeout(() => {
        setExitOverrideSuccess(false);
        setIsSimulatingExit(false);
      }, 3000);
    } catch (err) {
      alert('Falha ao acionar saída.');
      setIsSimulatingExit(false);
    }
  };

  // Registrar Saída de Morador Específico
  const handleAdminReleaseResident = async (residentId) => {
    try {
      await axios.post(`${API_URL}/access/exit`, { user_id: residentId, method: 'ADMIN_RELEASE' });
      fetchData();
    } catch (err) {
      alert('Erro ao registrar saída do morador.');
    }
  };

  // Ping Manual no Dispositivo (Sincroniza e Valida Status Online)
  const handleManualPing = async () => {
    setIsPinging(true);
    try {
      await axios.post(`${API_URL}/hardware/ping`, { status: 'ONLINE' });
      await fetchData();
    } catch (err) {
      console.error('Erro ao enviar ping manual:', err);
    } finally {
      setTimeout(() => setIsPinging(false), 800);
    }
  };

  // Aprovação de Morador
  const handleApproveUser = async (userId) => {
    try {
      await axios.post(`${API_URL}/users/approve`, { userId }, getHeaders());
      fetchData();
    } catch (err) {
      alert('Erro ao aprovar morador.');
    }
  };

  // Salvar Configurações
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/config`, config, getHeaders());
      alert('Configuração atualizada com sucesso!');
    } catch (err) {
      alert('Erro ao atualizar configuração.');
    }
  };

  // Exportar Relatório CSV
  const handleExportCSV = () => {
    if (logs.length === 0) {
      alert('Nenhum registro para exportar.');
      return;
    }

    const headers = ['ID', 'Data/Hora', 'Nome', 'Apartamento', 'Acao', 'Detalhes_Auditoria'];
    const rows = logs.map(l => [
      l.id,
      `"${new Date(l.timestamp + 'Z').toLocaleString('pt-BR')}"`,
      `"${l.name || 'Desconhecido'}"`,
      `"${l.apartment || '-'}"`,
      `"${l.action}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `smartcondo_auditoria_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtros de Tabela
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 1. Filtro de Abas
      if (filterType === 'moradores') {
        if (log.details && log.details.includes('VISITANTE')) return false;
        if (log.action === 'DENIED') return false;
        if (log.action === 'EXIT' && !log.name) return false;
      } else if (filterType === 'visitantes') {
        if (!log.details || !log.details.includes('VISITANTE')) return false;
      } else if (filterType === 'saidas') {
        if (log.action !== 'EXIT') return false;
      } else if (filterType === 'negados') {
        if (log.action !== 'DENIED' && log.action !== 'EMERGENCY') return false;
      }

      // 2. Busca por Texto
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const nameMatch = (log.name || '').toLowerCase().includes(term);
        const aptMatch = (log.apartment || '').toLowerCase().includes(term);
        const detailsMatch = (log.details || '').toLowerCase().includes(term);
        const actionMatch = (log.action || '').toLowerCase().includes(term);
        return nameMatch || aptMatch || detailsMatch || actionMatch;
      }

      return true;
    });
  }, [logs, filterType, searchTerm]);

  return (
    <div className="flex h-screen bg-[#0f131c] text-[#dfe2ee] font-sans antialiased select-none overflow-hidden">
      
      {/* 1. SIDEBAR EXECUTIVA (Obsidian Glass) */}
      <aside className="w-64 bg-[#181c24]/85 backdrop-blur-2xl border-r border-slate-800/80 flex flex-col justify-between z-30 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col">
          {/* Logo & Subtítulo */}
          <div className="px-5 pt-6 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-base text-white tracking-tight leading-none">SmartCondo</h1>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">Painel Administrativo</p>
              </div>
            </div>
          </div>

          <div className="px-5 pb-2">
            <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Administração</span>
          </div>

          {/* Navegação */}
          <nav className="flex flex-col gap-1.5 px-3">
            <button
              onClick={() => setActiveTab('monitor')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'monitor'
                  ? 'bg-slate-800/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.4)] border border-slate-700/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Activity className="w-4 h-4 text-blue-400" />
              <span>Monitoramento</span>
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'users'
                  ? 'bg-slate-800/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.4)] border border-slate-700/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Moradores & Unidades</span>
              </div>
              {pendingUsers.length > 0 && (
                <span className="bg-red-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                  {pendingUsers.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'settings'
                  ? 'bg-slate-800/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.4)] border border-slate-700/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>Configurações</span>
            </button>
          </nav>
        </div>

        {/* Rodapé Usuário */}
        <div className="p-3">
          <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
                SG
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white leading-tight">Síndico Geral</span>
                <span className="text-[10px] text-slate-400 leading-tight">{config.name}</span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-950/60 hover:text-red-400 transition-colors"
              title="Encerrar Sessão"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* TOP BAR / HEADER COM BUSCA E STATUS DO HARDWARE */}
        <header className="h-14 bg-[#0f131c]/80 backdrop-blur-2xl border-b border-slate-800/80 z-20 flex items-center justify-between px-8">
          <div className="flex items-center gap-3">
            {/* Status Online Pulsante */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border ${
              telemetry.status === 'ONLINE'
                ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-400'
                : 'bg-red-950/50 border-red-800/60 text-red-400'
            }`}>
              <span className="relative flex h-2 w-2">
                {telemetry.status === 'ONLINE' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${telemetry.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
              </span>
              <span className="uppercase text-[11px] font-mono">Hardware {telemetry.status}</span>
            </div>

            <span className="text-xs text-slate-500 font-mono hidden sm:inline">
              Último ping: {telemetry.last_ping ? new Date(telemetry.last_ping + 'Z').toLocaleTimeString('pt-BR') : 'Sem registro'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 w-64 shadow-inner">
              <Search className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type="text"
                placeholder="Buscar unidade, tag ou log..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full"
              />
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">⌘K</kbd>
            </div>

            <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
          </div>
        </header>

        {/* CONTEÚDO SCROLLÁVEL */}
        <main className="flex-1 overflow-y-auto p-8 space-y-6">
          
          {/* ==================================================== */}
          {/* ABA: MONITORAMENTO EM TEMPO REAL (OBSIDIAN GLASS)     */}
          {/* ==================================================== */}
          {activeTab === 'monitor' && (
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* Context Header & Ações */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono uppercase font-bold text-blue-400 tracking-wider">
                      Telemetria ao Vivo
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                    <span className="text-xs text-slate-400">Ciclo de leitura: 500ms</span>
                  </div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Monitoramento em Tempo Real</h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Controle unificado de acessos, validação de tokens temporários e segurança da entrada autônoma InHouse.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/50 text-xs font-semibold transition-all active:scale-95 shadow-sm"
                  >
                    <Download className="w-4 h-4 text-slate-400" />
                    <span>Exportar Relatório CSV</span>
                  </button>

                  <button
                    onClick={handleExitOverride}
                    disabled={isSimulatingExit}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
                      exitOverrideSuccess
                        ? 'bg-cyan-600 text-white'
                        : 'bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/60'
                    }`}
                    title="Simular acionamento da botoeira No-Touch de saída livre"
                  >
                    <DoorOpen className={`w-4 h-4 ${isSimulatingExit ? 'animate-bounce' : ''}`} />
                    <span>{exitOverrideSuccess ? 'Saída Liberada!' : isSimulatingExit ? 'Registrando...' : 'Simular Saída Livre'}</span>
                  </button>

                  <button
                    onClick={handleRemoteOverride}
                    disabled={isOpeningGate}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 ${
                      gateSuccess 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-800/50'
                    }`}
                  >
                    <LockOpen className={`w-4 h-4 ${isOpeningGate ? 'animate-spin' : ''}`} />
                    <span>{gateSuccess ? 'Porta Liberada!' : isOpeningGate ? 'Liberando...' : 'Abertura Remota'}</span>
                  </button>
                </div>
              </div>

              {/* 4 CARDS DE KPIS EM TEMPO REAL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                
                {/* KPI 1: Acessos Hoje */}
                <div className="relative overflow-hidden rounded-2xl bg-[#1c2028]/80 backdrop-blur-xl p-5 border border-slate-800/80 shadow-lg flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Acessos Hoje</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <DoorOpen className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-white tracking-tight">{metrics.today_entries}</span>
                      <span className="text-xs text-emerald-400 font-semibold flex items-center">
                        +12%
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">vs ontem</span>
                  </div>
                  <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (metrics.today_entries / 20) * 100)}%` }}></div>
                  </div>
                </div>

                {/* KPI 2: Ocupação Atual (Pessoas Dentro do Mercado) */}
                <div className="relative overflow-hidden rounded-2xl bg-[#1c2028]/80 backdrop-blur-xl p-5 border border-slate-800/80 shadow-lg flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ocupação Atual</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">{metrics.current_occupancy}</span>
                      <span className="text-xs text-slate-400">no minimercado</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/50">
                      Cap: {metrics.max_capacity} Max
                    </span>
                  </div>
                  {/* Bolinhas visuais de capacidade */}
                  <div className="mt-3 flex items-center gap-1.5">
                    {Array.from({ length: metrics.max_capacity }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${
                          i < metrics.current_occupancy ? 'bg-emerald-400 shadow-sm shadow-emerald-500/50' : 'bg-slate-800'
                        }`}
                      ></span>
                    ))}
                    <span className="ml-auto text-[10px] text-slate-400">
                      {metrics.current_occupancy < metrics.max_capacity ? 'Espaço Seguro' : 'Lotação Atingida'}
                    </span>
                  </div>
                </div>

                {/* KPI 3: Passes Visitante Ativos */}
                <div className="relative overflow-hidden rounded-2xl bg-[#1c2028]/80 backdrop-blur-xl p-5 border border-slate-800/80 shadow-lg flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Passes Visitante</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <QrCode className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-amber-400 tracking-tight">{metrics.active_passes}</span>
                      <span className="text-xs text-slate-400">convites válidos</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-800/40 font-bold">
                      Anti-Passback ON
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Emitidos por moradores</span>
                    <span className="text-blue-400 font-semibold">Monitorado →</span>
                  </div>
                </div>

                {/* KPI 4: Recusas / Bloqueios */}
                <div className="relative overflow-hidden rounded-2xl bg-[#1c2028]/80 backdrop-blur-xl p-5 border border-slate-800/80 shadow-lg flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Recusas / Bloqueios</span>
                    <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-red-400 tracking-tight">{metrics.security_alerts}</span>
                      <span className="text-[10px] font-bold text-red-400 bg-red-950/60 px-2 py-0.5 rounded-md border border-red-800/50">
                        TOTP & Replay
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Hoje</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Segurança patrimonial</span>
                    <button onClick={() => setFilterType('negados')} className="text-red-400 hover:underline font-semibold">
                      Filtrar alertas
                    </button>
                  </div>
                </div>

              </div>

              {/* BANNER DE HARDWARE IOT (ESP32) */}
              <div className="relative overflow-hidden rounded-2xl bg-[#1c2028]/60 backdrop-blur-xl p-4 border border-slate-800/80 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="relative w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Cpu className="w-6 h-6" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-sm font-bold text-white">Entrada InHouse • {config.name || 'SmartCondo'}</h2>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full uppercase">
                        ONLINE & SINCRONIZADO
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-400 font-mono">
                      <span>Hardware: <strong className="text-slate-200">ESP32-S3 Pro</strong></span>
                      <span>Firmware: <strong className="text-slate-200">v2.4.1</strong></span>
                      <span className="inline-flex items-center gap-1.5">
                        <span>IP:</span>
                        <strong className={`font-mono transition-all ${showIp ? 'text-blue-400' : 'text-slate-500 tracking-wider'}`}>
                          {showIp ? `${window.location.hostname}:3000` : '••••••••••••••'}
                        </strong>
                        <button
                          type="button"
                          onClick={toggleShowIp}
                          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-95 transition-all inline-flex items-center justify-center group"
                          title={showIp ? "Ocultar endereço IP" : "Exibir endereço IP"}
                          aria-label={showIp ? "Ocultar endereço IP" : "Exibir endereço IP"}
                        >
                          {showIp ? (
                            <EyeOff className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 transition-colors" />
                          ) : (
                            <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 transition-colors" />
                          )}
                        </button>
                      </span>
                      <span>Latência: <strong className="text-emerald-400">18ms</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    onClick={handleManualPing}
                    disabled={isPinging}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-semibold border border-slate-700/50 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isPinging ? 'animate-spin' : ''}`} />
                    <span>Ping Dispositivo</span>
                  </button>

                  <button
                    onClick={handleRemoteOverride}
                    disabled={isOpeningGate}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30"
                  >
                    <LockOpen className="w-3.5 h-3.5" />
                    <span>Liberar Passagem</span>
                  </button>
                </div>
              </div>

              {/* TABELA DE AUDITORIA "APPLE STREAM" COM FILTROS */}
              <div className="rounded-2xl bg-[#1c2028]/80 backdrop-blur-2xl border border-slate-800/80 shadow-2xl overflow-hidden">
                
                {/* BARRA DE CONTROLE: SEGMENTED CONTROL + BUSCA */}
                <div className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/50 border-b border-slate-800/80">
                  {/* Segmented Control */}
                  <div className="inline-flex p-1 rounded-xl bg-[#0f131c] border border-slate-800 text-slate-400 text-xs shadow-inner">
                    <button
                      onClick={() => setFilterType('all')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        filterType === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'hover:text-white'
                      }`}
                    >
                      Todos os Eventos
                    </button>
                    <button
                      onClick={() => setFilterType('moradores')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        filterType === 'moradores' ? 'bg-slate-800 text-white shadow-sm' : 'hover:text-white'
                      }`}
                    >
                      Apenas Moradores
                    </button>
                    <button
                      onClick={() => setFilterType('visitantes')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        filterType === 'visitantes' ? 'bg-slate-800 text-white shadow-sm' : 'hover:text-white'
                      }`}
                    >
                      Passes Visitante
                    </button>
                    <button
                      onClick={() => setFilterType('saidas')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        filterType === 'saidas' ? 'bg-slate-800 text-white shadow-sm' : 'hover:text-white'
                      }`}
                    >
                      Fluxo de Saída
                    </button>
                    <button
                      onClick={() => setFilterType('negados')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        filterType === 'negados' ? 'bg-red-950/80 text-red-400 border border-red-800/40 shadow-sm' : 'hover:text-white'
                      }`}
                    >
                      Tentativas Negadas
                    </button>
                  </div>

                  {/* Indicador Live Stream */}
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-400 text-[11px] font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Live Stream Ativo</span>
                    </div>
                  </div>
                </div>

                {/* TABELA DE REGISTROS */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300 border-collapse">
                    <thead>
                      <tr className="bg-slate-900/40 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800/60">
                        <th className="py-3 px-4">Data / Hora</th>
                        <th className="py-3 px-4">Usuário & Unidade</th>
                        <th className="py-3 px-4">Vínculo de Acesso</th>
                        <th className="py-3 px-4">Método & Credencial</th>
                        <th className="py-3 px-4">Detalhes & Auditoria</th>
                        <th className="py-3 px-4 text-right">Ação / Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-500 text-xs">
                            Nenhum registro encontrado para este filtro.
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map((log) => {
                          const isEmergency = log.action === 'EMERGENCY';
                          const isDenied = log.action === 'DENIED';
                          const isExit = log.action === 'EXIT';
                          const isVisitor = log.details && log.details.includes('VISITANTE');
                          const isRemote = log.details && log.details.includes('Remota');

                          // Iniciais para avatar
                          const initials = isEmergency
                            ? 'EM'
                            : isExit && !log.name
                            ? 'SA'
                            : (log.name || 'SISTEMA')
                                .split(' ')
                                .map(n => n.charAt(0))
                                .slice(0, 2)
                                .join('')
                                .toUpperCase();

                          return (
                            <tr key={log.id} className="hover:bg-slate-800/30 transition-colors group">
                              {/* 1. Data/Hora */}
                              <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-400">
                                <span className="text-white font-medium">
                                  {new Date(log.timestamp + 'Z').toLocaleDateString('pt-BR')}
                                </span>{' '}
                                <span className={isDenied ? 'text-red-400' : isExit ? 'text-cyan-400' : 'text-emerald-400'}>
                                  {new Date(log.timestamp + 'Z').toLocaleTimeString('pt-BR')}
                                </span>
                              </td>

                              {/* 2. Usuário & Unidade */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-[11px] font-bold ${
                                    isVisitor 
                                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                                      : isEmergency
                                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                      : isExit
                                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  }`}>
                                    {initials}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-white leading-tight">
                                      {isEmergency ? 'SISTEMA DE INCÊNDIO (AVCB)' : isExit && !log.name ? 'Fluxo Livre de Saída' : log.name || 'Desconhecido'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {isEmergency ? 'Rota de Fuga' : isExit && !log.apartment ? 'Saída Desimpedida' : `Apto ${log.apartment || '-'}`}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* 3. Vínculo */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  isEmergency
                                    ? 'bg-red-950/80 text-red-400 border-red-800/50'
                                    : isExit
                                    ? 'bg-cyan-950/80 text-cyan-400 border-cyan-800/50'
                                    : isVisitor
                                    ? 'bg-amber-950/80 text-amber-400 border-amber-800/50'
                                    : isRemote
                                    ? 'bg-purple-950/80 text-purple-400 border-purple-800/50'
                                    : 'bg-blue-950/80 text-blue-400 border-blue-800/50'
                                }`}>
                                  {isEmergency ? 'PÂNICO / AVCB' : isExit ? (log.name ? 'Saída Morador' : 'Fluxo de Saída') : isVisitor ? 'Passe Visitante' : isRemote ? 'Bypass Síndico' : 'Morador Titular'}
                                </span>
                              </td>

                              {/* 4. Método */}
                              <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-400">
                                <div className="flex items-center gap-1.5">
                                  {isExit ? (
                                    <>
                                      <DoorOpen className="w-3.5 h-3.5 text-cyan-400" />
                                      <span>{log.details && log.details.includes('App') ? 'App Morador' : 'Botoeira No-Touch'}</span>
                                    </>
                                  ) : isVisitor ? (
                                    <>
                                      <QrCode className="w-3.5 h-3.5 text-amber-400" />
                                      <span>QR Convidado</span>
                                    </>
                                  ) : isEmergency ? (
                                    <>
                                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                                      <span>Botoeira Emergência</span>
                                    </>
                                  ) : (
                                    <>
                                      <Key className="w-3.5 h-3.5 text-blue-400" />
                                      <span>TOTP Dinâmico</span>
                                    </>
                                  )}
                                </div>
                              </td>

                              {/* 5. Detalhes & Responsabilidade Solidária */}
                              <td className="py-3 px-4 text-xs max-w-sm">
                                {isVisitor ? (
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-amber-300">
                                      {log.details.split('(')[0]}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {log.details.includes('(') ? `(${log.details.split('(')[1]}` : ''}
                                    </span>
                                  </div>
                                ) : (
                                  <span className={isDenied ? 'text-red-300' : isExit ? 'text-cyan-300' : 'text-slate-300'}>
                                    {log.details || 'Acesso registrado.'}
                                  </span>
                                )}
                              </td>

                              {/* 6. Status / Ação */}
                              <td className="py-3 px-4 whitespace-nowrap text-right">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                                  log.action === 'ENTRY'
                                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                                    : log.action === 'EXIT'
                                    ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/50'
                                    : log.action === 'DENIED'
                                    ? 'bg-red-950/80 text-red-400 border border-red-800/50'
                                    : log.action === 'EMERGENCY'
                                    ? 'bg-red-600 text-white animate-pulse'
                                    : 'bg-slate-800 text-slate-400'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    log.action === 'ENTRY' ? 'bg-emerald-400' : log.action === 'EXIT' ? 'bg-cyan-400' : 'bg-red-400'
                                  }`}></span>
                                  <span>{log.action}</span>
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Rodapé da Tabela */}
                <div className="p-3.5 bg-slate-900/60 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Logs auditáveis com assinatura digital e conformidade com a LGPD (Art. 7º IX).</span>
                  </div>
                  <span>Exibindo {filteredLogs.length} registro(s)</span>
                </div>

              </div>

            </div>
          )}

          {/* ==================================================== */}
          {/* ABA: MORADORES & UNIDADES                            */}
          {/* ==================================================== */}
          {activeTab === 'users' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Moradores & Unidades</h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Controle de condôminos cadastrados, conformidade LGPD e links de passes visitantes emitidos.
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
                    <strong className="text-blue-400">{residents.length}</strong> unidade(s) cadastradas
                  </span>
                  {residents.length > 0 && (
                    <button
                      onClick={toggleAllResidents}
                      className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white font-medium transition-colors flex items-center gap-1.5 active:scale-95"
                      title={allExpanded ? 'Recolher todos os passes' : 'Expandir todos os passes'}
                    >
                      {allExpanded ? <ChevronUp className="w-3.5 h-3.5 text-blue-400" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-400" />}
                      <span>{allExpanded ? 'Recolher Todos' : 'Expandir Todos'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 3 CARDS DE KPI RÁPIDO */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#1c2028]/70 border border-slate-800/80 rounded-2xl p-4 shadow-md flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Moradores Ativos</span>
                    <h3 className="text-xl font-bold text-white">
                      {residents.filter(r => r.status === 'APPROVED').length}
                    </h3>
                  </div>
                </div>

                <div className="bg-[#1c2028]/70 border border-slate-800/80 rounded-2xl p-4 shadow-md flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Passes Visitante Emitidos</span>
                    <h3 className="text-xl font-bold text-white">
                      {residents.reduce((acc, r) => acc + (r.invites ? r.invites.length : 0), 0)}
                    </h3>
                  </div>
                </div>

                <div className="bg-[#1c2028]/70 border border-slate-800/80 rounded-2xl p-4 shadow-md flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Aprovações Pendentes</span>
                    <h3 className="text-xl font-bold text-white">
                      {pendingUsers.length}
                    </h3>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 1: APROVAÇÕES PENDENTES */}
              {pendingUsers.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-bold text-white">Aprovações Pendentes de Novos Moradores ({pendingUsers.length})</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingUsers.map((user) => (
                      <div key={user.id} className="bg-[#1c2028]/80 border border-amber-800/40 rounded-2xl p-4 shadow-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-sm">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">{user.name}</h4>
                            <p className="text-xs text-slate-400">Apartamento: <strong className="text-amber-300">{user.apartment}</strong></p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleApproveUser(user.id)}
                          className="py-1.5 px-3.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-md flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Aprovar</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SEÇÃO 2: MORADORES & UNIDADES CADASTRADAS */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight">Moradores & Unidades Cadastradas</h2>
                    <p className="text-xs text-slate-400">Relação de condôminos, status de auditoria e passes emitidos.</p>
                  </div>
                </div>

                {residents.length === 0 ? (
                  <div className="bg-[#1c2028]/80 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                    Nenhum morador cadastrado até o momento.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {residents.map((resident) => {
                      const invites = resident.invites || [];
                      const activeInvitesCount = invites.filter(i => i.status === 'ACTIVE').length;
                      const isExpanded = Boolean(expandedResidents[resident.id]);

                      return (
                        <div
                          key={resident.id}
                          className="bg-[#1c2028]/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4"
                        >
                          {/* Header do Card do Morador */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-sm font-mono">
                                {resident.name.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-sm font-bold text-white">{resident.name}</h3>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-950/80 text-blue-400 border border-blue-800/60">
                                    Apto {resident.apartment}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                  <span>Cadastrado em: {new Date(resident.createdAt).toLocaleDateString('pt-BR')}</span>
                                </div>
                              </div>
                            </div>

                            {/* Badges de Status do Morador */}
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Status do Cadastro */}
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase border ${
                                resident.status === 'APPROVED'
                                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50'
                                  : 'bg-amber-950/80 text-amber-400 border-amber-800/50'
                              }`}>
                                {resident.status === 'APPROVED' ? 'Aprovado' : 'Pendente'}
                              </span>

                              {/* LGPD Status */}
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border flex items-center gap-1 ${
                                resident.lgpd_accepted === 1
                                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}>
                                <ShieldCheck className="w-3 h-3" />
                                <span>{resident.lgpd_accepted === 1 ? 'LGPD Aceito' : 'LGPD Pendente'}</span>
                              </span>

                              {/* Presença na Loja */}
                              <div className="flex items-center gap-1.5">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono border flex items-center gap-1.5 ${
                                  resident.is_inside === 1
                                    ? 'bg-blue-950 text-blue-400 border-blue-700 animate-pulse'
                                    : 'bg-slate-900 text-slate-500 border-slate-800'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${resident.is_inside === 1 ? 'bg-blue-400' : 'bg-slate-600'}`}></span>
                                  <span>{resident.is_inside === 1 ? 'No Mercado' : 'Fora'}</span>
                                </span>

                                {resident.is_inside === 1 && (
                                  <button
                                    onClick={() => handleAdminReleaseResident(resident.id)}
                                    className="px-2 py-0.5 rounded-full bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 text-[10px] font-bold transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                                    title="Registrar saída deste morador manualmente"
                                  >
                                    <DoorOpen className="w-3 h-3 text-cyan-400" />
                                    <span>Liberar Saída</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Subseção: Passes Visitante Emitidos por Este Morador (Minimizável) */}
                          <div className="space-y-2.5">
                            <button
                              type="button"
                              onClick={() => toggleResidentExpand(resident.id)}
                              className="flex items-center justify-between w-full py-2.5 px-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 text-xs transition-all group active:scale-[0.99]"
                            >
                              <div className="flex items-center gap-2">
                                <QrCode className="w-3.5 h-3.5 text-amber-400" />
                                <span className="font-semibold text-slate-200">
                                  Passes Visitante Emitidos ({invites.length})
                                </span>
                                {activeInvitesCount > 0 && (
                                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/50">
                                    {activeInvitesCount} ativo(s)
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 text-xs text-blue-400 group-hover:text-blue-300 font-medium">
                                <span>{isExpanded ? 'Recolher Passes' : 'Ver Passes'}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </div>
                            </button>

                            {isExpanded && (
                              invites.length === 0 ? (
                                <p className="text-xs text-slate-500 italic py-2 pl-2">
                                  Nenhum passe de visitante emitido por esta unidade até o momento.
                                </p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 animate-fade-in">
                                  {invites.map((inv) => {
                                    const isExpired = new Date(inv.valid_until.replace(' ', 'T') + 'Z').getTime() < Date.now();
                                    const isCopied = copiedCode === inv.invite_code;
                                    const invitePublicUrl = `${window.location.origin}/invite/${inv.invite_code}`;

                                    // Badge de status do passe
                                    const badgeClass = 
                                      inv.status === 'REVOKED'
                                        ? 'bg-red-950/80 text-red-400 border-red-800/50'
                                        : inv.status === 'USED'
                                        ? 'bg-slate-800 text-slate-400 border-slate-700'
                                        : isExpired
                                        ? 'bg-amber-950/80 text-amber-400 border-amber-800/50'
                                        : 'bg-emerald-950/80 text-emerald-400 border-emerald-800/50';

                                    const badgeLabel = 
                                      inv.status === 'REVOKED' ? 'Revogado' :
                                      inv.status === 'USED' ? 'Utilizado' :
                                      isExpired ? 'Expirado' : 'Ativo';

                                    return (
                                      <div
                                        key={inv.id}
                                        className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between gap-2.5 hover:border-slate-700 transition-colors"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs font-bold text-white">{inv.guest_name}</span>
                                              <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-md border ${badgeClass}`}>
                                              {badgeLabel}
                                            </span>
                                          </div>
                                          <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center gap-1.5">
                                            <span className="text-amber-400 font-bold">{inv.invite_code}</span>
                                            <span>•</span>
                                            <span>{inv.used_count}/{inv.max_uses} uso(s)</span>
                                          </div>
                                        </div>

                                        {inv.status === 'ACTIVE' && !isExpired && (
                                          <button
                                            onClick={() => handleRevokeInvite(inv.id)}
                                            disabled={revokingId === inv.id}
                                            className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                                            title="Revogar passe"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>

                                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        <span>Válido até {new Date(inv.valid_until.replace(' ', 'T') + 'Z').toLocaleString('pt-BR')}</span>
                                      </div>

                                      {/* Links e Ações do Passe */}
                                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[180px] sm:max-w-[200px]" title={invitePublicUrl}>
                                          /invite/{inv.invite_code}
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                          <button
                                            onClick={() => handleCopyLink(inv.invite_code)}
                                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold border border-slate-700/60 transition-colors flex items-center gap-1 active:scale-95"
                                            title="Copiar link do passe"
                                          >
                                            {isCopied ? (
                                              <>
                                                <Check className="w-3 h-3 text-emerald-400" />
                                                <span className="text-emerald-400">Copiado!</span>
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="w-3 h-3 text-slate-400" />
                                                <span>Copiar Link</span>
                                              </>
                                            )}
                                          </button>

                                          <a
                                            href={`/invite/${inv.invite_code}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 transition-colors"
                                            title="Abrir página pública do passe"
                                          >
                                            <ExternalLink className="w-3 h-3" />
                                          </a>
                                        </div>
                                      </div>

                                    </div>
                                  );
                                })}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* ABA: CONFIGURAÇÕES DO CONDOMÍNIO                     */}
          {/* ==================================================== */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Setup do Condomínio</h1>
                <p className="text-xs text-slate-400 mt-0.5">Parâmetros de infraestrutura e topologia do empreendimento.</p>
              </div>

              <div className="bg-[#1c2028]/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <form onSubmit={handleSaveConfig} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Nome do Condomínio</label>
                    <input
                      type="text"
                      value={config.name}
                      onChange={(e) => setConfig({ ...config, name: e.target.value })}
                      className="w-full bg-[#0f131c] border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Topologia Residencial</label>
                    <select
                      value={config.topology}
                      onChange={(e) => setConfig({ ...config, topology: e.target.value })}
                      className="w-full bg-[#0f131c] border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="VERTICAL">Vertical (Prédios / Torres)</option>
                      <option value="HORIZONTAL">Horizontal (Casas / Vilas)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all"
                  >
                    Salvar Parâmetros
                  </button>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
