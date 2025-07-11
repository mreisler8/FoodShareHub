import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Users, 
  Search, 
  X, 
  Plus,
  ListPlus,
  Tag,
  UserPlus,
  ChefHat,
  MapPin,
  DollarSign
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";

const formSchema = z.object({
  name: z.string().min(1, "Circle name is required"),
  description: z.string().optional(),
  primaryCuisine: z.string().optional(),
  priceRange: z.string().optional(),
  location: z.string().optional(),
  allowPublicJoin: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  memberIds: z.array(z.number()).optional(),
  listIds: z.array(z.number()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SearchUser {
  id: number;
  name: string;
  username: string;
  profilePicture?: string;
}

interface List {
  id: number;
  name: string;
  description?: string;
  restaurantCount?: number;
}

export default function CreateCirclePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(false);
  
  // State for member search
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<SearchUser[]>([]);
  
  // State for lists
  const [selectedLists, setSelectedLists] = useState<List[]>([]);
  
  // State for tags
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      primaryCuisine: "",
      priceRange: "",
      location: "",
      allowPublicJoin: false,
      tags: [],
      memberIds: [],
      listIds: [],
    },
  });

  // Fetch user's lists
  const { data: userLists = [] } = useQuery<List[]>({
    queryKey: ["/api/lists"],
  });

  // Debounced member search
  useEffect(() => {
    if (memberSearchQuery.length < 2) {
      setMemberSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await apiRequest(`/api/search/unified?q=${encodeURIComponent(memberSearchQuery)}`);
        const users = response.users || [];
        // Filter out already selected members
        const selectedIds = selectedMembers.map(m => m.id);
        const filteredUsers = users.filter((user: SearchUser) => !selectedIds.includes(user.id));
        setMemberSearchResults(filteredUsers);
      } catch (error) {
        console.error("Search error:", error);
        setMemberSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [memberSearchQuery, selectedMembers]);

  const handleAddMember = (user: SearchUser) => {
    setSelectedMembers([...selectedMembers, user]);
    setMemberSearchQuery("");
    setMemberSearchResults([]);
  };

  const handleRemoveMember = (userId: number) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== userId));
  };

  const handleAddList = (list: List) => {
    if (!selectedLists.find(l => l.id === list.id)) {
      setSelectedLists([...selectedLists, list]);
    }
  };

  const handleRemoveList = (listId: number) => {
    setSelectedLists(selectedLists.filter(l => l.id !== listId));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const createCircle = useMutation({
    mutationFn: async (values: FormValues) => {
      setIsLoading(true);
      try {
        // Include selected members, lists, and tags in the submission
        const payload = {
          ...values,
          tags,
          memberIds: selectedMembers.map(m => m.id),
          listIds: selectedLists.map(l => l.id),
        };
        const response = await apiRequest("/api/circles", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        return response;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me/circles"] });
      
      toast({
        title: "Success!",
        description: "Your circle has been created successfully.",
      });
      
      navigate(`/circles/${data.id}`);
    },
    onError: (error: any) => {
      console.error("Create circle error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create circle. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    createCircle.mutate(values);
  };

  const isFormValid = form.watch("name").trim().length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {isMobile ? <MobileNavigation /> : <DesktopSidebar />}
      
      <div className={`${isMobile ? 'pb-16' : 'md:ml-64'}`}>
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/circles")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Circles
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Create New Circle</CardTitle>
                  <p className="text-gray-600">Start your food community and connect with like-minded people</p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Circle Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Circle Name *</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="e.g., NYC Pizza Lovers, Vegetarian Foodies"
                    className="w-full"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...form.register("description")}
                    placeholder="Tell people what your circle is about..."
                    className="w-full h-24"
                  />
                </div>

                {/* Primary Cuisine */}
                <div className="space-y-2">
                  <Label htmlFor="primaryCuisine">Primary Cuisine (Optional)</Label>
                  <Select onValueChange={(value) => form.setValue("primaryCuisine", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a cuisine type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="italian">Italian</SelectItem>
                      <SelectItem value="chinese">Chinese</SelectItem>
                      <SelectItem value="japanese">Japanese</SelectItem>
                      <SelectItem value="mexican">Mexican</SelectItem>
                      <SelectItem value="indian">Indian</SelectItem>
                      <SelectItem value="american">American</SelectItem>
                      <SelectItem value="french">French</SelectItem>
                      <SelectItem value="thai">Thai</SelectItem>
                      <SelectItem value="mediterranean">Mediterranean</SelectItem>
                      <SelectItem value="vegetarian">Vegetarian</SelectItem>
                      <SelectItem value="vegan">Vegan</SelectItem>
                      <SelectItem value="mixed">Mixed/All Cuisines</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div className="space-y-2">
                  <Label htmlFor="priceRange">Price Range (Optional)</Label>
                  <Select onValueChange={(value) => form.setValue("priceRange", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select price range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="budget">Budget-Friendly ($)</SelectItem>
                      <SelectItem value="mid">Mid-Range ($$)</SelectItem>
                      <SelectItem value="upscale">Upscale ($$$)</SelectItem>
                      <SelectItem value="fine">Fine Dining ($$$$)</SelectItem>
                      <SelectItem value="mixed">Mixed Price Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">Location (Optional)</Label>
                  <Input
                    id="location"
                    {...form.register("location")}
                    placeholder="e.g., New York City, San Francisco Bay Area"
                    className="w-full"
                  />
                </div>

                {/* Tags Section */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a tag (e.g., italian, pizza, casual-dining)"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                      />
                      <Button type="button" variant="outline" onClick={handleAddTag}>
                        Add
                      </Button>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="gap-1">
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Tags help others discover your circle</p>
                </div>

                {/* Invite Members Section */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Invite Members (optional)
                  </Label>
                  
                  {!showMemberSearch ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setShowMemberSearch(true)}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Search and add members...
                    </Button>
                  ) : (
                    <Card className="p-4 border-primary/20 bg-primary/5">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Search for members</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setShowMemberSearch(false);
                              setMemberSearchQuery("");
                              setMemberSearchResults([]);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search by name or username..."
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            className="pl-10"
                            autoFocus
                          />
                        </div>
                        
                        {memberSearchQuery.length >= 2 && (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {searchLoading ? (
                              <p className="text-center py-2 text-sm text-gray-500">Searching...</p>
                            ) : memberSearchResults.length > 0 ? (
                              memberSearchResults.map((user) => (
                                <div
                                  key={user.id}
                                  className="flex items-center justify-between p-2 bg-white rounded-lg border hover:border-primary/50"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                                      {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">{user.name}</p>
                                      <p className="text-xs text-gray-600">@{user.username}</p>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleAddMember(user)}
                                  >
                                    Add
                                  </Button>
                                </div>
                              ))
                            ) : (
                              <p className="text-center py-2 text-sm text-gray-500">No users found</p>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  )}
                  
                  {selectedMembers.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Selected members:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedMembers.map((member) => (
                          <Badge key={member.id} variant="secondary" className="gap-1">
                            {member.name}
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.id)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Add Lists Section */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ListPlus className="h-4 w-4" />
                    Share Lists (optional)
                  </Label>
                  <p className="text-xs text-gray-500">Select lists to share with this circle</p>
                  
                  {userLists.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {userLists.map((list) => (
                        <div
                          key={list.id}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedLists.some(l => l.id === list.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  handleAddList(list);
                                } else {
                                  handleRemoveList(list.id);
                                }
                              }}
                            />
                            <div>
                              <p className="font-medium">{list.name}</p>
                              {list.description && (
                                <p className="text-sm text-gray-600">{list.description}</p>
                              )}
                              {list.restaurantCount !== undefined && (
                                <p className="text-xs text-gray-500">{list.restaurantCount} restaurants</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No lists available. Create lists first to share them.</p>
                  )}
                </div>

                {/* Allow Public Join */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allowPublicJoin"
                    checked={form.watch("allowPublicJoin")}
                    onCheckedChange={(checked) => form.setValue("allowPublicJoin", !!checked)}
                  />
                  <Label htmlFor="allowPublicJoin" className="text-sm">
                    Allow anyone to join this circle publicly
                  </Label>
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/circles")}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!isFormValid || isLoading}
                    className="flex-1"
                  >
                    {isLoading ? "Creating..." : "Create Circle"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}