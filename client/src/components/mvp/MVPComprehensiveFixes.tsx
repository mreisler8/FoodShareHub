import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Users, Clock, Shield, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface CircleScoreDisplayProps {
  score: number;
  restaurantName: string;
  contributorCount?: number;
  lastUpdated?: string;
  isOptedOut?: boolean;
  onOptOutToggle?: (optOut: boolean) => void;
}

export function CircleScoreEnhancement({ 
  score, 
  restaurantName, 
  contributorCount = 0, 
  lastUpdated,
  isOptedOut = false,
  onOptOutToggle 
}: CircleScoreDisplayProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);

  const scoreColor = score >= 7 ? 'bg-green-100 text-green-800' : 
                    score >= 5 ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800';

  const timeAgo = lastUpdated ? (() => {
    const minutes = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  })() : 'Recently';

  if (isOptedOut) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Shield className="h-4 w-4" />
        <span>Circle Score hidden (privacy setting)</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowPrivacySettings(true)}
          className="h-6 px-2 text-xs"
        >
          Change
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Badge className={scoreColor}>
            Circle Score: {score}
          </Badge>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowExplanation(true)}
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                aria-label="What's Circle Score?"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Click to learn about Circle Score</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{contributorCount} circle members</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Updated {timeAgo}</span>
          </div>
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowPrivacySettings(true)}
          className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          aria-label="Privacy settings"
        >
          <Settings className="h-4 w-4" />
        </Button>

        {/* Circle Score Explanation Modal */}
        <Dialog open={showExplanation} onOpenChange={setShowExplanation}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>What's Circle Score?</DialogTitle>
              <DialogDescription>
                Your personalized trust score for {restaurantName}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">How it works:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Based on ratings from your circles and followers</li>
                  <li>• Weighted by how much you trust each person</li>
                  <li>• Updated when new ratings are added</li>
                  <li>• Scale: 1-10 (higher = more recommended)</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>Current breakdown:</span>
                  <span>{contributorCount} contributors</span>
                </div>
                <div className="text-lg font-bold text-center">
                  {score}/10
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Your Circle Score is private and only visible to you. 
                Others see their own personalized scores.
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Privacy Settings Modal */}
        <Dialog open={showPrivacySettings} onOpenChange={setShowPrivacySettings}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Circle Score Privacy</DialogTitle>
              <DialogDescription>
                Control how your ratings contribute to others' Circle Scores
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="opt-out-toggle">Hide my contributions</Label>
                  <p className="text-xs text-gray-500">
                    Your ratings won't influence other people's Circle Scores
                  </p>
                </div>
                <Switch
                  id="opt-out-toggle"
                  checked={isOptedOut}
                  onCheckedChange={onOptOutToggle}
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
                <strong>Note:</strong> This only affects future Circle Score calculations. 
                You'll still see Circle Scores from others who haven't opted out.
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// Social proof component for ratings
interface SocialProofBadgeProps {
  userPosition: number;
  totalRaters: number;
  mutualCount?: number;
}

export function SocialProofBadge({ userPosition, totalRaters, mutualCount }: SocialProofBadgeProps) {
  const getMessage = () => {
    if (mutualCount && mutualCount > 0) {
      return `You're the ${userPosition}${getOrdinalSuffix(userPosition)} person in your circles to rate this`;
    }
    return `You're the ${userPosition}${getOrdinalSuffix(userPosition)} to rate this restaurant`;
  };

  return (
    <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
      {getMessage()}
    </div>
  );
}

function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}