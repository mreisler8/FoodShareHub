describe('Explorer Alex - Discovery Enthusiast', () => {
  // Goal: Discover Top Picks easily
  
  beforeEach(() => {
    cy.login();
    cy.visit('/');
  });

  describe('EA-001: Browse Top Picks Tab on Home Page', () => {
    it('should easily discover top picks from home page', () => {
      // Given: User is on home page
      cy.get('[data-testid="section-tabs"]').should('be.visible');
      
      // When: User clicks on Top Picks tab
      cy.get('[data-testid="top-picks-tab"]').click();
      
      // Then: Top picks are displayed
      cy.get('[data-testid="top-picks-carousel"]').should('be.visible');
      cy.get('[data-testid="top-pick-card"]').should('have.length.greaterThan', 0);
      
      // And: Each pick shows essential info
      cy.get('[data-testid="top-pick-card"]').first().within(() => {
        cy.get('[data-testid="restaurant-name"]').should('be.visible');
        cy.get('[data-testid="restaurant-rating"]').should('be.visible');
        cy.get('[data-testid="restaurant-cuisine"]').should('be.visible');
        cy.get('[data-testid="restaurant-location"]').should('be.visible');
      });
    });
    
    it('should show variety of top picks', () => {
      // When: User views top picks
      cy.get('[data-testid="top-picks-tab"]').click();
      
      // Then: Multiple categories are represented
      cy.get('[data-testid="top-pick-card"]').should('have.length.greaterThan', 2);
      
      // And: Different cuisines are shown
      const cuisines = [];
      cy.get('[data-testid="restaurant-cuisine"]').each(($el) => {
        cuisines.push($el.text());
      }).then(() => {
        expect(new Set(cuisines).size).to.be.greaterThan(1); // Multiple unique cuisines
      });
    });
  });

  describe('EA-002: Filter Top Picks by Cuisine/Location', () => {
    it('should filter top picks by cuisine', () => {
      // Given: User is viewing top picks
      cy.get('[data-testid="top-picks-tab"]').click();
      
      // When: User filters by cuisine
      cy.get('[data-testid="cuisine-filter"]').select('Italian');
      
      // Then: Only Italian restaurants are shown
      cy.get('[data-testid="top-pick-card"]').each(($card) => {
        cy.wrap($card).find('[data-testid="restaurant-cuisine"]').should('contain', 'Italian');
      });
    });
    
    it('should filter top picks by location', () => {
      // Given: User is viewing top picks
      cy.get('[data-testid="top-picks-tab"]').click();
      
      // When: User filters by location
      cy.get('[data-testid="location-filter"]').select('Downtown');
      
      // Then: Only downtown restaurants are shown
      cy.get('[data-testid="top-pick-card"]').each(($card) => {
        cy.wrap($card).find('[data-testid="restaurant-location"]').should('contain', 'Downtown');
      });
    });
    
    it('should allow combined filters', () => {
      // Given: User is viewing top picks
      cy.get('[data-testid="top-picks-tab"]').click();
      
      // When: User applies multiple filters
      cy.get('[data-testid="cuisine-filter"]').select('Italian');
      cy.get('[data-testid="location-filter"]').select('Downtown');
      
      // Then: Results match both criteria
      cy.get('[data-testid="top-pick-card"]').each(($card) => {
        cy.wrap($card).find('[data-testid="restaurant-cuisine"]').should('contain', 'Italian');
        cy.wrap($card).find('[data-testid="restaurant-location"]').should('contain', 'Downtown');
      });
    });
  });

  describe('EA-003: Click Through to Restaurant Details', () => {
    it('should navigate to restaurant details on click', () => {
      // Given: User is viewing top picks
      cy.get('[data-testid="top-picks-tab"]').click();
      
      // When: User clicks on a restaurant card
      cy.get('[data-testid="top-pick-card"]').first().click();
      
      // Then: User is taken to restaurant details
      cy.url().should('include', '/restaurants/');
      cy.get('[data-testid="restaurant-detail-page"]').should('be.visible');
      cy.get('[data-testid="restaurant-name"]').should('be.visible');
      cy.get('[data-testid="restaurant-details"]').should('be.visible');
    });
    
    it('should show comprehensive restaurant information', () => {
      // Given: User clicks on a restaurant
      cy.get('[data-testid="top-picks-tab"]').click();
      cy.get('[data-testid="top-pick-card"]').first().click();
      
      // Then: Detailed information is displayed
      cy.get('[data-testid="restaurant-name"]').should('be.visible');
      cy.get('[data-testid="restaurant-rating"]').should('be.visible');
      cy.get('[data-testid="restaurant-cuisine"]').should('be.visible');
      cy.get('[data-testid="restaurant-location"]').should('be.visible');
      cy.get('[data-testid="restaurant-posts"]').should('be.visible');
      cy.get('[data-testid="restaurant-photos"]').should('be.visible');
    });
  });

  describe('EA-004: Save Interesting Restaurants to Personal List', () => {
    it('should save restaurant to existing list', () => {
      // Given: User has an existing list
      cy.createList('Interesting Finds');
      
      // And: User is viewing top picks
      cy.visit('/');
      cy.get('[data-testid="top-picks-tab"]').click();
      cy.get('[data-testid="top-pick-card"]').first().click();
      
      // When: User saves restaurant to list
      cy.get('[data-testid="save-to-list-button"]').click();
      cy.get('[data-testid="list-selector"]').select('Interesting Finds');
      cy.get('[data-testid="confirm-save-button"]').click();
      
      // Then: Restaurant is added to list
      cy.get('[data-testid="save-success-message"]').should('be.visible');
      
      // Verify in list
      cy.visit('/lists/1');
      cy.get('[data-testid="list-item"]').should('have.length', 1);
    });
    
    it('should create new list while saving restaurant', () => {
      // Given: User is viewing a restaurant
      cy.visit('/');
      cy.get('[data-testid="top-picks-tab"]').click();
      cy.get('[data-testid="top-pick-card"]').first().click();
      
      // When: User creates new list while saving
      cy.get('[data-testid="save-to-list-button"]').click();
      cy.get('[data-testid="create-new-list-option"]').click();
      cy.get('[data-testid="new-list-name"]').type('Places to Try');
      cy.get('[data-testid="create-and-save-button"]').click();
      
      // Then: New list is created and restaurant is saved
      cy.get('[data-testid="save-success-message"]').should('be.visible');
      cy.visit('/lists');
      cy.get('[data-testid="list-item"]').should('contain', 'Places to Try');
    });
  });

  describe('Alex\'s Discovery Experience', () => {
    it('should provide smooth discovery flow', () => {
      // Test complete discovery workflow
      cy.visit('/');
      
      // Browse top picks
      cy.get('[data-testid="top-picks-tab"]').click();
      cy.get('[data-testid="top-pick-card"]').should('be.visible');
      
      // Filter by interest
      cy.get('[data-testid="cuisine-filter"]').select('Asian');
      cy.get('[data-testid="top-pick-card"]').first().click();
      
      // Save to list
      cy.get('[data-testid="save-to-list-button"]').click();
      cy.get('[data-testid="create-new-list-option"]').click();
      cy.get('[data-testid="new-list-name"]').type('Asian Favorites');
      cy.get('[data-testid="create-and-save-button"]').click();
      
      // Verify saved
      cy.get('[data-testid="save-success-message"]').should('be.visible');
    });
    
    it('should handle no results gracefully', () => {
      // Given: User applies very specific filters
      cy.get('[data-testid="top-picks-tab"]').click();
      cy.get('[data-testid="cuisine-filter"]').select('Mongolian');
      cy.get('[data-testid="location-filter"]').select('Specific District');
      
      // When: No results match
      cy.get('[data-testid="no-results-message"]').should('be.visible');
      cy.get('[data-testid="no-results-message"]').should('contain', 'No restaurants match your filters');
      
      // And: User can clear filters
      cy.get('[data-testid="clear-filters-button"]').click();
      cy.get('[data-testid="top-pick-card"]').should('be.visible');
    });
  });

  afterEach(() => {
    cy.cleanupTestData();
  });
});