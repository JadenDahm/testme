'use client';

import { useEffect, useState } from 'react';
import { scoreColor, scoreLabel } from '@/lib/utils';

interface Props {
  score: number;
  size?: number;
}

function getGradientColors(score: number): [string, string] {
  if (score >= 80) return ['#22c55e', '#16a34a'];
  if (score >= 60) return ['#eab308', '#ca8a04'];
  if (score >= 40) return ['#f97316', '#ea580c'];
  return ['#ef4444', '#dc2626'];
}

export function ScoreGauge({ score, size = 180 }: Props) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(score * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [score]);

  const center = size / 2;
  const radius = size / 2 - 16;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (animatedScore / 100) * circumference;
  const [color1, color2] = getGradientColors(score);

  const gradientId = `scoreGradient-${score}`;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color1} />
            <stop offset="100%" stopColor={color2} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="12"
        />

        {/* Subtle tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const angle = (tick / 100) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          const innerR = radius - 8;
          const outerR = radius + 8;
          return (
            <line
              key={tick}
              x1={center + innerR * Math.cos(rad)}
              y1={center + innerR * Math.sin(rad)}
              x2={center + outerR * Math.cos(rad)}
              y2={center + outerR * Math.sin(rad)}
              stroke="#e2e8f0"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          );
        })}

        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          transform={`rotate(-90 ${center} ${center})`}
          filter="url(#glow)"
          style={{ transition: 'stroke-dashoffset 0.1s ease-out' }}
        />

        {/* End dot */}
        {animatedScore > 0 && (() => {
          const endAngle = ((animatedScore / 100) * 360 - 90) * (Math.PI / 180);
          return (
            <circle
              cx={center + radius * Math.cos(endAngle)}
              cy={center + radius * Math.sin(endAngle)}
              r="6"
              fill="white"
              stroke={color2}
              strokeWidth="3"
            />
          );
        })()}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-black tracking-tight ${scoreColor(score)}`}>
          {animatedScore}
        </span>
        <span className="text-xs text-gray-400 font-medium mt-0.5">von 100</span>
        <span className={`text-xs font-semibold mt-1 ${scoreColor(score)}`}>
          {scoreLabel(score)}
        </span>
      </div>
    </div>
  );
}
