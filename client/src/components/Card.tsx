import { forwardRef } from 'react';
import './Card.css';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'elevated' | 'outlined';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = '', onClick, hover = false, padding = 'md', variant = 'default' }, ref) => {
    const cardClasses = [
      'card',
      `card--${variant}`,
      `card--${padding}`,
      hover && 'card--hover',
      onClick && 'card--clickable',
      className
    ].filter(Boolean).join(' ');

    return (
      <div
        ref={ref}
        className={cardClasses}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        } : undefined}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Simple CardContent component for compatibility
export const CardContent = forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
  ({ children, className = '' }, ref) => (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
);

CardContent.displayName = 'CardContent';