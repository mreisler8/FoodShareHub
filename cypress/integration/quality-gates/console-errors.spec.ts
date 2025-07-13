describe('Console Errors Quality Gate', () => {
  beforeEach(() => {
    cy.login();
    
    // Set up console error monitoring
    cy.window().then((win) => {
      cy.stub(win.console, 'error').as('consoleError');
      cy.stub(win.console, 'warn').as('consoleWarn');
    });
  });

  describe('Critical User Flows - Zero Console Errors', () => {
    it('should have no console errors during restaurant search', () => {
      // Given: User performs restaurant search
      cy.visit('/');
      cy.get('[data-testid="hero-search-button"]').click();
      cy.get('[data-testid="search-input"]').type('Italian restaurant');
      cy.get('[data-testid="search-result"]').first().click();
      
      // Then: No console errors should occur
      cy.get('@consoleError').should('not.have.been.called');
    });
    
    it('should have no console errors during list creation', () => {
      // Given: User creates a new list
      cy.visit('/');
      cy.get('[data-testid="create-list-button"]').click();
      cy.get('[data-testid="list-name-input"]').type('Test List');
      cy.get('[data-testid="create-list-submit"]').click();
      
      // Then: No console errors should occur
      cy.get('@consoleError').should('not.have.been.called');
    });
    
    it('should have no console errors during post creation', () => {
      // Given: User creates a new post
      cy.visit('/');
      cy.get('[data-testid="create-post-button"]').click();
      cy.get('[data-testid="restaurant-search"]').type('Test Restaurant');
      cy.get('[data-testid="search-result"]').first().click();
      cy.get('[data-testid="post-content"]').type('Test post content');
      cy.get('[data-testid="save-post-button"]').click();
      
      // Then: No console errors should occur
      cy.get('@consoleError').should('not.have.been.called');
    });
    
    it('should have no console errors during navigation', () => {
      // Given: User navigates between pages
      cy.visit('/');
      cy.get('[data-testid="lists-nav"]').click();
      cy.get('[data-testid="circles-nav"]').click();
      cy.get('[data-testid="discover-nav"]').click();
      cy.get('[data-testid="home-nav"]').click();
      
      // Then: No console errors should occur
      cy.get('@consoleError').should('not.have.been.called');
    });
  });

  describe('API Error Handling', () => {
    it('should handle API errors gracefully without console errors', () => {
      // Given: API returns error
      cy.intercept('GET', '/api/lists', { statusCode: 500 }).as('listsError');
      
      // When: User navigates to lists
      cy.visit('/lists');
      cy.wait('@listsError');
      
      // Then: Error is handled gracefully
      cy.get('[data-testid="error-message"]').should('be.visible');
      cy.get('@consoleError').should('not.have.been.called');
    });
    
    it('should handle network failures without console errors', () => {
      // Given: Network request fails
      cy.intercept('GET', '/api/restaurants/search*', { forceNetworkError: true }).as('networkError');
      
      // When: User searches for restaurants
      cy.visit('/');
      cy.get('[data-testid="hero-search-button"]').click();
      cy.get('[data-testid="search-input"]').type('Restaurant');
      cy.wait('@networkError');
      
      // Then: Network error is handled gracefully
      cy.get('[data-testid="network-error-message"]').should('be.visible');
      cy.get('@consoleError').should('not.have.been.called');
    });
  });

  describe('Form Validation Errors', () => {
    it('should handle form validation without console errors', () => {
      // Given: User submits invalid form
      cy.visit('/');
      cy.get('[data-testid="create-list-button"]').click();
      cy.get('[data-testid="create-list-submit"]').click(); // Submit without name
      
      // Then: Validation errors are shown properly
      cy.get('[data-testid="validation-error"]').should('be.visible');
      cy.get('@consoleError').should('not.have.been.called');
    });
  });

  describe('Console Warning Monitoring', () => {
    it('should minimize console warnings in production flows', () => {
      // Given: User performs common actions
      cy.visit('/');
      cy.get('[data-testid="top-picks-tab"]').click();
      cy.get('[data-testid="my-lists-tab"]').click();
      
      // Then: Minimal warnings should occur
      cy.get('@consoleWarn').should('have.been.calledLess', 5);
    });
  });

  afterEach(() => {
    // Report any unexpected console errors
    cy.get('@consoleError').then((consoleError) => {
      if (consoleError.called) {
        cy.log('Console errors detected:', consoleError.args);
      }
    });
  });
});