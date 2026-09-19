import { useMemo } from 'react';
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  differenceInCalendarDays,
  isWithinInterval, 
  parseISO,
  format,
  isSameDay,
  eachDayOfInterval
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type Appointment } from '../lib/supabase';

export type PeriodType = 'day' | 'week' | 'month' | 'year' | 'custom' | 'all';

export interface DateFilterState {
  period: PeriodType;
  referenceDate: Date;
  customStartDate?: string;
  customEndDate?: string;
}

export interface ChartDataPoint {
  name: string;
  fullName?: string;
  activity: number;
  revenue: number;
}

// ============================================================
// Hook: useStats - Filtros Precisos, Comparações Reais & Gráficos Dinâmicos
// ============================================================
export function useStats(
  filter: DateFilterState | PeriodType = 'month',
  passedAppointments: Appointment[] = [],
  legacyCustomDate?: string
) {
  // Normaliza parâmetros de filtro para suportar formato novo ou legado
  const filterState: DateFilterState = useMemo(() => {
    if (typeof filter === 'string') {
      return {
        period: filter,
        referenceDate: legacyCustomDate ? new Date(`${legacyCustomDate}T12:00:00`) : new Date(),
        customStartDate: legacyCustomDate,
        customEndDate: legacyCustomDate,
      };
    }
    return filter;
  }, [filter, legacyCustomDate]);

  const stats = useMemo(() => {
    const appointments = passedAppointments || [];
    const { period, referenceDate, customStartDate, customEndDate } = filterState;
    const ref = referenceDate instanceof Date && !isNaN(referenceDate.getTime()) ? referenceDate : new Date();

    let currentInterval: { start: Date; end: Date } | null = null;
    let previousInterval: { start: Date; end: Date } | null = null;
    let periodLabel = '';
    let periodSubLabel = '';
    let chartTitle = 'Movimento';
    let chartSubtitle = 'Atendimentos por período';

    switch (period) {
      case 'day': {
        const start = startOfDay(ref);
        const end = endOfDay(ref);
        currentInterval = { start, end };
        
        const prevRef = subDays(ref, 1);
        previousInterval = { start: startOfDay(prevRef), end: endOfDay(prevRef) };

        const isToday = isSameDay(ref, new Date());
        periodLabel = isToday 
          ? `Hoje (${format(ref, "dd 'de' MMMM", { locale: ptBR })})`
          : format(ref, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
        // Capitalize first letter
        periodLabel = periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1);
        periodSubLabel = isToday ? 'Comparado a ontem' : `Comparado a ${format(prevRef, "dd/MM", { locale: ptBR })}`;
        chartTitle = 'Movimento Diário';
        chartSubtitle = `Atendimentos por horário em ${format(ref, "dd/MM/yyyy")}`;
        break;
      }

      case 'week': {
        const start = startOfWeek(ref, { weekStartsOn: 1 }); // Segunda-feira
        const end = endOfWeek(ref, { weekStartsOn: 1 }); // Domingo
        currentInterval = { start, end };

        const prevRef = subWeeks(ref, 1);
        previousInterval = { 
          start: startOfWeek(prevRef, { weekStartsOn: 1 }), 
          end: endOfWeek(prevRef, { weekStartsOn: 1 }) 
        };

        periodLabel = `Semana: ${format(start, 'dd/MM')} a ${format(end, 'dd/MM/yyyy')}`;
        periodSubLabel = 'Comparado à semana anterior';
        chartTitle = 'Movimento Semanal';
        chartSubtitle = `Atendimentos por dia (${format(start, 'dd/MM')} - ${format(end, 'dd/MM')})`;
        break;
      }

      case 'month': {
        const start = startOfMonth(ref);
        const end = endOfMonth(ref);
        currentInterval = { start, end };

        const prevRef = subMonths(ref, 1);
        previousInterval = { start: startOfMonth(prevRef), end: endOfMonth(prevRef) };

        const monthName = format(ref, "MMMM 'de' yyyy", { locale: ptBR });
        periodLabel = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        periodSubLabel = 'Comparado ao mês anterior';
        chartTitle = 'Movimento Mensal';
        chartSubtitle = `Distribuição diária em ${periodLabel}`;
        break;
      }

      case 'year': {
        const start = startOfYear(ref);
        const end = endOfYear(ref);
        currentInterval = { start, end };

        const prevRef = subYears(ref, 1);
        previousInterval = { start: startOfYear(prevRef), end: endOfYear(prevRef) };

        periodLabel = `Ano de ${format(ref, 'yyyy')}`;
        periodSubLabel = 'Comparado ao ano anterior';
        chartTitle = 'Movimento Anual';
        chartSubtitle = `Atendimentos mês a mês em ${format(ref, 'yyyy')}`;
        break;
      }

      case 'custom': {
        const start = customStartDate ? startOfDay(parseISO(customStartDate)) : startOfMonth(ref);
        const end = customEndDate ? endOfDay(parseISO(customEndDate)) : endOfMonth(ref);
        currentInterval = { start, end };

        const diffDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
        const prevEnd = subDays(start, 1);
        const prevStart = subDays(prevEnd, diffDays - 1);
        previousInterval = { start: startOfDay(prevStart), end: endOfDay(prevEnd) };

        periodLabel = `${format(start, 'dd/MM/yyyy')} até ${format(end, 'dd/MM/yyyy')}`;
        periodSubLabel = `Comparado aos ${diffDays} dias anteriores`;
        chartTitle = 'Movimento do Período';
        chartSubtitle = `Atendimentos entre ${format(start, 'dd/MM')} e ${format(end, 'dd/MM')}`;
        break;
      }

      case 'all':
      default: {
        currentInterval = null; // sem filtro de intervalo
        previousInterval = null;
        periodLabel = 'Todo o Histórico';
        periodSubLabel = 'Dados acumulados';
        chartTitle = 'Histórico Geral de Movimento';
        chartSubtitle = 'Atendimentos ao longo do tempo';
        break;
      }
    }

    // Função auxiliar para filtrar por intervalo
    const filterByInterval = (items: Appointment[], interval: { start: Date; end: Date } | null) => {
      if (!interval) return items;
      return items.filter(a => {
        if (!a.data_hora_inicio) return false;
        try {
          const date = typeof a.data_hora_inicio === 'string' ? parseISO(a.data_hora_inicio) : new Date(a.data_hora_inicio);
          if (isNaN(date.getTime())) return false;
          return isWithinInterval(date, interval);
        } catch {
          return false;
        }
      });
    };

    const periodAppts = filterByInterval(appointments, currentInterval);
    const prevAppts = previousInterval ? filterByInterval(appointments, previousInterval) : [];

    // Faturamento do período atual
    const revenue = periodAppts
      .filter(a => a.status !== 'cancelado')
      .reduce((acc, a) => acc + (Number(a.valor_total ?? a.valor_cobrado) || 0), 0);

    // Faturamento do período anterior
    const prevRevenue = prevAppts
      .filter(a => a.status !== 'cancelado')
      .reduce((acc, a) => acc + (Number(a.valor_total ?? a.valor_cobrado) || 0), 0);

    // Crescimento de Faturamento (%)
    let revenueGrowth = 0;
    if (prevRevenue > 0) {
      revenueGrowth = Math.round(((revenue - prevRevenue) / prevRevenue) * 100);
    } else if (revenue > 0) {
      revenueGrowth = 100;
    }

    // Contagens
    const appointmentsCount = periodAppts.length;
    const prevAppointmentsCount = prevAppts.length;
    
    let appointmentsGrowth = 0;
    if (prevAppointmentsCount > 0) {
      appointmentsGrowth = Math.round(((appointmentsCount - prevAppointmentsCount) / prevAppointmentsCount) * 100);
    } else if (appointmentsCount > 0) {
      appointmentsGrowth = 100;
    }

    const cancelledCount = periodAppts.filter(a => a.status === 'cancelado').length;
    const prevCancelledCount = prevAppts.filter(a => a.status === 'cancelado').length;
    const completedCount = periodAppts.filter(a => a.status === 'concluido').length;
    const confirmedCount = periodAppts.filter(a => a.status === 'confirmado').length;
    const pendingCount = periodAppts.filter(a => a.status === 'pendente').length;

    // Taxa de cancelamento
    const cancellationRate = appointmentsCount > 0 ? Math.round((cancelledCount / appointmentsCount) * 100) : 0;

    // Ticket Médio
    const activeApptsCount = periodAppts.filter(a => a.status !== 'cancelado').length;
    const averageTicket = activeApptsCount > 0 ? revenue / activeApptsCount : 0;

    // Serviços Populares
    const effectiveForServices = periodAppts.length > 0 ? periodAppts : appointments;
    const serviceCounts: Record<string, { name: string; value: number; revenue: number; color: string }> = {};
    const palette = ['#FF622B', '#FFA07A', '#E04F1D', '#FFB899', '#CC4A1F', '#F97316', '#EA580C', '#C2410C'];

    effectiveForServices.forEach(a => {
      const serviceNamesString = a.servico_nome || 'Personalizado';
      const serviceNames = serviceNamesString.split(/[,+]|\be\b/).map((s: string) => s.trim()).filter(Boolean);
      const val = Number(a.valor_total ?? a.valor_cobrado) || 0;
      const shareVal = serviceNames.length > 0 ? val / serviceNames.length : val;

      serviceNames.forEach((name: string) => {
        if (!serviceCounts[name]) {
          const colorIdx = Object.keys(serviceCounts).length % palette.length;
          serviceCounts[name] = { 
            name, 
            value: 0, 
            revenue: 0,
            color: palette[colorIdx] 
          };
        }
        serviceCounts[name].value += 1;
        if (a.status !== 'cancelado') {
          serviceCounts[name].revenue += shareVal;
        }
      });
    });

    const popularServices = Object.values(serviceCounts).sort((a, b) => b.value - a.value);

    // ============================================================
    // Geração Dinâmica de Dados para o Gráfico (chartData)
    // ============================================================
    let chartData: ChartDataPoint[] = [];

    if (period === 'day' && currentInterval) {
      // Horários do dia (das 08:00 às 20:00)
      const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
      chartData = hours.map(h => {
        const hourLabel = `${h.toString().padStart(2, '0')}h`;
        const hourAppts = periodAppts.filter(a => {
          if (!a.data_hora_inicio) return false;
          const d = parseISO(a.data_hora_inicio);
          return d.getHours() === h;
        });
        const rev = hourAppts
          .filter(a => a.status !== 'cancelado')
          .reduce((sum, a) => sum + (Number(a.valor_total ?? a.valor_cobrado) || 0), 0);

        return {
          name: hourLabel,
          fullName: `${h.toString().padStart(2, '0')}:00`,
          activity: hourAppts.length,
          revenue: rev
        };
      });
    } else if (period === 'week' && currentInterval) {
      // 7 Dias da Semana (Seg a Dom)
      const days = eachDayOfInterval(currentInterval);
      chartData = days.map(d => {
        const shortName = format(d, 'eee', { locale: ptBR }).replace('.', '');
        const dayLabel = shortName.charAt(0).toUpperCase() + shortName.slice(1, 3);
        const dayAppts = periodAppts.filter(a => a.data_hora_inicio && isSameDay(parseISO(a.data_hora_inicio), d));
        const rev = dayAppts
          .filter(a => a.status !== 'cancelado')
          .reduce((sum, a) => sum + (Number(a.valor_total ?? a.valor_cobrado) || 0), 0);

        return {
          name: `${dayLabel} ${format(d, 'dd')}`,
          fullName: format(d, "EEEE, dd 'de' MMMM", { locale: ptBR }),
          activity: dayAppts.length,
          revenue: rev
        };
      });
    } else if (period === 'month' && currentInterval) {
      // Dias do Mês
      const days = eachDayOfInterval(currentInterval);
      chartData = days.map(d => {
        const dayAppts = periodAppts.filter(a => a.data_hora_inicio && isSameDay(parseISO(a.data_hora_inicio), d));
        const rev = dayAppts
          .filter(a => a.status !== 'cancelado')
          .reduce((sum, a) => sum + (Number(a.valor_total ?? a.valor_cobrado) || 0), 0);

        return {
          name: format(d, 'dd'),
          fullName: format(d, "dd 'de' MMMM", { locale: ptBR }),
          activity: dayAppts.length,
          revenue: rev
        };
      });
    } else if (period === 'year' && currentInterval) {
      // 12 Meses do Ano
      const monthShorts = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const currentYear = ref.getFullYear();
      chartData = monthShorts.map((mName, mIdx) => {
        const monthAppts = periodAppts.filter(a => {
          if (!a.data_hora_inicio) return false;
          const d = parseISO(a.data_hora_inicio);
          return d.getFullYear() === currentYear && d.getMonth() === mIdx;
        });
        const rev = monthAppts
          .filter(a => a.status !== 'cancelado')
          .reduce((sum, a) => sum + (Number(a.valor_total ?? a.valor_cobrado) || 0), 0);

        return {
          name: mName,
          fullName: `${mName} de ${currentYear}`,
          activity: monthAppts.length,
          revenue: rev
        };
      });
    } else {
      // Custom ou All: Agrupado por dias se intervalo curto, ou meses se intervalo longo
      if (currentInterval) {
        const days = eachDayOfInterval(currentInterval);
        if (days.length <= 31) {
          chartData = days.map(d => {
            const dayAppts = periodAppts.filter(a => a.data_hora_inicio && isSameDay(parseISO(a.data_hora_inicio), d));
            const rev = dayAppts
              .filter(a => a.status !== 'cancelado')
              .reduce((sum, a) => sum + (Number(a.valor_total ?? a.valor_cobrado) || 0), 0);

            return {
              name: format(d, 'dd/MM'),
              fullName: format(d, "dd 'de' MMMM", { locale: ptBR }),
              activity: dayAppts.length,
              revenue: rev
            };
          });
        } else {
          // Mais de 31 dias: agrupa por semanas
          chartData = days.filter((_, idx) => idx % 7 === 0).map(d => {
            const weekStart = startOfWeek(d, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(d, { weekStartsOn: 1 });
            const weekAppts = periodAppts.filter(a => {
              if (!a.data_hora_inicio) return false;
              const ad = parseISO(a.data_hora_inicio);
              return isWithinInterval(ad, { start: weekStart, end: weekEnd });
            });
            const rev = weekAppts
              .filter(a => a.status !== 'cancelado')
              .reduce((sum, a) => sum + (Number(a.valor_total ?? a.valor_cobrado) || 0), 0);

            return {
              name: format(weekStart, 'dd/MM'),
              fullName: `Semana ${format(weekStart, 'dd/MM')} a ${format(weekEnd, 'dd/MM')}`,
              activity: weekAppts.length,
              revenue: rev
            };
          });
        }
      } else {
        // All
        const monthShorts = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        chartData = monthShorts.map((mName, mIdx) => {
          const monthAppts = appointments.filter(a => {
            if (!a.data_hora_inicio) return false;
            const d = parseISO(a.data_hora_inicio);
            return d.getMonth() === mIdx;
          });
          const rev = monthAppts
            .filter(a => a.status !== 'cancelado')
            .reduce((sum, a) => sum + (Number(a.valor_total ?? a.valor_cobrado) || 0), 0);

          return {
            name: mName,
            fullName: mName,
            activity: monthAppts.length,
            revenue: rev
          };
        });
      }
    }

    return {
      revenue,
      prevRevenue,
      revenueGrowth,
      appointmentsCount,
      prevAppointmentsCount,
      appointmentsGrowth,
      cancelledCount,
      prevCancelledCount,
      cancellationRate,
      completedCount,
      confirmedCount,
      pendingCount,
      averageTicket,
      popularServices,
      periodLabel,
      periodSubLabel,
      chartTitle,
      chartSubtitle,
      chartData,
      filteredAppointments: periodAppts
    };
  }, [filterState, passedAppointments]);

  return { ...stats, loading: false };
}
