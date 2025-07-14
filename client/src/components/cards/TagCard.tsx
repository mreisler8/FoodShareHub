
import { Link } from "wouter";

interface TagCardProps {
  tag: string;
}

export function TagCard({ tag }: TagCardProps) {
  return (
    <Link href={`/discover?tag=${encodeURIComponent(tag.replace('#', ''))}`}>
      <button className="bg-gray-100 hover:bg-gray-200 text-sm px-4 py-2 rounded-full shadow-sm transition-colors duration-200 font-medium text-gray-700 hover:text-gray-900">
        {tag}
      </button>
    </Link>
  );
}
