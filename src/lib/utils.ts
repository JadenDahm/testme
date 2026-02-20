import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeDomain(input: string): string {
  let domain = input.trim().toLowerCase();
  // Remove protocol
  domain = domain.replace(/^https?:\/\//, '');
  // Remove trailing slash
  domain = domain.replace(/\/+$/, '');
  // Remove www prefix
  domain = domain.replace(/^www\./, '');
  // Remove path
  domain = domain.split('/')[0];
  return domain;
}

export function generateVerificationToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'testme-verify-';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function isValidDomain(domain: string): boolean {
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

export function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    case 'low': return 'text-accent-400 bg-accent-500/10 border-accent-500/20';
    case 'info': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  }
}

export function severityBadge(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-rose-500/15 text-rose-300 border border-rose-500/20';
    case 'high': return 'bg-orange-500/15 text-orange-300 border border-orange-500/20';
    case 'medium': return 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/20';
    case 'low': return 'bg-accent-500/15 text-accent-300 border border-accent-500/20';
    case 'info': return 'bg-slate-500/15 text-slate-300 border border-slate-500/20';
    default: return 'bg-slate-500/15 text-slate-300 border border-slate-500/20';
  }
}

export function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-rose-400';
}

export function scoreLabel(score: number): string {
  if (score >= 90) return 'Ausgezeichnet';
  if (score >= 80) return 'Gut';
  if (score >= 60) return 'Befriedigend';
  if (score >= 40) return 'Mangelhaft';
  return 'Kritisch';
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
