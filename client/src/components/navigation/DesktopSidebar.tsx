import { Home, Search, PlusCircle, Users, Bookmark, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";

export function DesktopSidebar() {
  const [location] = useLocation();
  
  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ["/api/me"],
  });
  
  // Function to check if a path is active
  const isActive = (path: string) => {
    if (path === "/" && location === "/") {
      return true;
    }
    return path !== "/" && location.startsWith(path);
  };

  const getNavItemClasses = (path: string) => {
    return `flex items-center p-3 rounded-lg font-medium ${
      isActive(path)
        ? "bg-primary bg-opacity-10 text-primary"
        : "hover:bg-neutral-100 text-neutral-700"
    }`;
  };

  return (
    <div className="hidden md:flex md:flex-col md:w-64 bg-white p-5 h-screen sticky top-0 border-r border-neutral-200">
      <div className="flex items-center mb-10">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 11h.01"></path>
            <path d="M11 15h.01"></path>
            <path d="M16 16h.01"></path>
            <path d="m2 16 20 6-6-20A20 20 0 0 0 2 16"></path>
            <path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"></path>
          </svg>
        </div>
        <h1 className="ml-3 text-2xl font-heading font-bold text-neutral-900">TasteBuds</h1>
      </div>
      
      <nav className="flex-1">
        <ul className="space-y-2">
          <li>
            <Link href="/">
              <a className={getNavItemClasses("/")}>
                <Home className="w-6 mr-2" />
                <span>Feed</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/discover">
              <a className={getNavItemClasses("/discover")}>
                <Search className="w-6 mr-2" />
                <span>Discover</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/create-post">
              <a className={getNavItemClasses("/create-post")}>
                <PlusCircle className="w-6 mr-2" />
                <span>Create Post</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/hubs/1">
              <a className={getNavItemClasses("/hubs")}>
                <Users className="w-6 mr-2" />
                <span>Food Hubs</span>
              </a>
            </Link>
          </li>
          <li>
            <Link href="/saved">
              <a className={getNavItemClasses("/saved")}>
                <Bookmark className="w-6 mr-2" />
                <span>Saved Restaurants</span>
              </a>
            </Link>
          </li>
        </ul>
      </nav>
      
      {currentUser && (
        <div className="mt-auto pt-5 border-t border-neutral-200">
          <Link href="/profile">
            <a className="flex items-center p-3 rounded-lg hover:bg-neutral-100">
              <Avatar className="w-10 h-10">
                <AvatarImage src={currentUser.profilePicture} alt={currentUser.name} />
                <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="font-medium text-neutral-900">{currentUser.name}</p>
                <p className="text-sm text-neutral-500">@{currentUser.username}</p>
              </div>
            </a>
          </Link>
        </div>
      )}
    </div>
  );
}
