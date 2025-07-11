import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield, Lock, Eye, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface PrivacySettings {
  requireFollowApproval: boolean;
  privateProfile: boolean;
  showFollowersCount: boolean;
  showFollowingCount: boolean;
}

export function PrivacySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current privacy settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/me/privacy'],
  });

  // Update privacy settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<PrivacySettings>) => {
      return apiRequest('/api/me/privacy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Privacy settings updated',
        description: 'Your privacy preferences have been saved.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/me/privacy'] });
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating settings',
        description: error.message || 'Failed to update privacy settings',
        variant: 'destructive',
      });
    },
  });

  const handleToggle = (setting: keyof PrivacySettings, value: boolean) => {
    updateSettingsMutation.mutate({ [setting]: value });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Privacy Settings
        </CardTitle>
        <CardDescription>
          Control who can follow you and see your activity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="follow-approval" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Require Follow Approval
            </Label>
            <p className="text-sm text-gray-500">
              People must request to follow you
            </p>
          </div>
          <Switch
            id="follow-approval"
            checked={settings?.requireFollowApproval || false}
            onCheckedChange={(checked) => handleToggle('requireFollowApproval', checked)}
            disabled={updateSettingsMutation.isPending}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="private-profile" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Private Profile
            </Label>
            <p className="text-sm text-gray-500">
              Only followers can see your posts and lists
            </p>
          </div>
          <Switch
            id="private-profile"
            checked={settings?.privateProfile || false}
            onCheckedChange={(checked) => handleToggle('privateProfile', checked)}
            disabled={updateSettingsMutation.isPending}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-followers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Show Followers Count
            </Label>
            <p className="text-sm text-gray-500">
              Display your follower count publicly
            </p>
          </div>
          <Switch
            id="show-followers"
            checked={settings?.showFollowersCount ?? true}
            onCheckedChange={(checked) => handleToggle('showFollowersCount', checked)}
            disabled={updateSettingsMutation.isPending}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="show-following" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Show Following Count
            </Label>
            <p className="text-sm text-gray-500">
              Display who you follow publicly
            </p>
          </div>
          <Switch
            id="show-following"
            checked={settings?.showFollowingCount ?? true}
            onCheckedChange={(checked) => handleToggle('showFollowingCount', checked)}
            disabled={updateSettingsMutation.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}