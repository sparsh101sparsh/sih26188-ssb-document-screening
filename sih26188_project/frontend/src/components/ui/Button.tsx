import React, { ButtonHTMLAttributes } from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'accent'
  | 'success'
  | 'danger'
  | 'default'
  | 'outline';

export type ButtonSize = 'sm' | 'md' | 'lg';

const filledShadow = 'shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]';

const variants: Record<ButtonVariant, string> = {
  primary:
    `bg-ink text-canvas hover:opacity-90 dark:bg-ink dark:text-canvas ${filledShadow}`,
  secondary:
    'bg-surface text-ink shadow-btn hover:bg-inset aria-expanded:bg-hover border border-line',
  ghost: 'text-ink-2 hover:bg-hover hover:text-ink',
  accent: `bg-accent text-white hover:brightness-105 ${filledShadow}`,
  success: `bg-green text-white hover:brightness-95 ${filledShadow}`,
  danger: `bg-red text-white hover:brightness-95 ${filledShadow}`,
  default:
    'bg-surface text-ink shadow-btn hover:bg-inset border border-line',
  outline:
    'bg-transparent text-ink-2 border border-line-strong hover:bg-hover hover:text-ink',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-[12px] rounded-control gap-1.5',
  md: 'h-8.5 px-3.5 text-[13px] rounded-control gap-2',
  lg: 'h-10 px-4 text-[14px] rounded-control gap-2.5',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium select-none
        transition-[transform,background-color,border-color,color,opacity] duration-150 ease-out
        active:scale-[0.96] disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
        ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
