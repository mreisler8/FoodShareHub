import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users } from "lucide-react";
import SocialProofAvatars from "./SocialProofAvatars";

interface CircleScoreCardProps {
  circleScore: any;
  isLoading: boolean;
}

export function CircleScoreCard({ circleScore, isLoading }: CircleScoreCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="rounded-xl shadow-sm bg-white p-4 space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
        </div>
      </div>
    );
  }

  if (!circleScore || circleScore.totalContributors === 0) {
    return (
      <div className="rounded-xl shadow-sm bg-white p-4 space-y-4">
        <div className="text-center py-6">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Circle Score Yet</h3>
          <p className="text-sm text-muted-foreground">
            Be the first in your network to rate this restaurant. Use the "Quick Rate" button below to share your experience.
          </p>
        </div>
      </div>
    );
  }

  const scoreColor = circleScore.averageScore >= 7.0 ? "bg-green-100 text-green-800" : 
                    circleScore.averageScore >= 5.0 ? "bg-yellow-100 text-yellow-800" : 
                    "bg-red-100 text-red-800";

  return (
    <div className="rounded-xl shadow-sm bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Badge className={`${scoreColor} text-lg font-bold px-3 py-1`}>
              {circleScore.averageScore?.toFixed(1) || 'N/A'}/10.0
            </Badge>
            <div>
              <p className="text-sm font-medium">Circle Score</p>
              <p className="text-sm text-muted-foreground">
                Rated by {circleScore.totalContributors} people you follow
              </p>
            </div>
          </div>
        </div>
        
        <SocialProofAvatars contributors={circleScore.contributors} limit={3} />
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full text-sm">
            See who rated this →
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Circle Score Breakdown</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {circleScore.contributors?.map((contributor: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-xs font-medium">
                      {contributor.name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{contributor.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {contributor.relationship}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">
                  ⭐ {contributor.rating}
                </Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}