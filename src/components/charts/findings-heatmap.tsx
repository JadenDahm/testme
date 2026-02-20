'use client';

import type { ScanFinding, Severity, FindingCategory } from '@/types';

interface Props {
  findings: ScanFinding[];
}

const severityConfig: Record<Severity, { label: string; bg: string; text: string }> = {
  critical: { label: 'Krit.', bg: 'bg-red-500', text: 'text-white' },
  high: { label: 'Hoch', bg: 'bg-orange-400', text: 'text-white' },
  medium: { label: 'Mittel', bg: 'bg-yellow-400', text: 'text-gray-900' },
  low: { label: 'Niedrig', bg: 'bg-blue-400', text: 'text-white' },
  info: { label: 'Info', bg: 'bg-slate-300', text: 'text-gray-700' },
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

function getCellIntensity(count: number): string {
  if (count === 0) return 'bg-gray-50';
  if (count === 1) return 'bg-opacity-40';
  if (count <= 3) return 'bg-opacity-70';
  return 'bg-opacity-100';
}

function getCellColor(severity: Severity, count: number): string {
  if (count === 0) return 'bg-gray-50 border-gray-100';
  const colors: Record<Severity, string> = {
    critical: 'bg-red-500 border-red-600',
    high: 'bg-orange-400 border-orange-500',
    medium: 'bg-yellow-400 border-yellow-500',
    low: 'bg-blue-400 border-blue-500',
    info: 'bg-slate-300 border-slate-400',
  };
  const opacity = count === 1 ? 'opacity-50' : count <= 3 ? 'opacity-75' : 'opacity-100';
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
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Ergebnis-Matrix</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-[10px] font-medium text-gray-400 uppercase tracking-wider pb-2 pr-3" />
              {severityOrder.map((sev) => (
                <th key={sev} className="text-center text-[10px] font-medium text-gray-400 uppercase tracking-wider pb-2 px-1">
                  {severityConfig[sev].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat}>
                <td className="text-xs font-medium text-gray-600 py-1 pr-3 whitespace-nowrap">
                  {categoryConfig[cat]}
                </td>
                {severityOrder.map((sev) => {
                  const count = matrix[cat][sev];
                  return (
                    <td key={sev} className="p-0.5 text-center">
                      <div
                        className={`w-9 h-9 mx-auto rounded-md border flex items-center justify-center text-xs font-bold transition-all ${getCellColor(sev, count)}`}
                        title={`${categoryConfig[cat]} – ${severityConfig[sev].label}: ${count}`}
                      >
                        {count > 0 && (
                          <span className={count > 0 && sev !== 'medium' ? 'text-white' : 'text-gray-800'}>
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
