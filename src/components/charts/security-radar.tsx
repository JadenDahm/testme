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
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-900">{d.category}</p>
      <p className="text-gray-600 mt-0.5">Score: <span className="font-bold text-primary-600">{d.score}/100</span></p>
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
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Sicherheitsprofil</h3>
      <div className="w-full h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fontSize: 10, fill: '#475569' }}
              tickLine={false}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: '#94a3b8' }}
              tickCount={5}
              axisLine={false}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.15}
              strokeWidth={2}
              dot={{ r: 3, fill: '#6366f1' }}
              animationDuration={800}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
