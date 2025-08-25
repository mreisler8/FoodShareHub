import { SaveListButton } from "./SaveListButton";
import { ListAudienceBadge } from "./ListAudienceBadge";

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
    audience: string;
    items: ListItem[];
  };
  userId: string;
}

export function ListDetails({ list, userId }: ListDetailsProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold">{list.title}</h1>
            <ListAudienceBadge audience={list.audience} />
          </div>
          <p className="text-sm text-muted-foreground">
            By @{list.creator} {list.cuisine && `· ${list.cuisine}`}{" "}
            {list.city && `· ${list.city}`}
          </p>
        </div>
        <SaveListButton listId={list.id} userId={userId} />
      </div>

      {list.cover_image && (
        <img
          src={list.cover_image}
          alt="Cover"
          className="w-full h-48 object-cover rounded-lg"
        />
      )}

      <div className="space-y-2">
        {list.items.map((item, i) => (
          <div
            key={i}
            className="border p-3 rounded-lg bg-white shadow-sm space-y-1"
          >
            <div className="font-medium">
              {item.rank && `${item.rank}. `} {item.name}
            </div>
            {item.city && <div className="text-sm text-muted-foreground">{item.city}</div>}
            {item.notes && <p className="text-sm">{item.notes}</p>}
            {item.tags && (
              <div className="flex flex-wrap gap-1 text-xs text-gray-500">
                {item.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            {item.mediaUrl && (
              <img
                src={item.mediaUrl}
                alt="Item"
                className="w-full h-40 object-cover rounded-md"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}