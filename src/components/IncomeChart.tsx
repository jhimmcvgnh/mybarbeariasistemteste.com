import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { type Appointment } from '../lib/supabase';
import { type ChartDataPoint } from '../hooks/useStats';

interface IncomeChartProps {
  appointments?: Appointment[];
  chartData?: ChartDataPoint[];
  title?: string;
  subtitle?: string;
}

export const IncomeChart: React.FC<IncomeChartProps> = ({ 
  chartData = [], 
  title = 'Movimento', 
  subtitle = 'Atendimentos por período' 
}) => {
  const data = chartData;
  const maxActivity = Math.max(...data.map(d => d.activity), 0);
  const totalPeriodActivity = data.reduce((sum, d) => sum + d.activity, 0);

  // Custom tooltip for rich info
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point: ChartDataPoint = payload[0].payload;
      return (
        <div className="bg-bg-surface border border-border-main p-3 rounded-xl shadow-lg text-xs flex flex-col gap-1 min-w-[130px]">
          <span className="font-bold text-text-main border-b border-border-main pb-1 mb-1">
            {point.fullName || point.name}
          </span>
          <div className="flex items-center justify-between gap-3 text-text-secondary">
            <span>Atendimentos:</span>
            <span className="font-semibold text-primary">{point.activity}</span>
          </div>
          {point.revenue > 0 && (
            <div className="flex items-center justify-between gap-3 text-text-secondary">
              <span>Faturado:</span>
              <span className="font-semibold text-success">
                R$ {point.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-bg-surface rounded-3xl p-6 shadow-sm border border-border-main xl:col-span-1 col-span-1 md:col-span-2 xl:col-start-3 xl:col-end-4 transition-colors duration-200 flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-lg text-text-main flex items-center gap-2">
            {title}
            {totalPeriodActivity > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {totalPeriodActivity} total
              </span>
            )}
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>
        </div>
      </div>
      
      <div className="flex justify-between items-end text-xs text-text-secondary mb-3">
        <span className="font-medium text-text-main">Volume de Clientes</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary"></span> Pico
          </span>
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-sm bg-bg-elevated border border-border-main"></span> Normal
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-[220px] w-full relative">
        {data.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary text-xs">
            <span className="material-icons-outlined text-2xl mb-1 opacity-50">bar_chart</span>
            Sem registros para este período
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 8,
                right: 4,
                left: -24,
                bottom: 0,
              }}
              barSize={data.length > 20 ? 8 : data.length > 12 ? 14 : 20}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-main)" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: data.length > 15 ? 9 : 10, fill: 'var(--color-text-secondary)' }} 
                dy={6}
                interval={data.length > 20 ? 2 : 0}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                allowDecimals={false}
                tick={{ fontSize: 10, fill: 'var(--color-text-secondary)' }} 
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                content={<CustomTooltip />}
              />
              <Bar dataKey="activity" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => {
                  const isPeak = entry.activity === maxActivity && maxActivity > 0;
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={isPeak ? 'var(--color-primary)' : 'var(--color-bg-elevated)'} 
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
