
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export function SuggestedTags() {
  const tags = [
    { tag: "Vegan", color: "bg-green-50 text-green-700 hover:bg-green-100" },
    { tag: "DateNight", color: "bg-pink-50 text-pink-700 hover:bg-pink-100" },
    { tag: "TorontoEats", color: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
    { tag: "Brunch", color: "bg-yellow-50 text-yellow-700 hover:bg-yellow-100" },
    { tag: "Ramen", color: "bg-orange-50 text-orange-700 hover:bg-orange-100" },
    { tag: "Pizza", color: "bg-red-50 text-red-700 hover:bg-red-100" },
    { tag: "Coffee", color: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
    { tag: "Sushi", color: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" },
  ];

  return (
    <div className="space-y-3 py-4">
      <h4 className="text-sm font-medium text-gray-700">Explore Popular Tags</h4>
      <div className="flex gap-2 flex-wrap">
        {tags.map(({ tag, color }) => (
          <Link key={tag} href={`/discover?tag=${encodeURIComponent(tag)}`}>
            <Badge 
              variant="secondary" 
              className={`${color} border-0 cursor-pointer transition-colors`}
            >
              #{tag}
            </Badge>
          </Link>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        Discover lists and recommendations by exploring tags
      </p>
    </div>
  );
}
