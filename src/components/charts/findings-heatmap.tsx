'use client';

import type { ScanFinding, Severity, FindingCategory } from '@/types';

interface Props {
  findings: ScanFinding[];
}

const severityConfig: Record<Severity, { label: string }> = {
  critical: { label: 'Krit.' },
  high: { label: 'Hoch' },
  medium: { label: 'Mittel' },
  low: { label: 'Niedrig' },
  info: { label: 'Info' },
};

const categoryConfig: Record<FindingCategory, string> = {
  ssl: 'SSL/TLS',
  headers: 'HTTP-Header',
  sensitive_files: 'Dateien',
  secrets: 'Secrets',
  vulnerability: 'Schwachstellen',
  cors: 'CORS',
  email: 'E-Mail',
  info: 'Informationen',
};

const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

function getCellColor(severity: Severity, count: number): string {
  if (count === 0) return 'bg-surface-200/50 border-border-subtle';

  const opacity = count === 1 ? 'opacity-50' : count <= 3 ? 'opacity-75' : 'opacity-100';
  const colors: Record<Severity, string> = {
    critical: 'bg-rose-500 border-rose-400/30',
    high: 'bg-orange-500 border-orange-400/30',
    medium: 'bg-yellow-500 border-yellow-400/30',
    low: 'bg-cyan-500 border-cyan-400/30',
    info: 'bg-slate-500 border-slate-400/30',
  };
  return `${colors[severity]} ${opacity}`;
}

export function FindingsHeatmap({ findings }: Props) {
  // Get categories that actually have findings
  const categories = [...new Set(findings.map((f) => f.category))] as FindingCategory[];

  if (categories.length === 0) return null;

  // Build matrix
  const matrix: Record<string, Record<Severity, number>> = {};
  for (const cat of categories) {
    matrix[cat] = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  }
  for (const f of findings) {
    matrix[f.category][f.severity]++;
  }

  return (
    <div className="flex flex-col">
      <h3 className="text-sm font-semibold text-text-secondary mb-3">Ergebnis-Matrix</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-[10px] font-medium text-text-faint uppercase tracking-wider pb-2 pr-3" />
              {severityOrder.map((sev) => (
                <th key={sev} className="text-center text-[10px] font-medium text-text-faint uppercase tracking-wider pb-2 px-1">
                  {severityConfig[sev].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat}>
                <td className="text-xs font-medium text-text-secondary py-1 pr-3 whitespace-nowrap">
                  {categoryConfig[cat]}
                </td>
                {severityOrder.map((sev) => {
                  const count = matrix[cat][sev];
                  return (
                    <td key={sev} className="p-0.5 text-center">
                      <div
                        className={`w-9 h-9 mx-auto rounded-lg border flex items-center justify-center text-xs font-bold transition-all ${getCellColor(sev, count)}`}
                        title={`${categoryConfig[cat]} – ${severityConfig[sev].label}: ${count}`}
                      >
                        {count > 0 && (
                          <span className="text-white drop-shadow-sm">
                            {count}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
