
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Globe, 
  Users, 
  User, 
  Lock,
  Save,
  Send
} from 'lucide-react';

interface Circle {
  id: number;
  name: string;
  memberCount: number;
  isPrivate: boolean;
}

interface ShareDestinationPickerProps {
  circles: Circle[];
  onShareDestinationChange: (destination: {
    visibility: 'public' | 'circles' | 'private';
    selectedCircles: number[];
    saveAsDraft: boolean;
  }) => void;
  defaultVisibility?: 'public' | 'circles' | 'private';
}

export function ShareDestinationPicker({
  circles,
  onShareDestinationChange,
  defaultVisibility = 'public'
}: ShareDestinationPickerProps) {
  const [visibility, setVisibility] = useState<'public' | 'circles' | 'private'>(defaultVisibility);
  const [selectedCircles, setSelectedCircles] = useState<number[]>([]);
  const [saveAsDraft, setSaveAsDraft] = useState(false);

  const handleVisibilityChange = (newVisibility: 'public' | 'circles' | 'private') => {
    setVisibility(newVisibility);
    if (newVisibility !== 'circles') {
      setSelectedCircles([]);
    }
    updateDestination(newVisibility, newVisibility === 'circles' ? selectedCircles : [], saveAsDraft);
  };

  const handleCircleToggle = (circleId: number) => {
    const newSelectedCircles = selectedCircles.includes(circleId)
      ? selectedCircles.filter(id => id !== circleId)
      : [...selectedCircles, circleId];
    
    setSelectedCircles(newSelectedCircles);
    updateDestination(visibility, newSelectedCircles, saveAsDraft);
  };

  const handleDraftToggle = (isDraft: boolean) => {
    setSaveAsDraft(isDraft);
    updateDestination(visibility, selectedCircles, isDraft);
  };

  const updateDestination = (vis: string, circles: number[], draft: boolean) => {
    onShareDestinationChange({
      visibility: vis as 'public' | 'circles' | 'private',
      selectedCircles: circles,
      saveAsDraft: draft
    });
  };

  const visibilityOptions = [
    {
      id: 'public',
      title: 'Public Feed',
      description: 'Anyone can see this post',
      icon: <Globe className="w-5 h-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200'
    },
    {
      id: 'circles',
      title: 'Share with Circles',
      description: 'Only selected circle members can see',
      icon: <Users className="w-5 h-5" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200'
    },
    {
      id: 'private',
      title: 'Profile Only',
      description: 'Only visible on your profile',
      icon: <User className="w-5 h-5" />,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 border-gray-200'
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Where do you want to share this?</h3>
        <p className="text-sm text-gray-600">Choose who can see your post</p>
      </div>

      {/* Visibility Options */}
      <div className="space-y-3">
        {visibilityOptions.map((option) => (
          <Card
            key={option.id}
            className={`cursor-pointer transition-all duration-200 border-2 ${
              visibility === option.id
                ? `${option.bgColor} border-current shadow-md`
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleVisibilityChange(option.id as any)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`${option.color}`}>
                  {option.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{option.title}</h4>
                  <p className="text-sm text-gray-600">{option.description}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${
                  visibility === option.id
                    ? 'bg-primary border-primary'
                    : 'border-gray-300'
                }`}>
                  {visibility === option.id && (
                    <div className="w-full h-full rounded-full bg-white scale-50" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Circle Selection */}
      {visibility === 'circles' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Circles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {circles.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>You haven't joined any circles yet</p>
                <Button variant="link" size="sm">
                  Discover Circles
                </Button>
              </div>
            ) : (
              circles.map((circle) => (
                <div
                  key={circle.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedCircles.includes(circle.id)
                      ? 'bg-primary/5 border-primary'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => handleCircleToggle(circle.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {circle.name[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{circle.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {circle.memberCount} members
                        </span>
                        {circle.isPrivate && (
                          <Badge variant="outline" className="text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            Private
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 ${
                    selectedCircles.includes(circle.id)
                      ? 'bg-primary border-primary'
                      : 'border-gray-300'
                  }`}>
                    {selectedCircles.includes(circle.id) && (
                      <div className="w-full h-full rounded bg-white scale-50" />
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Save as Draft Option */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Save className="w-5 h-5 text-gray-600" />
              <div>
                <Label htmlFor="save-draft" className="font-medium">
                  Save as Draft
                </Label>
                <p className="text-sm text-gray-600">
                  Save your post to finish later
                </p>
              </div>
            </div>
            <Switch
              id="save-draft"
              checked={saveAsDraft}
              onCheckedChange={handleDraftToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <div className="pt-2">
        <Button className="w-full" size="lg">
          <Send className="w-4 h-4 mr-2" />
          {saveAsDraft ? 'Save Draft' : 'Publish Post'}
        </Button>
      </div>
    </div>
  );
}
