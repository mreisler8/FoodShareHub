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

export function UnifiedShareModal({ 
  isOpen, 
  onClose, 
  defaultTab = 'moment',
  contextData 
}: UnifiedShareModalProps) {
  const [activeTab, setActiveTab] = useState<'moment' | 'list' | 'post'>(defaultTab);
  const [privacy, setPrivacy] = useState<'public' | 'circle' | 'private'>('public');
  const { trackComponent, cleanupComponent } = useMemoryManagement();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      trackComponent('UnifiedShareModal');
    }
    return () => cleanupComponent('UnifiedShareModal');
  }, [isOpen, trackComponent, cleanupComponent]);

  const handleSuccessfulShare = (type: string) => {
    toast({
      title: `${type} shared successfully! ✨`,
      description: "Your content is now live and visible to your network.",
      duration: 3000,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] p-0 gap-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Enhanced Header with Visual Hierarchy */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-orange-50 to-pink-50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                  Share Your Experience
                </h2>
                <p className="text-sm text-gray-600 mt-1">Choose what you'd like to share with your network</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-white/50">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Enhanced Privacy Selection with Visual Feedback */}
          <div className="px-6 py-4 border-b bg-gray-50/50">
            <div className="flex gap-3">
              <Button 
                variant={privacy === 'public' ? 'default' : 'outline'} 
                size="sm" 
                className={`gap-2 transition-all ${privacy === 'public' ? 'bg-green-500 hover:bg-green-600 text-white shadow-md' : ''}`}
                onClick={() => setPrivacy('public')}
              >
                <Globe className="h-4 w-4" />
                Public
              </Button>
              <Button 
                variant={privacy === 'circle' ? 'default' : 'outline'} 
                size="sm" 
                className={`gap-2 transition-all ${privacy === 'circle' ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md' : ''}`}
                onClick={() => setPrivacy('circle')}
              >
                <Users className="h-4 w-4" />
                Circle
              </Button>
              <Button 
                variant={privacy === 'private' ? 'default' : 'outline'} 
                size="sm" 
                className={`gap-2 transition-all ${privacy === 'private' ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-md' : ''}`}
                onClick={() => setPrivacy('private')}
              >
                <Lock className="h-4 w-4" />
                Private
              </Button>
            </div>
          </div>

          {/* Enhanced Tab Navigation */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3 mx-6 mt-4 bg-white border shadow-sm">
                <TabsTrigger 
                  value="moment" 
                  className="gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  <Camera className="h-4 w-4" />
                  Food Moment
                </TabsTrigger>
                <TabsTrigger 
                  value="list" 
                  className="gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  <List className="h-4 w-4" />
                  Create List
                </TabsTrigger>
                <TabsTrigger 
                  value="post" 
                  className="gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  <Share2 className="h-4 w-4" />
                  Share Experience
                </TabsTrigger>
              </TabsList>

              {/* Enhanced Food Moment with Real-time Feedback */}
              <TabsContent value="moment" className="h-full p-6 m-0 overflow-auto">
                <VisualFoodMoment
                  onSuccess={() => handleSuccessfulShare('Food Moment')}
                  onCancel={onClose}
                  initialVisibility={privacy}
                  contextData={contextData}
                />
              </TabsContent>

              {/* Modal-based List Creation (no page navigation) */}
              <TabsContent value="list" className="h-full p-6 m-0 overflow-auto">
                <div className="max-w-2xl mx-auto">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <List className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Create a New List</h3>
                    <p className="text-gray-600">Curate and share your favorite spots with your network</p>
                  </div>
                  <ListStarterForm
                    onSuccess={() => handleSuccessfulShare('List')}
                    onCancel={onClose}
                    privacy={privacy}
                  />
                </div>
              </TabsContent>

              {/* Enhanced Share Experience Placeholder */}
              <TabsContent value="post" className="h-full p-6 m-0">
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Share2 className="h-10 w-10 text-purple-600" />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">Detailed Reviews Coming Soon</h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      We're building an amazing experience for detailed restaurant reviews. 
                      In the meantime, try our other sharing options!
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button 
                        onClick={() => setActiveTab('moment')}
                        className="gap-2 bg-orange-500 hover:bg-orange-600"
                      >
                        <Camera className="h-4 w-4" />
                        Quick Food Moment
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setActiveTab('list')}
                        className="gap-2"
                      >
                        <List className="h-4 w-4" />
                        Create List
                      </Button>
                    </div>
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