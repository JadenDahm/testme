'use client';

import { useEffect, useRef } from 'react';

interface MatrixState {
  fps: number;
  bgOpacity: number;
  color: string;
  charset: string;
  size: number;
}

export function HeroAnimation({ showGUI = false }: { showGUI?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const colYPosRef = useRef<number[]>([]);
  const stateRef = useRef<MatrixState>({
    fps: 20, // Langsamer
    bgOpacity: 0.02, // Weniger prägnant
    color: '#3b82f6', // Blau statt grün für Light-Mode
    charset: '01',
    size: 20,
  });
  const dimensionsRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = stateRef.current;
    let { w, h } = dimensionsRef.current;
    let colYPos = colYPosRef.current;

    // Helper functions
    const random = (items: string) => items[Math.floor(Math.random() * items.length)];
    const randomRange = (start: number, end: number) => start + end * Math.random();

    // Resize canvas to fit window and reinitialize column positions
    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      dimensionsRef.current = { w, h };

      // Create array to track y-position of each column
      const numCols = Math.ceil(w / state.size);
      colYPos = Array(numCols).fill(0);
      colYPosRef.current = colYPos;
    };

    // Draw one frame of the Matrix effect
    const draw = () => {
      // Helles Grau für Light-Mode (statt schwarz)
      ctx.fillStyle = `rgba(248, 249, 250, ${state.bgOpacity})`;
      ctx.fillRect(0, 0, w, h);

      // Set text style - weniger prägnant mit reduzierter Opazität
      ctx.fillStyle = state.color;
      ctx.globalAlpha = 0.4; // Reduzierte Opazität für weniger prägnantes Aussehen
      ctx.font = `${state.size}px monospace`;

      // Draw and update each column
      for (let i = 0; i < colYPos.length; i++) {
        const yPos = colYPos[i];

        // Calculate x position for this column
        const xPos = i * state.size;

        // Draw random character at current position
        ctx.fillText(random(state.charset), xPos, yPos);

        // Update position for next frame - langsamer fallen
        const reachedBottom = yPos >= h;
        const randomReset = yPos >= randomRange(100, 5000);

        if (reachedBottom || randomReset) {
          colYPos[i] = 0; // Reset to top
        } else {
          colYPos[i] = yPos + state.size * 0.5; // Langsamer fallen (50% der normalen Geschwindigkeit)
        }
      }
      
      // Reset global alpha
      ctx.globalAlpha = 1.0;
    };

    // Initial setup
    resize();

    // Animation loop with FPS control
    const startAnimation = () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
      intervalIdRef.current = setInterval(draw, 1000 / state.fps);
    };

    startAnimation();

    // Handle window resize
    const handleResize = () => {
      resize();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
