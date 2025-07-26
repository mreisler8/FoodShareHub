import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { Flame, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecCreditBadgeProps {
  entityType: 'list' | 'rating' | 'post';
  entityId: number;
  variant?: 'default' | 'compact';
  className?: string;
}

interface AcceptorData {
  id: number;
  name: string;
  username: string;
  profilePicture?: string;
  acceptedAt: string;
  ratingValue?: number;
}

interface StatsData {
  stats: {
    totalAcceptances: number;
    uniqueUsers: number;
    averageRating?: number;
  };
  recentAcceptors: AcceptorData[];
}

export function RecCreditBadge({ 
  entityType, 
  entityId, 
  variant = 'default',
  className 
}: RecCreditBadgeProps) {
  const [showModal, setShowModal] = useState(false);

  const { data: statsData, isLoading } = useQuery<StatsData>({
    queryKey: ['/api/recommendations/stats', entityType, entityId.toString()],
    enabled: !!entityType && !!entityId,
  });

  // Don't render if no acceptances or still loading
  if (isLoading || !statsData || statsData.stats.totalAcceptances === 0) {
    return null;
  }

  const { totalAcceptances, uniqueUsers } = statsData.stats;
  const { recentAcceptors } = statsData;

  const formatAcceptanceCount = (count: number) => {
    if (count === 1) return "1 person";
    if (count < 1000) return `${count} people`;
    if (count < 1000000) return `${(count / 1000).toFixed(1)}k people`;
    return `${(count / 1000000).toFixed(1)}m people`;
  };

  const BadgeContent = () => {
    if (variant === 'compact') {
      return (
        <Badge 
          variant="secondary" 
          className={cn(
            "gap-1 bg-orange-50 text-orange-700 hover:bg-orange-100 cursor-pointer transition-colors",
            className
          )}
          onClick={() => setShowModal(true)}
        >
          <Flame className="h-3 w-3" />
          {totalAcceptances}
        </Badge>
      );
    }

    return (
      <Badge 
        variant="secondary" 
        className={cn(
          "gap-1 bg-orange-50 text-orange-700 hover:bg-orange-100 cursor-pointer transition-all duration-200 hover:scale-105",
          className
        )}
        onClick={() => setShowModal(true)}
      >
        <Flame className="h-3 w-3" />
        Tried by {formatAcceptanceCount(uniqueUsers)}
      </Badge>
    );
  };

  const ModalContent = () => (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-600" />
            People who tried this
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stats Summary */}
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-orange-600">{totalAcceptances}</div>
                <div className="text-sm text-orange-700">Total tries</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{uniqueUsers}</div>
                <div className="text-sm text-orange-700">Unique people</div>
              </div>
            </div>
          </div>

          {/* Recent Acceptors List */}
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {recentAcceptors.length > 0 ? (
              recentAcceptors.map((acceptor) => (
                <div key={acceptor.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={acceptor.profilePicture} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {acceptor.name?.[0] || acceptor.username?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {acceptor.name || acceptor.username}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(acceptor.acceptedAt).toLocaleDateString()}
                    </p>
                  </div>

                  {acceptor.ratingValue && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-600">Rated:</span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={cn(
                              "text-xs",
                              i < acceptor.ratingValue! ? "text-yellow-400" : "text-gray-300"
                            )}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No one has tried this yet</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <BadgeContent />
      <ModalContent />
    </>
  );
}