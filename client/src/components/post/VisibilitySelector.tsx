import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Globe, 
  Users, 
  Lock, 
  Eye, 
  Shield, 
  UserCheck, 
  Info,
  AlertCircle,
  TrendingUp,
  Target
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';

export type VisibilityOption = 'circle-only' | 'followers' | 'public';

interface VisibilitySettings {
  visibility: VisibilityOption;
  selectedCircles: string[];
  allowSharing: boolean;
  showInPublicFeed: boolean;
}

interface VisibilityAudiencePreview {
  estimatedReach: number;
  audienceBreakdown: {
    circles: number;
    followers: number;
    public: number;
  };
  privacyLevel: 'high' | 'medium' | 'low';
}

interface VisibilitySelectorProps {
  settings: VisibilitySettings;
  onSettingsChange: (settings: VisibilitySettings) => void;
  contentType: 'post' | 'list' | 'moment';
  className?: string;
}

export function VisibilitySelector({
  settings,
  onSettingsChange,
  contentType,
  className
}: VisibilitySelectorProps) {
  const { user } = useAuth();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fetch user's circles for selection
  const { data: userCircles } = useQuery({
    queryKey: ['/api/circles/my-circles'],
    queryFn: async () => {
      const response = await fetch('/api/circles/my-circles');
      if (!response.ok) throw new Error('Failed to fetch circles');
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch audience preview based on current settings
  const { data: audiencePreview } = useQuery({
    queryKey: ['/api/content/audience-preview', settings],
    queryFn: async () => {
      const response = await fetch('/api/content/audience-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!response.ok) throw new Error('Failed to fetch audience preview');
      return response.json();
    },
    enabled: !!user,
    staleTime: 60000, // 1 minute
  });

  const visibilityOptions = [
    {
      value: 'circle-only' as const,
      label: 'Circle Only',
      icon: Users,
      description: 'Only members of your selected circles can see this',
      privacy: 'high' as const,
      recommendedFor: ['personal thoughts', 'close friend recommendations']
    },
    {
      value: 'followers' as const,
      label: 'Followers',
      icon: UserCheck,
      description: 'All your followers and circle members can see this',
      privacy: 'medium' as const,
      recommendedFor: ['restaurant discoveries', 'food experiences']
    },
    {
      value: 'public' as const,
      label: 'Public',
      icon: Globe,
      description: 'Anyone can discover this content in public feeds',
      privacy: 'low' as const,
      recommendedFor: ['helpful reviews', 'trending spots', 'expert recommendations']
    }
  ];

  const updateVisibility = (visibility: VisibilityOption) => {
    onSettingsChange({
      ...settings,
      visibility,
      // Auto-enable public feed for public content
      showInPublicFeed: visibility === 'public' ? true : settings.showInPublicFeed
    });
  };

  const toggleCircle = (circleId: string) => {
    const newSelectedCircles = settings.selectedCircles.includes(circleId)
      ? settings.selectedCircles.filter(id => id !== circleId)
      : [...settings.selectedCircles, circleId];
    
    onSettingsChange({
      ...settings,
      selectedCircles: newSelectedCircles
    });
  };

  const getContentTypeGuidance = () => {
    switch (contentType) {
      case 'moment':
        return {
          title: 'Food Moment Sharing',
          suggestion: 'Food moments often perform best when shared with followers - they love seeing your dining experiences!',
          defaultVisibility: 'followers' as const
        };
      case 'list':
        return {
          title: 'Restaurant List Sharing',
          suggestion: 'Lists with public visibility help other food lovers discover great spots and build your reputation as a trusted curator.',
          defaultVisibility: 'public' as const
        };
      case 'post':
        return {
          title: 'Post Visibility',
          suggestion: 'Consider your audience - personal experiences work well for circles, while helpful reviews shine publicly.',
          defaultVisibility: 'followers' as const
        };
    }
  };

  const guidance = getContentTypeGuidance();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {guidance.title}
        </CardTitle>
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <p className="text-sm text-blue-700">{guidance.suggestion}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Visibility Options */}
        <div className="space-y-3">
          <span className="font-medium">Who can see this?</span>
          <div className="grid gap-3">
            {visibilityOptions.map(option => (
              <div
                key={option.value}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  settings.visibility === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => updateVisibility(option.value)}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    settings.visibility === option.value
                      ? 'bg-blue-100'
                      : 'bg-gray-100'
                  }`}>
                    <option.icon className={`h-4 w-4 ${
                      settings.visibility === option.value
                        ? 'text-blue-600'
                        : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{option.label}</span>
                      <Badge 
                        variant={option.privacy === 'high' ? 'default' : option.privacy === 'medium' ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {option.privacy} privacy
                      </Badge>
                      {option.value === guidance.defaultVisibility && (
                        <Badge variant="outline" className="text-xs">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{option.description}</p>
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Great for:</span> {option.recommendedFor.join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Circle Selection (when circle-only is selected) */}
        {settings.visibility === 'circle-only' && userCircles && (
          <div className="space-y-3">
            <span className="font-medium">Select Circles ({settings.selectedCircles.length} selected)</span>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {userCircles.map((circle: any) => (
                <div key={circle.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`circle-${circle.id}`}
                    checked={settings.selectedCircles.includes(circle.id.toString())}
                    onCheckedChange={() => toggleCircle(circle.id.toString())}
                  />
                  <label 
                    htmlFor={`circle-${circle.id}`}
                    className="text-sm cursor-pointer hover:text-blue-600 flex-1"
                  >
                    <div className="flex items-center gap-2">
                      <span>{circle.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {circle.memberCount || 1} members
                      </Badge>
                    </div>
                    {circle.description && (
                      <p className="text-xs text-gray-500 mt-1">{circle.description}</p>
                    )}
                  </label>
                </div>
              ))}
            </div>
            {settings.selectedCircles.length === 0 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-700">Select at least one circle to share with</p>
              </div>
            )}
          </div>
        )}

        {/* Audience Preview */}
        {audiencePreview && (
          <div className="space-y-3">
            <span className="font-medium">Audience Preview</span>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">
                  Estimated reach: ~{audiencePreview.estimatedReach} people
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-600">
                    {audiencePreview.audienceBreakdown.circles}
                  </div>
                  <div className="text-xs text-gray-600">Circle Members</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {audiencePreview.audienceBreakdown.followers}
                  </div>
                  <div className="text-xs text-gray-600">Followers</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-600">
                    {audiencePreview.audienceBreakdown.public}
                  </div>
                  <div className="text-xs text-gray-600">Public Discovery</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Settings */}
        <div className="space-y-3">
          <Button
            variant="ghost"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full justify-between"
          >
            <span>Advanced Settings</span>
            <span>{showAdvanced ? '−' : '+'}</span>
          </Button>

          {showAdvanced && (
            <div className="space-y-4 border-t pt-4">
              {/* Allow Sharing Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Allow Sharing</label>
                  <p className="text-xs text-gray-600">
                    Let others share your content with their networks
                  </p>
                </div>
                <Checkbox
                  checked={settings.allowSharing}
                  onCheckedChange={(checked) => 
                    onSettingsChange({ ...settings, allowSharing: !!checked })
                  }
                />
              </div>

              {/* Public Feed Inclusion (for public content) */}
              {settings.visibility === 'public' && (
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Show in Public Feeds</label>
                    <p className="text-xs text-gray-600">
                      Include in Discover and trending feeds for maximum reach
                    </p>
                  </div>
                  <Checkbox
                    checked={settings.showInPublicFeed}
                    onCheckedChange={(checked) => 
                      onSettingsChange({ ...settings, showInPublicFeed: !!checked })
                    }
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content Performance Insights */}
        {settings.visibility === 'public' && contentType === 'list' && (
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Target className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-900 mb-1">Great choice for discovery!</p>
                <p className="text-green-700 text-xs">
                  Public restaurant lists get 3x more saves and help establish you as a trusted food curator in your area.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}