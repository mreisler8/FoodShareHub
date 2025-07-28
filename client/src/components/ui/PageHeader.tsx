import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { PizzaLogo } from "./PizzaLogo";

interface PageHeaderProps {
  title?: string;
  showBackButton?: boolean;
  showLogo?: boolean;
  backUrl?: string;
  className?: string;
}

export function PageHeader({ 
  title, 
  showBackButton = false, 
  showLogo = true,
  backUrl = "/feed",
  className = "" 
}: PageHeaderProps) {
  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 ${className}`}>
      <div className="flex items-center justify-between h-14 px-4">
        
        {/* Left side - Back button or Logo */}
        <div className="flex items-center gap-3">
          {showBackButton ? (
            <Link 
              to={backUrl}
              className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Go back to feed"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </Link>
          ) : showLogo && (
            <div className="flex items-center gap-2">
              <PizzaLogo size="md" />
              <span className="text-xl font-bold text-gray-900">Circles</span>
            </div>
          )}
        </div>

        {/* Center - Page title when back button is shown */}
        {showBackButton && title && (
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-lg font-semibold text-gray-900 text-center">{title}</h1>
          </div>
        )}

        {/* Right side - Placeholder for future actions */}
        <div className="w-11 h-11" />
      </div>
    </header>
  );
}