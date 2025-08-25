import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { ImagePlus, X, Sparkles } from "lucide-react";
import { SmartTagInput } from "./SmartTagInput";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  coverImage: z.string().optional(),
  isRanked: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateListFormProps {
  onSubmit: (data: FormValues) => void;
  initialValues?: Partial<FormValues>;
}

export function CreateListForm({ onSubmit, initialValues }: CreateListFormProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialValues?.tags || []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialValues?.title || "",
      description: initialValues?.description || "",
      coverImage: initialValues?.coverImage || "",
      isRanked: initialValues?.isRanked || false,
      tags: initialValues?.tags || [],
    },
  });

  // Smart title suggestions based on common patterns
  const titleSuggestions = [
    "My Favorite Local Spots",
    "Best Pizza Places",
    "Date Night Restaurants",
    "Hidden Gems",
    "Weekend Brunch Spots",
    "Late Night Eats",
  ];

  const handleTitleSuggestion = (suggestion: string) => {
    form.setValue("title", suggestion);
  };

  const handleTagsChange = (tags: string[]) => {
    setSelectedTags(tags);
    form.setValue("tags", tags);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      // In a real app, you'd upload to Cloudinary here
      const imageUrl = URL.createObjectURL(imageFile);
      form.setValue("coverImage", imageUrl);
    }
  };

  const handleSubmit = (data: FormValues) => {
    onSubmit({ ...data, tags: selectedTags });
  };

  const isRanked = form.watch("isRanked");
  const currentTitle = form.watch("title");
  const coverImage = form.watch("coverImage");

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Create Your List
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Title Field with Smart Suggestions */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-medium">List Title *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Best Pizza in Brooklyn"
                      className="text-lg h-12"
                    />
                  </FormControl>
                  {!currentTitle && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-sm text-muted-foreground">Quick suggestions:</span>
                      {titleSuggestions.map((suggestion) => (
                        <Button
                          key={suggestion}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleTitleSuggestion(suggestion)}
                          className="text-xs"
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cover Image Upload */}
            <FormField
              control={form.control}
              name="coverImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover Image (Optional)</FormLabel>
                  <FormControl>
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        dragActive
                          ? "border-primary bg-primary/5"
                          : "border-muted-foreground/25 hover:border-primary/50"
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                      }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={handleDrop}
                    >
                      {coverImage ? (
                        <div className="relative">
                          <img
                            src={coverImage}
                            alt="Cover"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => form.setValue("coverImage", "")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Drag & drop an image or click to upload
                          </p>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Tell others what makes this list special..."
                      className="min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Smart Tags */}
            <div className="space-y-2">
              <FormLabel>Tags</FormLabel>
              <SmartTagInput
                selectedTags={selectedTags}
                onTagsChange={handleTagsChange}
                listTitle={currentTitle}
              />
            </div>

            {/* Ranking Toggle */}
            <FormField
              control={form.control}
              name="isRanked"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-medium">
                      Rank this list?
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Enable drag-and-drop ordering for your items
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {isRanked && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-sm text-primary font-medium">
                  ✨ Ranking enabled! You'll be able to drag items to reorder them.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="submit"
                className="min-h-[48px] px-8"
                disabled={!currentTitle}
              >
                Continue to Add Items
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}