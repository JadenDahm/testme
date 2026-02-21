'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer border-2 border-black/20 shadow-[0_4px_0_0_rgba(0,0,0,0.8)] hover:shadow-[0_2px_0_0_rgba(0,0,0,0.8)] hover:translate-y-[2px] active:shadow-[0_0_0_0_rgba(0,0,0,0.8)] active:translate-y-[4px]';

    const variants = {
      primary: 'bg-accent-400 text-white hover:bg-accent-500 rounded-full border-2 border-black/20 shadow-[0_4px_0_0_rgba(0,0,0,0.8)] hover:shadow-[0_2px_0_0_rgba(0,0,0,0.8)] hover:translate-y-[2px] active:shadow-[0_0_0_0_rgba(0,0,0,0.8)] active:translate-y-[4px]',
      secondary: 'bg-surface-50 text-text-primary hover:bg-surface-100 border-2 border-black/20 rounded-full shadow-[0_4px_0_0_rgba(0,0,0,0.8)] hover:shadow-[0_2px_0_0_rgba(0,0,0,0.8)] hover:translate-y-[2px] active:shadow-[0_0_0_0_rgba(0,0,0,0.8)] active:translate-y-[4px]',
      outline: 'border-2 border-black/20 text-text-secondary hover:text-text-primary hover:bg-surface-50 rounded-full shadow-[0_4px_0_0_rgba(0,0,0,0.8)] hover:shadow-[0_2px_0_0_rgba(0,0,0,0.8)] hover:translate-y-[2px] active:shadow-[0_0_0_0_rgba(0,0,0,0.8)] active:translate-y-[4px]',
      danger: 'bg-red-500/10 text-red-500 border-2 border-black/20 hover:bg-red-500/15 rounded-full shadow-[0_4px_0_0_rgba(0,0,0,0.8)] hover:shadow-[0_2px_0_0_rgba(0,0,0,0.8)] hover:translate-y-[2px] active:shadow-[0_0_0_0_rgba(0,0,0,0.8)] active:translate-y-[4px]',
      ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface-100 rounded-full border-2 border-transparent shadow-[0_4px_0_0_rgba(0,0,0,0.6)] hover:shadow-[0_2px_0_0_rgba(0,0,0,0.6)] hover:translate-y-[2px] active:shadow-[0_0_0_0_rgba(0,0,0,0.6)] active:translate-y-[4px]',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-5 py-2.5 gap-2',
      lg: 'text-base px-7 py-3.5 gap-2',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export { Button };
