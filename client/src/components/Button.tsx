import React from 'react';
import './Button.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const baseClasses = `
      inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium 
      ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 
      focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60
      active:scale-98 hover:scale-100 focus:scale-100 cursor-pointer disabled:cursor-not-allowed
    `;

    const variantClasses = {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70',
      danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80',
      ghost: 'hover:bg-accent hover:text-accent-foreground active:bg-accent/80'
    };

    const sizeClasses = {
      sm: 'h-9 rounded-md px-3 text-xs',
      md: 'h-10 px-4 py-2',
      lg: 'h-11 rounded-md px-8 text-base',
      icon: 'h-10 w-10'
    };

    const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim();

    return (
      <button
        className={classes}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';