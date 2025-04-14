import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { StoryGroup } from "@/lib/types";

export function StoriesCarousel() {
  const { data: storyGroups, isLoading } = useQuery<StoryGroup[]>({
    queryKey: ["/api/stories"],
  });

  return (
    <div className="mb-8 overflow-x-auto">
      <div className="flex space-x-4 pb-2">
        {/* Add Story Button */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-primary p-0.5">
              <div className="bg-secondary w-full h-full rounded-full flex items-center justify-center text-white">
                <Plus />
              </div>
            </div>
          </div>
          <span className="text-xs mt-1 text-neutral-700">Add Story</span>
        </div>
        
        {/* Loading placeholder for stories */}
        {isLoading && 
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border-2 border-primary p-0.5 animate-pulse bg-neutral-200"></div>
              <div className="w-8 h-3 bg-neutral-200 rounded mt-1 animate-pulse"></div>
            </div>
          ))
        }
        
        {/* Story Items */}
        {storyGroups?.map((storyGroup) => (
          <div key={storyGroup.userId} className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border-2 border-primary p-0.5">
              <Avatar className="w-full h-full">
                <AvatarImage src={storyGroup.profilePicture} alt={storyGroup.userName} className="w-full h-full object-cover rounded-full" />
                <AvatarFallback className="rounded-full">{storyGroup.userName.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
            <span className="text-xs mt-1 text-neutral-700">{storyGroup.userName.split(' ')[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
