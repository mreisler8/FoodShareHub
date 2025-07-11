import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const editCircleSchema = z.object({
  name: z.string().min(3, 'Circle name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  primaryCuisine: z.string().optional(),
  priceRange: z.string().optional(),
  location: z.string().optional(),
  isPrivate: z.boolean(),
  allowPublicJoin: z.boolean(),
});

type EditCircleFormData = z.infer<typeof editCircleSchema>;

interface EditCircleModalProps {
  isOpen: boolean;
  onClose: () => void;
  circle: {
    id: number;
    name: string;
    description: string;
    primaryCuisine?: string | null;
    priceRange?: string | null;
    location?: string | null;
    isPrivate: boolean;
    allowPublicJoin: boolean;
  };
}

export function EditCircleModal({ isOpen, onClose, circle }: EditCircleModalProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EditCircleFormData>({
    resolver: zodResolver(editCircleSchema),
    defaultValues: {
      name: circle.name,
      description: circle.description,
      primaryCuisine: circle.primaryCuisine || '',
      priceRange: circle.priceRange || '',
      location: circle.location || '',
      isPrivate: circle.isPrivate,
      allowPublicJoin: circle.allowPublicJoin,
    },
  });

  const updateCircleMutation = useMutation({
    mutationFn: async (data: EditCircleFormData) => {
      // First update circle details
      const response = await apiRequest(`/api/circles/${circle.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      // If there's an image, upload it separately
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        await apiRequest(`/api/circles/${circle.id}/image`, {
          method: 'POST',
          body: formData,
          headers: {}, // Let browser set Content-Type with boundary
        });
      }

      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Circle updated',
        description: 'Your circle has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/circles/${circle.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/circles'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating circle',
        description: error.message || 'Failed to update circle',
        variant: 'destructive',
      });
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: EditCircleFormData) => {
    updateCircleMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Circle</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Circle Image</label>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Circle preview" 
                    className="w-24 h-24 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Circle Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Circle Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Toronto Foodies" />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Describe what your circle is about..."
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Primary Cuisine */}
              <FormField
                control={form.control}
                name="primaryCuisine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Cuisine</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select cuisine" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        <SelectItem value="Italian">Italian</SelectItem>
                        <SelectItem value="Japanese">Japanese</SelectItem>
                        <SelectItem value="Mexican">Mexican</SelectItem>
                        <SelectItem value="Indian">Indian</SelectItem>
                        <SelectItem value="Chinese">Chinese</SelectItem>
                        <SelectItem value="Thai">Thai</SelectItem>
                        <SelectItem value="French">French</SelectItem>
                        <SelectItem value="American">American</SelectItem>
                        <SelectItem value="Mediterranean">Mediterranean</SelectItem>
                        <SelectItem value="Korean">Korean</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Price Range */}
              <FormField
                control={form.control}
                name="priceRange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price Range</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        <SelectItem value="$">$ (Budget)</SelectItem>
                        <SelectItem value="$$">$$ (Moderate)</SelectItem>
                        <SelectItem value="$$$">$$$ (Upscale)</SelectItem>
                        <SelectItem value="$$$$">$$$$ (Fine Dining)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Location */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Toronto" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Privacy Settings */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="isPrivate"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel>Private Circle</FormLabel>
                      <p className="text-sm text-gray-500">Only invited members can see this circle</p>
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

              <FormField
                control={form.control}
                name="allowPublicJoin"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel>Allow Public Join</FormLabel>
                      <p className="text-sm text-gray-500">Anyone with the invite link can join</p>
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
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateCircleMutation.isPending}
              >
                {updateCircleMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Circle'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}