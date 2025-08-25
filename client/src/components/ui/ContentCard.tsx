import { ReactNode } from 'react';

interface ContentCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

export default function ContentCard({ 
  children, 
  className = '', 
  hover = true, 
  padding = 'md' 
}: ContentCardProps) {
  const paddingClasses = {
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-6 py-4'
  };

  return (
    <div 
      className={`
        rounded-xl shadow-sm bg-white border border-gray-100
        ${paddingClasses[padding]}
        ${hover ? 'hover:shadow-md hover:border-gray-200 transition-all duration-200' : ''}
        ${className}
      `}
    >
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}