
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowLeft, Camera, MapPin, Star } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RestaurantSearch } from "@/components/restaurant/RestaurantSearch";
import { MediaUploader } from "@/components/MediaUploader";
import { VisibilitySelector } from "@/components/VisibilitySelector";
import { Rating } from "@/components/ui/rating";
import { useToast } from "@/hooks/use-toast";
import { Restaurant } from "@shared/schema";

interface PostFormData {
  restaurantId: number;
  content: string;
  rating: number;
  visibility: {
    public: boolean;
    followers: boolean;
    circleIds: number[];
  };
  dishesTried: string[];
  images: string[];
  videos: string[];
  priceAssessment?: string;
  atmosphere?: string;
  serviceRating?: number;
  dietaryOptions: string[];
}

export default function CreatePostPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [formData, setFormData] = useState<Partial<PostFormData>>({
    content: "",
    rating: 0,
    visibility: { public: true, followers: false, circleIds: [] },
    dishesTried: [],
    images: [],
    videos: [],
    dietaryOptions: [],
  });
  const [dishInput, setDishInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (data: PostFormData) => {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create post');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      toast({
        title: "Post created successfully!",
        description: "Your dining experience has been shared.",
      });
      navigate('/feed');
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create post",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!selectedRestaurant) {
      newErrors.restaurant = "Please select a restaurant";
    }
    
    if (!formData.content?.trim()) {
      newErrors.content = "Please share your experience";
    }
    
    if (!formData.rating || formData.rating < 1) {
      newErrors.rating = "Please rate your experience";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit the form
    const postData: PostFormData = {
      restaurantId: selectedRestaurant!.id,
      content: formData.content!,
      rating: formData.rating!,
      visibility: formData.visibility!,
      dishesTried: formData.dishesTried || [],
      images: formData.images || [],
      videos: formData.videos || [],
      priceAssessment: formData.priceAssessment,
      atmosphere: formData.atmosphere,
      serviceRating: formData.serviceRating,
      dietaryOptions: formData.dietaryOptions || [],
    };

    createPostMutation.mutate(postData);
  };

  const addDish = () => {
    if (dishInput.trim() && !formData.dishesTried?.includes(dishInput.trim())) {
      setFormData(prev => ({
        ...prev,
        dishesTried: [...(prev.dishesTried || []), dishInput.trim()]
      }));
      setDishInput("");
    }
  };

  const removeDish = (dish: string) => {
    setFormData(prev => ({
      ...prev,
      dishesTried: prev.dishesTried?.filter(d => d !== dish) || []
    }));
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Share Your Experience</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Restaurant Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Restaurant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedRestaurant ? (
              <div>
                <RestaurantSearch 
                  onSelectRestaurant={setSelectedRestaurant}
                  placeholder="Search for the restaurant you visited"
                  buttonLabel="Select"
                />
                {errors.restaurant && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.restaurant}</AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div>
                  <h3 className="font-medium">{selectedRestaurant.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedRestaurant.category} • {selectedRestaurant.location}
                  </p>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedRestaurant(null)}
                >
                  Change
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rating */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Overall Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Rating
              value={formData.rating || 0}
              onChange={(rating) => setFormData(prev => ({ ...prev, rating }))}
              size="lg"
            />
            {errors.rating && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.rating}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Experience Description */}
        <Card>
          <CardHeader>
            <CardTitle>Share Your Experience</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Tell us about your dining experience..."
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={4}
              className="resize-none"
            />
            {errors.content && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.content}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Dishes Tried */}
        <Card>
          <CardHeader>
            <CardTitle>Dishes You Tried</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add a dish..."
                value={dishInput}
                onChange={(e) => setDishInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDish())}
              />
              <Button type="button" onClick={addDish} disabled={!dishInput.trim()}>
                Add
              </Button>
            </div>
            
            {formData.dishesTried && formData.dishesTried.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.dishesTried.map((dish, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm cursor-pointer hover:bg-primary/20"
                    onClick={() => removeDish(dish)}
                  >
                    {dish}
                    <span className="text-xs">×</span>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Media Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Photos & Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MediaUploader
              onMediaUploaded={(urls, type) => {
                if (type === 'image') {
                  setFormData(prev => ({ ...prev, images: [...(prev.images || []), ...urls] }));
                } else {
                  setFormData(prev => ({ ...prev, videos: [...(prev.videos || []), ...urls] }));
                }
              }}
              maxFiles={5}
            />
          </CardContent>
        </Card>

        {/* Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Price Assessment */}
            <div>
              <Label htmlFor="price">Price Assessment</Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, priceAssessment: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="How was the value?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="great-value">Great Value</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="overpriced">Overpriced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Atmosphere */}
            <div>
              <Label htmlFor="atmosphere">Atmosphere</Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, atmosphere: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="How was the atmosphere?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quiet">Quiet</SelectItem>
                  <SelectItem value="lively">Lively</SelectItem>
                  <SelectItem value="romantic">Romantic</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="upscale">Upscale</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Service Rating */}
            <div>
              <Label>Service Rating</Label>
              <Rating
                value={formData.serviceRating || 0}
                onChange={(rating) => setFormData(prev => ({ ...prev, serviceRating: rating }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Visibility */}
        <Card>
          <CardHeader>
            <CardTitle>Who can see this post?</CardTitle>
          </CardHeader>
          <CardContent>
            <VisibilitySelector
              value={formData.visibility!}
              onChange={(visibility) => setFormData(prev => ({ ...prev, visibility }))}
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={createPostMutation.isPending}
          >
            {createPostMutation.isPending ? "Sharing..." : "Share Experience"}
          </Button>
        </div>
      </form>
    </div>
  );
}
