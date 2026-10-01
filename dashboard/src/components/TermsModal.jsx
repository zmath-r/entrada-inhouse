import React, { useState } from 'react';
import axios from 'axios';
import { ShieldCheck, AlertCircle, FileText, Check } from 'lucide-react';

const API_URL = `http://${window.location.hostname}:3000/api`;

export default function TermsModal({ onAccepted }) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async () => {
    if (!agreed) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/auth/terms/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onAccepted();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao registrar aceite dos termos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl max-w-lg w-full p-6 flex flex-col max-h-[90vh]">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
          <div className="h-10 w-10 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Termos de Uso & LGPD</h2>
            <p className="text-xs text-slate-400">SmartCondo Minimercado Autônomo</p>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 my-4 pr-2 space-y-4 text-sm text-slate-300 leading-relaxed">
          <div className="bg-blue-950/40 border border-blue-900/50 p-3.5 rounded-xl text-blue-200 text-xs flex items-start space-x-2.5">
            <AlertCircle className="h-5 w-5 shrink-0 text-blue-400 mt-0.5" />
            <span>
              Em cumprimento à <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</strong>, solicitamos sua ciência prévia sobre o tratamento dos seus dados de acesso ao minimercado autônomo.
            </span>
          </div>

          <section>
            <h3 className="font-semibold text-white mb-1 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-blue-400" /> 1. Finalidade do Tratamento
            </h3>
            <p className="text-xs text-slate-400">
              Os dados de identificação (nome, unidade condominial, registros de data/hora de abertura de porta e telemetria de presença) são coletados exclusivamente para fins de segurança patrimonial, prevenção de fraudes e controle de acesso ao mercado.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-1 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-blue-400" /> 2. Responsabilidade Solidária por Visitantes
            </h3>
            <p className="text-xs text-slate-400">
              Ao gerar convites digitais para visitantes ou terceiros, o condômino titular <strong>reconhece expressamente sua responsabilidade civil e condominial solidária</strong> por quaisquer danos, infrações ou acessos indevidos decorrentes da utilização da chave concedida.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-1 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-blue-400" /> 3. Chaves Dinâmicas (TOTP)
            </h3>
            <p className="text-xs text-slate-400">
              Para sua proteção contra clonagem ou capturas de tela não autorizadas, as chaves de acesso possuem renovação periódica de 30 segundos, sendo de uso pessoal e intransferível no momento do acesso.
            </p>
          </section>
        </div>

        {error && (
          <p className="text-red-400 text-xs mb-3 text-center bg-red-950/50 p-2 rounded-lg border border-red-900/50">
            {error}
          </p>
        )}

        <div className="pt-4 border-t border-slate-800 space-y-4">
          <label className="flex items-start space-x-3 cursor-pointer select-none">
            <div className="relative flex items-center mt-0.5">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-5 w-5 bg-slate-800 border-2 border-slate-600 rounded-md peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors flex items-center justify-center">
                {agreed && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
              </div>
            </div>
            <span className="text-xs text-slate-300">
              Li e concordo integralmente com os <strong>Termos de Uso</strong> e as condições de <strong>Tratamento de Dados (LGPD)</strong> e responsabilidade solidária.
            </span>
          </label>

          <button
            onClick={handleAccept}
            disabled={!agreed || loading}
            className="w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span>Gravando aceite...</span>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>Confirmar Aceite e Liberar Módulo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
