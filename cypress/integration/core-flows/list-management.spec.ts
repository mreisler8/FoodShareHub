describe('List Management Flow', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/');
  });

  describe('TC-CF-004: List Creation Flow', () => {
    it('should allow user to create new list', () => {
      // Given: User is authenticated
      cy.get('[data-testid="create-list-button"]').should('be.visible');
      
      // When: User clicks "Create List"
      cy.get('[data-testid="create-list-button"]').click();
      
      // And: Enters list details
      cy.get('[data-testid="list-name-input"]').type('Best Pizza Places');
      cy.get('[data-testid="list-description-input"]').type('My favorite pizza spots in the city');
      cy.get('[data-testid="list-tags-input"]').type('pizza, italian, casual');
      
      // And: Sets sharing settings
      cy.get('[data-testid="share-with-circle-checkbox"]').check();
      cy.get('[data-testid="make-public-checkbox"]').uncheck();
      
      // And: Saves the list
      cy.get('[data-testid="create-list-submit"]').click();
      
      // Then: List is created and user is redirected
      cy.url().should('include', '/lists/');
      cy.get('[data-testid="list-title"]').should('contain', 'Best Pizza Places');
      cy.get('[data-testid="list-description"]').should('contain', 'My favorite pizza spots');
      
      // Verify ≤3 clicks for Tracker Taylor
      // TODO: Implement click counter
    });
  });

  describe('TC-CF-005: List Edit Flow', () => {
    it('should allow user to edit existing list', () => {
      // Given: User owns a list
      cy.createList('Original List Name');
      cy.visit('/lists/1');
      
      // When: User clicks edit button
      cy.get('[data-testid="edit-list-button"]').click();
      
      // And: Modifies name and sharing settings
      cy.get('[data-testid="list-name-input"]').clear().type('Updated List Name');
      cy.get('[data-testid="make-public-checkbox"]').check();
      
      // And: Saves changes
      cy.get('[data-testid="save-list-button"]').click();
      
      // Then: Changes are reflected immediately
      cy.get('[data-testid="list-title"]').should('contain', 'Updated List Name');
      cy.get('[data-testid="public-badge"]').should('be.visible');
    });
  });

  describe('TC-CF-006: List Deletion Flow', () => {
    it('should allow user to delete list with confirmation', () => {
      // Given: User owns a list with items
      cy.createListWithItems('List to Delete', ['Restaurant 1', 'Restaurant 2']);
      cy.visit('/lists/1');
      
      // When: User clicks delete button
      cy.get('[data-testid="delete-list-button"]').click();
      
      // And: Confirms deletion
      cy.get('[data-testid="confirm-delete-button"]').click();
      
      // Then: List is removed and user redirected
      cy.url().should('include', '/lists');
      cy.get('[data-testid="list-item"]').should('not.contain', 'List to Delete');
    });
    
    it('should cancel deletion when user chooses cancel', () => {
      // Given: User owns a list
      cy.createList('List to Keep');
      cy.visit('/lists/1');
      
      // When: User clicks delete but cancels
      cy.get('[data-testid="delete-list-button"]').click();
      cy.get('[data-testid="cancel-delete-button"]').click();
      
      // Then: List remains intact
      cy.get('[data-testid="list-title"]').should('contain', 'List to Keep');
    });
  });

  describe('TC-CF-007: List Tag Creation', () => {
    it('should allow creating and filtering by tags', () => {
      // Given: User is creating a new list
      cy.get('[data-testid="create-list-button"]').click();
      
      // When: User enters tags
      cy.get('[data-testid="list-name-input"]').type('Date Night Spots');
      cy.get('[data-testid="list-tags-input"]').type('Date Night, Italian, Cozy');
      cy.get('[data-testid="create-list-submit"]').click();
      
      // Then: Tags are saved and appear as filter options
      cy.get('[data-testid="list-tags"]').should('contain', 'Date Night');
      cy.get('[data-testid="list-tags"]').should('contain', 'Italian');
      cy.get('[data-testid="list-tags"]').should('contain', 'Cozy');
      
      // And: Tags are searchable
      cy.visit('/lists');
      cy.get('[data-testid="tag-filter"]').select('Date Night');
      cy.get('[data-testid="filtered-lists"]').should('contain', 'Date Night Spots');
    });
  });

  describe('TC-CF-008: Duplicate List Name Prevention', () => {
    it('should warn user about duplicate list names', () => {
      // Given: User already has a list named "Best Pizza"
      cy.createList('Best Pizza');
      
      // When: User tries to create another list with same name
      cy.get('[data-testid="create-list-button"]').click();
      cy.get('[data-testid="list-name-input"]').type('Best Pizza');
      
      // Then: Warning appears with options
      cy.get('[data-testid="duplicate-warning"]').should('be.visible');
      cy.get('[data-testid="view-existing-button"]').should('be.visible');
      cy.get('[data-testid="continue-anyway-button"]').should('be.visible');
    });
    
    it('should allow user to view existing list', () => {
      // Given: Duplicate warning is shown
      cy.createList('Best Pizza');
      cy.get('[data-testid="create-list-button"]').click();
      cy.get('[data-testid="list-name-input"]').type('Best Pizza');
      
      // When: User clicks "View Existing"
      cy.get('[data-testid="view-existing-button"]').click();
      
      // Then: User is redirected to existing list
      cy.url().should('include', '/lists/1');
      cy.get('[data-testid="list-title"]').should('contain', 'Best Pizza');
    });
  });

  afterEach(() => {
    cy.cleanupTestData();
  });
});