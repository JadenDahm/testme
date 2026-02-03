import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function normalizeDomain(domain: string): string {
  let normalized = domain.trim().toLowerCase();
  
  // Entferne Protokoll falls vorhanden
  normalized = normalized.replace(/^https?:\/\//, '');
  
  // Entferne trailing slash
  normalized = normalized.replace(/\/$/, '');
  
  // Entferne www. falls vorhanden (optional, könnte auch beibehalten werden)
  // normalized = normalized.replace(/^www\./, '');
  
  return normalized;
}

export function getDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}
