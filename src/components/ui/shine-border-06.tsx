import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FocusFrameBorderProps = {
  children: ReactNode;
  className?: string;
  duration?: number;
  color?: string;
};

const corners = [
  {
    position: "-top-2 -left-2 sm:-top-3 sm:-left-3",
    edges: "border-t-[2.5px] border-l-[2.5px] rounded-tl-2xl",
    delay: 0,
  },
  {
    position: "-top-2 -right-2 sm:-top-3 sm:-right-3",
    edges: "border-t-[2.5px] border-r-[2.5px] rounded-tr-2xl",
    delay: 0.3,
  },
  {
    position: "-bottom-2 -left-2 sm:-bottom-3 sm:-left-3",
    edges: "border-b-[2.5px] border-l-[2.5px] rounded-bl-2xl",
    delay: 0.6,
  },
  {
    position: "-bottom-2 -right-2 sm:-bottom-3 sm:-right-3",
    edges: "border-b-[2.5px] border-r-[2.5px] rounded-br-2xl",
    delay: 0.9,
  },
];

const FocusFrameBorder = ({
  children,
  className,
  duration = 2.4,
  color = "#00e676",
}: FocusFrameBorderProps) => {
  return (
    <>
      <style>{`
        @keyframes focus-pulse {
          0%, 100% { opacity: 0.65; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }
        .animate-focus-pulse {
          animation: focus-pulse var(--duration, 2.4s) ease-in-out infinite;
        }
      `}</style>
      <div className={cn("relative", className)}>
        {/* Pulsing corner brackets */}
        {corners.map((corner) => (
          <div
            key={corner.position}
            className={cn(
              "absolute z-30 size-12 pointer-events-none animate-focus-pulse",
              corner.position,
              corner.edges,
            )}
            style={
              {
                borderColor: color,
                filter: `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 16px ${color})`,
                animationDelay: `${corner.delay}s`,
                "--duration": `${duration}s`,
              } as React.CSSProperties
            }
          />
        ))}

        {/* Content Layer */}
        <div className="relative z-10 rounded-2xl bg-[#0d1117] border border-neutral-800/80 overflow-hidden shadow-2xl">
          {children}
        </div>
      </div>
    </>
  );
};

export default FocusFrameBorder;
