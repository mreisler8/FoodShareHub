import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MobileNavigation } from "@/components/navigation/MobileNavigation";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  ArrowLeft, 
  ArrowRight, 
  Users, 
  Mail, 
  Search,
  X,
  Plus,
  Upload,
  ChefHat,
  MapPin,
  DollarSign
} from "lucide-react";

interface User {
  id: number;
  name: string;
  username: string;
  profilePicture?: string;
}

interface List {
  id: number;
  name: string;
  description?: string;
  restaurantCount: number;
}

export default function CreateCircleAdvancedPage() {
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  
  // Step 1: Basic Info
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [primaryCuisine, setPrimaryCuisine] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [circleLocation, setCircleLocation] = useState("");
  
  // Step 2: Invite Members
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [emailInvites, setEmailInvites] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  
  // Step 3: Import Lists
  const [selectedLists, setSelectedLists] = useState<number[]>([]);
  
  // Search users
  const { data: searchResults = [] } = useQuery({
    queryKey: ['/api/search/unified', searchQuery],
    enabled: searchQuery.length > 2,
    select: (data: any) => data.users || [],
  });
  
  // Get my lists
  const { data: myLists = [] } = useQuery<List[]>({
    queryKey: ['/api/lists'],
  });
  
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };
  
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };
  
  const handleAddEmail = () => {
    const email = emailInput.trim();
    if (email && !emailInvites.includes(email)) {
      setEmailInvites([...emailInvites, email]);
      setEmailInput("");
    }
  };
  
  const handleRemoveEmail = (email: string) => {
    setEmailInvites(emailInvites.filter(e => e !== email));
  };
  
  const handleSelectUser = (user: User) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQuery("");
  };
  
  const handleRemoveUser = (userId: number) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };
  
  const handleToggleList = (listId: number) => {
    setSelectedLists(prev =>
      prev.includes(listId)
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };
  
  const handleCreateCircle = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a circle name",
        variant: "destructive",
      });
      return;
    }
    
    setIsCreating(true);
    try {
      // Create circle
      const circle = await apiRequest("/api/circles", {
        method: "POST",
        body: JSON.stringify({
          name,
          description: description || undefined,
          tags: tags.length > 0 ? tags.join(",") : undefined,
          isPrivate: !isPublic,
          allowPublicJoin: isPublic,
          primaryCuisine: primaryCuisine || undefined,
          priceRange: priceRange || undefined,
          location: circleLocation || undefined,
        }),
      });
      
      // Send invites to users
      if (selectedUsers.length > 0) {
        for (const user of selectedUsers) {
          try {
            await apiRequest(`/api/circles/${circle.id}/invites`, {
              method: "POST",
              body: JSON.stringify({ userId: user.id }),
            });
          } catch (err) {
            console.error("Failed to invite user:", user.name);
          }
        }
      }
      
      // Share selected lists
      if (selectedLists.length > 0) {
        for (const listId of selectedLists) {
          try {
            await apiRequest(`/api/lists/${listId}/share`, {
              method: "POST",
              body: JSON.stringify({ circleId: circle.id }),
            });
          } catch (err) {
            console.error("Failed to share list:", listId);
          }
        }
      }
      
      await queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
      
      toast({
        title: "Circle created!",
        description: "Your new circle is ready",
      });
      
      setLocation(`/circles/${circle.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create circle",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  const canProceed = step === 1 ? name.trim() !== "" : true;
  
  return (
    <div className="flex h-screen bg-gray-50">
      {!isMobile && <DesktopSidebar />}
      
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="max-w-2xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/circles")}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Circles
              </Button>
              <h1 className="text-2xl font-bold">Create New Circle</h1>
              <p className="text-gray-600 mt-1">
                Build your food community with advanced options
              </p>
            </div>
            
            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-8">
              <div className={`flex items-center ${step >= 1 ? 'text-primary' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step >= 1 ? 'border-primary bg-primary text-white' : 'border-gray-300'
                }`}>
                  1
                </div>
                <span className="ml-2 hidden md:block">Basic Info</span>
              </div>
              <div className={`flex-1 h-0.5 mx-2 ${step >= 2 ? 'bg-primary' : 'bg-gray-300'}`} />
              <div className={`flex items-center ${step >= 2 ? 'text-primary' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step >= 2 ? 'border-primary bg-primary text-white' : 'border-gray-300'
                }`}>
                  2
                </div>
                <span className="ml-2 hidden md:block">Invite Members</span>
              </div>
              <div className={`flex-1 h-0.5 mx-2 ${step >= 3 ? 'bg-primary' : 'bg-gray-300'}`} />
              <div className={`flex items-center ${step >= 3 ? 'text-primary' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step >= 3 ? 'border-primary bg-primary text-white' : 'border-gray-300'
                }`}>
                  3
                </div>
                <span className="ml-2 hidden md:block">Import Lists</span>
              </div>
            </div>
            
            {/* Step Content */}
            <Card className="p-6">
              {step === 1 && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">Basic Information</h2>
                  
                  <div>
                    <Label htmlFor="name">Circle Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Pizza Lovers NYC"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="What's this circle about?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label>Tags</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="Add a tag"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      />
                      <Button onClick={handleAddTag} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => handleRemoveTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="cuisine">
                        <ChefHat className="h-4 w-4 inline mr-1" />
                        Primary Cuisine
                      </Label>
                      <Input
                        id="cuisine"
                        placeholder="e.g., Italian"
                        value={primaryCuisine}
                        onChange={(e) => setPrimaryCuisine(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="price">
                        <DollarSign className="h-4 w-4 inline mr-1" />
                        Price Range
                      </Label>
                      <select
                        id="price"
                        value={priceRange}
                        onChange={(e) => setPriceRange(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                      >
                        <option value="">Select...</option>
                        <option value="$">$ - Budget</option>
                        <option value="$$">$$ - Moderate</option>
                        <option value="$$$">$$$ - Upscale</option>
                        <option value="$$$$">$$$$ - Fine Dining</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="location">
                        <MapPin className="h-4 w-4 inline mr-1" />
                        Location
                      </Label>
                      <Input
                        id="location"
                        placeholder="e.g., NYC"
                        value={circleLocation}
                        onChange={(e) => setCircleLocation(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="public"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="public" className="font-normal cursor-pointer">
                      Allow anyone with the link to join
                    </Label>
                  </div>
                </div>
              )}
              
              {step === 2 && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">Invite Members</h2>
                  
                  <Tabs defaultValue="search">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="search">Search Users</TabsTrigger>
                      <TabsTrigger value="email">Email Invites</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="search" className="space-y-4">
                      <div>
                        <Label>Search for users</Label>
                        <div className="relative mt-1">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search by name or username"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      
                      {searchQuery.length > 2 && (
                        <div className="space-y-2">
                          {searchResults.map((user: User) => (
                            <div
                              key={user.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                              onClick={() => handleSelectUser(user)}
                            >
                              <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-sm text-gray-600">@{user.username}</p>
                              </div>
                              <Plus className="h-4 w-4 text-gray-400" />
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {selectedUsers.length > 0 && (
                        <div>
                          <Label>Selected Users</Label>
                          <div className="space-y-2 mt-2">
                            {selectedUsers.map(user => (
                              <div
                                key={user.id}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded"
                              >
                                <span>{user.name}</span>
                                <X
                                  className="h-4 w-4 cursor-pointer text-gray-500 hover:text-gray-700"
                                  onClick={() => handleRemoveUser(user.id)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="email" className="space-y-4">
                      <div>
                        <Label>Email Addresses</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="email"
                            placeholder="Enter email address"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEmail())}
                          />
                          <Button onClick={handleAddEmail} size="sm">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {emailInvites.length > 0 && (
                        <div className="space-y-2">
                          {emailInvites.map(email => (
                            <div
                              key={email}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded"
                            >
                              <span className="text-sm">{email}</span>
                              <X
                                className="h-4 w-4 cursor-pointer text-gray-500 hover:text-gray-700"
                                onClick={() => handleRemoveEmail(email)}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                  
                  <p className="text-sm text-gray-600">
                    {selectedUsers.length + emailInvites.length} people will be invited
                  </p>
                </div>
              )}
              
              {step === 3 && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">Import Lists</h2>
                  <p className="text-gray-600">
                    Select existing lists to share with your new circle
                  </p>
                  
                  {myLists.length === 0 ? (
                    <div className="text-center py-8">
                      <Upload className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600">No lists to import</p>
                      <p className="text-sm text-gray-500 mt-1">
                        You can share lists later from the circle page
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {myLists.map(list => (
                        <label
                          key={list.id}
                          className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedLists.includes(list.id)}
                            onChange={() => handleToggleList(list.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{list.name}</p>
                            <p className="text-sm text-gray-600">
                              {list.restaurantCount} restaurants
                            </p>
                            {list.description && (
                              <p className="text-sm text-gray-500 mt-1">
                                {list.description}
                              </p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-sm text-gray-600">
                    {selectedLists.length} list(s) selected
                  </p>
                </div>
              )}
              
              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={() => step > 1 ? setStep(step - 1) : setLocation("/circles")}
                >
                  {step === 1 ? "Cancel" : "Back"}
                </Button>
                {step < 3 ? (
                  <Button
                    onClick={() => setStep(step + 1)}
                    disabled={!canProceed}
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleCreateCircle}
                    disabled={isCreating || !name.trim()}
                  >
                    {isCreating ? "Creating..." : "Create Circle"}
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
        
        {isMobile && <MobileNavigation />}
      </div>
    </div>
  );
}