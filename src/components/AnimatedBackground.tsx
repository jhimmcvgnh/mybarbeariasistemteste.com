import React from 'react';
import { NeuralNoise } from './ui/neural-noise';

export const AnimatedBackground: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  if (darkMode) {
    return (
      <div className="fixed inset-0 z-[-1] pointer-events-none bg-black">
        <NeuralNoise color={[1.0, 0.384, 0.169]} opacity={0.8} speed={0.001} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_560px_at_50%_200px,#FF622B15,transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#FF622B10_1px,transparent_1px),linear-gradient(to_bottom,#FF622B10_1px,transparent_1px)] bg-[size:18px_18px]" />
    </div>
  );
};
