import express from "express";
import { db } from "../db.js";
import { restaurantLists, users } from "@shared/schema";
import { sql, desc, inArray } from "drizzle-orm";

const router = express.Router();

// Get popular tags from restaurant lists
router.get("/popular", async (req, res) => {
  try {
    // Get all tags from restaurant lists
    const lists = await db.select({
      tags: restaurantLists.tags
    }).from(restaurantLists)
    .where(sql`${restaurantLists.tags} IS NOT NULL AND array_length(${restaurantLists.tags}, 1) > 0`);

    // Count tag frequency
    const tagCounts = new Map<string, number>();
    
    lists.forEach(list => {
      if (list.tags && Array.isArray(list.tags)) {
        list.tags.forEach(tag => {
          const normalizedTag = tag.trim();
          if (normalizedTag) {
            tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1);
          }
        });
      }
    });

    // Sort by frequency and return top tags
    const popularTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag]) => tag);

    // If no tags found, return some defaults
    if (popularTags.length === 0) {
      const defaultTags = [
        'Must Try',
        'Hidden Gem', 
        'Local Favorite',
        'Great Value',
        'Date Night',
        'Family Friendly',
        'Quick Bite',
        'Brunch',
        'Late Night',
        'Vegetarian Friendly'
      ];
      return res.json({ tags: defaultTags });
    }

    res.json({ tags: popularTags });
  } catch (error) {
    console.error("Error fetching popular tags:", error);
    res.status(500).json({ error: "Failed to fetch popular tags" });
  }
});

// Get tag suggestions based on context
router.get("/suggestions", async (req, res) => {
  try {
    const { query, cuisine, location } = req.query;
    
    const suggestions = new Set<string>();

    // Add cuisine-based suggestions
    if (cuisine) {
      const cuisineStr = cuisine.toString().toLowerCase();
      if (cuisineStr.includes('italian')) {
        suggestions.add('Pasta');
        suggestions.add('Wine');
        suggestions.add('Pizza');
      }
      if (cuisineStr.includes('asian') || cuisineStr.includes('chinese') || cuisineStr.includes('japanese')) {
        suggestions.add('Spicy');
        suggestions.add('Noodles');
        suggestions.add('Sushi');
      }
      if (cuisineStr.includes('mexican')) {
        suggestions.add('Tacos');
        suggestions.add('Spicy');
        suggestions.add('Authentic');
      }
      if (cuisineStr.includes('indian')) {
        suggestions.add('Curry');
        suggestions.add('Spicy');
        suggestions.add('Vegetarian');
      }
    }

    // Add location-based suggestions
    if (location) {
      const locationStr = location.toString().toLowerCase();
      if (locationStr.includes('downtown')) suggestions.add('Downtown');
      if (locationStr.includes('waterfront')) suggestions.add('Waterfront');
      if (locationStr.includes('beach')) suggestions.add('Beach');
      if (locationStr.includes('mall')) suggestions.add('Shopping');
    }

    // Add query-based suggestions
    if (query) {
      const queryStr = query.toString().toLowerCase();
      if (queryStr.includes('date')) suggestions.add('Date Night');
      if (queryStr.includes('family')) suggestions.add('Family Friendly');
      if (queryStr.includes('business')) suggestions.add('Business Lunch');
      if (queryStr.includes('brunch')) suggestions.add('Brunch');
      if (queryStr.includes('cheap') || queryStr.includes('budget')) suggestions.add('Budget Friendly');
      if (queryStr.includes('fancy')) suggestions.add('Upscale');
    }

    // Add some general suggestions
    const generalTags = [
      'Must Try',
      'Hidden Gem',
      'Local Favorite',
      'Great Value',
      'Romantic',
      'Casual',
      'Quick Bite',
      'Good for Groups',
      'Outdoor Seating',
    ];
    
    generalTags.forEach(tag => suggestions.add(tag));

    res.json({ suggestions: Array.from(suggestions).slice(0, 10) });
  } catch (error) {
    console.error("Error generating tag suggestions:", error);
    res.status(500).json({ error: "Failed to generate suggestions" });
  }
});

export default router;