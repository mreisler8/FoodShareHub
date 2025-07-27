import { useState } from "react";
import { Plus, List, Camera, Star } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/Button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FloatingCreateButtonProps {
  className?: string;
}

export function FloatingCreateButton({ className }: FloatingCreateButtonProps) {
  const [, navigate] = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  const createOptions = [
    {
      icon: List,
      label: "Create List",
      description: "Curate restaurant collections",
      href: "/create-list",
      color: "bg-orange-500 hover:bg-orange-600",
      textColor: "text-orange-600"
    },
    {
      icon: Camera,
      label: "Food Moment",
      description: "Share a food experience",
      href: "/create-post?type=moment",
      color: "bg-blue-500 hover:bg-blue-600",
      textColor: "text-blue-600"
    },
    {
      icon: Star,
      label: "Rate Restaurant",
      description: "Quick rating & review",
      href: "/quick-ratings",
      color: "bg-green-500 hover:bg-green-600", 
      textColor: "text-green-600"
    }
  ];

  const handleOptionClick = (href: string) => {
    navigate(href);
    setIsExpanded(false);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={cn("fixed bottom-20 lg:bottom-8 right-4 z-50", className)}>
      {/* Expanded Options */}
      {isExpanded && (
        <div className="mb-4 space-y-3">
          {createOptions.map((option, index) => (
            <Card 
              key={option.label}
              className={cn(
                "transform transition-all duration-300 shadow-lg cursor-pointer hover:shadow-xl",
                "animate-in slide-in-from-bottom-2 fade-in-0",
                isExpanded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              )}
              style={{ 
                animationDelay: `${index * 100}ms`,
                animationFillMode: 'both'
              }}
              onClick={() => handleOptionClick(option.href)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", option.color)}>
                    <option.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-500">{option.description}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Create Button */}
      <Button
        onClick={toggleExpanded}
        className={cn(
          "h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300",
          "bg-orange-500 hover:bg-orange-600 text-white",
          "flex items-center justify-center",
          isExpanded && "rotate-45"
        )}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Backdrop */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 z-[-1]"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}