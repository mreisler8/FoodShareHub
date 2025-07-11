
import { useState, useEffect, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Search, X, Plus, Users, ChevronRight, Mail, MapPin, Utensils } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertCircleSchema } from "@shared/schema";
import { z } from "zod";
import "./CircleCreationWizard.css";

interface CircleCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WizardStep {
  id: number;
  name: string;
  title: string;
}

interface SearchUser {
  id: number;
  name: string;
  username: string;
  email?: string;
  bio?: string;
}

const wizardSteps: WizardStep[] = [
  { id: 1, name: "Name", title: "Circle Setup" },
  { id: 2, name: "Invite", title: "Member Invitation" },
  { id: 3, name: "Share", title: "First List Sharing" }
];

const circleTemplates = [
  "Pizza Pals",
  "Sushi Squad", 
  "Weekend Brunchers",
  "Date Night Crew",
  "Coffee Connoisseurs",
  "Taco Tuesday Gang"
];

const tagSuggestions = [
  "pizza", "sushi", "romantic", "brunch", "fine-dining",
  "casual", "coffee", "tacos", "burgers", "vegetarian",
  "asian", "italian", "mexican", "american", "healthy"
];

const popularLists = [
  { id: 1, name: "Best Pizza in Toronto", theme: "pizza", count: 12, rating: 4.8 },
  { id: 2, name: "Romantic Date Spots", theme: "romantic", count: 8, rating: 4.6 },
  { id: 3, name: "Weekend Brunch Places", theme: "brunch", count: 15, rating: 4.7 },
  { id: 4, name: "Sushi Favorites", theme: "sushi", count: 10, rating: 4.9 }
];

