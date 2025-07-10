import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
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
import { ArrowLeft, Users } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

const formSchema = z.object({
  name: z.string().min(1, "Circle name is required"),
  description: z.string().optional(),
  primaryCuisine: z.string().optional(),
  priceRange: z.string().optional(),
  location: z.string().optional(),
  allowPublicJoin: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateCirclePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      primaryCuisine: "",
      priceRange: "",
      location: "",
      allowPublicJoin: false,
    },
  });

  const createCircle = useMutation({
    mutationFn: async (values: FormValues) => {
      setIsLoading(true);
      try {
        const response = await apiRequest("POST", "/api/circles", values);
        return await response.json();
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
      
      navigate("/circles");
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