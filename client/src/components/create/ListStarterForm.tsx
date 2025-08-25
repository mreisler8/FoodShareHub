import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Loader2, Plus, X, Sparkles, Users, Globe, Lock } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const listStarterSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be under 100 characters'),
  description: z.string().max(500, 'Description must be under 500 characters').optional(),
  privacy: z.enum(['public', 'circles', 'private']),
  category: z.string().optional(),
});

type ListStarterFormData = z.infer<typeof listStarterSchema>;

interface ListStarterFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  privacy?: 'public' | 'circle' | 'private';
}

const QUICK_TEMPLATES = [
  { emoji: '🍕', title: 'Best Pizza Places', description: 'Amazing pizza spots worth trying', category: 'pizza' },
  { emoji: '💕', title: 'Date Night Favorites', description: 'Perfect restaurants for romantic dinners', category: 'date-night' },
  { emoji: '💎', title: 'Hidden Gems', description: 'Secret spots that locals love', category: 'hidden-gems' },
  { emoji: '☀️', title: 'Brunch Spots', description: 'Great places for weekend brunch', category: 'brunch' },
  { emoji: '🌮', title: 'Taco Tuesday', description: 'Best tacos in the city', category: 'tacos' },
  { emoji: '👨‍👩‍👧‍👦', title: 'Family Friendly', description: 'Great restaurants for the whole family', category: 'family' },
];

const CATEGORIES = [
  'pizza', 'burgers', 'sushi', 'tacos', 'brunch', 'coffee', 'dessert', 'date-night', 
  'family', 'hidden-gems', 'cheap-eats', 'fine-dining', 'casual', 'takeout'
];

export function ListStarterForm({ onSuccess, onCancel, privacy }: ListStarterFormProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ListStarterFormData>({
    resolver: zodResolver(listStarterSchema),
    defaultValues: {
      title: '',
      description: '',
      privacy: privacy === 'circle' ? 'circles' : privacy || 'public',
      category: '',
    },
  });

  // Create list mutation
  const createListMutation = useMutation({
    mutationFn: async (data: ListStarterFormData & { tags: string[] }) => {
      return apiRequest('/api/lists', {
        method: 'POST',
        body: JSON.stringify({
          title: data.title,
          description: data.description || '',
          privacy: data.privacy,
          category: data.category || null,
          tags: data.tags,
          isRanked: false, // Start as unranked, user can add ranking later
        }),
      });
    },
    onSuccess: (newList) => {
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
      queryClient.invalidateQueries({ queryKey: ['/api/unified-feed'] });

      toast({
        title: 'List created!',
        description: 'Your list has been created. Start adding restaurants to build your curated collection.',
      });

      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create list',
        description: error.message || 'There was an error creating your list. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Apply quick template
  const applyTemplate = useCallback((template: typeof QUICK_TEMPLATES[0]) => {
    form.setValue('title', template.title);
    form.setValue('description', template.description);
    form.setValue('category', template.category);
    setTags([template.category]);
  }, [form]);

  // Add tag
  const addTag = useCallback(() => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 5) {
      setTags(prev => [...prev, newTag.trim()]);
      setNewTag('');
    }
  }, [newTag, tags]);

  // Remove tag
  const removeTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  // Handle key press for tag input
  const handleTagKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  }, [addTag]);

  // Submit form
  const onSubmit = useCallback((data: ListStarterFormData) => {
    createListMutation.mutate({
      ...data,
      tags,
    });
  }, [tags, createListMutation]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Quick Templates */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <Label className="text-base font-medium">Quick Start Templates</Label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {QUICK_TEMPLATES.map((template, index) => (
              <Card 
                key={index} 
                className="cursor-pointer hover:shadow-md transition-all duration-200 hover:border-blue-300"
                onClick={() => applyTemplate(template)}
              >
                <CardContent className="p-3 text-center">
                  <div className="text-2xl mb-1">{template.emoji}</div>
                  <div className="text-sm font-medium text-gray-900">{template.title}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* List Details */}
        <div className="space-y-4">
          <Label className="text-base font-medium">List Details</Label>

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="My amazing restaurant list..."
                    {...field}
                    className="text-base"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="What makes this list special? Share your thoughts..."
                    {...field}
                    rows={3}
                    className="resize-none"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a category (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category?.charAt(0)?.toUpperCase() + category?.slice(1)?.replace('-', ' ') || category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tags */}
          <div className="space-y-3">
            <Label>Tags (max 5)</Label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTag(tag)}
                      className="h-4 w-4 p-0 hover:bg-transparent"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
            {tags.length < 5 && (
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTag}
                  disabled={!newTag.trim() || tags.includes(newTag.trim())}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <FormField
            control={form.control}
            name="privacy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Privacy</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Public - Anyone can see
                      </div>
                    </SelectItem>
                    <SelectItem value="circles">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Circles - Only your circles
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Private - Only you
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={createListMutation.isPending || !form.watch('title')}
            className="flex-1 min-h-[44px]"
          >
            {createListMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create List'
            )}
          </Button>
        </div>

        <div className="text-xs text-gray-500 text-center">
          You can add restaurants and customize your list after creation
        </div>
      </form>
    </Form>
  );
}