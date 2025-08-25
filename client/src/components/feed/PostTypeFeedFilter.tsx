import { PostType } from '../post/PostTypeSelector';
import { PostTypeIcon, getPostTypeLabel } from '../post/PostTypeIcon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface PostTypeFeedFilterProps {
  selectedTypes: PostType[];
  onTypesChange: (types: PostType[]) => void;
  postCounts?: Record<PostType, number>;
}

export function PostTypeFeedFilter({ selectedTypes, onTypesChange, postCounts }: PostTypeFeedFilterProps) {
  const postTypes: PostType[] = ['list', 'moment', 'dish'];

  const toggleType = (type: PostType) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter(t => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  const selectAll = () => {
    onTypesChange(postTypes);
  };

  const clearAll = () => {
    onTypesChange([]);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Filter by Post Type</h3>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={selectAll}
            disabled={selectedTypes.length === postTypes.length}
          >
            Select All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            disabled={selectedTypes.length === 0}
          >
            Clear All
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {postTypes.map((type) => {
          const isSelected = selectedTypes.includes(type);
          const count = postCounts?.[type] || 0;
          
          return (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-md border transition-colors
                ${isSelected 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'bg-background hover:bg-muted border-border'
                }
              `}
            >
              <PostTypeIcon type={type} size="sm" />
              <span className="text-sm font-medium">
                {getPostTypeLabel(type)}
              </span>
              {count > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {selectedTypes.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            Showing {selectedTypes.length} of {postTypes.length} post types
          </p>
        </div>
      )}
    </Card>
  );
}