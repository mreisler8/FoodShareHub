import { Link } from "wouter";
import { Plus } from "lucide-react";

export function CreatePostButton() {
  return (
    <Link href="/create-post">
      <div className="fixed bottom-20 right-5 md:bottom-8 z-40 w-14 h-14 bg-primary rounded-full flex items-center justify-center text-white shadow-lg hover:bg-primary/90 transition-colors cursor-pointer">
        <Plus className="text-xl" />
      </div>
    </Link>
  );
}
