import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'warning';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
  children,
  onClick,
  type = 'button',
  ...props
}: ButtonProps) {
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold focus:ring-amber-400';
      case 'secondary':
        return 'bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border border-slate-200 focus:ring-slate-300';
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 text-white font-bold focus:ring-rose-500';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold focus:ring-emerald-500';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold focus:ring-amber-500';
      case 'ghost':
        return 'bg-transparent hover:bg-slate-100 text-slate-600 font-semibold focus:ring-slate-200';
      default:
        return 'bg-slate-900 hover:bg-slate-800 text-white font-bold';
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={handleClick}
      className={`relative inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${getVariantStyles()} ${className}`}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-1 h-4 w-4 text-current shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      <span className={loading ? 'opacity-90' : ''}>{children}</span>
    </button>
  );
}
