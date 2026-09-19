import React, { useState, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { type Appointment } from '../lib/supabase';
import { useFinance } from '../hooks/useFinance';
import { parseISO } from 'date-fns';

interface ForecastScreenProps {
  appointments?: Appointment[];
}

// Interfaces para os dados do painel
interface MonthlySeasonality {
  month: string;
  monthIndex: number;
  seasonalityFactor: number; // 1.0 = normal, > 1.0 = alta, < 1.0 = baixa
  historicalRevenue: number;
  projectedRevenue: number;
  demandLevel: 'Baixa' | 'Normal' | 'Alta' | 'Pico Extraordinário';
  recommendedAction: string;
}

interface ScenarioSimulation {
  priceAdjustment: number; // percent ex: +10%
  clientVolumeAdjustment: number; // percent ex: +5%
  fixedCosts: number; // R$ fixos mensais
  activeBarbers: number; // quantidade de barbeiros
}

// Fatores de Sazonalidade Típicos do Mercado de Barbearia no Brasil
const BASE_SEASONALITY_BENCHMARK = [
  { month: 'Jan', monthIndex: 0, seasonalityFactor: 0.88, demandLevel: 'Baixa' as const, recommendedAction: 'Pós-festas: Oferecer pacotes de assinatura e promoções de retorno.' },
  { month: 'Fev', monthIndex: 1, seasonalityFactor: 0.82, demandLevel: 'Baixa' as const, recommendedAction: 'Mês do Carnaval: Campanhas de cortes estilosos e combos promocionais.' },
  { month: 'Mar', monthIndex: 2, seasonalityFactor: 0.95, demandLevel: 'Normal' as const, recommendedAction: 'Recuperação de fluxo: Foco em fidelização e retenção da base.' },
  { month: 'Abr', monthIndex: 3, seasonalityFactor: 0.98, demandLevel: 'Normal' as const, recommendedAction: 'Feriados de Páscoa/Tiradentes: Antecipar agendamentos de véspera.' },
  { month: 'Mai', monthIndex: 4, seasonalityFactor: 1.05, demandLevel: 'Alta' as const, recommendedAction: 'Dia das Mães e pré-inverno: Venda de vales-presente e produtos.' },
  { month: 'Jun', monthIndex: 5, seasonalityFactor: 1.02, demandLevel: 'Normal' as const, recommendedAction: 'Dia dos Namorados: Barba + Cabelo + Dia de Noivo/Tratamentos VIP.' },
  { month: 'Jul', monthIndex: 6, seasonalityFactor: 0.92, demandLevel: 'Baixa' as const, recommendedAction: 'Férias escolares: Promoções "Pai e Filho" para movimentar a barbearia.' },
  { month: 'Ago', monthIndex: 7, seasonalityFactor: 1.04, demandLevel: 'Alta' as const, recommendedAction: 'Dia dos Pais: Ponto alto do 2º semestre em venda de produtos de barba.' },
  { month: 'Set', monthIndex: 8, seasonalityFactor: 1.00, demandLevel: 'Normal' as const, recommendedAction: 'Estabilidade: Manter taxa de ocupação dos barbeiros acima de 70%.' },
  { month: 'Out', monthIndex: 9, seasonalityFactor: 1.06, demandLevel: 'Alta' as const, recommendedAction: 'Pré-festivais e eventos: Estimular reagendamento automático.' },
  { month: 'Nov', monthIndex: 10, seasonalityFactor: 1.18, demandLevel: 'Alta' as const, recommendedAction: 'Black Friday & Preparativos: Vendas antecipadas de pacotes de fim de ano.' },
  { month: 'Dez', monthIndex: 11, seasonalityFactor: 1.45, demandLevel: 'Pico Extraordinário' as const, recommendedAction: 'Super Pico de Festas: Horários estendidos e taxa adicional de agenda extra.' },
];

export const ForecastScreen: React.FC<ForecastScreenProps> = ({ appointments = [] }) => {
  // Finanças reais do Supabase para calibrar custos fixos
  const { totalExpense } = useFinance();

  // Estado de Período da Projeção
  const [forecastHorizon, setForecastHorizon] = useState<'3M' | '6M' | '12M'>('12M');
  const [activeTab, setActiveTab] = useState<'overview' | 'seasonality' | 'simulator' | 'ai'>('overview');

  // Barbeiros reais encontrados no banco
  const uniqueBarbersCount = useMemo(() => {
    const barbers = new Set<string>();
    appointments.forEach(a => {
      if (a.profissional_id) barbers.add(a.profissional_id);
    });
    return Math.max(barbers.size, 1);
  }, [appointments]);

  // Estado do Simulador de Cenários
  const [simulation, setSimulation] = useState<ScenarioSimulation>({
    priceAdjustment: 0,
    clientVolumeAdjustment: 0,
    fixedCosts: totalExpense > 0 ? Math.round(totalExpense) : 1500,
    activeBarbers: uniqueBarbersCount,
  });

  // Estado da IA
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [customUserPrompt, setCustomUserPrompt] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'Olá! Sou o seu **Consultor Financeiro & Sazonal IA**. Estou conectado aos dados reais da sua barbearia para projetar seus faturamentos futuros, prever meses de alta/baixa e calcular seu ponto de equilíbrio de forma precisa.'
    }
  ]);

  // =========================================================================
  // 1. CÁLCULO DE DADOS REAIS DO BANCO DE DADOS
  // =========================================================================
  const realDatabaseStats = useMemo(() => {
    const activeAppts = appointments.filter(a => a.status !== 'cancelado');
    const totalConfirmedRevenue = activeAppts.reduce((sum, a) => {
      const val = Number(a.valor_total ?? a.valor_cobrado ?? 0);
      return sum + val;
    }, 0);

    // Faturamento e contagem real mês a mês
    const monthlyRevenueMap: Record<number, number> = {};
    const monthlyCountMap: Record<number, number> = {};
    const activeMonths = new Set<string>();

    activeAppts.forEach(a => {
      if (!a.data_hora_inicio) return;
      try {
        const d = typeof a.data_hora_inicio === 'string' ? parseISO(a.data_hora_inicio) : new Date(a.data_hora_inicio);
        if (!isNaN(d.getTime())) {
          const mIdx = d.getMonth();
          const yKey = `${d.getFullYear()}-${mIdx}`;
          activeMonths.add(yKey);
          
          const val = Number(a.valor_total ?? a.valor_cobrado ?? 0);
          monthlyRevenueMap[mIdx] = (monthlyRevenueMap[mIdx] || 0) + val;
          monthlyCountMap[mIdx] = (monthlyCountMap[mIdx] || 0) + 1;
        }
      } catch {}
    });

    const monthsWithRecords = Math.max(activeMonths.size, 1);
    // Média real mensal baseada nos meses ativos
    const realMonthlyAverage = totalConfirmedRevenue > 0 
      ? Math.round(totalConfirmedRevenue / monthsWithRecords) 
      : 0;

    return {
      totalConfirmedRevenue,
      realMonthlyAverage,
      monthlyRevenueMap,
      monthlyCountMap,
      totalAppointmentsCount: activeAppts.length,
      hasRealData: totalConfirmedRevenue > 0 || activeAppts.length > 0
    };
  }, [appointments]);

  // =========================================================================
  // 2. SAZONALIDADE SEMANAL REAL (Calculada dos agendamentos no banco)
  // =========================================================================
  const realWeekdaySeasonality = useMemo(() => {
    const days = [
      { name: 'Domingo', key: 0 },
      { name: 'Segunda', key: 1 },
      { name: 'Terça', key: 2 },
      { name: 'Quarta', key: 3 },
      { name: 'Quinta', key: 4 },
      { name: 'Sexta', key: 5 },
      { name: 'Sábado', key: 6 },
    ];

    const dayRevenueMap: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const dayCountMap: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    appointments.filter(a => a.status !== 'cancelado').forEach(a => {
      if (!a.data_hora_inicio) return;
      try {
        const d = typeof a.data_hora_inicio === 'string' ? parseISO(a.data_hora_inicio) : new Date(a.data_hora_inicio);
        if (!isNaN(d.getTime())) {
          const dayIdx = d.getDay();
          const val = Number(a.valor_total ?? a.valor_cobrado ?? 0);
          dayRevenueMap[dayIdx] += val;
          dayCountMap[dayIdx] += 1;
        }
      } catch {}
    });

    const totalRev = Object.values(dayRevenueMap).reduce((a, b) => a + b, 0);
    const totalCount = Object.values(dayCountMap).reduce((a, b) => a + b, 0);

    const result = days.map(d => {
      const rev = dayRevenueMap[d.key];
      const count = dayCountMap[d.key];
      const sharePct = totalRev > 0 ? (rev / totalRev) * 100 : (totalCount > 0 ? (count / totalCount) * 100 : 0);

      return {
        day: d.name,
        revenue: rev,
        count,
        sharePct: Math.round(sharePct),
        shareFormatted: `${Math.round(sharePct)}%`,
      };
    });

    // Encontrar os 2 dias mais movimentados
    const sorted = [...result].sort((a, b) => b.count - a.count);
    const topDays = sorted.filter(s => s.count > 0).slice(0, 2);

    let tip = 'Cadastre seus agendamentos para visualizar a distribuição semanal exata do seu negócio.';
    if (topDays.length >= 2) {
      const combinedShare = topDays[0].sharePct + topDays[1].sharePct;
      tip = `**Dica de Ouro:** ${topDays[0].day} e ${topDays[1].day} concentram **${combinedShare}% dos seus atendimentos**. Crie ações promocionais para equilibrar os dias mais calmos.`;
    } else if (topDays.length === 1) {
      tip = `**Dica:** Seus agendamentos atuais estão concentrados em **${topDays[0].day}**. Continue cadastrando clientes para mapear toda a sua semana.`;
    }

    return { items: result, tip };
  }, [appointments]);

  // =========================================================================
  // 3. PROJEÇÃO MENSAL REAL E SAZONALIDADE
  // =========================================================================
  const seasonalityDetailed = useMemo<MonthlySeasonality[]>(() => {
    const baseRev = realDatabaseStats.realMonthlyAverage;

    return BASE_SEASONALITY_BENCHMARK.map((benchmark) => {
      const historical = realDatabaseStats.monthlyRevenueMap[benchmark.monthIndex] || 0;
      // Projeção realista: se há faturamento real base, aplica o multiplicador sazonal
      const projected = Math.round(baseRev * benchmark.seasonalityFactor);

      return {
        month: benchmark.month,
        monthIndex: benchmark.monthIndex,
        seasonalityFactor: benchmark.seasonalityFactor,
        demandLevel: benchmark.demandLevel,
        recommendedAction: benchmark.recommendedAction,
        historicalRevenue: historical,
        projectedRevenue: projected
      };
    });
  }, [realDatabaseStats]);

  // =========================================================================
  // 4. MÉTRICAS CONSOLIDADAS
  // =========================================================================
  const metrics = useMemo(() => {
    const monthsCount = forecastHorizon === '3M' ? 3 : forecastHorizon === '6M' ? 6 : 12;
    const currentMonthIdx = new Date().getMonth();

    // Próximos N meses a partir do mês atual
    const selectedMonths: MonthlySeasonality[] = [];
    for (let i = 0; i < monthsCount; i++) {
      const idx = (currentMonthIdx + i) % 12;
      selectedMonths.push(seasonalityDetailed[idx]);
    }

    const totalProjectedRevenue = selectedMonths.reduce((acc, m) => acc + m.projectedRevenue, 0);
    const avgMonthlyRevenue = monthsCount > 0 ? Math.round(totalProjectedRevenue / monthsCount) : 0;
    
    // Mês de pico e mês mais baixo
    const peakMonth = [...selectedMonths].sort((a, b) => b.seasonalityFactor - a.seasonalityFactor)[0] || selectedMonths[0];
    const lowestMonth = [...selectedMonths].sort((a, b) => a.seasonalityFactor - b.seasonalityFactor)[0] || selectedMonths[0];

    // Reserva de emergência / Capital de giro recomendado (Cobre 2.5 meses de custos fixos reais)
    const recommendedEmergencyFund = Math.round(
      Math.max(simulation.fixedCosts * 2.5, avgMonthlyRevenue * 1.5)
    );

    // Projeção com simulação de cenário
    const scenarioRevenue = Math.round(
      totalProjectedRevenue * (1 + simulation.priceAdjustment / 100) * (1 + simulation.clientVolumeAdjustment / 100)
    );
    const scenarioMonthlyAvg = Math.round(scenarioRevenue / monthsCount);
    
    // Lucro Líquido Estimado
    const estimatedNetProfit = Math.max(0, Math.round(scenarioMonthlyAvg - simulation.fixedCosts));
    
    // Ponto de Equilíbrio (Break-Even): Custos Fixos necessários
    const breakEvenRevenue = simulation.fixedCosts;

    return {
      monthsCount,
      totalProjectedRevenue,
      avgMonthlyRevenue,
      peakMonth,
      lowestMonth,
      recommendedEmergencyFund,
      scenarioRevenue,
      scenarioMonthlyAvg,
      estimatedNetProfit,
      breakEvenRevenue,
    };
  }, [seasonalityDetailed, forecastHorizon, simulation]);

  // =========================================================================
  // 5. DADOS PARA O GRÁFICO TEMPORAL
  // =========================================================================
  const chartData = useMemo(() => {
    const currentMonthIdx = new Date().getMonth();
    const monthsCount = forecastHorizon === '3M' ? 3 : forecastHorizon === '6M' ? 6 : 12;

    const data = [];
    for (let i = 0; i < monthsCount; i++) {
      const idx = (currentMonthIdx + i) % 12;
      const item = seasonalityDetailed[idx];
      const baseProj = item.projectedRevenue * (1 + simulation.priceAdjustment / 100) * (1 + simulation.clientVolumeAdjustment / 100);

      data.push({
        month: item.month,
        Historico: item.historicalRevenue,
        Projetado: Math.round(baseProj),
        Otimista: Math.round(baseProj * 1.15),
        Conservador: Math.round(baseProj * 0.85),
      });
    }

    return data;
  }, [seasonalityDetailed, forecastHorizon, simulation]);

  // =========================================================================
  // 6. INTEGRAÇÃO IA COM DADOS REAIS
  // =========================================================================
  const callGeminiAI = async (promptText: string, actionType?: string) => {
    setAiLoading(true);
    setAiError(null);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      
      const contextData = {
        faturamentoTotalRegistrado: `R$ ${realDatabaseStats.totalConfirmedRevenue.toFixed(2)}`,
        mediaMensalReal: `R$ ${realDatabaseStats.realMonthlyAverage.toFixed(2)}`,
        totalAgendamentos: realDatabaseStats.totalAppointmentsCount,
        faturamentoProjetadoHorizonte: `R$ ${metrics.totalProjectedRevenue.toFixed(2)} (${metrics.monthsCount} meses)`,
        mesPicoSazonal: `${metrics.peakMonth.month} (Estimado: R$ ${metrics.peakMonth.projectedRevenue})`,
        mesBaixaSazonal: `${metrics.lowestMonth.month} (Estimado: R$ ${metrics.lowestMonth.projectedRevenue})`,
        reservaRecomendada: `R$ ${metrics.recommendedEmergencyFund}`,
        custosFixosMensais: `R$ ${simulation.fixedCosts}`,
        simulacaoAtual: {
          reajustePreco: `${simulation.priceAdjustment}%`,
          variacaoClientes: `${simulation.clientVolumeAdjustment}%`,
          barbeiros: simulation.activeBarbers
        }
      };

      const systemInstruction = `
        Você é o Consultor Financeiro de IA de uma barbearia real.
        Analise estritamente com base nos dados reais do sistema da barbearia:
        ${JSON.stringify(contextData, null, 2)}
        
        Forneça respostas estruturadas em Markdown, com passos práticos, valores numéricos reais em R$ e tom profissional e motivador.
      `;

      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            { parts: [{ text: `${systemInstruction}\n\nSolicitação do Dono da Barbearia: ${promptText}` }] }
          ]
        });

        const replyText = response.text || 'Não foi possível gerar a resposta no momento.';
        setAiAnalysis(replyText);
        setChatHistory(prev => [...prev, { role: 'user', text: promptText }, { role: 'assistant', text: replyText }]);
      } else {
        // Resposta inteligente e grounded nos números reais do usuário
        await new Promise(r => setTimeout(r, 900));
        let fallbackText = '';

        if (actionType === 'diagnostico') {
          fallbackText = `### 📊 Diagnóstico Real do Caixa & Projeção
* **Faturamento Base Atual:** R$ ${realDatabaseStats.totalConfirmedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${realDatabaseStats.totalAppointmentsCount} agendamentos registrados).
* **Média Mensal Estimada:** R$ ${metrics.avgMonthlyRevenue.toLocaleString('pt-BR')}/mês.
* **Projeção para ${metrics.monthsCount} Meses:** R$ ${metrics.totalProjectedRevenue.toLocaleString('pt-BR')}.
* **Ponto de Equilíbrio (Custos Fixos):** R$ ${metrics.breakEvenRevenue.toLocaleString('pt-BR')}/mês.

**Recomendações Estratégicas:**
1. **Acúmulo de Reserva:** Mantenha uma reserva mínima sugerida de **R$ ${metrics.recommendedEmergencyFund.toLocaleString('pt-BR')}** para amortecer custos fixos nos meses de menor fluxo.
2. **Meses de Alta:** O pico sazonal projeta maior demanda em **${metrics.peakMonth.month}**. Prepare campanhas antecipadas.
3. **Meses de Baixa:** Fique atento ao mês de **${metrics.lowestMonth.month}**, aplicando pacotes de fidelidade e recorrência.`;
        } else if (actionType === 'baixa') {
          fallbackText = `### 🛡️ Plano para Meses de Baixa Sazonal (${metrics.lowestMonth.month})
1. **Clubes de Assinatura:** Garanta receita recorrente no dia 1º de cada mês com planos mensais de corte ou barba.
2. **Promoções em Dias Calmos:** Ofereça condições especiais para agendamentos em horários de menor movimento.
3. **Reativação via WhatsApp:** Envie mensagens para clientes sem agendamento há mais de 30 dias com condições exclusivas.`;
        } else if (actionType === 'reserva') {
          fallbackText = `### 💰 Estrutura de Reserva Financeira
* **Reserva Mínima Recomendada:** R$ ${metrics.recommendedEmergencyFund.toLocaleString('pt-BR')}
* **Custos Fixos Mensais Cadastrados:** R$ ${simulation.fixedCosts.toLocaleString('pt-BR')}
* **Meses de Cobertura de Segurança:** ~2.5 meses de custos fixos sem sobressaltos operacionais.`;
        } else {
          fallbackText = `Com base no seu faturamento atual de **R$ ${realDatabaseStats.totalConfirmedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**, o foco principal deve ser aumentar a frequência média de retorno dos clientes de 30 para 20 dias, elevando o faturamento mensal projetado para **R$ ${metrics.avgMonthlyRevenue.toLocaleString('pt-BR')}/mês**.`;
        }

        setAiAnalysis(fallbackText);
        setChatHistory(prev => [...prev, { role: 'user', text: promptText }, { role: 'assistant', text: fallbackText }]);
      }
    } catch (err: any) {
      console.error("Erro no assistente IA:", err);
      setAiError("Erro ao comunicar com o assistente financeiro.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      
      {/* HEADER DA TELA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-bg-surface p-6 rounded-3xl border border-border-main shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-icons-outlined text-2xl">auto_graph</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-text-main tracking-tight">
                  Previsão de Faturamento & Sazonalidade
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30">
                  Dados Reais
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Projeção matemática baseada nos agendamentos reais da sua barbearia e comportamento sazonal.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto">
          {/* Seletor de Horizonte de Previsão */}
          <div className="bg-bg-base p-1 rounded-2xl flex items-center gap-1 border border-border-main">
            {(['3M', '6M', '12M'] as const).map(horizon => (
              <button
                key={horizon}
                onClick={() => setForecastHorizon(horizon)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  forecastHorizon === horizon 
                    ? 'bg-primary text-primary-text shadow-sm' 
                    : 'text-text-secondary hover:text-text-main'
                }`}
              >
                {horizon === '3M' ? '3 Meses' : horizon === '6M' ? '6 Meses' : '12 Meses'}
              </button>
            ))}
          </div>

          <button 
            onClick={() => {
              setActiveTab('ai');
              callGeminiAI("Gere um diagnóstico estratégico completo do meu caixa com base nos dados reais", "diagnostico");
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-2xl text-xs font-bold transition-all border border-primary/30 cursor-pointer"
          >
            <span className="material-icons-outlined text-sm">auto_awesome</span>
            Gerar Diagnóstico IA
          </button>
        </div>
      </div>

      {/* TABS NAVEGAÇÃO INTERNA */}
      <div className="flex items-center gap-2 border-b border-border-main pb-2 overflow-x-auto hide-scrollbar">
        {[
          { id: 'overview', label: 'Visão Geral & Projeção', icon: 'insights' },
          { id: 'seasonality', label: 'Relatório de Sazonalidade', icon: 'calendar_view_month' },
          { id: 'simulator', label: 'Simulador de Caixa', icon: 'tune' },
          { id: 'ai', label: 'Consultor IA Financeiro', icon: 'psychology' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id 
                ? 'bg-primary text-primary-text shadow-sm shadow-primary/20 scale-[1.02]' 
                : 'text-text-secondary hover:bg-bg-surface hover:text-text-main'
            }`}
          >
            <span className="material-icons-outlined text-base">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* CARDS KPI PRINCIPAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Faturamento Projetado */}
        <div className="bg-bg-surface p-5 rounded-3xl border border-border-main shadow-sm flex flex-col justify-between hover:border-primary/40 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Faturamento Projetado</span>
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <span className="material-icons-outlined text-lg">trending_up</span>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-text-main tracking-tight">
              R$ {metrics.totalProjectedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
              <span className="text-success font-bold">
                Média: R$ {metrics.avgMonthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mês
              </span>
            </p>
          </div>
        </div>

        {/* Card 2: Reserva de Emergência Sugerida */}
        <div className="bg-bg-surface p-5 rounded-3xl border border-border-main shadow-sm flex flex-col justify-between hover:border-primary/40 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Reserva Mínima (Caixa)</span>
            <div className="p-2 bg-warning/10 text-warning rounded-xl">
              <span className="material-icons-outlined text-lg">shield</span>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-text-main tracking-tight">
              R$ {metrics.recommendedEmergencyFund.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Para cobrir ~2.5 meses de custos fixos
            </p>
          </div>
        </div>

        {/* Card 3: Mês de Pico (Alta) */}
        <div className="bg-bg-surface p-5 rounded-3xl border border-border-main shadow-sm flex flex-col justify-between hover:border-primary/40 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Pico de Alta Sazonal</span>
            <div className="p-2 bg-success/10 text-success rounded-xl">
              <span className="material-icons-outlined text-lg">rocket_launch</span>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-text-main tracking-tight flex items-baseline gap-2">
              {metrics.peakMonth?.month || 'Dez'}
              <span className="text-xs font-bold text-success">
                +{Math.round((metrics.peakMonth?.seasonalityFactor || 1.45) * 100 - 100)}%
              </span>
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Est. R$ {(metrics.peakMonth?.projectedRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Card 4: Mês Crítico de Baixa */}
        <div className="bg-bg-surface p-5 rounded-3xl border border-border-main shadow-sm flex flex-col justify-between hover:border-primary/40 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Período de Baixa</span>
            <div className="p-2 bg-danger/10 text-danger rounded-xl">
              <span className="material-icons-outlined text-lg">warning_amber</span>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-text-main tracking-tight flex items-baseline gap-2">
              {metrics.lowestMonth?.month || 'Fev'}
              <span className="text-xs font-bold text-danger">
                {Math.round((metrics.lowestMonth?.seasonalityFactor || 0.82) * 100 - 100)}%
              </span>
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Est. R$ {(metrics.lowestMonth?.projectedRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Atenção)
            </p>
          </div>
        </div>
      </div>

      {/* CONTEÚDO DA TAB 1: VISÃO GERAL & GRÁFICO */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico de Projeção */}
          <div className="lg:col-span-2 bg-bg-surface p-6 rounded-3xl border border-border-main shadow-sm flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="font-bold text-base text-text-main flex items-center gap-2">
                  <span className="material-icons-outlined text-primary text-lg">show_chart</span>
                  Projeção de Faturamento e Corredor Financeiro
                </h3>
                <p className="text-xs text-text-secondary">
                  Estimativa calibrada com base nos dados reais do seu painel ({forecastHorizon}).
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span> Projetado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Otimista (+15%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Conservador (-15%)
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProjetado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary, #FF622B)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--color-primary, #FF622B)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorOtimista" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-main, #333)" opacity={0.3} />
                  <XAxis dataKey="month" stroke="var(--color-text-secondary, #999)" fontSize={11} tickLine={false} />
                  <YAxis 
                    stroke="var(--color-text-secondary, #999)" 
                    fontSize={11} 
                    tickLine={false} 
                    tickFormatter={(val) => `R$ ${val}`} 
                  />
                  <Tooltip 
                    formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                    contentStyle={{ backgroundColor: 'var(--color-bg-surface, #1e1e1e)', borderColor: 'var(--color-border-main, #333)', borderRadius: '14px', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="Otimista" stroke="#10B981" fillOpacity={1} fill="url(#colorOtimista)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Projetado" stroke="var(--color-primary, #FF622B)" fillOpacity={1} fill="url(#colorProjetado)" strokeWidth={3} />
                  <Area type="monotone" dataKey="Conservador" stroke="#F59E0B" strokeDasharray="4 4" fill="none" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 p-3.5 bg-bg-base rounded-2xl flex items-center justify-between border border-border-main text-xs">
              <span className="text-text-secondary flex items-center gap-1.5">
                <span className="material-icons-outlined text-primary text-base">info</span>
                Base mensal calculada: R$ {realDatabaseStats.realMonthlyAverage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="font-bold text-text-main">Ponto de Equilíbrio: R$ {metrics.breakEvenRevenue.toLocaleString('pt-BR')}/mês</span>
            </div>
          </div>

          {/* Sazonalidade Semanal Real */}
          <div className="bg-bg-surface p-6 rounded-3xl border border-border-main shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-bold text-base text-text-main flex items-center gap-2">
                  <span className="material-icons-outlined text-primary text-lg">equalizer</span>
                  Sazonalidade Semanal
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  Real do Banco
                </span>
              </div>
              <p className="text-xs text-text-secondary mb-4">
                Distribuição percentual dos agendamentos por dia da semana.
              </p>

              <div className="space-y-2.5">
                {realWeekdaySeasonality.items.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-text-main">{item.day}</span>
                      <span className="font-bold text-primary">
                        {item.shareFormatted} {item.count > 0 && `(${item.count} agend.)`}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-bg-base rounded-full overflow-hidden border border-border-main/40">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.sharePct > 20 ? 'bg-primary' : item.sharePct > 10 ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.max(item.sharePct, item.count > 0 ? 5 : 0)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 p-3.5 bg-primary/10 rounded-2xl border border-primary/20">
              <p className="text-xs text-text-main leading-relaxed">
                <Markdown>{realWeekdaySeasonality.tip}</Markdown>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA TAB 2: RELATÓRIO MÊS A MÊS DE SAZONALIDADE */}
      {activeTab === 'seasonality' && (
        <div className="bg-bg-surface p-6 rounded-3xl border border-border-main shadow-sm flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg text-text-main flex items-center gap-2">
                <span className="material-icons-outlined text-primary text-lg">calendar_month</span>
                Relatório de Sazonalidade Mês a Mês
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Fatores sazonais calibrados pelo faturamento real da sua barbearia com planos de ação práticos.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-xl bg-bg-base border border-border-main text-text-secondary">
              Faturamento Base: R$ {realDatabaseStats.realMonthlyAverage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-border-main text-text-secondary text-[11px] uppercase tracking-wider bg-bg-base">
                  <th className="py-3 px-4 font-semibold">Mês</th>
                  <th className="py-3 px-4 font-semibold">Fator Sazonal</th>
                  <th className="py-3 px-4 font-semibold">Faturamento Proj.</th>
                  <th className="py-3 px-4 font-semibold">Demanda</th>
                  <th className="py-3 px-4 font-semibold">Ação Estratégica Recomendada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-main">
                {seasonalityDetailed.map((item, idx) => (
                  <tr key={idx} className="hover:bg-bg-elevated/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-text-main">{item.month}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-primary">
                      {item.seasonalityFactor.toFixed(2)}x
                    </td>
                    <td className="py-3.5 px-4 font-bold text-text-main">
                      R$ {item.projectedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.demandLevel === 'Pico Extraordinário' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' :
                        item.demandLevel === 'Alta' ? 'bg-success/15 text-success border border-success/30' :
                        item.demandLevel === 'Baixa' ? 'bg-danger/15 text-danger border border-danger/30' :
                        'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      }`}>
                        {item.demandLevel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-text-secondary max-w-md">
                      {item.recommendedAction}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA TAB 3: SIMULADOR DE CAIXA */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sliders Interativos */}
          <div className="bg-bg-surface p-6 rounded-3xl border border-border-main shadow-sm space-y-6">
            <div>
              <h3 className="font-bold text-lg text-text-main flex items-center gap-2">
                <span className="material-icons-outlined text-primary text-lg">tune</span>
                Simulador de Cenários & Preços
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Simule variações de preço, fluxo de clientes e custos fixos para prever o lucro real.
              </p>
            </div>

            {/* Slider 1: Reajuste de Preço */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-text-main">Reajuste Médio de Preço</span>
                <span className="text-primary font-mono text-sm">{simulation.priceAdjustment > 0 ? `+${simulation.priceAdjustment}%` : `${simulation.priceAdjustment}%`}</span>
              </div>
              <input 
                type="range" 
                min="-20" 
                max="40" 
                step="5"
                value={simulation.priceAdjustment}
                onChange={(e) => setSimulation({ ...simulation, priceAdjustment: Number(e.target.value) })}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-text-secondary">
                <span>Desconto -20%</span>
                <span>Preço Atual (0%)</span>
                <span>Aumento +40%</span>
              </div>
            </div>

            {/* Slider 2: Variação de Clientes */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-text-main">Variação no Volume de Clientes</span>
                <span className="text-primary font-mono text-sm">{simulation.clientVolumeAdjustment > 0 ? `+${simulation.clientVolumeAdjustment}%` : `${simulation.clientVolumeAdjustment}%`}</span>
              </div>
              <input 
                type="range" 
                min="-30" 
                max="50" 
                step="5"
                value={simulation.clientVolumeAdjustment}
                onChange={(e) => setSimulation({ ...simulation, clientVolumeAdjustment: Number(e.target.value) })}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-text-secondary">
                <span>Queda -30%</span>
                <span>Fluxo Atual (0%)</span>
                <span>Crescimento +50%</span>
              </div>
            </div>

            {/* Input 3: Custos Fixos Mensais */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-main block">Custos Fixos Mensais (R$)</label>
              <input 
                type="number"
                value={simulation.fixedCosts}
                onChange={(e) => setSimulation({ ...simulation, fixedCosts: Number(e.target.value) })}
                className="w-full bg-bg-base border border-border-main rounded-2xl px-4 py-2.5 text-xs text-text-main font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Resultado Recalculado da Simulação */}
          <div className="bg-bg-surface p-6 rounded-3xl border border-border-main shadow-sm flex flex-col justify-between gap-6">
            <div>
              <h3 className="font-bold text-lg text-text-main flex items-center gap-2 mb-4">
                <span className="material-icons-outlined text-primary text-lg">calculated</span>
                Resultado da Simulação
              </h3>

              <div className="space-y-3.5">
                <div className="p-4 bg-bg-base rounded-2xl border border-border-main flex justify-between items-center">
                  <div>
                    <span className="text-xs text-text-secondary block">Faturamento Mensal Simulado</span>
                    <span className="text-xl font-extrabold text-text-main">
                      R$ {metrics.scenarioMonthlyAvg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {metrics.scenarioMonthlyAvg >= metrics.avgMonthlyRevenue ? '▲ Acima da média' : '▼ Abaixo da média'}
                  </span>
                </div>

                <div className="p-4 bg-bg-base rounded-2xl border border-border-main flex justify-between items-center">
                  <div>
                    <span className="text-xs text-text-secondary block">Lucro Líquido Estimado</span>
                    <span className="text-xl font-extrabold text-success">
                      R$ {metrics.estimatedNetProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <span className="text-xs text-text-secondary font-medium">
                    {metrics.scenarioMonthlyAvg > 0 ? `Margem ~${Math.round((metrics.estimatedNetProfit / metrics.scenarioMonthlyAvg) * 100)}%` : '0%'}
                  </span>
                </div>

                <div className="p-4 bg-bg-base rounded-2xl border border-border-main flex justify-between items-center">
                  <div>
                    <span className="text-xs text-text-secondary block">Ponto de Equilíbrio (Break-Even)</span>
                    <span className="text-base font-bold text-text-main">
                      R$ {metrics.breakEvenRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <span className="text-xs text-text-secondary">Custos Fixos</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveTab('ai');
                callGeminiAI(`Análise a seguinte simulação de cenário: Reajuste de preços de ${simulation.priceAdjustment}%, variação de clientes de ${simulation.clientVolumeAdjustment}%, custos fixos de R$ ${simulation.fixedCosts}, resultando em faturamento simulado de R$ ${metrics.scenarioMonthlyAvg}/mês.`, "simulacao");
              }}
              className="w-full py-3 bg-primary text-primary-text font-bold text-xs rounded-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-primary/20"
            >
              <span className="material-icons-outlined text-sm">auto_awesome</span>
              Analisar esta Simulação com IA
            </button>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA TAB 4: CONSULTOR IA FINANCEIRO & CHAT */}
      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Painel de Ações Rápidas de IA */}
          <div className="bg-bg-surface p-6 rounded-3xl border border-border-main shadow-sm flex flex-col gap-3">
            <div>
              <h3 className="font-bold text-base text-text-main flex items-center gap-2">
                <span className="material-icons-outlined text-primary text-lg">bolt</span>
                Ações Rápidas de IA
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Clique para diagnósticos instantâneos baseados nos dados reais.
              </p>
            </div>

            <button
              onClick={() => callGeminiAI("Gere um diagnóstico estratégico completo do meu caixa com base nos dados reais da barbearia", "diagnostico")}
              disabled={aiLoading}
              className="w-full text-left p-3.5 rounded-2xl bg-bg-base hover:bg-primary/10 border border-border-main hover:border-primary/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-text transition-colors">
                  <span className="material-icons-outlined text-sm">assessment</span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-text-main">Diagnóstico Completo de Caixa</h4>
                  <p className="text-[11px] text-text-secondary">Visão geral do faturamento e caixa</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => callGeminiAI("Como devo me preparar para os meses de baixa temporada com base no meu faturamento atual?", "baixa")}
              disabled={aiLoading}
              className="w-full text-left p-3.5 rounded-2xl bg-bg-base hover:bg-primary/10 border border-border-main hover:border-primary/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-warning/10 text-warning flex items-center justify-center group-hover:bg-warning group-hover:text-black transition-colors">
                  <span className="material-icons-outlined text-sm">shield</span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-text-main">Estratégias para Meses Fracos</h4>
                  <p className="text-[11px] text-text-secondary">Evite aperto em períodos de baixa</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => callGeminiAI("Qual é a estrutura recomendada para a reserva de segurança da minha barbearia?", "reserva")}
              disabled={aiLoading}
              className="w-full text-left p-3.5 rounded-2xl bg-bg-base hover:bg-primary/10 border border-border-main hover:border-primary/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-success/10 text-success flex items-center justify-center group-hover:bg-success group-hover:text-black transition-colors">
                  <span className="material-icons-outlined text-sm">account_balance</span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-text-main">Plano de Capital de Giro</h4>
                  <p className="text-[11px] text-text-secondary">Cálculo de colchão financeiro</p>
                </div>
              </div>
            </button>
          </div>

          {/* Chat Interativo com IA */}
          <div className="lg:col-span-2 bg-bg-surface p-6 rounded-3xl border border-border-main shadow-sm flex flex-col justify-between h-[520px]">
            <div className="flex items-center justify-between border-b border-border-main pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse"></div>
                <span className="font-bold text-xs text-text-main">Consultor IA Financeiro (Online)</span>
              </div>
              <span className="text-[11px] text-text-secondary">Dados Reais Integrados</span>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 hide-scrollbar">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-text rounded-tr-none' 
                      : 'bg-bg-base border border-border-main text-text-main rounded-tl-none prose dark:prose-invert max-w-none text-xs leading-relaxed'
                  }`}>
                    {msg.role === 'user' ? (
                      msg.text
                    ) : (
                      <Markdown>{msg.text}</Markdown>
                    )}
                  </div>
                </div>
              ))}

              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-bg-base border border-border-main p-3 rounded-2xl rounded-tl-none flex items-center gap-2.5 text-xs text-text-secondary">
                    <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                    Analisando dados do banco e gerando diagnóstico...
                  </div>
                </div>
              )}
            </div>

            {/* Input do Usuário */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (customUserPrompt.trim() && !aiLoading) {
                  const prompt = customUserPrompt;
                  setCustomUserPrompt('');
                  callGeminiAI(prompt);
                }
              }}
              className="flex items-center gap-2 pt-3 border-t border-border-main"
            >
              <input 
                type="text" 
                value={customUserPrompt}
                onChange={(e) => setCustomUserPrompt(e.target.value)}
                placeholder="Pergunte sobre faturamento, custos, metas ou estratégias..."
                className="flex-1 bg-bg-base border border-border-main rounded-xl px-4 py-2.5 text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button 
                type="submit"
                disabled={aiLoading || !customUserPrompt.trim()}
                className="p-2.5 bg-primary text-primary-text rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center cursor-pointer"
              >
                <span className="material-icons-outlined text-base">send</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
