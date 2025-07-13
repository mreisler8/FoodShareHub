describe('Error Boundaries and Loading States', () => {
  beforeEach(() => {
    cy.login();
  });

  describe('Loading States', () => {
    it('should show loading states during data fetching', () => {
      // Given: Slow API response
      cy.intercept('GET', '/api/lists', { delay: 2000 }).as('slowLists');
      
      // When: User navigates to lists
      cy.visit('/lists');
      
      // Then: Loading state is shown
      cy.get('[data-testid="loading-spinner"]').should('be.visible');
      cy.get('[data-testid="loading-message"]').should('contain', 'Loading lists...');
      
      // And: Content loads after delay
      cy.wait('@slowLists');
      cy.get('[data-testid="loading-spinner"]').should('not.exist');
      cy.get('[data-testid="lists-container"]').should('be.visible');
    });
    
    it('should show skeleton loading for list items', () => {
      // Given: Slow API response
      cy.intercept('GET', '/api/lists', { delay: 1000 }).as('slowLists');
      
      // When: User navigates to lists
      cy.visit('/lists');
      
      // Then: Skeleton loading is shown
      cy.get('[data-testid="skeleton-list-item"]').should('be.visible');
      cy.get('[data-testid="skeleton-list-item"]').should('have.length.greaterThan', 2);
      
      // And: Real content replaces skeleton
      cy.wait('@slowLists');
      cy.get('[data-testid="skeleton-list-item"]').should('not.exist');
    });
    
    it('should show loading states for restaurant search', () => {
      // Given: Slow search API
      cy.intercept('GET', '/api/restaurants/search*', { delay: 1500 }).as('slowSearch');
      
      // When: User searches for restaurants
      cy.visit('/');
      cy.get('[data-testid="hero-search-button"]').click();
      cy.get('[data-testid="search-input"]').type('Italian');
      
      // Then: Search loading is shown
      cy.get('[data-testid="search-loading"]').should('be.visible');
      cy.get('[data-testid="search-loading-message"]').should('contain', 'Searching...');
      
      // And: Results appear after loading
      cy.wait('@slowSearch');
      cy.get('[data-testid="search-loading"]').should('not.exist');
      cy.get('[data-testid="search-results"]').should('be.visible');
    });
  });

  describe('Error Boundaries', () => {
    it('should catch and display component errors gracefully', () => {
      // Given: Component throws error
      cy.window().then((win) => {
        // Simulate component error
        win.postMessage({ type: 'TRIGGER_ERROR', component: 'ListItem' }, '*');
      });
      
      // When: User navigates to lists
      cy.visit('/lists');
      
      // Then: Error boundary catches error
      cy.get('[data-testid="error-boundary"]').should('be.visible');
      cy.get('[data-testid="error-boundary-message"]').should('contain', 'Something went wrong');
      cy.get('[data-testid="error-boundary-retry"]').should('be.visible');
    });
    
    it('should allow recovery from error boundary', () => {
      // Given: Error boundary is triggered
      cy.window().then((win) => {
        win.postMessage({ type: 'TRIGGER_ERROR', component: 'PostCard' }, '*');
      });
      cy.visit('/');
      
      // When: User clicks retry
      cy.get('[data-testid="error-boundary-retry"]').click();
      
      // Then: Component recovers
      cy.get('[data-testid="error-boundary"]').should('not.exist');
      cy.get('[data-testid="feed-section"]').should('be.visible');
    });
    
    it('should isolate errors to specific components', () => {
      // Given: One component has error
      cy.window().then((win) => {
        win.postMessage({ type: 'TRIGGER_ERROR', component: 'PostCard' }, '*');
      });
      cy.visit('/');
      
      // When: Error occurs in post card
      cy.get('[data-testid="post-error-boundary"]').should('be.visible');
      
      // Then: Other components remain functional
      cy.get('[data-testid="hero-section"]').should('be.visible');
      cy.get('[data-testid="navigation"]').should('be.visible');
      cy.get('[data-testid="quick-actions"]').should('be.visible');
    });
  });

  describe('API Error Handling', () => {
    it('should handle 404 errors gracefully', () => {
      // Given: API returns 404
      cy.intercept('GET', '/api/lists/999', { statusCode: 404 }).as('notFound');
      
      // When: User navigates to non-existent list
      cy.visit('/lists/999');
      
      // Then: 404 error is handled
      cy.get('[data-testid="not-found-message"]').should('be.visible');
      cy.get('[data-testid="not-found-message"]').should('contain', 'List not found');
      cy.get('[data-testid="back-to-lists-button"]').should('be.visible');
    });
    
    it('should handle 500 errors gracefully', () => {
      // Given: API returns 500
      cy.intercept('GET', '/api/lists', { statusCode: 500 }).as('serverError');
      
      // When: User navigates to lists
      cy.visit('/lists');
      
      // Then: Server error is handled
      cy.get('[data-testid="server-error-message"]').should('be.visible');
      cy.get('[data-testid="server-error-message"]').should('contain', 'Unable to load lists');
      cy.get('[data-testid="retry-button"]').should('be.visible');
    });
    
    it('should handle network connection errors', () => {
      // Given: Network connection fails
      cy.intercept('GET', '/api/lists', { forceNetworkError: true }).as('networkError');
      
      // When: User navigates to lists
      cy.visit('/lists');
      
      // Then: Network error is handled
      cy.get('[data-testid="network-error-message"]').should('be.visible');
      cy.get('[data-testid="network-error-message"]').should('contain', 'Connection problem');
      cy.get('[data-testid="retry-button"]').should('be.visible');
    });
  });

  describe('Form Error Handling', () => {
    it('should handle form submission errors', () => {
      // Given: Form submission fails
      cy.intercept('POST', '/api/lists', { statusCode: 400, body: { error: 'Invalid list name' } }).as('formError');
      
      // When: User submits invalid form
      cy.visit('/');
      cy.get('[data-testid="create-list-button"]').click();
      cy.get('[data-testid="list-name-input"]').type('Invalid@Name');
      cy.get('[data-testid="create-list-submit"]').click();
      
      // Then: Form error is displayed
      cy.get('[data-testid="form-error-message"]').should('be.visible');
      cy.get('[data-testid="form-error-message"]').should('contain', 'Invalid list name');
      cy.get('[data-testid="list-name-input"]').should('have.class', 'error');
    });
    
    it('should handle validation errors', () => {
      // Given: User enters invalid data
      cy.visit('/');
      cy.get('[data-testid="create-list-button"]').click();
      
      // When: User submits empty form
      cy.get('[data-testid="create-list-submit"]').click();
      
      // Then: Validation errors are shown
      cy.get('[data-testid="validation-error"]').should('be.visible');
      cy.get('[data-testid="validation-error"]').should('contain', 'List name is required');
      cy.get('[data-testid="list-name-input"]').should('have.class', 'error');
    });
  });

  describe('Graceful Degradation', () => {
    it('should work without JavaScript enabled features', () => {
      // Test basic functionality without advanced JS features
      cy.visit('/lists');
      cy.get('[data-testid="lists-container"]').should('be.visible');
      
      // Basic navigation should work
      cy.get('[data-testid="create-list-link"]').should('be.visible');
      cy.get('[data-testid="list-item-link"]').should('be.visible');
    });
    
    it('should handle slow network connections', () => {
      // Simulate slow network
      cy.intercept('GET', '/api/**', { delay: 3000 }).as('slowNetwork');
      
      // User should see loading states
      cy.visit('/');
      cy.get('[data-testid="loading-indicator"]').should('be.visible');
      
      // And eventual content loading
      cy.wait('@slowNetwork');
      cy.get('[data-testid="main-content"]').should('be.visible');
    });
  });

  afterEach(() => {
    cy.cleanupTestData();
  });
});