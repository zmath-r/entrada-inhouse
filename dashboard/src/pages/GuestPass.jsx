import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, Clock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

const API_URL = `http://${window.location.hostname}:3000/api`;

export default function GuestPass() {
  const { code } = useParams();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const response = await axios.get(`${API_URL}/invites/public/${code}`);
        setInvite(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Convite inválido, revogado ou expirado.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvite();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-slate-400 text-sm">Carregando passe digital...</p>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="h-16 w-16 bg-red-950/60 border border-red-800 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Passe Indisponível</h2>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <div className="text-xs text-slate-500">
            SmartCondo Access Control • Entre em contato com seu anfitrião.
          </div>
        </div>
      </div>
    );
  }

  const isExpired = new Date(invite.valid_until.replace(' ', 'T') + 'Z').getTime() < Date.now();
  const isUsed = invite.used_count >= invite.max_uses;
  const isValid = invite.status === 'ACTIVE' && !isExpired && !isUsed;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-blue-600">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-white shadow-2xl relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800/80 mb-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-800/50">
              Passe de Visitante
            </span>
            <h1 className="text-xl font-bold mt-1.5">SmartCondo</h1>
          </div>
          <div className="h-10 w-10 bg-slate-800/80 rounded-2xl flex items-center justify-center text-blue-400 border border-slate-700/50">
            <Shield className="h-5 w-5" />
          </div>
        </div>

        {/* Identificação do Visitante */}
        <div className="text-center mb-6">
          <p className="text-xs text-slate-400">Visitante Autorizado</p>
          <h2 className="text-2xl font-bold text-white mt-0.5">{invite.guest_name}</h2>
          <div className="mt-2 inline-flex items-center space-x-1.5 text-xs text-slate-300 bg-slate-800/60 px-3 py-1 rounded-lg border border-slate-700/40">
            <span>Anfitrião:</span>
            <strong className="text-white">{invite.host_name}</strong>
            <span className="text-slate-500">•</span>
            <span>Apto <strong className="text-white">{invite.host_apartment}</strong></span>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="bg-white p-5 rounded-2xl shadow-inner flex flex-col items-center justify-center relative mb-6">
          {isValid ? (
            <>
              <QRCodeSVG value={invite.invite_code} size={210} level="H" />
              <p className="text-[11px] font-mono text-slate-600 mt-3 font-semibold tracking-wider">
                {invite.invite_code}
              </p>
            </>
          ) : (
            <div className="h-[210px] flex flex-col items-center justify-center text-slate-700 p-4 text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mb-2" />
              <p className="font-bold text-sm text-slate-900">Passe Expirado ou Já Utilizado</p>
              <p className="text-xs text-slate-600 mt-1">Este QR Code não permite novas aberturas de porta.</p>
            </div>
          )}
        </div>

        {/* Validade & Status */}
        <div className="space-y-3 mb-6 text-xs">
          <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2 text-slate-300">
              <Clock className="h-4 w-4 text-blue-400" />
              <span>Válido até:</span>
            </div>
            <span className="font-semibold text-white">
              {new Date(invite.valid_until.replace(' ', 'T') + 'Z').toLocaleString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-800">
            <span className="text-slate-300">Status do Passe:</span>
            <span className={`inline-flex items-center gap-1 font-bold ${isValid ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isValid ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> ATIVO (1 uso)
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5" /> {isUsed ? 'JÁ UTILIZADO' : 'EXPIRADO'}
                </>
              )}
            </span>
          </div>
        </div>

        {/* Aviso de Responsabilidade Solidária */}
        <div className="bg-amber-950/30 border border-amber-800/40 p-3 rounded-xl text-[11px] text-amber-200/90 leading-tight">
          <strong>Aviso de Segurança:</strong> Entrada individual monitorada. Todas as ações neste mercado autônomo estão sob responsabilidade solidária da unidade <strong>{invite.host_apartment}</strong>.
        </div>
      </div>
    </div>
  );
}
