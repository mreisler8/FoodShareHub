import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListChecks, Crown, Medal, Award } from "lucide-react";

interface ListMention {
  id: number;
  name: string;
  description: string;
  owner: {
    id: number;
    name: string;
    username: string;
  };
  itemCount: number;
  ranking?: number;
  tags?: string[];
  isPublic: boolean;
}

interface ListMentionsCardProps {
  lists: ListMention[];
  onViewList?: (listId: number) => void;
}

export function ListMentionsCard({ lists, onViewList }: ListMentionsCardProps) {
  if (!lists || lists.length === 0) {
    return (
      <div className="rounded-xl shadow-sm bg-white border p-6" role="region" aria-label="List mentions">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <ListChecks className="h-8 w-8 text-gray-400" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Not Listed Yet</h3>
          <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
            No one in your Circle has added this restaurant to a list yet. Be the first to curate!
          </p>
          <Button size="sm" variant="outline" className="gap-2">
            <ListChecks className="h-4 w-4" />
            Add to List
          </Button>
        </div>
      </div>
    );
  }

  const getRankingIcon = (ranking?: number) => {
    if (!ranking) return null;
    switch (ranking) {
      case 1: return <Crown className="h-4 w-4 text-yellow-500" />;
      case 2: return <Medal className="h-4 w-4 text-gray-400" />;
      case 3: return <Award className="h-4 w-4 text-amber-600" />;
      default: return null;
    }
  };

  const getRankingBadge = (ranking?: number) => {
    if (!ranking || ranking > 3) return null;
    return (
      <Badge 
        variant="outline" 
        className={`text-xs ${
          ranking === 1 ? 'border-yellow-500 text-yellow-700' :
          ranking === 2 ? 'border-gray-400 text-gray-700' :
          'border-amber-600 text-amber-700'
        }`}
      >
        #{ranking}
      </Badge>
    );
  };

  return (
    <div className="rounded-xl shadow-sm bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Featured in Lists</h3>
        <Badge variant="secondary">{lists.length}</Badge>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-2" style={{ width: 'max-content' }}>
          {lists.map((list) => (
            <div
              key={list.id}
              className="flex-none w-72 p-4 rounded-lg border bg-white hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onViewList?.(list.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getRankingIcon(list.ranking)}
                  <h4 className="font-medium text-sm line-clamp-1">{list.name}</h4>
                </div>
                <div className="flex items-center gap-1">
                  {getRankingBadge(list.ranking)}
                  {!list.isPublic && (
                    <Badge variant="outline" className="text-xs">
                      Private
                    </Badge>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                {list.description}
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>by {list.owner.name}</span>
                  <span>{list.itemCount} places</span>
                </div>

                {list.tags && list.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {list.tags.slice(0, 2).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs px-2 py-0">
                        {tag}
                      </Badge>
                    ))}
                    {list.tags.length > 2 && (
                      <Badge variant="secondary" className="text-xs px-2 py-0">
                        +{list.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}