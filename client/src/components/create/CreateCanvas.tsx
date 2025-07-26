import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, ImageIcon, ListIcon, MapPinIcon, UsersIcon } from 'lucide-react';
import { FoodMomentForm } from './FoodMomentForm';
import { ListStarterForm } from './ListStarterForm';
import { useMemoryManagement } from '@/utils/memoryManagement';
import { useSmartPollingContext } from '@/components/optimized/SmartPollingProvider';

interface CreateCanvasProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'moment' | 'list';
}

export function CreateCanvas({ isOpen, onClose, initialTab = 'moment' }: CreateCanvasProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const memoryManager = useMemoryManagement('CreateCanvas');
  const { memoryManager: globalMemoryManager } = useSmartPollingContext();

  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      memoryManager.addEventListenerSafe(document, 'keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose, memoryManager]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleSuccess = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-full h-full w-full p-0 gap-0 bg-white dark:bg-gray-900 border-0 rounded-none sm:max-w-4xl sm:h-[90vh] sm:rounded-lg sm:border"
        aria-labelledby="create-canvas-title"
        aria-describedby="create-canvas-description"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <h2 id="create-canvas-title" className="text-xl font-semibold text-gray-900 dark:text-white">
              Create New Content
            </h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close create canvas"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tab Navigation */}
        <Tabs 
          value={activeTab} 
          onValueChange={handleTabChange} 
          className="flex flex-col h-full"
        >
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-4 bg-gray-100 dark:bg-gray-800">
            <TabsTrigger 
              value="moment" 
              className="flex items-center space-x-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
            >
              <ImageIcon className="h-4 w-4" />
              <span>Food Moment</span>
            </TabsTrigger>
            <TabsTrigger 
              value="list" 
              className="flex items-center space-x-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
            >
              <ListIcon className="h-4 w-4" />
              <span>List Starter</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            <TabsContent value="moment" className="h-full m-0 p-4">
              <div className="h-full overflow-y-auto">
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start space-x-3">
                    <ImageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-blue-900 dark:text-blue-100">Share a Food Moment</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Capture a quick moment from your dining experience with a photo and caption.
                      </p>
                    </div>
                  </div>
                </div>
                <FoodMomentForm onSuccess={handleSuccess} onCancel={onClose} />
              </div>
            </TabsContent>

            <TabsContent value="list" className="h-full m-0 p-4">
              <div className="h-full overflow-y-auto">
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start space-x-3">
                    <ListIcon className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-green-900 dark:text-green-100">Start a New List</h3>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        Create a curated collection of restaurants for any occasion or theme.
                      </p>
                    </div>
                  </div>
                </div>
                <ListStarterForm onSuccess={handleSuccess} onCancel={onClose} />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Hidden description for screen readers */}
        <div id="create-canvas-description" className="sr-only">
          Create new content for your Circles profile. Choose between sharing a food moment with photos and captions, or starting a new restaurant list.
        </div>
      </DialogContent>
    </Dialog>
  );
}