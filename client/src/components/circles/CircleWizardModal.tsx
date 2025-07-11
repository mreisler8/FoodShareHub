import { useState, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import "./CircleWizardModal.css";

interface CircleWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const wizardSteps = [
  { id: 1, name: "Circle Setup", icon: Utensils },
  { id: 2, name: "Invite Members", icon: Users },
  { id: 3, name: "Share Lists", icon: MapPin },
];

const tagSuggestions = [
  "Pizza", "Sushi", "Brunch", "Cocktails", "Fine Dining", "Casual", "Romantic", "Family-friendly"
];

const templateNames = [
  "Pizza Pals", "Sushi Squad", "Brunch Bunch", "Cocktail Crew", "Fine Dining Club", "Casual Eats", "Date Night Spots", "Family Favorites"
];

const popularLists = [
  { id: 1, name: "Best NYC Pizza", theme: "pizza", description: "Top-rated pizza spots in the city" },
  { id: 2, name: "Sushi Favorites", theme: "sushi", description: "Fresh sushi and sashimi destinations" },
  { id: 3, name: "Brunch Spots", theme: "brunch", description: "Weekend brunch destinations" },
  { id: 4, name: "Romantic Dinners", theme: "romantic", description: "Perfect spots for date nights" },
  { id: 5, name: "Best Restaurants", theme: "general", description: "Top-rated dining experiences" },
];

export default function CircleWizardModal({ open, onOpenChange }: CircleWizardModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  const [selectedLists, setSelectedLists] = useState<number[]>([]);
  const [circleData, setCircleData] = useState({
    name: "",
    description: "",
    tags: [] as string[],
    isPrivate: false,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search users query - using unified search endpoint with type=users
  const { data: searchResults = [] } = useQuery({
    queryKey: ["/api/search", searchTerm, "users"],
    queryFn: async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}&type=users`);
      if (!response.ok) throw new Error("Failed to search users");
      const data = await response.json();
      return data.results || [];
    },
    enabled: searchTerm.length > 1,
  });

  // Create circle mutation
  const createCircleMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertCircleSchema>) => {
      return apiRequest("/api/circles", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
      toast({ title: "Circle created successfully!" });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Error creating circle:", error);
      toast({ title: "Failed to create circle", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setCurrentStep(1);
    setCircleData({ name: "", description: "", tags: [], isPrivate: false });
    setSelectedMembers([]);
    setSelectedLists([]);
    setSearchTerm("");
    setTagInput("");
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

  const handleCreateCircle = async () => {
    if (!circleData.name) return;

    setIsCreating(true);
    try {
      await createCircleMutation.mutateAsync({
        name: circleData.name,
        description: circleData.description,
        isPrivate: circleData.isPrivate,
        allowPublicJoin: !circleData.isPrivate,
        tags: circleData.tags,
      });
    } catch (error) {
      console.error("Error creating circle:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const isStep1Valid = circleData.name.length >= 3;
  
  const addTag = (tag: string) => {
    if (!circleData.tags.includes(tag)) {
      setCircleData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setTagInput("");
  };

  const removeTag = (tagToRemove: string) => {
    setCircleData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addMember = (member: any) => {
    if (!selectedMembers.find(m => m.id === member.id)) {
      setSelectedMembers(prev => [...prev, member]);
    }
  };

  const removeMember = (memberId: number) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const currentTheme = useMemo(() => {
    const lowerName = circleData.name.toLowerCase();
    if (lowerName.includes('pizza')) return 'pizza';
    if (lowerName.includes('sushi')) return 'sushi';
    if (lowerName.includes('brunch')) return 'brunch';
    if (lowerName.includes('date') || lowerName.includes('romantic')) return 'romantic';
    return 'general';
  }, [circleData.name]);

  const relevantLists = useMemo(() => popularLists.filter(list => 
    list.theme === currentTheme || currentTheme === 'general'
  ), [currentTheme]);

  if (!open) return null;

  return (
    <div className="circle-wizard-overlay">
      <div className="circle-wizard-modal">
        {/* Header */}
        <div className="circle-wizard-header">
          <h2 className="circle-wizard-title">Create New Circle</h2>
          <button 
            onClick={() => onOpenChange(false)}
            className="circle-wizard-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="circle-wizard-steps">
          {wizardSteps.map((step, index) => (
            <div key={step.id} className="circle-wizard-step">
              <div className={`circle-wizard-step-number ${
                currentStep >= step.id ? 'active' : ''
              }`}>
                {step.id}
              </div>
              <span className={`circle-wizard-step-name ${
                currentStep >= step.id ? 'active' : ''
              }`}>
                {step.name}
              </span>
              {index < wizardSteps.length - 1 && (
                <ChevronRight className="circle-wizard-step-arrow" />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="circle-wizard-content">
          {/* Step 1: Circle Setup */}
          {currentStep === 1 && (
            <div className="circle-wizard-step-content">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="circle-name">Circle Name</Label>
                  <Input
                    id="circle-name"
                    value={circleData.name}
                    onChange={(e) => setCircleData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter circle name..."
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {templateNames.map(template => (
                      <Badge 
                        key={template}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => setCircleData(prev => ({ ...prev, name: template }))}
                      >
                        {template}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="circle-description">Description (Optional)</Label>
                  <Textarea
                    id="circle-description"
                    value={circleData.description}
                    onChange={(e) => setCircleData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="What makes this circle special?"
                  />
                </div>

                <div>
                  <Label>Privacy</Label>
                  <RadioGroup 
                    value={circleData.isPrivate ? "private" : "public"}
                    onValueChange={(value) => setCircleData(prev => ({ ...prev, isPrivate: value === "private" }))}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="public" id="public" />
                      <Label htmlFor="public">Public - Anyone can join</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="private" id="private" />
                      <Label htmlFor="private">Private - Invite only</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {circleData.tags.map(tag => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tagSuggestions.filter(tag => !circleData.tags.includes(tag)).map(tag => (
                      <Badge 
                        key={tag}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => addTag(tag)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Invite Members */}
          {currentStep === 2 && (
            <div className="circle-wizard-step-content">
              <div className="space-y-4">
                <div>
                  <Label>Search & Invite Friends</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search for friends..."
                      className="pl-10"
                    />
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="mt-2 border rounded-md max-h-32 overflow-y-auto">
                      {searchResults.map((user: any) => (
                        <div 
                          key={user.id}
                          className="p-2 hover:bg-muted cursor-pointer flex items-center justify-between"
                          onClick={() => addMember(user)}
                        >
                          <span>{user.name}</span>
                          <Plus className="w-4 h-4" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label>Selected Members</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map(member => (
                      <Badge key={member.id} variant="secondary">
                        {member.name}
                        <button
                          onClick={() => removeMember(member.id)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Share Lists */}
          {currentStep === 3 && (
            <div className="circle-wizard-step-content">
              <div className="space-y-4">
                <div>
                  <Label>Recommended Lists</Label>
                  <div className="grid gap-3 mt-2">
                    {relevantLists.map(list => (
                      <Card key={list.id} className="cursor-pointer hover:shadow-md">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{list.name}</h4>
                              <p className="text-sm text-muted-foreground">{list.description}</p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                if (selectedLists.includes(list.id)) {
                                  setSelectedLists(prev => prev.filter(id => id !== list.id));
                                } else {
                                  setSelectedLists(prev => [...prev, list.id]);
                                }
                              }}
                            >
                              {selectedLists.includes(list.id) ? "Remove" : "Add"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="circle-wizard-footer">
          <div className="flex justify-between">
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
                  disabled={currentStep === 1 && !isStep1Valid}
                >
                  Next
                </Button>
              ) : (
                <Button 
                  onClick={handleCreateCircle}
                  disabled={isCreating || !isStep1Valid}
                >
                  {isCreating ? "Creating..." : "Create Circle"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}