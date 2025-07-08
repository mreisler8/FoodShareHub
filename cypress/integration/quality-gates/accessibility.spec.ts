describe('Accessibility Quality Gate', () => {
  beforeEach(() => {
    cy.login();
    cy.injectAxe(); // Inject axe-core for accessibility testing
  });

  describe('WCAG 2.1 AA Compliance', () => {
    it('should have no accessibility violations on home page', () => {
      cy.visit('/');
      cy.checkA11y();
    });
    
    it('should have no accessibility violations on lists page', () => {
      cy.visit('/lists');
      cy.checkA11y();
    });
    
    it('should have no accessibility violations on create list page', () => {
      cy.visit('/');
      cy.get('[data-testid="create-list-button"]').click();
      cy.checkA11y();
    });
    
    it('should have no accessibility violations on post creation', () => {
      cy.visit('/');
      cy.get('[data-testid="create-post-button"]').click();
      cy.checkA11y();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate main menu with keyboard', () => {
      cy.visit('/');
      
      // Tab through main navigation
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-testid', 'home-nav');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-testid', 'discover-nav');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-testid', 'create-post-nav');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-testid', 'circles-nav');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-testid', 'lists-nav');
    });
    
    it('should navigate search results with keyboard', () => {
      cy.visit('/');
      cy.get('[data-testid="hero-search-button"]').click();
      cy.get('[data-testid="search-input"]').type('Italian');
      
      // Arrow down to navigate results
      cy.get('[data-testid="search-input"]').type('{downarrow}');
      cy.focused().should('have.attr', 'data-testid', 'search-result');
      
      // Arrow down to next result
      cy.focused().type('{downarrow}');
      cy.focused().should('have.attr', 'data-testid', 'search-result');
      
      // Enter to select
      cy.focused().type('{enter}');
      cy.get('[data-testid="selected-restaurant"]').should('be.visible');
    });
    
    it('should navigate forms with keyboard', () => {
      cy.visit('/');
      cy.get('[data-testid="create-list-button"]').click();
      
      // Tab through form fields
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-testid', 'list-name-input');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-testid', 'list-description-input');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-testid', 'list-tags-input');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-testid', 'share-with-circle-checkbox');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-testid', 'create-list-submit');
    });
    
    it('should handle modal keyboard navigation', () => {
      cy.visit('/');
      cy.get('[data-testid="create-post-button"]').click();
      
      // Focus should be trapped in modal
      cy.get('[data-testid="modal-close-button"]').should('be.visible');
      
      // Tab should cycle through modal elements
      cy.get('body').tab();
      cy.focused().should('be.inside', '[data-testid="post-modal"]');
      
      // Escape should close modal
      cy.get('body').type('{esc}');
      cy.get('[data-testid="post-modal"]').should('not.exist');
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper ARIA labels on interactive elements', () => {
      cy.visit('/');
      
      // Navigation elements should have ARIA labels
      cy.get('[data-testid="home-nav"]').should('have.attr', 'aria-label');
      cy.get('[data-testid="discover-nav"]').should('have.attr', 'aria-label');
      cy.get('[data-testid="lists-nav"]').should('have.attr', 'aria-label');
      
      // Buttons should have accessible names
      cy.get('[data-testid="create-list-button"]').should('have.attr', 'aria-label');
      cy.get('[data-testid="hero-search-button"]').should('have.attr', 'aria-label');
    });
    
    it('should have proper heading hierarchy', () => {
      cy.visit('/');
      
      // Page should have proper heading structure
      cy.get('h1').should('exist');
      cy.get('h2').should('exist');
      
      // Headings should be in logical order
      cy.get('h1').should('contain', 'Circles');
      cy.get('h2').first().should('contain', 'My Lists');
    });
    
    it('should announce form validation errors', () => {
      cy.visit('/');
      cy.get('[data-testid="create-list-button"]').click();
      
      // Submit empty form
      cy.get('[data-testid="create-list-submit"]').click();
      
      // Error should be announced
      cy.get('[data-testid="validation-error"]').should('have.attr', 'role', 'alert');
      cy.get('[data-testid="validation-error"]').should('have.attr', 'aria-live', 'polite');
    });
    
    it('should have proper landmark roles', () => {
      cy.visit('/');
      
      // Page should have proper landmarks
      cy.get('main').should('have.attr', 'role', 'main');
      cy.get('nav').should('have.attr', 'role', 'navigation');
      cy.get('[data-testid="search-region"]').should('have.attr', 'role', 'search');
    });
  });

  describe('Color Contrast', () => {
    it('should meet WCAG AA color contrast requirements', () => {
      cy.visit('/');
      
      // Check color contrast for text elements
      cy.checkA11y(null, {
        rules: {
          'color-contrast': { enabled: true }
        }
      });
    });
    
    it('should be usable without color alone', () => {
      cy.visit('/lists');
      
      // Create lists with different privacy levels
      cy.createList('Private List', { visibility: 'private' });
      cy.createList('Public List', { visibility: 'public' });
      
      // Privacy should be indicated by more than just color
      cy.get('[data-testid="privacy-indicator"]').should('contain.text', 'Private');
      cy.get('[data-testid="privacy-indicator"]').should('contain.text', 'Public');
      
      // Icons should accompany color indicators
      cy.get('[data-testid="privacy-icon"]').should('be.visible');
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators', () => {
      cy.visit('/');
      
      // Tab to first focusable element
      cy.get('body').tab();
      cy.focused().should('have.css', 'outline');
      
      // Focus should be clearly visible
      cy.focused().should('have.css', 'outline-width').and('not.equal', '0px');
    });
    
    it('should manage focus in dynamic content', () => {
      cy.visit('/lists');
      
      // When content is loaded dynamically
      cy.get('[data-testid="load-more-button"]').click();
      
      // Focus should remain manageable
      cy.get('[data-testid="new-list-item"]').first().focus();
      cy.focused().should('be.visible');
    });
    
    it('should handle modal focus correctly', () => {
      cy.visit('/');
      cy.get('[data-testid="create-post-button"]').click();
      
      // Focus should move to modal
      cy.focused().should('be.inside', '[data-testid="post-modal"]');
      
      // When modal closes, focus should return
      cy.get('[data-testid="modal-close-button"]').click();
      cy.focused().should('have.attr', 'data-testid', 'create-post-button');
    });
  });

  describe('Alternative Text and Media', () => {
    it('should have alt text for images', () => {
      cy.visit('/');
      
      // All images should have alt text
      cy.get('img').each(($img) => {
        cy.wrap($img).should('have.attr', 'alt');
      });
    });
    
    it('should handle missing images gracefully', () => {
      cy.visit('/');
      
      // Broken images should have descriptive alt text
      cy.get('[data-testid="restaurant-image"]').should('have.attr', 'alt').and('not.be.empty');
    });
  });

  describe('Mobile Accessibility', () => {
    it('should be accessible on mobile devices', () => {
      cy.viewport('iphone-6');
      cy.visit('/');
      
      // Touch targets should be large enough
      cy.get('[data-testid="mobile-nav-item"]').should('have.css', 'min-height', '44px');
      cy.get('[data-testid="mobile-nav-item"]').should('have.css', 'min-width', '44px');
      
      // Check accessibility on mobile
      cy.checkA11y();
    });
    
    it('should handle mobile screen reader navigation', () => {
      cy.viewport('iphone-6');
      cy.visit('/');
      
      // Mobile navigation should have proper ARIA
      cy.get('[data-testid="mobile-nav"]').should('have.attr', 'role', 'navigation');
      cy.get('[data-testid="mobile-nav-item"]').should('have.attr', 'role', 'tab');
    });
  });

  afterEach(() => {
    cy.cleanupTestData();
  });
});