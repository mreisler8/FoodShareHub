import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  BadgeCheck,
  ThumbsUp, 
  Users, 
  Heart, 
  Star
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TrustIndicatorsProps {
  restaurantId?: number;
  circleId?: number;
  userId?: number;
  type?: 'restaurant' | 'circle' | 'user' | 'post';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

type TrustData = {
  trustScore: number;
  verifiedStatus: boolean;
  friendsCount: number;
  friendAvatars: Array<{id: number, name: string, avatar?: string}>;
  popularWithFriends: boolean;
  highlyRated: boolean;
};

// Mock data for demonstration
const mockTrustData: TrustData = {
  trustScore: 92,
  verifiedStatus: true,
  friendsCount: 5,
  friendAvatars: [
    { id: 1, name: 'Alex Chen', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80' },
    { id: 2, name: 'Sophia Williams', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80' },
    { id: 3, name: 'Michael Johnson', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80' },
    { id: 4, name: 'Emma Davis', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80' },
    { id: 5, name: 'James Wilson', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=150&q=80' }
  ],
  popularWithFriends: true,
  highlyRated: true
};

export function TrustIndicators({
  restaurantId,
  circleId,
  userId,
  type = 'restaurant',
  size = 'md',
  showLabel = true
}: TrustIndicatorsProps) {
  // In a real app, we would fetch trust data from an API based on the ID and type
  const [trustData, setTrustData] = useState<TrustData | null>(null);
  
  useEffect(() => {
    // Simulating API call with mock data
    setTrustData(mockTrustData);
  }, [restaurantId, circleId, userId, type]);
  
  if (!trustData) {
    return null;
  }
  
  const sizeClasses = {
    sm: {
      container: 'text-xs gap-1.5',
      icon: 'h-3 w-3',
      avatar: 'h-4 w-4',
      avatarGroup: 'flex -space-x-1'
    },
    md: {
      container: 'text-sm gap-2',
      icon: 'h-4 w-4',
      avatar: 'h-5 w-5',
      avatarGroup: 'flex -space-x-1.5'
    },
    lg: {
      container: 'text-base gap-2',
      icon: 'h-5 w-5',
      avatar: 'h-6 w-6',
      avatarGroup: 'flex -space-x-2'
    }
  };
  
  const classes = sizeClasses[size];
  
  return (
    <TooltipProvider>
      <div className={`flex flex-wrap ${classes.container}`}>
        {/* Verified Badge */}
        {trustData.verifiedStatus && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                <BadgeCheck className={`${classes.icon} fill-blue-200`} />
                {showLabel && <span>Verified</span>}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Verified by our community</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {/* Friends Trust Indicator */}
        {trustData.friendsCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary">
                <Users className={classes.icon} />
                {showLabel ? (
                  <span>Trusted by {trustData.friendsCount} {trustData.friendsCount === 1 ? 'friend' : 'friends'}</span>
                ) : (
                  <span>{trustData.friendsCount}</span>
                )}
                
                {/* Friend Avatars */}
                {showLabel && (
                  <div className={classes.avatarGroup}>
                    {trustData.friendAvatars.slice(0, 3).map((friend) => (
                      <Avatar key={friend.id} className={`${classes.avatar} border-2 border-background`}>
                        <AvatarImage src={friend.avatar} alt={friend.name} />
                        <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    ))}
                    {trustData.friendAvatars.length > 3 && (
                      <div className={`${classes.avatar} bg-primary/20 text-primary rounded-full flex items-center justify-center border-2 border-background`}>
                        +{trustData.friendAvatars.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Recommended by people you know</p>
              <div className="mt-2 space-y-1">
                {trustData.friendAvatars.map((friend) => (
                  <div key={friend.id} className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={friend.avatar} alt={friend.name} />
                      <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{friend.name}</span>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
        
        {/* Popular With Friends */}
        {trustData.popularWithFriends && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700">
                <Heart className={`${classes.icon} fill-red-200`} />
                {showLabel && <span>Popular with friends</span>}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Frequently visited by people in your network</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {/* Highly Rated */}
        {trustData.highlyRated && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                <Star className={`${classes.icon} fill-yellow-200`} />
                {showLabel && <span>Highly rated</span>}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Consistently rated 4.5+ stars</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}