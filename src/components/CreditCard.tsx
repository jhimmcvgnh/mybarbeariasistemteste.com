import React from 'react';

interface CreditCardProps {
  type: 'primary' | 'dark';
  cardNumber: string;
  exp?: string;
  cvv?: string;
}

export const CreditCard: React.FC<CreditCardProps> = ({ type, cardNumber, exp, cvv }) => {
  if (type === 'dark') {
    return (
      <div className="min-w-[240px] h-[150px] bg-gray-900 rounded-2xl p-5 text-white flex flex-col justify-between relative overflow-hidden shadow-md">
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/5 blur-xl"></div>
        <div className="absolute -left-6 -bottom-6 w-20 h-20 rounded-full bg-white/5 blur-xl"></div>
        <div className="flex justify-between items-start z-10">
          <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded text-[10px] font-medium backdrop-blur-sm">
            <span className="material-icons-outlined text-[12px]">contactless</span> Ativo
          </div>
          <div className="flex">
            <div className="w-6 h-6 rounded-full bg-red-500/80 mix-blend-multiply"></div>
            <div className="w-6 h-6 rounded-full bg-yellow-500/80 mix-blend-multiply -ml-2"></div>
          </div>
        </div>
        <div className="z-10 flex justify-between items-end mt-4">
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5">Número do Cartão</p>
            <p className="font-mono text-sm tracking-widest">{cardNumber}</p>
          </div>
          <div className="flex gap-4">
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5">EXP</p>
              <p className="font-mono text-sm">{exp}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5">CVV</p>
              <p className="font-mono text-sm">{cvv}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-[240px] h-[150px] bg-primary rounded-2xl p-5 text-primary-text flex flex-col justify-between relative overflow-hidden shadow-md">
      <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full border-[20px] border-white/10"></div>
      <div className="absolute -left-4 bottom-4 w-12 h-12 rounded-full bg-white/10"></div>
      <div className="flex justify-between items-start z-10">
        <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded text-[10px] font-medium backdrop-blur-sm">
          <span className="material-icons-outlined text-[12px]">contactless</span> Ativo
        </div>
        <div className="flex">
          <div className="w-6 h-6 rounded-full bg-white/50 mix-blend-overlay"></div>
          <div className="w-6 h-6 rounded-full bg-white/50 mix-blend-overlay -ml-2"></div>
        </div>
      </div>
      <div className="z-10 flex justify-between items-end mt-4">
        <div>
          <p className="text-[10px] text-primary-text/70 mb-0.5">Número do Cartão</p>
          <p className="font-mono text-sm tracking-widest">{cardNumber}</p>
        </div>
      </div>
    </div>
  );
};
