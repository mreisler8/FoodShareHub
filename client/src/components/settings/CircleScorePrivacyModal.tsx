import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Shield, Info, Users, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface CircleScorePrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PrivacySettings {
  circleScoreOptOut: boolean;
}

export const CircleScorePrivacyModal: React.FC<CircleScorePrivacyModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [localSettings, setLocalSettings] = useState<PrivacySettings>({
    circleScoreOptOut: false,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current privacy settings
  const { data: privacySettings, isLoading } = useQuery({
    queryKey: ['/api/user/privacy'],
    enabled: isOpen,
  });

  // Update privacy settings mutation
  const updatePrivacyMutation = useMutation({
    mutationFn: async (settings: PrivacySettings) => {
      return apiRequest('/api/user/privacy', {
        method: 'PUT',
        body: JSON.stringify(settings),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/privacy'] });
      toast({
        title: 'Privacy settings updated',
        description: 'Your Circle Score privacy preferences have been saved.',
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update privacy settings',
        variant: 'destructive',
      });
    },
  });

  // Sync local state with fetched data
  useEffect(() => {
    if (privacySettings && typeof privacySettings === 'object') {
      setLocalSettings({
        circleScoreOptOut: (privacySettings as any).circleScoreOptOut ?? false,
      });
    }
  }, [privacySettings]);

  const handleSave = () => {
    updatePrivacyMutation.mutate(localSettings);
  };

  const handleOptOutChange = (checked: boolean) => {
    setLocalSettings(prev => ({
      ...prev,
      circleScoreOptOut: checked,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" aria-labelledby="privacy-modal-title">
        <DialogHeader>
          <DialogTitle id="privacy-modal-title" className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Circle Score Privacy
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info Section */}
          <div className="flex gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">What is Circle Score?</p>
              <p className="text-xs text-blue-700">
                Your personalized trust rating based on your social network and rating history.
                Higher scores indicate more trusted recommendations.
              </p>
            </div>
          </div>

          <Separator />

          {/* Privacy Controls */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Privacy Controls
            </h3>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1 space-y-1">
                <Label htmlFor="circle-score-opt-out" className="text-sm font-medium">
                  Hide Circle Score from others
                </Label>
                <p className="text-xs text-gray-600">
                  Other users won't see your Circle Score on ratings and recommendations
                </p>
              </div>
              <div className="flex items-center gap-2">
                {localSettings.circleScoreOptOut ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
                <Switch
                  id="circle-score-opt-out"
                  checked={localSettings.circleScoreOptOut}
                  onCheckedChange={handleOptOutChange}
                  disabled={isLoading || updatePrivacyMutation.isPending}
                  aria-label="Hide Circle Score from other users"
                />
              </div>
            </div>

            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border">
              <strong>Note:</strong> This only affects visibility to other users. Your Circle Score 
              will still be calculated and used for personalized recommendations.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={updatePrivacyMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={updatePrivacyMutation.isPending || isLoading}
            >
              {updatePrivacyMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};