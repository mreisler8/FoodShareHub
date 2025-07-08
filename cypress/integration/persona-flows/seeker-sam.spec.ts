describe('Seeker Sam - Occasion-Specific Finder', () => {
  // Goal: Find occasion-specific recommendations in one place
  
  beforeEach(() => {
    cy.login();
    cy.visit('/');
  });

  describe('SS-001: Create "Date Night" Tagged List', () => {
    it('should create occasion-specific list with appropriate tags', () => {
      // Given: User wants to create a date night list
      cy.get('[data-testid="create-list-button"]').click();
      
      // When: User creates list with date night tags
      cy.get('[data-testid="list-name-input"]').type('Perfect Date Night Spots');
      cy.get('[data-testid="list-description-input"]').type('Romantic restaurants for special occasions');
      cy.get('[data-testid="list-tags-input"]').type('Date Night, Romantic, Intimate, Fine Dining');
      
      // And: Sets appropriate privacy (private for personal use)
      cy.get('[data-testid="make-private-option"]').check();
      cy.get('[data-testid="create-list-submit"]').click();
      
      // Then: List is created with proper tags
      cy.get('[data-testid="list-title"]').should('contain', 'Perfect Date Night Spots');
      cy.get('[data-testid="list-tags"]').should('contain', 'Date Night');
      cy.get('[data-testid="list-tags"]').should('contain', 'Romantic');
      cy.get('[data-testid="list-tags"]').should('contain', 'Intimate');
      cy.get('[data-testid="list-tags"]').should('contain', 'Fine Dining');
    });
  });

  describe('SS-002: Filter Lists by Tags', () => {
    it('should filter lists by occasion tags', () => {
      // Given: User has multiple occasion-specific lists
      cy.createList('Date Night Spots', { tags: ['Date Night', 'Romantic'] });
      cy.createList('Business Lunch Places', { tags: ['Business', 'Lunch', 'Professional'] });
      cy.createList('Family Restaurants', { tags: ['Family', 'Kids', 'Casual'] });
      
      // When: User filters by "Date Night" tag
      cy.visit('/lists');
      cy.get('[data-testid="tag-filter"]').select('Date Night');
      
      // Then: Only date night lists are shown
      cy.get('[data-testid="filtered-lists"]').should('have.length', 1);
      cy.get('[data-testid="filtered-lists"]').should('contain', 'Date Night Spots');
      cy.get('[data-testid="filtered-lists"]').should('not.contain', 'Business Lunch');
      cy.get('[data-testid="filtered-lists"]').should('not.contain', 'Family Restaurants');
    });
    
    it('should support multiple tag filters', () => {
      // Given: Lists with overlapping tags
      cy.createList('Romantic Fine Dining', { tags: ['Date Night', 'Romantic', 'Fine Dining'] });
      cy.createList('Casual Date Spots', { tags: ['Date Night', 'Casual', 'Affordable'] });
      cy.createList('Anniversary Restaurants', { tags: ['Romantic', 'Fine Dining', 'Special Occasion'] });
      
      // When: User filters by multiple tags
      cy.visit('/lists');
      cy.get('[data-testid="tag-filter"]').select('Date Night');
      cy.get('[data-testid="tag-filter-2"]').select('Romantic');
      
      // Then: Only lists with both tags are shown
      cy.get('[data-testid="filtered-lists"]').should('contain', 'Romantic Fine Dining');
      cy.get('[data-testid="filtered-lists"]').should('not.contain', 'Casual Date Spots');
    });
  });

  describe('SS-003: Search Lists by Occasion', () => {
    it('should search lists by occasion keywords', () => {
      // Given: User has occasion-specific lists
      cy.createList('Birthday Celebration Spots', { tags: ['Birthday', 'Celebration'] });
      cy.createList('Quiet Study Cafes', { tags: ['Study', 'Quiet', 'Coffee'] });
      cy.createList('Group Dinner Places', { tags: ['Group', 'Dinner', 'Large Tables'] });
      
      // When: User searches for "birthday"
      cy.visit('/lists');
      cy.get('[data-testid="list-search-input"]').type('birthday');
      
      // Then: Relevant lists are shown
      cy.get('[data-testid="search-results"]').should('contain', 'Birthday Celebration Spots');
      cy.get('[data-testid="search-results"]').should('not.contain', 'Quiet Study Cafes');
    });
    
    it('should search within list descriptions', () => {
      // Given: Lists with descriptive content
      cy.createList('Special Occasions', { 
        description: 'Perfect for anniversaries, birthdays, and milestone celebrations',
        tags: ['Special', 'Celebrations'] 
      });
      
      // When: User searches for "anniversary"
      cy.visit('/lists');
      cy.get('[data-testid="list-search-input"]').type('anniversary');
      
      // Then: List is found via description
      cy.get('[data-testid="search-results"]').should('contain', 'Special Occasions');
    });
  });

  describe('SS-004: View Curated Lists for Specific Events', () => {
    it('should display curated lists with event-specific recommendations', () => {
      // Given: User has created event-specific lists
      cy.createListWithItems('Wedding Anniversary Dinner', [
        { name: 'Le Bernardin', tags: ['Fine Dining', 'Romantic', 'Seafood'] },
        { name: 'Daniel', tags: ['Fine Dining', 'French', 'Elegant'] }
      ]);
      
      // When: User views the list
      cy.visit('/lists/1');
      
      // Then: List shows event-appropriate restaurants
      cy.get('[data-testid="list-title"]').should('contain', 'Wedding Anniversary Dinner');
      cy.get('[data-testid="list-item"]').should('contain', 'Le Bernardin');
      cy.get('[data-testid="list-item"]').should('contain', 'Daniel');
      
      // And: Restaurants have appropriate ratings and notes
      cy.get('[data-testid="list-item"]').first().within(() => {
        cy.get('[data-testid="restaurant-rating"]').should('be.visible');
        cy.get('[data-testid="occasion-notes"]').should('be.visible');
      });
    });
    
    it('should show occasion-specific filtering within lists', () => {
      // Given: List with restaurants suitable for different occasions
      cy.createListWithItems('Versatile Restaurants', [
        { name: 'Casual Spot', tags: ['Casual', 'Lunch', 'Family'] },
        { name: 'Upscale Place', tags: ['Fine Dining', 'Date Night', 'Special'] },
        { name: 'Group Friendly', tags: ['Groups', 'Loud', 'Fun'] }
      ]);
      
      // When: User filters within the list by occasion
      cy.visit('/lists/1');
      cy.get('[data-testid="list-filter"]').select('Date Night');
      
      // Then: Only appropriate restaurants are shown
      cy.get('[data-testid="filtered-list-items"]').should('contain', 'Upscale Place');
      cy.get('[data-testid="filtered-list-items"]').should('not.contain', 'Casual Spot');
    });
  });

  describe('Sam\'s Occasion-Based Discovery', () => {
    it('should provide comprehensive occasion-based search', () => {
      // Test complete occasion discovery workflow
      
      // Create various occasion lists
      cy.createList('Date Night', { tags: ['Date Night', 'Romantic'] });
      cy.createList('Business Meals', { tags: ['Business', 'Professional'] });
      cy.createList('Family Outings', { tags: ['Family', 'Kids'] });
      
      // User searches for specific occasion
      cy.visit('/lists');
      cy.get('[data-testid="occasion-search"]').type('romantic dinner');
      
      // System shows relevant results
      cy.get('[data-testid="occasion-results"]').should('contain', 'Date Night');
      
      // User can refine by additional criteria
      cy.get('[data-testid="price-filter"]').select('$$$');
      cy.get('[data-testid="cuisine-filter"]').select('Italian');
      
      // Results are appropriately filtered
      cy.get('[data-testid="refined-results"]').should('be.visible');
    });
    
    it('should suggest relevant occasions based on user history', () => {
      // Given: User has created several occasion-specific lists
      cy.createMultipleOccasionLists();
      
      // When: User starts creating a new list
      cy.get('[data-testid="create-list-button"]').click();
      
      // Then: System suggests relevant occasions
      cy.get('[data-testid="occasion-suggestions"]').should('be.visible');
      cy.get('[data-testid="occasion-suggestions"]').should('contain', 'Date Night');
      cy.get('[data-testid="occasion-suggestions"]').should('contain', 'Business Lunch');
      
      // User can select a suggestion
      cy.get('[data-testid="occasion-suggestion"]').contains('Date Night').click();
      cy.get('[data-testid="suggested-tags"]').should('contain', 'Romantic');
    });
  });

  afterEach(() => {
    cy.cleanupTestData();
  });
});