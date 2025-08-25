import React from 'react';
import { VisualFoodMoment } from './VisualFoodMoment';

interface FoodMomentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

// CRITICAL FIX: Remove broken photo-optional logic entirely
// FoodMomentForm now delegates to VisualFoodMoment with strict photo-first enforcement
export function FoodMomentForm({ onSuccess, onCancel }: FoodMomentFormProps) {
  return (
    <VisualFoodMoment
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  );
}