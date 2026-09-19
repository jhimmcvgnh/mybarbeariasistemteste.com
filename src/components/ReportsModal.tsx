import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { type Appointment } from '../lib/supabase';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: Appointment[];
}

export const ReportsModal: React.FC<ReportsModalProps> = ({ isOpen, onClose, appointments }) => {
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      generateReport();
    }
  }, [isOpen]);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `
        Você é um consultor de negócios especializado em barbearias e estética masculina.
        Analise os seguintes dados de agendamentos e gere um relatório detalhado em Português do Brasil.
        
        Dados dos Agendamentos:
        ${JSON.stringify(appointments, null, 2)}
        
        O relatório deve conter as seguintes seções:
        1. **Resumo Executivo**: Um resumo escrito do último mês/semana em relação a tudo (faturamento, volume de clientes, serviços mais procurados).
        2. **Análise de Probabilidade**: Uma análise de probabilidade de resultados futuros baseada na tendência atual.
        3. **Dicas Estratégicas**: Dicas práticas do que fazer para ter mais resultados e aumentar o faturamento.
        
        Use formatação Markdown para deixar o relatório elegante e fácil de ler.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
      });

      setReport(response.text || 'Não foi possível gerar o relatório.');
    } catch (err) {
      console.error('Erro ao gerar relatório:', err);
      setError('Ocorreu um erro ao gerar o relatório inteligente. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-bg-surface rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-border-main overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border-main flex justify-between items-center bg-bg-base">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-icons-outlined">auto_awesome</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-main">Relatório Inteligente</h2>
              <p className="text-xs text-text-secondary">Análise estratégica baseada em IA</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-bg-elevated rounded-full transition-colors text-text-secondary"
          >
            <span className="material-icons-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6"></div>
              <p className="text-lg font-medium text-text-main animate-pulse">
                Gerando análise estratégica...
              </p>
              <p className="text-sm text-text-secondary mt-2">
                Isso pode levar alguns segundos.
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <span className="material-icons-outlined text-6xl text-danger mb-4">error_outline</span>
              <p className="text-lg font-medium text-text-main">{error}</p>
              <button 
                onClick={generateReport}
                className="mt-6 px-6 py-2 bg-primary text-primary-text rounded-xl hover:bg-primary-hover transition-colors font-bold"
              >
                Tentar Novamente
              </button>
            </div>
          ) : (
            <div className="max-w-none markdown-body text-text-main">
              <Markdown>{report}</Markdown>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border-main bg-bg-base flex justify-between items-center">
          <p className="text-xs text-text-secondary">
            Dados baseados em {appointments.length} agendamentos recentes.
          </p>
          <div className="flex gap-3">
            <button 
              onClick={generateReport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-primary hover:bg-primary/10 transition-colors"
            >
              <span className="material-icons-outlined text-sm">refresh</span> Atualizar
            </button>
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-primary hover:bg-primary-hover text-primary-text rounded-xl text-sm font-bold transition-colors shadow-sm shadow-primary/20"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