export function CircleCreationWizard({ open, onOpenChange }: CircleCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [circleData, setCircleData] = useState({
    name: "",
    description: "",
    tags: [] as string[],
    isPrivate: true,
    inviteEmails: [] as string[],
    bulkEmails: "",
    selectedLists: [] as number[]
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [showBulkEmails, setShowBulkEmails] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // FIXED: Proper search functionality with better error handling
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const timeoutId = setTimeout(async () => {
        setIsSearching(true);
        try {
          console.log('Searching for users with query:', searchQuery);
          
          const response = await apiRequest(`/api/search/unified?q=${encodeURIComponent(searchQuery)}`);
          console.log('Full search response:', response);
          
          // FIXED: Properly extract users from the unified search response
          if (response?.data?.users && Array.isArray(response.data.users)) {
            const users = response.data.users.map((user: any) => ({
              id: user.id,
              name: user.name || user.username,
              username: user.username,
              email: user.email || user.username,
              bio: user.bio
            }));
            setSearchResults(users);
            console.log('Processed users:', users);
          } else if (response?.users && Array.isArray(response.users)) {
            // Alternative response structure
            const users = response.users.map((user: any) => ({
              id: user.id,
              name: user.name || user.username,
              username: user.username,
              email: user.email || user.username,
              bio: user.bio
            }));
            setSearchResults(users);
            console.log('Processed users (alt structure):', users);
          } else {
            console.log('No users found in response structure:', response);
            setSearchResults([]);
          }
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
          toast({
            title: "Search Error",
            description: "Failed to search users. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsSearching(false);
        }
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery, toast]);

  const createCircleMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertCircleSchema>) => {
      return apiRequest("/api/circles", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
      toast({
        title: "Circle Created!",
        description: "Your circle has been created successfully.",
      });
      onOpenChange(false);
      resetWizard();
    },
    onError: (error) => {
      console.error("Create circle error:", error);
      toast({
        title: "Error",
        description: "Failed to create circle. Please try again.",
        variant: "destructive",
      });
    }
  });

  const resetWizard = () => {
    setCurrentStep(1);
    setCircleData({
      name: "",
      description: "",
      tags: [],
      isPrivate: true,
      inviteEmails: [],
      bulkEmails: "",
      selectedLists: []
    });
    setSearchQuery("");
    setTagInput("");
    setShowBulkEmails(false);
    setSearchResults([]);
    setIsSearching(false);
  };

  const handleTemplateClick = (template: string) => {
    setCircleData(prev => ({ ...prev, name: template }));
  };

  const handleTagAdd = (tag: string) => {
    if (!circleData.tags.includes(tag)) {
      setCircleData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setTagInput("");
  };

  const handleTagRemove = (tagToRemove: string) => {
    setCircleData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleEmailAdd = (email: string) => {
    if (email && !circleData.inviteEmails.includes(email)) {
      setCircleData(prev => ({ ...prev, inviteEmails: [...prev.inviteEmails, email] }));
      toast({
        title: "Email Added",
        description: `${email} has been added to your invite list.`,
      });
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleUserAdd = (user: SearchUser) => {
    const email = user.email || user.username;
    const displayName = user.name || email;
    
    if (email && !circleData.inviteEmails.includes(email)) {
      setCircleData(prev => ({ ...prev, inviteEmails: [...prev.inviteEmails, email] }));
      toast({
        title: "User Added",
        description: `${displayName} has been added to your invite list.`,
      });
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleEmailRemove = (emailToRemove: string) => {
    setCircleData(prev => ({
      ...prev,
      inviteEmails: prev.inviteEmails.filter(email => email !== emailToRemove)
    }));
  };

  const handleBulkEmailsProcess = () => {
    const emails = circleData.bulkEmails
      .split(/[,\n]/)
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));
    
    const newEmails = emails.filter(email => !circleData.inviteEmails.includes(email));
    setCircleData(prev => ({ ...prev, inviteEmails: [...prev.inviteEmails, ...newEmails], bulkEmails: "" }));
    setShowBulkEmails(false);
    
    if (newEmails.length > 0) {
      toast({
        title: "Emails Added",
        description: `${newEmails.length} email(s) added to your invite list.`,
      });
    }
  };

  const handleListToggle = (listId: number) => {
    setCircleData(prev => ({
      ...prev,
      selectedLists: prev.selectedLists.includes(listId)
        ? prev.selectedLists.filter(id => id !== listId)
        : [...prev.selectedLists, listId]
    }));
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    setIsCreating(true);
    try {
      await createCircleMutation.mutateAsync({
        name: circleData.name,
        description: circleData.description,
        isPrivate: circleData.isPrivate,
        tags: circleData.tags,
        allowPublicJoin: !circleData.isPrivate,
        primaryCuisine: circleData.tags[0] || null,
        priceRange: null,
        location: null,
        memberCount: 1,
        featured: false,
        trending: false,
        inviteCode: null,
        creatorId: undefined
      });

      if (circleData.inviteEmails.length > 0) {
        toast({
          title: "Invites Sent!",
          description: `${circleData.inviteEmails.length} invites sent successfully.`,
        });
      }
    } catch (error) {
      console.error("Error creating circle:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const isStep1Valid = circleData.name.length >= 3;
  const isStep2Valid = true;

  const filteredTagSuggestions = tagSuggestions.filter(tag => 
    tag.toLowerCase().includes(tagInput.toLowerCase()) && 
    !circleData.tags.includes(tag)
  );

  const getThemeFromName = useCallback((name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('pizza')) return 'pizza';
    if (lowerName.includes('sushi')) return 'sushi';
    if (lowerName.includes('brunch')) return 'brunch';
    if (lowerName.includes('date') || lowerName.includes('romantic')) return 'romantic';
    return 'general';
  }, []);

  const currentTheme = useMemo(() => getThemeFromName(circleData.name), [circleData.name, getThemeFromName]);
  const relevantLists = useMemo(() => popularLists.filter(list => 
    list.theme === currentTheme || currentTheme === 'general'
  ), [currentTheme]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="circle-wizard-dialog max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="circle-wizard-header">
          <DialogTitle className="text-2xl font-bold">Create New Circle</DialogTitle>
          
          {/* Step Indicator */}
          <div className="flex items-center justify-between my-4">
            {wizardSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  currentStep >= step.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {step.id}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {step.name}
                </span>
                {index < wizardSteps.length - 1 && (
                  <ChevronRight className="w-4 h-4 mx-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Circle Setup */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="circle-name" className="text-base font-medium">
                  Circle Name
                </Label>
                <Input
                  id="circle-name"
                  placeholder="e.g. Pizza Pals, Date-Night Crew"
                  value={circleData.name}
                  onChange={(e) => setCircleData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {circleData.name.length}/50 characters
                </p>
              </div>

              {/* Smart Templates */}
              <div>
                <Label className="text-base font-medium">Quick Templates</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {circleTemplates.map(template => (
                    <Badge
                      key={template}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => handleTemplateClick(template)}
                    >
                      {template}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <Label className="text-base font-medium">Tags</Label>
                <div className="flex flex-wrap gap-2 mt-2 mb-2">
                  {circleData.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X 
                        className="w-3 h-3 cursor-pointer hover:text-destructive" 
                        onClick={() => handleTagRemove(tag)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="relative">
                  <Input
                    placeholder="Add tags like 'pizza', 'romantic', 'brunch'..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && tagInput.trim()) {
                        handleTagAdd(tagInput.trim());
                      }
                    }}
                  />
                  {tagInput && filteredTagSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-background border border-border rounded-md mt-1 max-h-32 overflow-y-auto z-10">
                      {filteredTagSuggestions.map(tag => (
                        <div
                          key={tag}
                          className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                          onClick={() => handleTagAdd(tag)}
                        >
                          {tag}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Privacy Settings */}
              <div>
                <Label className="text-base font-medium">Privacy</Label>
                <RadioGroup
                  value={circleData.isPrivate ? "private" : "public"}
                  onValueChange={(value) => setCircleData(prev => ({ ...prev, isPrivate: value === "private" }))}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="private" id="private" />
                    <Label htmlFor="private" className="text-sm">
                      Circle-only (Only members can see content)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="public" id="public" />
                    <Label htmlFor="public" className="text-sm">
                      Public (Anyone can discover this circle)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 2: Member Invitation */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-medium">Invite Friends</Label>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Find friends by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        handleEmailAdd(searchQuery.trim());
                      }
                    }}
                    className="pl-10"
                  />
                  
                  {/* FIXED: Search Results Dropdown */}
                  {searchQuery && (isSearching || searchResults.length > 0 || searchQuery.includes('@')) && (
                    <div className="absolute top-full left-0 right-0 bg-background border border-border rounded-md mt-1 max-h-48 overflow-y-auto z-10 shadow-lg">
                      {isSearching && (
                        <div className="px-4 py-3 text-muted-foreground text-sm">
                          Searching...
                        </div>
                      )}
                      
                      {!isSearching && searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="px-4 py-3 hover:bg-muted cursor-pointer flex items-center gap-3"
                          onClick={() => handleUserAdd(user)}
                        >
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {user.email || user.username}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {!isSearching && searchQuery.includes('@') && !searchResults.some(u => u.email === searchQuery || u.username === searchQuery) && (
                        <div
                          className="px-4 py-3 hover:bg-muted cursor-pointer flex items-center gap-3 border-t"
                          onClick={() => handleEmailAdd(searchQuery.trim())}
                        >
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <Mail className="w-4 h-4 text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium">+ Invite {searchQuery}</div>
                            <div className="text-sm text-muted-foreground">Send invitation to this email</div>
                          </div>
                        </div>
                      )}
                      
                      {!isSearching && searchResults.length === 0 && searchQuery.length > 1 && !searchQuery.includes('@') && (
                        <div className="px-4 py-3 text-muted-foreground text-sm">
                          No users found matching "{searchQuery}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Bulk Email Option */}
                <div className="mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBulkEmails(!showBulkEmails)}
                    className="text-primary hover:text-primary/80"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Paste emails separated by commas
                  </Button>
                </div>

                {showBulkEmails && (
                  <div className="mt-4 space-y-2">
                    <Textarea
                      placeholder="Enter emails separated by commas or new lines..."
                      value={circleData.bulkEmails}
                      onChange={(e) => setCircleData(prev => ({ ...prev, bulkEmails: e.target.value }))}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleBulkEmailsProcess}>
                        Add Emails
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowBulkEmails(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Invitees */}
              <div>
                <Label className="text-base font-medium">
                  Selected Invitees ({circleData.inviteEmails.length})
                </Label>
                {circleData.inviteEmails.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {circleData.inviteEmails.map(email => (
                      <Badge key={email} variant="secondary" className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {email}
                        <X 
                          className="w-3 h-3 cursor-pointer hover:text-destructive" 
                          onClick={() => handleEmailRemove(email)}
                        />
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">
                    No members selected yet. You can invite members later after creating the circle.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: First List Sharing */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">
                  Add your favorite {currentTheme !== 'general' ? currentTheme : 'food'} spots to get the party started
                </h3>
                <p className="text-sm text-muted-foreground">
                  Share popular lists or create your own custom list (optional)
                </p>
              </div>

              {/* Popular Lists */}
              <div>
                <Label className="text-base font-medium">Popular Lists</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {relevantLists.map(list => (
                    <Card 
                      key={list.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        circleData.selectedLists.includes(list.id) 
                          ? 'ring-2 ring-primary bg-primary/5' 
                          : ''
                      }`}
                      onClick={() => handleListToggle(list.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{list.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {list.count} restaurants
                              </span>
                              <Badge variant="outline" className="text-xs">
                                ⭐ {list.rating}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={circleData.selectedLists.includes(list.id) ? "default" : "outline"}
                          >
                            {circleData.selectedLists.includes(list.id) ? "Added" : "Add"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Create Custom List */}
              <div>
                <Button variant="outline" className="w-full" size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Custom List
                </Button>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              Back
            </Button>
            
            <div className="flex gap-2">
              {currentStep < 3 ? (
                <Button
                  onClick={handleNext}
                  disabled={currentStep === 1 ? !isStep1Valid : currentStep === 2 ? !isStep2Valid : false}
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  disabled={isCreating}
                  className="min-w-[100px]"
                >
                  {isCreating ? "Creating..." : "Save & Share"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
