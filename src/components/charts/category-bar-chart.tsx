'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import type { CategoryScore } from '@/lib/scanner/scoring';

interface Props {
  categoryScores: CategoryScore[];
}

function getBarColor(score: number): string {
  if (score >= 90) return '#22c55e';
  if (score >= 70) return '#84cc16';
  if (score >= 50) return '#eab308';
  if (score >= 30) return '#f97316';
  return '#ef4444';
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      displayName: string;
      score: number;
      criticalCount: number;
      highCount: number;
      mediumCount: number;
      lowCount: number;
    };
  }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-xs">
      <p className="font-semibold text-gray-900 mb-1">{d.displayName}</p>
      <p className="text-gray-600">
        Score: <span className="font-bold" style={{ color: getBarColor(d.score) }}>{d.score}/100</span>
      </p>
      <div className="mt-1.5 space-y-0.5 text-gray-500">
        {d.criticalCount > 0 && <p>🔴 {d.criticalCount} kritisch</p>}
        {d.highCount > 0 && <p>🟠 {d.highCount} hoch</p>}
        {d.mediumCount > 0 && <p>🟡 {d.mediumCount} mittel</p>}
        {d.lowCount > 0 && <p>🔵 {d.lowCount} niedrig</p>}
      </div>
    </div>
  );
}

export function CategoryBarChart({ categoryScores }: Props) {
  // Filter out the 'info' category for the bar chart
  const data = categoryScores
    .filter((c) => c.name !== 'info')
    .sort((a, b) => a.score - b.score);

  if (data.length === 0) return null;

  return (
    <div className="flex flex-col">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Kategorie-Bewertung</h3>
      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="displayName"
              width={120}
              tick={{ fontSize: 11, fill: '#475569' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
            <Bar
              dataKey="score"
              radius={[0, 6, 6, 0]}
              barSize={22}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
              ))}
              <LabelList
                dataKey="score"
                position="right"
                formatter={(value: unknown) => `${value}%`}
                style={{ fontSize: 11, fontWeight: 600, fill: '#475569' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
