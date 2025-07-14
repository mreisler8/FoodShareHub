
import { SaveListButton } from "./SaveListButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ListItem {
  name: string;
  notes?: string;
  tags?: string[];
  city?: string;
  mediaUrl?: string;
  rank?: number;
}

interface ListDetailsProps {
  list: {
    id: string;
    title: string;
    creator: string;
    cuisine?: string;
    city?: string;
    cover_image?: string;
    items: ListItem[];
    description?: string;
    type?: string;
  };
  userId: string;
}

export function ListDetails({ list, userId }: ListDetailsProps) {
  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">{list.title}</h1>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>By @{list.creator}</span>
            {list.cuisine && (
              <>
                <span>·</span>
                <Badge variant="secondary">{list.cuisine}</Badge>
              </>
            )}
            {list.city && (
              <>
                <span>·</span>
                <span>{list.city}</span>
              </>
            )}
          </div>
          {list.description && (
            <p className="text-gray-700 max-w-2xl">{list.description}</p>
          )}
        </div>
        <SaveListButton listId={list.id} userId={userId} />
      </div>

      {/* Cover Image */}
      {list.cover_image && (
        <div className="w-full">
          <img
            src={list.cover_image}
            alt={`${list.title} cover`}
            className="w-full h-64 object-cover rounded-lg shadow-md"
          />
        </div>
      )}

      {/* List Items */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {list.type === 'dish' ? 'Dishes' : 'Restaurants'} ({list.items.length})
        </h2>
        
        <div className="grid gap-4">
          {list.items.map((item, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Item Header */}
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {item.rank && <span className="text-blue-600 mr-2">#{item.rank}</span>}
                      {item.name}
                    </h3>
                    {item.city && (
                      <Badge variant="outline" className="text-xs">
                        {item.city}
                      </Badge>
                    )}
                  </div>

                  {/* Item Notes */}
                  {item.notes && (
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {item.notes}
                    </p>
                  )}

                  {/* Item Media */}
                  {item.mediaUrl && (
                    <div className="w-full">
                      <img
                        src={item.mediaUrl}
                        alt={item.name}
                        className="w-full h-48 object-cover rounded-md"
                      />
                    </div>
                  )}

                  {/* Item Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {list.items.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No items in this list yet.</p>
        </div>
      )}
    </div>
  );
}
