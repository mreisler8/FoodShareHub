import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Search, Filter, Grid, List as ListIcon, Heart, Eye, Share2, Edit3, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface List {
  id: number;
  name: string;
  description?: string;
  createdById: number;
  isPublic: boolean;
  tags: string[];
  visibility: string;
  viewCount: number;
  saveCount: number;
  reactionCount: number;
  restaurantCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ListMetrics {
  views: number;
  saves: number;
  reactions: number;
  recentActivity: {
    type: 'view' | 'save' | 'reaction';
    count: number;
    timeframe: string;
  }[];
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Lists', icon: ListIcon },
  { value: 'public', label: 'Public', icon: Share2 },
  { value: 'circle', label: 'Circle Only', icon: Heart },
  { value: 'private', label: 'Private', icon: Eye },
];

export default function MyLists() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Fetch user's lists
  const { data: lists = [], isLoading } = useQuery<List[]>({
    queryKey: ['/api/lists/user'],
    enabled: !!user?.id,
  });

  // Delete list mutation
  const deleteMutation = useMutation({
    mutationFn: (listId: number) => apiRequest(`/api/lists/${listId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lists/user'] });
      toast({ title: "List deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete list", variant: "destructive" });
    }
  });

  // Duplicate list mutation
  const duplicateMutation = useMutation({
    mutationFn: (listId: number) => apiRequest(`/api/lists/${listId}/duplicate`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lists/user'] });
      toast({ title: "List duplicated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to duplicate list", variant: "destructive" });
    }
  });

  // Filter lists based on search and filter
  const filteredLists = lists.filter((list: List) => {
    const matchesSearch = list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         list.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         list.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = activeFilter === 'all' || 
                         (activeFilter === 'public' && list.isPublic) ||
                         (activeFilter === 'circle' && list.visibility === 'circle') ||
                         (activeFilter === 'private' && !list.isPublic && list.visibility !== 'circle');
    
    return matchesSearch && matchesFilter;
  });

  const handleListAction = (action: string, listId: number) => {
    switch (action) {
      case 'view':
        navigate(`/lists/${listId}`);
        break;
      case 'edit':
        navigate(`/lists/${listId}/edit`);
        break;
      case 'share':
        // Copy share link to clipboard
        navigator.clipboard.writeText(`${window.location.origin}/lists/${listId}`);
        toast({ title: "Share link copied to clipboard" });
        break;
      case 'duplicate':
        duplicateMutation.mutate(listId);
        break;
      case 'delete':
        if (confirm('Are you sure you want to delete this list?')) {
          deleteMutation.mutate(listId);
        }
        break;
    }
  };

  const getVisibilityColor = (list: List) => {
    if (list.isPublic) return "bg-green-100 text-green-800";
    if (list.visibility === 'circle') return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  };

  const getVisibilityLabel = (list: List) => {
    if (list.isPublic) return "Public";
    if (list.visibility === 'circle') return "Circle";
    return "Private";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DesktopSidebar />
        <div className="lg:ml-64 pb-20 lg:pb-8">
          <div className="p-4 lg:p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-48"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <MobileNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DesktopSidebar />
      <div className="lg:ml-64 pb-20 lg:pb-8">
        <div className="p-4 lg:p-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">My Lists</h1>
              <p className="text-gray-600">Manage your restaurant collections</p>
            </div>
            <Button 
              onClick={() => navigate('/create-list')}
              className="mt-4 lg:mt-0 bg-orange-500 hover:bg-orange-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New List
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search your lists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-auto">
                <TabsList className="grid w-full grid-cols-4">
                  {FILTER_OPTIONS.map(filter => (
                    <TabsTrigger key={filter.value} value={filter.value} className="text-xs">
                      <filter.icon className="h-3 w-3 mr-1" />
                      {filter.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <ListIcon className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-900">{lists.length}</div>
                <div className="text-sm text-gray-500">Total Lists</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {lists.reduce((sum: number, list: List) => sum + list.viewCount, 0)}
                </div>
                <div className="text-sm text-gray-500">Total Views</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {lists.reduce((sum: number, list: List) => sum + list.saveCount, 0)}
                </div>
                <div className="text-sm text-gray-500">Total Saves</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {lists.reduce((sum: number, list: List) => sum + list.reactionCount, 0)}
                </div>
                <div className="text-sm text-gray-500">Total Reactions</div>
              </CardContent>
            </Card>
          </div>

          {/* Lists Grid/List View */}
          {filteredLists.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <ListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No lists found</h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery || activeFilter !== 'all' 
                    ? "Try adjusting your search or filters" 
                    : "Create your first restaurant list to get started"}
                </p>
                <Button onClick={() => navigate('/create-list')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First List
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className={cn(
              viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                : "space-y-4"
            )}>
              {filteredLists.map((list: List) => (
                <Card key={list.id} className="hover:shadow-lg transition-all duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2 cursor-pointer hover:text-orange-600" 
                                  onClick={() => handleListAction('view', list.id)}>
                          {list.name}
                        </CardTitle>
                        <Badge className={cn("text-xs", getVisibilityColor(list))}>
                          {getVisibilityLabel(list)}
                        </Badge>
                      </div>
                    </div>
                    {list.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{list.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    {/* Tags */}
                    {list.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {list.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {list.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{list.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Metrics */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <ListIcon className="h-3 w-3" />
                        {list.restaurantCount} places
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {list.viewCount}
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {list.reactionCount}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleListAction('view', list.id)}
                        className="flex-1"
                      >
                        View
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleListAction('edit', list.id)}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleListAction('share', list.id)}
                      >
                        <Share2 className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleListAction('duplicate', list.id)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleListAction('delete', list.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      <MobileNavigation />
    </div>
  );
}