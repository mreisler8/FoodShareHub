import { Badge } from "@/components/ui/badge";
import { Users, Globe, Lock, User } from "lucide-react";

interface CircleMetadataProps {
  name: string;
  description?: string;
  isPrivate: boolean;
  memberCount: number;
  creatorUsername: string;
}

export function CircleMetadata({ 
  name, 
  description, 
  isPrivate, 
  memberCount, 
  creatorUsername 
}: CircleMetadataProps) {
  return (
    <div className="space-y-3 border-b pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{name}</h1>
        <Badge 
          variant={isPrivate ? "secondary" : "outline"} 
          className={isPrivate ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}
        >
          {isPrivate ? (
            <>
              <Lock className="h-3 w-3 mr-1" />
              Private
            </>
          ) : (
            <>
              <Globe className="h-3 w-3 mr-1" />
              Public
            </>
          )}
        </Badge>
      </div>

      {description && (
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      )}

      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
        <div className="flex items-center">
          <Users className="h-4 w-4 mr-1" />
          <span className="font-medium">{memberCount}</span>
          <span className="ml-1">{memberCount === 1 ? "member" : "members"}</span>
        </div>

        <div className="flex items-center">
          <User className="h-4 w-4 mr-1" />
          <span>Created by</span>
          <span className="font-medium ml-1">@{creatorUsername}</span>
        </div>
      </div>
    </div>
  );
}