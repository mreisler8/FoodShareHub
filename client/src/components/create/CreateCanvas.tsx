import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { X, Camera, List, Sparkles } from 'lucide-react';
import { FoodMomentForm } from './FoodMomentForm';
import { ListStarterForm } from './ListStarterForm';
import { useMemoryManagement } from '@/hooks/useMemoryManagement';

interface CreateCanvasProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'moment' | 'list';
}

export function CreateCanvas({ isOpen, onClose, defaultTab = 'moment' }: CreateCanvasProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const { trackComponent, cleanupComponent } = useMemoryManagement();

  // Track component lifecycle for memory management
  useEffect(() => {
    if (isOpen) {
      trackComponent('CreateCanvas');
    }
    
    return () => {
      if (isOpen) {
        cleanupComponent('CreateCanvas');
      }
    };
  }, [isOpen, trackComponent, cleanupComponent]);

  // Handle successful creation
  const handleSuccess = useCallback(() => {
    onClose();
    setActiveTab('moment'); // Reset to default tab
  }, [onClose]);

  // Handle modal close with cleanup
  const handleClose = useCallback(() => {
    cleanupComponent('CreateCanvas');
    onClose();
  }, [onClose, cleanupComponent]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl w-full max-w-[95vw] h-[90vh] max-h-screen p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-white">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold">Create</h2>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tab Navigation */}
          <div className="bg-gray-50 px-6 py-3 border-b">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'moment' | 'list')}>
              <TabsList className="grid w-full grid-cols-2 bg-white">
                <TabsTrigger value="moment" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Food Moment
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  List Starter
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            <Tabs value={activeTab} className="h-full">
              <TabsContent value="moment" className="h-full p-6 m-0">
                <div className="h-full">
                  <FoodMomentForm onSuccess={handleSuccess} onCancel={handleClose} />
                </div>
              </TabsContent>
              
              <TabsContent value="list" className="h-full p-6 m-0">
                <div className="h-full">
                  <ListStarterForm onSuccess={handleSuccess} />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}