
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Users, Plus, Search } from "lucide-react";

export function EmptyState() {
  return (
    <div className="text-center py-12 space-y-6">
      <div className="space-y-4">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
          <Users className="w-8 h-8 text-blue-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Let's get your feed started</h2>
          <p className="text-gray-600 max-w-sm mx-auto">
            Follow foodies or join Circles to see curated restaurant lists and recommendations
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/circles">
          <Button className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Explore Circles
          </Button>
        </Link>
        <Link href="/create-list">
          <Button variant="outline" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Your First List
          </Button>
        </Link>
      </div>

      <div className="pt-4 border-t">
        <p className="text-sm text-gray-500">
          Popular categories to explore: Pizza, Brunch, Date Night, Vegetarian
        </p>
      </div>
    </div>
  );
}
