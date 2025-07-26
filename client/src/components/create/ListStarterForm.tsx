import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ListIcon, PlusIcon, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useMemoryManagement } from '@/utils/memoryManagement';

const listStarterSchema = z.object({
  name: z.string().min(1, 'List name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  privacy: z.enum(['public', 'circle', 'private']),
  tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed'),
});

type ListStarterFormData = z.infer<typeof listStarterSchema>;

interface ListStarterFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const commonTags = [
  'date-night', 'family-friendly', 'brunch', 'cheap-eats', 'fine-dining',
  'pizza', 'sushi', 'mexican', 'italian', 'asian', 'breakfast', 'lunch',
  'dinner', 'drinks', 'coffee', 'dessert', 'vegetarian', 'vegan'
];

export function ListStarterForm({ onSuccess, onCancel }: ListStarterFormProps) {
  const [customTag, setCustomTag] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const memoryManager = useMemoryManagement('ListStarterForm');

  const form = useForm<ListStarterFormData>({
    resolver: zodResolver(listStarterSchema),
    defaultValues: {
      name: '',
      description: '',
      privacy: 'public',
      tags: [],
    },
  });

  const watchedTags = form.watch('tags');

  // Add tag
  const addTag = useCallback((tag: string) => {
    const cleanTag = tag.trim().toLowerCase();
    if (cleanTag && !watchedTags.includes(cleanTag) && watchedTags.length < 10) {
      form.setValue('tags', [...watchedTags, cleanTag]);
    }
    setCustomTag('');
  }, [watchedTags, form]);

  // Remove tag
  const removeTag = useCallback((tagToRemove: string) => {
    form.setValue('tags', watchedTags.filter(tag => tag !== tagToRemove));
  }, [watchedTags, form]);

  // Handle custom tag input
  const handleCustomTagKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(customTag);
    }
  }, [customTag, addTag]);

  // Submit mutation
  const createListMutation = useMutation({
    mutationFn: async (data: ListStarterFormData) => {
      return apiRequest('/api/lists', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          description: data.description || null,
          privacy: data.privacy,
          tags: data.tags,
          isPublic: data.privacy === 'public',
        }),
      });
    },
    onSuccess: (newList) => {
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/lists'] });
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      queryClient.invalidateQueries({ queryKey: ['/api/discover'] });
      
      toast({
        title: 'List created!',
        description: 'Your new restaurant list has been created successfully.',
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

  const onSubmit = useCallback((data: ListStarterFormData) => {
    createListMutation.mutate(data);
  }, [createListMutation]);

  // Component cleanup handled automatically by useMemoryManagement hook

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* List Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-base font-medium">List Name *</Label>
        <Input
          id="name"
          placeholder="e.g., Best Pizza Places in SF"
          {...form.register('name')}
          className="min-h-[44px]"
          maxLength={100}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-base font-medium">Description (Optional)</Label>
        <Textarea
          id="description"
          placeholder="What makes this list special? Share some context..."
          {...form.register('description')}
          className="resize-none min-h-[80px]"
          maxLength={500}
        />
        {form.formState.errors.description && (
          <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
        )}
      </div>

      {/* Tags */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Tags (Optional)</Label>
        
        {/* Selected Tags */}
        {watchedTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {watchedTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                {tag}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTag(tag)}
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
        
        {/* Quick Add Tags */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Add:</p>
              <div className="flex flex-wrap gap-2">
                {commonTags
                  .filter(tag => !watchedTags.includes(tag))
                  .slice(0, 12)
                  .map((tag) => (
                    <Button
                      key={tag}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addTag(tag)}
                      disabled={watchedTags.length >= 10}
                      className="h-8 text-xs"
                    >
                      <PlusIcon className="h-3 w-3 mr-1" />
                      {tag}
                    </Button>
                  ))
                }
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Custom Tag Input */}
        <div className="flex space-x-2">
          <Input
            placeholder="Add custom tag..."
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={handleCustomTagKeyDown}
            disabled={watchedTags.length >= 10}
            className="flex-1 min-h-[44px]"
            maxLength={20}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => addTag(customTag)}
            disabled={!customTag.trim() || watchedTags.length >= 10}
            className="min-h-[44px] px-4"
          >
            Add
          </Button>
        </div>
        
        {watchedTags.length >= 10 && (
          <p className="text-sm text-amber-600">Maximum 10 tags reached</p>
        )}
      </div>

      {/* Privacy */}
      <div className="space-y-2">
        <Label className="text-base font-medium">Privacy</Label>
        <Select 
          value={form.watch('privacy')} 
          onValueChange={(value: 'public' | 'circle' | 'private') => form.setValue('privacy', value)}
        >
          <SelectTrigger className="min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">🌍 Public - Anyone can discover</SelectItem>
            <SelectItem value="circle">👥 Circle - Only your circles</SelectItem>
            <SelectItem value="private">🔒 Private - Only you</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 min-h-[44px]"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={createListMutation.isPending}
          className="flex-1 min-h-[44px]"
        >
          {createListMutation.isPending ? 'Creating...' : 'Create List'}
        </Button>
      </div>
    </form>
  );
}