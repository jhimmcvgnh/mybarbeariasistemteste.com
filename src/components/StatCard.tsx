import React from 'react';

interface StatCardProps {
  title: string;
  amount: string | number;
  percentage?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: string;
  isPrimary?: boolean;
  period?: string;
  periodLabel?: string;
  subText?: string;
  details?: Array<{ label: string; count: number; colorClass?: string }>;
  onPeriodChange?: (period: any) => void;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  amount, 
  percentage, 
  trend = 'up', 
  icon, 
  isPrimary,
  periodLabel,
  subText,
  details
}) => {
  const baseClasses = "rounded-3xl p-5 shadow-sm flex flex-col justify-between transition-all duration-200";
  const primaryClasses = "bg-primary text-primary-text shadow-primary/20 shadow-lg";
  const secondaryClasses = "bg-bg-surface border border-border-main";

  return (
    <div className={`${baseClasses} ${isPrimary ? primaryClasses : secondaryClasses}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-1">
          <span className={`text-sm font-medium ${isPrimary ? 'opacity-90' : 'text-text-secondary'}`}>
            {title}
          </span>
          {periodLabel && (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md w-fit ${
              isPrimary ? 'bg-primary-text/20 text-primary-text' : 'bg-bg-elevated text-primary'
            }`}>
              {periodLabel}
            </span>
          )}
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
          isPrimary ? 'bg-primary-text/20 text-primary-text' : 'bg-bg-elevated text-text-secondary'
        }`}>
          <span className="material-icons-outlined text-lg">{icon}</span>
        </div>
      </div>

      <div>
        <h3 className="text-3xl font-bold mb-2 tracking-tight">{amount}</h3>
        
        <div className={`flex flex-wrap items-center gap-2 text-xs ${isPrimary ? 'opacity-90' : 'text-text-secondary'}`}>
          {percentage && (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded font-semibold ${
              isPrimary 
                ? 'bg-primary-text/20 text-primary-text' 
                : trend === 'up' 
                  ? 'text-success bg-success/10' 
                  : trend === 'down'
                    ? 'text-danger bg-danger/10'
                    : 'text-text-secondary bg-bg-elevated'
            }`}>
              {trend !== 'neutral' && (
                <span className="material-icons-outlined text-[12px] mr-1">
                  {trend === 'up' ? 'arrow_upward' : 'arrow_downward'}
                </span>
              )} 
              {percentage}
            </span>
          )}
          <span>{subText || 'no período selecionado'}</span>
        </div>

        {/* Detalhes / Status Breakdown se fornecido */}
        {details && details.length > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10 dark:border-border-main/50 text-[11px]">
            {details.map((d, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${d.colorClass || 'bg-text-secondary'}`}></span>
                <span className={isPrimary ? 'opacity-80' : 'text-text-secondary'}>{d.label}:</span>
                <span className="font-bold">{d.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
