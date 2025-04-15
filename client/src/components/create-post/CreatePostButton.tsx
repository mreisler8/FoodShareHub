import { Link } from "wouter";
import { Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export function CreatePostButton() {
  const isMobile = useIsMobile();
  
  // Don't render the floating button on mobile as we have the tab bar button
  if (isMobile) {
    return null;
  }
  
  return (
    <Link href="/create-post">
      <div className="fixed bottom-8 right-5 z-40 w-14 h-14 bg-primary rounded-full flex items-center justify-center text-white shadow-lg hover:bg-primary/90 transition-colors cursor-pointer">
        <Plus className="text-xl" />
      </div>
    </Link>
  );
}
