// Test script to create a rating for Badiali using the actual Google Place ID from search
const badiali = {
  googlePlaceId: "ChIJuQdEYaE1K4gRSb-QHzZpGss", // This is what the search returns
  restaurantName: "Pizzeria Badiali",
  ratingValue: 4,
  note: "Great pizza place!",
  tags: ["Pizza", "Authentic"]
};

console.log('Creating rating for Badiali:', badiali);

// This would be used to POST to /api/ratings with the restaurant data
// to test if the rating system works for any restaurant found through search