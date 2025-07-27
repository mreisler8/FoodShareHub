import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Camera, 
  List, 
  Share2, 
  Globe, 
  Users, 
  Lock,
  CheckCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { VisualFoodMoment } from '../create/VisualFoodMoment';
import { ListStarterForm } from '../create/ListStarterForm';
import { useToast } from '@/hooks/use-toast';
import { useMemoryManagement } from '@/hooks/useMemoryManagement';
import { cn } from '@/lib/utils';

interface UnifiedShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'moment' | 'list' | 'post';
  contextData?: {
    restaurant?: any;
    location?: any;
    initialCaption?: string;
  };
}

interface ShareOption {
  id: 'public' | 'circle' | 'private';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}

const shareOptions: ShareOption[] = [
  {
    id: 'public',
    icon: Globe,
    label: 'Public',
    description: 'Everyone can see this',
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100 border-green-200'
  },
  {
    id: 'circle',
    icon: Users,
    label: 'Circle',
    description: 'Share with your circles',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
  },
  {
    id: 'private',
    icon: Lock,
    label: 'Private',
    description: 'Only you can see this',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 hover:bg-gray-100 border-gray-200'
  }
];

export function UnifiedShareModal({ isOpen, onClose, defaultTab = 'moment', contextData }: UnifiedShareModalProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [selectedVisibility, setSelectedVisibility] = useState<'public' | 'circle' | 'private'>('public');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const { toast } = useToast();
  const { trackComponent, cleanupComponent } = useMemoryManagement();

  // Track component lifecycle
  useEffect(() => {
    if (isOpen) {
      trackComponent('UnifiedShareModal');
    }
    
    return () => {
      if (isOpen) {
        cleanupComponent('UnifiedShareModal');
      }
    };
  }, [isOpen, trackComponent, cleanupComponent]);

  // Reset active tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setShowSuccessAnimation(false);
    }
  }, [isOpen, defaultTab]);

  // Handle successful creation with animation
  const handleSuccess = useCallback(() => {
    setShowSuccessAnimation(true);
    toast({
      title: 'Shared successfully!',
      description: 'Your content has been shared with your network.',
    });
    
    // Close modal after animation
    setTimeout(() => {
      onClose();
      setShowSuccessAnimation(false);
    }, 2000);
  }, [onClose, toast]);

  // Handle modal close with cleanup
  const handleClose = useCallback(() => {
    cleanupComponent('UnifiedShareModal');
    setShowSuccessAnimation(false);
    onClose();
  }, [onClose, cleanupComponent]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !showSuccessAnimation) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose, showSuccessAnimation]);

  const getTabConfig = () => {
    const tabs = [
      {
        id: 'moment',
        icon: Camera,
        label: 'Food Moment',
        description: 'Quick photo sharing',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50'
      },
      {
        id: 'list',
        icon: List,
        label: 'Create List',
        description: 'Curated restaurant collection',
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      },
      {
        id: 'post',
        icon: Share2,
        label: 'Share Experience',
        description: 'Detailed restaurant review',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      }
    ];
    return tabs;
  };

  const tabs = getTabConfig();

  // Success animation overlay
  if (showSuccessAnimation) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md w-full max-w-[95vw] border-0 bg-white/95 backdrop-blur-sm" style={{ borderRadius: '12px !important' }}>
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="relative mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
                <CheckCircle className="h-10 w-10 text-green-600 animate-bounce" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center animate-spin">
                <Sparkles className="h-4 w-4 text-orange-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Successfully Shared!</h3>
            <p className="text-gray-600 mb-4">Your content is now live and visible to your network</p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Redirecting to feed</span>
              <ArrowRight className="h-4 w-4 animate-pulse" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-3xl w-full max-w-[95vw] h-[90vh] max-h-screen p-0 overflow-hidden border-0 bg-gradient-to-br from-white to-gray-50/50" 
        style={{ borderRadius: '12px !important' }}
      >
        <div className="flex flex-col h-full">
          {/* Enhanced Header */}
          <div className="relative p-6 bg-white border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Share Your Experience</h2>
                  <p className="text-sm text-gray-500">Choose what you'd like to share with your network</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Visibility Selection */}
            <div className="mt-4 flex gap-2">
              {shareOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={() => setSelectedVisibility(option.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 text-sm',
                      selectedVisibility === option.id 
                        ? `${option.bgColor} ${option.color} border-current shadow-sm` 
                        : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Enhanced Tab Navigation */}
          <div className="bg-gray-50/50 px-6 py-4">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'moment' | 'list' | 'post')}>
              <TabsList className="grid w-full grid-cols-3 bg-white p-1 shadow-sm" style={{ borderRadius: '8px !important' }}>
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                      style={{ borderRadius: '6px !important' }}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-medium">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto bg-white">
            <Tabs value={activeTab} className="h-full">
              <TabsContent value="moment" className="h-full p-6 m-0">
                <div className="h-full">
                  <VisualFoodMoment 
                    onSuccess={handleSuccess} 
                    onCancel={handleClose}
                    initialVisibility={selectedVisibility}
                    contextData={contextData}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="list" className="h-full p-6 m-0">
                <div className="h-full">
                  <ListStarterForm 
                    onSuccess={handleSuccess}
                  />
                </div>
              </TabsContent>

              <TabsContent value="post" className="h-full p-6 m-0">
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Share2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Share Experience</h3>
                    <p className="text-gray-500 mb-4">Detailed restaurant review coming soon</p>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab('moment')}
                      className="gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      Try Food Moment instead
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}