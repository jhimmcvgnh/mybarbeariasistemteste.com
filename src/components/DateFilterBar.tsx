import React, { useState } from 'react';
import { 
  subDays, 
  addDays, 
  subWeeks, 
  addWeeks, 
  subMonths, 
  addMonths, 
  subYears, 
  addYears, 
  isSameDay, 
  isSameMonth, 
  isSameYear,
  format 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type DateFilterState, type PeriodType } from '../hooks/useStats';

interface DateFilterBarProps {
  filter: DateFilterState;
  onChange: (filter: DateFilterState) => void;
}

export const DateFilterBar: React.FC<DateFilterBarProps> = ({ filter, onChange }) => {
  const [showPicker, setShowPicker] = useState(false);
  const now = new Date();
  const ref = filter.referenceDate instanceof Date && !isNaN(filter.referenceDate.getTime()) 
    ? filter.referenceDate 
    : now;

  const isCurrentToday = filter.period === 'day' && isSameDay(ref, now);
  const isCurrentThisWeek = filter.period === 'week' && isSameDay(ref, now);
  const isCurrentThisMonth = filter.period === 'month' && isSameMonth(ref, now);
  const isCurrentThisYear = filter.period === 'year' && isSameYear(ref, now);

  const isAtPresent = isCurrentToday || isCurrentThisWeek || isCurrentThisMonth || isCurrentThisYear;

  // Navegação: anterior
  const handlePrev = () => {
    let newRef = ref;
    if (filter.period === 'day') newRef = subDays(ref, 1);
    else if (filter.period === 'week') newRef = subWeeks(ref, 1);
    else if (filter.period === 'month') newRef = subMonths(ref, 1);
    else if (filter.period === 'year') newRef = subYears(ref, 1);

    onChange({
      ...filter,
      referenceDate: newRef,
      customStartDate: format(newRef, 'yyyy-MM-dd'),
      customEndDate: format(newRef, 'yyyy-MM-dd'),
    });
  };

  // Navegação: próximo
  const handleNext = () => {
    let newRef = ref;
    if (filter.period === 'day') newRef = addDays(ref, 1);
    else if (filter.period === 'week') newRef = addWeeks(ref, 1);
    else if (filter.period === 'month') newRef = addMonths(ref, 1);
    else if (filter.period === 'year') newRef = addYears(ref, 1);

    onChange({
      ...filter,
      referenceDate: newRef,
      customStartDate: format(newRef, 'yyyy-MM-dd'),
      customEndDate: format(newRef, 'yyyy-MM-dd'),
    });
  };

  // Resetar para hoje
  const handleResetToday = () => {
    const today = new Date();
    onChange({
      ...filter,
      referenceDate: today,
      customStartDate: format(today, 'yyyy-MM-dd'),
      customEndDate: format(today, 'yyyy-MM-dd'),
    });
  };

  // Mudar período
  const handlePeriodChange = (period: PeriodType) => {
    const today = new Date();
    onChange({
      period,
      referenceDate: today,
      customStartDate: filter.customStartDate || format(today, 'yyyy-MM-dd'),
      customEndDate: filter.customEndDate || format(today, 'yyyy-MM-dd'),
    });
  };

  // Formata o rótulo principal exibido na barra
  const getDisplayLabel = () => {
    switch (filter.period) {
      case 'day': {
        const isToday = isSameDay(ref, now);
        const isYesterday = isSameDay(ref, subDays(now, 1));
        const isTomorrow = isSameDay(ref, addDays(now, 1));

        if (isToday) return `Hoje • ${format(ref, "dd 'de' MMMM", { locale: ptBR })}`;
        if (isYesterday) return `Ontem • ${format(ref, "dd 'de' MMMM", { locale: ptBR })}`;
        if (isTomorrow) return `Amanhã • ${format(ref, "dd 'de' MMMM", { locale: ptBR })}`;
        return format(ref, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      }
      case 'week': {
        return `Esta semana (${format(ref, "MMMM 'de' yyyy", { locale: ptBR })})`;
      }
      case 'month': {
        const str = format(ref, "MMMM 'de' yyyy", { locale: ptBR });
        return str.charAt(0).toUpperCase() + str.slice(1);
      }
      case 'year': {
        return `Ano ${format(ref, 'yyyy')}`;
      }
      case 'custom': {
        const start = filter.customStartDate ? format(new Date(filter.customStartDate + 'T12:00:00'), 'dd/MM/yyyy') : 'Início';
        const end = filter.customEndDate ? format(new Date(filter.customEndDate + 'T12:00:00'), 'dd/MM/yyyy') : 'Fim';
        return `${start} até ${end}`;
      }
      case 'all':
      default:
        return 'Histórico Completo';
    }
  };

  const periodOptions: { id: PeriodType; label: string; icon: string }[] = [
    { id: 'day', label: 'Hoje / Dia', icon: 'calendar_today' },
    { id: 'week', label: 'Semana', icon: 'date_range' },
    { id: 'month', label: 'Mês', icon: 'calendar_view_month' },
    { id: 'year', label: 'Ano', icon: 'event_note' },
    { id: 'custom', label: 'Personalizado', icon: 'tune' },
    { id: 'all', label: 'Tudo', icon: 'all_inclusive' },
  ];

  return (
    <div className="bg-bg-surface/90 backdrop-blur-md border border-border-main rounded-2xl p-3 md:p-4 mb-6 shadow-sm transition-all flex flex-col gap-3">
      {/* Linha Superior: Seletor de Períodos e Ações Rápidas */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        {/* Pills de Período */}
        <div className="flex items-center gap-1.5 p-1 bg-bg-base/70 rounded-xl border border-border-main/60 overflow-x-auto max-w-full hide-scrollbar">
          {periodOptions.map((opt) => {
            const isActive = filter.period === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handlePeriodChange(opt.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-primary text-primary-text shadow-sm shadow-primary/20 scale-[1.02]'
                    : 'text-text-secondary hover:text-text-main hover:bg-bg-elevated/80'
                }`}
              >
                <span className="material-icons-outlined text-[15px]">{opt.icon}</span>
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Controles de Navegação de Data */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
          {filter.period !== 'all' && filter.period !== 'custom' && (
            <div className="flex items-center bg-bg-base/80 border border-border-main rounded-xl p-1 shadow-inner">
              <button
                onClick={handlePrev}
                title="Período anterior"
                className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-bg-elevated transition-colors cursor-pointer"
              >
                <span className="material-icons-outlined text-[18px]">chevron_left</span>
              </button>

              <div className="px-3 py-1 text-xs font-bold text-text-main min-w-[140px] md:min-w-[180px] text-center select-none flex items-center justify-center gap-1.5">
                <span className="material-icons-outlined text-[14px] text-primary">event</span>
                <span className="truncate">{getDisplayLabel()}</span>
              </div>

              <button
                onClick={handleNext}
                title="Próximo período"
                className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-bg-elevated transition-colors cursor-pointer"
              >
                <span className="material-icons-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          )}

          {/* Botão Retornar a Hoje (se estiver em data diferente) */}
          {!isAtPresent && filter.period !== 'all' && filter.period !== 'custom' && (
            <button
              onClick={handleResetToday}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/20 transition-all cursor-pointer"
              title="Voltar para a data de hoje"
            >
              <span className="material-icons-outlined text-[14px]">replay</span>
              <span>Hoje</span>
            </button>
          )}

          {/* Botão de Ajuste Fino / Seleção Específica */}
          <button
            onClick={() => setShowPicker(!showPicker)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              showPicker || filter.period === 'custom'
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-bg-base/80 border-border-main text-text-secondary hover:text-text-main hover:bg-bg-elevated'
            }`}
            title="Escolher data específica"
          >
            <span className="material-icons-outlined text-[16px]">edit_calendar</span>
            <span className="hidden sm:inline">Selecionar Data</span>
          </button>
        </div>
      </div>

      {/* Painel Expansível de Escolha de Data / Mês / Intervalo */}
      {(showPicker || filter.period === 'custom') && (
        <div className="pt-3 border-t border-border-main/60 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {filter.period === 'day' && (
            <div className="flex flex-wrap items-center gap-2 w-full">
              <span className="text-xs text-text-secondary font-medium">Escolher dia específico:</span>
              <input
                type="date"
                value={format(ref, 'yyyy-MM-dd')}
                onChange={(e) => {
                  if (e.target.value) {
                    const newDate = new Date(`${e.target.value}T12:00:00`);
                    onChange({
                      ...filter,
                      referenceDate: newDate,
                      customStartDate: e.target.value,
                      customEndDate: e.target.value,
                    });
                  }
                }}
                className="bg-bg-base border border-border-main rounded-xl px-3 py-1.5 text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
              />
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    const yesterday = subDays(now, 1);
                    onChange({
                      ...filter,
                      referenceDate: yesterday,
                      customStartDate: format(yesterday, 'yyyy-MM-dd'),
                      customEndDate: format(yesterday, 'yyyy-MM-dd'),
                    });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-bg-elevated hover:bg-bg-base text-text-secondary hover:text-text-main text-xs transition-colors cursor-pointer"
                >
                  Ontem
                </button>
                <button
                  onClick={handleResetToday}
                  className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-colors cursor-pointer"
                >
                  Hoje
                </button>
                <button
                  onClick={() => {
                    const tomorrow = addDays(now, 1);
                    onChange({
                      ...filter,
                      referenceDate: tomorrow,
                      customStartDate: format(tomorrow, 'yyyy-MM-dd'),
                      customEndDate: format(tomorrow, 'yyyy-MM-dd'),
                    });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-bg-elevated hover:bg-bg-base text-text-secondary hover:text-text-main text-xs transition-colors cursor-pointer"
                >
                  Amanhã
                </button>
              </div>
            </div>
          )}

          {filter.period === 'week' && (
            <div className="flex flex-wrap items-center gap-2 w-full">
              <span className="text-xs text-text-secondary font-medium">Escolher dia dentro da semana:</span>
              <input
                type="date"
                value={format(ref, 'yyyy-MM-dd')}
                onChange={(e) => {
                  if (e.target.value) {
                    const newDate = new Date(`${e.target.value}T12:00:00`);
                    onChange({
                      ...filter,
                      referenceDate: newDate,
                    });
                  }
                }}
                className="bg-bg-base border border-border-main rounded-xl px-3 py-1.5 text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
              />
              <span className="text-[11px] text-text-secondary italic">A semana iniciará na segunda-feira correspondente à data escolhida.</span>
            </div>
          )}

          {filter.period === 'month' && (
            <div className="flex flex-wrap items-center gap-2 w-full">
              <span className="text-xs text-text-secondary font-medium">Mês:</span>
              <select
                value={ref.getMonth()}
                onChange={(e) => {
                  const m = parseInt(e.target.value, 10);
                  const newDate = new Date(ref.getFullYear(), m, 1);
                  onChange({ ...filter, referenceDate: newDate });
                }}
                className="bg-bg-base border border-border-main rounded-xl px-3 py-1.5 text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
              >
                {[
                  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                ].map((name, idx) => (
                  <option key={name} value={idx}>{name}</option>
                ))}
              </select>

              <span className="text-xs text-text-secondary font-medium ml-2">Ano:</span>
              <select
                value={ref.getFullYear()}
                onChange={(e) => {
                  const y = parseInt(e.target.value, 10);
                  const newDate = new Date(y, ref.getMonth(), 1);
                  onChange({ ...filter, referenceDate: newDate });
                }}
                className="bg-bg-base border border-border-main rounded-xl px-3 py-1.5 text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
              >
                {[2024, 2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {filter.period === 'year' && (
            <div className="flex flex-wrap items-center gap-2 w-full">
              <span className="text-xs text-text-secondary font-medium">Selecionar Ano:</span>
              <div className="flex gap-1.5">
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <button
                    key={y}
                    onClick={() => {
                      const newDate = new Date(y, 0, 1);
                      onChange({ ...filter, referenceDate: newDate });
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      ref.getFullYear() === y
                        ? 'bg-primary text-primary-text shadow-sm'
                        : 'bg-bg-elevated text-text-secondary hover:text-text-main'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filter.period === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 w-full">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary font-medium">De:</span>
                <input
                  type="date"
                  value={filter.customStartDate || format(now, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    onChange({
                      ...filter,
                      customStartDate: e.target.value,
                    });
                  }}
                  className="bg-bg-base border border-border-main rounded-xl px-3 py-1.5 text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary font-medium">Até:</span>
                <input
                  type="date"
                  value={filter.customEndDate || format(now, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    onChange({
                      ...filter,
                      customEndDate: e.target.value,
                    });
                  }}
                  className="bg-bg-base border border-border-main rounded-xl px-3 py-1.5 text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                />
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    const start = format(subDays(now, 7), 'yyyy-MM-dd');
                    const end = format(now, 'yyyy-MM-dd');
                    onChange({ ...filter, customStartDate: start, customEndDate: end });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-bg-elevated hover:bg-bg-base text-text-secondary hover:text-text-main text-xs transition-colors cursor-pointer"
                >
                  Últimos 7 dias
                </button>
                <button
                  onClick={() => {
                    const start = format(subDays(now, 30), 'yyyy-MM-dd');
                    const end = format(now, 'yyyy-MM-dd');
                    onChange({ ...filter, customStartDate: start, customEndDate: end });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-bg-elevated hover:bg-bg-base text-text-secondary hover:text-text-main text-xs transition-colors cursor-pointer"
                >
                  Últimos 30 dias
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
