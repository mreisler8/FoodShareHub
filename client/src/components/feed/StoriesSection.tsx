import React from 'react';
import { Plus, Play } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import './StoriesSection.css';

interface Story {
  id: string;
  user: {
    name: string;
    username: string;
    avatar?: string;
  };
  preview?: string;
  isVideo?: boolean;
  hasViewed?: boolean;
}

interface StoriesSectionProps {
  stories?: Story[];
  onCreateStory?: () => void;
  onViewStory?: (storyId: string) => void;
}

const mockStories: Story[] = [
  {
    id: '1',
    user: { name: 'Your Story', username: 'you', avatar: '' },
    preview: '',
  },
  {
    id: '2',
    user: { name: 'Casey P', username: 'caseyp', avatar: '' },
    preview: '/api/placeholder/60/60',
    hasViewed: false,
  },
  {
    id: '3',
    user: { name: 'Jason Bloom', username: 'jbloom', avatar: '' },
    preview: '/api/placeholder/60/60',
    isVideo: true,
    hasViewed: true,
  },
  {
    id: '4',
    user: { name: 'Rachael R', username: 'rachaelr', avatar: '' },
    preview: '/api/placeholder/60/60',
    hasViewed: false,
  },
];

export function StoriesSection({ 
  stories = mockStories, 
  onCreateStory, 
  onViewStory 
}: StoriesSectionProps) {
  return (
    <div className="stories-section">
      <div className="stories-container">
        {stories.map((story, index) => (
          <div
            key={story.id}
            className={`story-item ${index === 0 ? 'story-item--create' : ''}`}
            onClick={() => {
              if (index === 0) {
                onCreateStory?.();
              } else {
                onViewStory?.(story.id);
              }
            }}
          >
            <div className={`story-avatar-container ${story.hasViewed ? 'viewed' : 'unviewed'}`}>
              <Avatar className="story-avatar">
                <AvatarImage src={story.user.avatar || story.preview} />
                <AvatarFallback className="story-avatar-fallback">
                  {story.user.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              {index === 0 && (
                <div className="story-create-icon">
                  <Plus size={12} />
                </div>
              )}
              
              {story.isVideo && (
                <div className="story-video-indicator">
                  <Play size={8} />
                </div>
              )}
            </div>
            
            <span className="story-username">
              {index === 0 ? 'Your Story' : story.user.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}