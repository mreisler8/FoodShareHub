import { useState, useRef, useEffect } from 'react';
import { Plus, Camera, UtensilsCrossed, ListPlus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface FloatingCreateButtonProps {
  onPostPhoto: () => void;
  onShareMoment: () => void;
  onBuildList: () => void;
}

interface CreateAction {
  id: string;
  label: string;
  icon: JSX.Element;
  onClick: () => void;
  description: string;
}

export function FloatingCreateButton({ 
  onPostPhoto, 
  onShareMoment, 
  onBuildList 
}: FloatingCreateButtonProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const createActions: CreateAction[] = [
    {
      id: 'photo',
      label: 'Post a Photo',
      icon: <Camera className="h-5 w-5" />,
      onClick: () => {
        onPostPhoto();
        setIsPopoverOpen(false);
      },
      description: 'Share a photo with your network'
    },
    {
      id: 'moment',
      label: 'Share a Food Moment',
      icon: <UtensilsCrossed className="h-5 w-5" />,
      onClick: () => {
        onShareMoment();
        setIsPopoverOpen(false);
      },
      description: 'Capture a dining experience'
    },
    {
      id: 'list',
      label: 'Build a List',
      icon: <ListPlus className="h-5 w-5" />,
      onClick: () => {
        onBuildList();
        setIsPopoverOpen(false);
      },
      description: 'Curate restaurants and experiences'
    }
  ];

  // Handle outside click to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsPopoverOpen(false);
      }
    }

    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPopoverOpen]);

  // Handle ESC key to close popover
  useEffect(() => {
    function handleEscKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && isPopoverOpen) {
        setIsPopoverOpen(false);
        buttonRef.current?.focus();
      }
    }

    if (isPopoverOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isPopoverOpen]);

  // Focus trap within popover
  useEffect(() => {
    if (isPopoverOpen && popoverRef.current) {
      const focusableElements = popoverRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }
  }, [isPopoverOpen]);

  const togglePopover = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  return (
    <div className="fixed bottom-6 right-4 z-50">
      {/* Popover Menu */}
      <AnimatePresence>
        {isPopoverOpen && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-20 right-0 w-64 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
            role="menu"
            aria-label="Create new content menu"
          >
            {/* Menu Header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Create New Content</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPopoverOpen(false)}
                  className="h-6 w-6 p-0 hover:bg-gray-200"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              {createActions.map((action, index) => (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className="w-full flex items-start gap-3 p-3 rounded-md hover:bg-gray-50 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-150 text-left"
                  role="menuitem"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      action.onClick();
                    }
                  }}
                >
                  <div className="flex-shrink-0 mt-0.5 text-gray-600">
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{action.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Quick tip */}
            <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
              <p className="text-xs text-blue-600">
                💡 Tip: Use keyboard shortcuts for faster creation
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        ref={buttonRef}
        onClick={togglePopover}
        className="h-14 w-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-haspopup="menu"
        aria-expanded={isPopoverOpen}
        aria-label="Create new content"
        type="button"
      >
        <motion.div
          animate={{ rotate: isPopoverOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus className="h-6 w-6" />
        </motion.div>
        
        {/* Pulse animation when closed */}
        {!isPopoverOpen && (
          <motion.div
            className="absolute inset-0 rounded-full bg-primary"
            initial={{ scale: 1, opacity: 0.3 }}
            animate={{ scale: 1.4, opacity: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
        )}
      </motion.button>

      {/* Tooltip for first-time users */}
      <div className="absolute bottom-4 right-16 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        Create content
        <div className="absolute top-2 -right-1 w-2 h-2 bg-gray-900 rotate-45" />
      </div>
    </div>
  );
}

export default FloatingCreateButton;