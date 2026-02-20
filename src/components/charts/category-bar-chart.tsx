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
  if (score >= 90) return '#10b981';
  if (score >= 70) return '#fb923c';
  if (score >= 50) return '#eab308';
  if (score >= 30) return '#f97316';
  return '#f43f5e';
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
    <div className="bg-surface-200 border border-border-default rounded px-4 py-3 text-xs">
      <p className="font-semibold text-text-primary mb-1.5">{d.displayName}</p>
      <p className="text-text-secondary">
        Score: <span className="font-bold" style={{ color: getBarColor(d.score) }}>{d.score}/100</span>
      </p>
      <div className="mt-2 space-y-0.5 text-text-secondary">
        {d.criticalCount > 0 && <p>{d.criticalCount} kritisch</p>}
        {d.highCount > 0 && <p>{d.highCount} hoch</p>}
        {d.mediumCount > 0 && <p>{d.mediumCount} mittel</p>}
        {d.lowCount > 0 && <p>{d.lowCount} niedrig</p>}
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
      <h3 className="text-sm font-semibold text-text-secondary mb-3">Kategorie-Bewertung</h3>
      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#5a6578' }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="displayName"
              width={120}
              tick={{ fontSize: 11, fill: '#a0aec0' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
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
                style={{ fontSize: 11, fontWeight: 600, fill: '#a0aec0' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
