import { Users, UserCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';

interface ProfileStatsProps {
  userId: number;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
}

interface UserStats {
  followers: number;
  following: number;
  isFollowing: boolean;
}

export function ProfileStats({ userId, onFollowersClick, onFollowingClick }: ProfileStatsProps) {
  const { data: stats, isLoading } = useQuery<UserStats>({
    queryKey: [`/api/users/${userId}/stats`],
    queryFn: () => apiRequest(`/api/users/${userId}/stats`),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-6">
        <div className="animate-pulse">
          <div className="h-4 w-16 bg-gray-200 rounded mb-1"></div>
          <div className="h-3 w-12 bg-gray-200 rounded"></div>
        </div>
        <div className="animate-pulse">
          <div className="h-4 w-16 bg-gray-200 rounded mb-1"></div>
          <div className="h-3 w-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="flex items-center gap-6">
      <button
        onClick={onFollowersClick}
        className="flex items-center gap-2 text-sm hover:text-blue-600 transition-colors"
      >
        <Users className="h-4 w-4" />
        <div className="text-left">
          <div className="font-medium">{stats.followers}</div>
          <div className="text-gray-500">Followers</div>
        </div>
      </button>
      
      <button
        onClick={onFollowingClick}
        className="flex items-center gap-2 text-sm hover:text-blue-600 transition-colors"
      >
        <UserCheck className="h-4 w-4" />
        <div className="text-left">
          <div className="font-medium">{stats.following}</div>
          <div className="text-gray-500">Following</div>
        </div>
      </button>
    </div>
  );
}