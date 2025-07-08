describe('Tracker Taylor - List Management Expert', () => {
  // Goal: Log & resume lists in ≤3 clicks
  
  beforeEach(() => {
    cy.login();
    cy.visit('/');
  });

  describe('TT-001: Quick List Creation from Home Page', () => {
    it('should create list in ≤3 clicks', () => {
      let clickCount = 0;
      
      // Track clicks
      cy.window().then((win) => {
        win.addEventListener('click', () => clickCount++);
      });
      
      // Click 1: Create List button
      cy.get('[data-testid="create-list-button"]').click();
      
      // Click 2: Fill and submit (single interaction)
      cy.get('[data-testid="list-name-input"]').type('Quick Pizza List');
      cy.get('[data-testid="create-list-submit"]').click();
      
      // Click 3: (Should be done by now)
      cy.url().should('include', '/lists/');
      cy.get('[data-testid="list-title"]').should('contain', 'Quick Pizza List');
      
      // Verify ≤3 clicks
      cy.then(() => {
        expect(clickCount).to.be.lessThan(4);
      });
    });
  });

  describe('TT-002: Resume Editing Existing List', () => {
    it('should quickly resume editing a list', () => {
      // Given: User has an existing list
      cy.createList('Existing List');
      
      // When: User navigates to lists and resumes editing
      cy.visit('/lists');
      cy.get('[data-testid="list-item"]').first().click(); // Click 1
      cy.get('[data-testid="add-restaurant-button"]').click(); // Click 2
      
      // Then: User can immediately start adding restaurants
      cy.get('[data-testid="restaurant-search"]').should('be.visible');
      cy.get('[data-testid="restaurant-search"]').type('New Restaurant');
      cy.get('[data-testid="search-result"]').first().click(); // Click 3
      
      // Verify restaurant added
      cy.get('[data-testid="save-to-list-button"]').click();
      cy.get('[data-testid="list-item"]').should('contain', 'New Restaurant');
    });
  });

  describe('TT-003: Add Restaurant to List via Search', () => {
    it('should add restaurant to existing list efficiently', () => {
      // Given: User has a list and wants to add a restaurant
      cy.createList('My Restaurant List');
      cy.visit('/lists/1');
      
      // When: User searches and adds restaurant
      cy.get('[data-testid="add-restaurant-button"]').click();
      cy.get('[data-testid="restaurant-search"]').type('Italian Bistro');
      cy.get('[data-testid="search-result"]').first().click();
      
      // And: Quickly adds with basic info
      cy.get('[data-testid="rating-stars"]').find('[data-rating="4"]').click();
      cy.get('[data-testid="save-to-list-button"]').click();
      
      // Then: Restaurant is added successfully
      cy.get('[data-testid="list-item"]').should('contain', 'Italian Bistro');
      cy.get('[data-testid="list-item-rating"]').should('contain', '4');
    });
  });

  describe('TT-004: Bulk Operations on List Items', () => {
    it('should support bulk operations for efficient list management', () => {
      // Given: User has a list with multiple items
      cy.createListWithItems('Bulk Operations List', [
        'Restaurant 1',
        'Restaurant 2', 
        'Restaurant 3'
      ]);
      cy.visit('/lists/1');
      
      // When: User selects multiple items
      cy.get('[data-testid="bulk-select-checkbox"]').check();
      cy.get('[data-testid="list-item-checkbox"]').eq(0).check();
      cy.get('[data-testid="list-item-checkbox"]').eq(1).check();
      
      // And: Performs bulk action
      cy.get('[data-testid="bulk-actions-menu"]').click();
      cy.get('[data-testid="bulk-delete-button"]').click();
      cy.get('[data-testid="confirm-bulk-delete"]').click();
      
      // Then: Items are removed efficiently
      cy.get('[data-testid="list-item"]').should('have.length', 1);
      cy.get('[data-testid="list-item"]').should('contain', 'Restaurant 3');
    });
  });

  describe('Taylor\'s Efficiency Metrics', () => {
    it('should meet performance expectations for list operations', () => {
      // Test response times for common operations
      cy.visit('/lists');
      
      // List loading should be fast
      cy.get('[data-testid="lists-container"]').should('be.visible');
      cy.get('[data-testid="list-item"]').should('be.visible');
      
      // List creation should be immediate
      const startTime = Date.now();
      cy.get('[data-testid="create-list-button"]').click();
      cy.get('[data-testid="list-name-input"]').type('Speed Test List');
      cy.get('[data-testid="create-list-submit"]').click();
      
      cy.url().should('include', '/lists/').then(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        expect(duration).to.be.lessThan(2000); // Under 2 seconds
      });
    });
  });

  afterEach(() => {
    cy.cleanupTestData();
  });
});