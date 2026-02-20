'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { Severity } from '@/types';

interface Props {
  counts: Record<Severity, number>;
}

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string }> = {
  critical: { label: 'Kritisch', color: '#f43f5e' },
  high: { label: 'Hoch', color: '#f97316' },
  medium: { label: 'Mittel', color: '#eab308' },
  low: { label: 'Niedrig', color: '#06b6d4' },
  info: { label: 'Info', color: '#475569' },
};

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { name: string; value: number; fill: string } }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const { name, value, fill } = payload[0].payload;
  return (
    <div className="bg-surface-200 border border-border-default rounded-lg px-4 py-3 text-xs">
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: fill }} />
        <span className="font-medium text-text-primary">{name}</span>
      </div>
      <p className="text-text-secondary mt-1">{value} {value === 1 ? 'Ergebnis' : 'Ergebnisse'}</p>
    </div>
  );
}

export function SeverityDonutChart({ counts }: Props) {
  const data = (Object.entries(SEVERITY_CONFIG) as [Severity, typeof SEVERITY_CONFIG[Severity]][])
    .filter(([sev]) => counts[sev] > 0)
    .map(([sev, config]) => ({
      name: config.label,
      value: counts[sev],
      fill: config.color,
    }));

  if (data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-sm font-semibold text-text-secondary mb-3">Schweregrad-Verteilung</h3>
      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value: string) => (
                <span className="text-xs text-text-muted">{value}</span>
              )}
              iconSize={8}
              iconType="circle"
              wrapperStyle={{ fontSize: '12px' }}
            />
            {/* Center text */}
            <text x="50%" y="47%" textAnchor="middle" className="fill-text-primary text-2xl font-bold">
              {total}
            </text>
            <text x="50%" y="57%" textAnchor="middle" className="fill-text-muted text-[10px]">
              Gesamt
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
