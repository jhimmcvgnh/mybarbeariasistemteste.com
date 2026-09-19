import React from 'react';

interface WalletCardProps {
  currency: string;
  amount: string;
  limit: string;
  active: boolean;
  flagUrl?: string;
  flagCode?: string;
}

export const WalletCard: React.FC<WalletCardProps> = ({ currency, amount, limit, active, flagUrl, flagCode }) => {
  return (
    <div className={`min-w-[140px] border border-border-main rounded-2xl p-4 bg-bg-base transition-colors duration-200 ${!active ? 'opacity-60' : ''}`}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          {flagUrl ? (
            <img src={flagUrl} alt={`${currency} Flag`} className="w-5 h-3.5 rounded-sm object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className={`w-5 h-3.5 rounded-sm flex items-center justify-center text-[8px] text-white overflow-hidden relative ${currency === 'EUR' ? 'bg-blue-600' : 'bg-blue-800'}`}>
              {currency === 'GBP' && (
                <>
                  <div className="absolute inset-0 bg-red-600 w-[2px] mx-auto"></div>
                  <div className="absolute inset-0 bg-red-600 h-[2px] my-auto"></div>
                </>
              )}
              {currency !== 'GBP' && currency}
            </div>
          )}
          <span className="text-sm font-medium text-text-main">{currency}</span>
        </div>
        <button className="text-text-secondary">
          <span className="material-icons-outlined text-sm">more_vert</span>
        </button>
      </div>
      <p className="font-bold text-lg mb-1 text-text-main">{amount}</p>
      <p className="text-[10px] text-text-secondary mb-2">{limit}</p>
      <span className={`text-xs font-bold ${active ? 'text-success' : 'text-danger'}`}>
        {active ? 'Ativo' : 'Inativo'}
      </span>
    </div>
  );
};
