'use client';

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { CategoryScore } from '@/lib/scanner/scoring';

interface Props {
  categoryScores: CategoryScore[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: { category: string; score: number; fullMark: number };
  }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-surface-200 border border-border-default rounded-xl shadow-2xl px-4 py-3 text-xs backdrop-blur-sm">
      <p className="font-semibold text-text-primary">{d.category}</p>
      <p className="text-text-secondary mt-1">Score: <span className="font-bold text-accent-400">{d.score}/100</span></p>
    </div>
  );
}

export function SecurityRadarChart({ categoryScores }: Props) {
  const data = categoryScores
    .filter((c) => c.name !== 'info')
    .map((c) => ({
      category: c.displayName,
      score: c.score,
      fullMark: 100,
    }));

  if (data.length < 3) return null; // Radar needs at least 3 data points

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-sm font-semibold text-text-secondary mb-3">Sicherheitsprofil</h3>
      <div className="w-full h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="rgba(255,255,255,0.06)" />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fontSize: 10, fill: '#a0aec0' }}
              tickLine={false}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: '#5a6578' }}
              tickCount={5}
              axisLine={false}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#22d3ee"
              fill="#06b6d4"
              fillOpacity={0.12}
              strokeWidth={2}
              dot={{ r: 3, fill: '#22d3ee', stroke: '#06b6d4', strokeWidth: 1 }}
              animationDuration={800}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
