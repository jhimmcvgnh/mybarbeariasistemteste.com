import React from 'react';
import FocusFrameBorder from './ui/shine-border-06';
import { Crosshair, X, Wand2, Gift, ArrowRight } from 'lucide-react';

interface PromoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PromoModal: React.FC<PromoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const quizUrl = 'https://quizz-page-fist.vercel.app/';

  const handleCtaClick = () => {
    window.open(quizUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg mx-auto">
        <FocusFrameBorder
          duration={2.4}
          color="#00e676"
          className="w-full"
        >
          <div className="relative p-6 sm:p-8 flex flex-col items-center text-center gap-5 bg-[#0a0e14]/95 text-white">
            {/* Close Button "X" */}
            <button
              onClick={onClose}
              aria-label="Fechar anúncio"
              className="absolute top-4 right-4 sm:top-5 sm:right-5 size-9 sm:size-10 rounded-xl bg-[#141923] hover:bg-[#1f2636] border border-neutral-700/60 text-neutral-300 hover:text-white flex items-center justify-center transition-all duration-200 shadow-lg cursor-pointer group"
            >
              <X className="size-5 transition-transform group-hover:scale-110" />
            </button>

            {/* Target Icon in circle */}
            <div className="size-14 sm:size-16 rounded-full bg-[#00e676]/10 border border-[#00e676]/40 flex items-center justify-center text-[#00e676] shadow-[0_0_20px_rgba(0,230,118,0.25)]">
              <Crosshair className="size-7 sm:size-8" />
            </div>

            {/* Badge jimdev */}
            <div className="px-4 py-1 rounded-full border border-[#00e676]/40 bg-[#00e676]/10 text-[#00e676] text-xs font-semibold tracking-wider">
              jimdev
            </div>

            {/* Main announcement text */}
            <p className="text-sm sm:text-base text-neutral-200 font-normal leading-relaxed max-w-md px-1 sm:px-4">
              Gostou da experiência? Quer melhorias? Um design totalmente novo, personalizado e melhorado? Clique no botão abaixo, responda ao quiz necessário que não dura nada e ganhe um presente no final por responder!
            </p>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-center gap-3 w-full pt-1">
              {/* Left Wand Button */}
              <button
                type="button"
                className="size-11 sm:size-12 rounded-full bg-[#141923] border border-neutral-700/60 text-neutral-300 flex items-center justify-center shrink-0 shadow-md hover:bg-[#1a2230] transition-colors"
                title="Melhorias personalizadas"
              >
                <Wand2 className="size-5" />
              </button>

              {/* Center CTA Button */}
              <button
                onClick={handleCtaClick}
                type="button"
                className="flex-1 max-w-[280px] sm:max-w-[320px] h-11 sm:h-12 rounded-full bg-[#00e676] hover:bg-[#00c864] active:scale-95 text-black font-extrabold text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,230,118,0.4)] transition-all duration-200 cursor-pointer"
              >
                <span>QUERO MEU PROJETO COMPLETO</span>
                <ArrowRight className="size-4.5 stroke-[2.5]" />
              </button>

              {/* Right Gift Button */}
              <button
                type="button"
                className="size-11 sm:size-12 rounded-full bg-[#141923] border border-neutral-700/60 text-neutral-300 flex items-center justify-center shrink-0 shadow-md hover:bg-[#1a2230] transition-colors"
                title="Ganhe um presente no final"
              >
                <Gift className="size-5" />
              </button>
            </div>
          </div>
        </FocusFrameBorder>
      </div>
    </div>
  );
};
