import { useState } from "react";
import { Plus, List, Camera, Share2 } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import { UnifiedShareModal } from "@/components/share/UnifiedShareModal";

interface FloatingCreateButtonProps {
  className?: string;
}

export function FloatingCreateButton({ className }: FloatingCreateButtonProps) {
  const [, navigate] = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  const [showUnifiedShare, setShowUnifiedShare] = useState(false);
  const [shareModalTab, setShareModalTab] = useState<'moment' | 'list' | 'post'>('moment');

  const createOptions = [
    {
      icon: Camera,
      label: "Food Moment",
      action: () => {
        setShareModalTab('moment');
        setShowUnifiedShare(true);
      },
      bgColor: "bg-orange-100 hover:bg-orange-200",
      iconColor: "text-orange-600",
      borderColor: "border-orange-200"
    },
    {
      icon: List,  
      label: "Create List",
      action: () => {
        setShareModalTab('list');
        setShowUnifiedShare(true);
      },
      bgColor: "bg-green-100 hover:bg-green-200",
      iconColor: "text-green-600",
      borderColor: "border-green-200"
    },
    {
      icon: Share2,
      label: "Share Experience",
      action: () => {
        setShareModalTab('post');
        setShowUnifiedShare(true);
      },
      bgColor: "bg-blue-100 hover:bg-blue-200",
      iconColor: "text-blue-600",
      borderColor: "border-blue-200"
    }
  ];

  const handleOptionClick = (action: () => void) => {
    action();
  };

  return (
    <div 
      className={cn("fixed bottom-20 lg:bottom-8 right-4 z-50 group", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Quick Actions - Show on Hover */}
      <div className={cn(
        "absolute bottom-16 right-0 transition-all duration-300 ease-out",
        isHovered 
          ? "opacity-100 translate-y-0 pointer-events-auto" 
          : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        {/* Quick Actions Header */}
        <div className="text-right mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-sm border border-gray-200">
            <Camera className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-700">Quick Actions</span>
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-3 w-80">
          {createOptions.map((option, index) => (
            <div
              key={option.label}
              onClick={option.action}
              className={cn(
                "p-4 rounded-lg border cursor-pointer transition-all duration-200",
                "hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
                "bg-white",
                option.bgColor,
                option.borderColor
              )}
              style={{ 
                animationDelay: `${index * 50}ms`,
              }}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg bg-white shadow-sm", option.iconColor)}>
                  <option.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 text-sm">{option.label}</div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Empty slot for 2x2 grid balance */}
          <div className="opacity-0"></div>
        </div>
      </div>

      {/* Main Create Button */}
      <Button
        className={cn(
          "h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300",
          "bg-orange-500 hover:bg-orange-600 text-white",
          "flex items-center justify-center group-hover:scale-110",
          isHovered && "rotate-45"
        )}
      >
        <Plus className="h-6 w-6" />
      </Button>
      
      {/* Unified Share Modal */}
      <UnifiedShareModal
        isOpen={showUnifiedShare}
        onClose={() => setShowUnifiedShare(false)}
        defaultTab={shareModalTab}
      />
    </div>
  );
}