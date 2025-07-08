describe('Sharing and Privacy Flow', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/');
  });

  describe('TC-CF-009: Private List Sharing', () => {
    it('should allow sharing private list with specific circle', () => {
      // Given: User creates a private list
      cy.createList('Private Food List', { visibility: 'private' });
      cy.visit('/lists/1');
      
      // When: User shares list with specific circle
      cy.get('[data-testid="share-list-button"]').click();
      cy.get('[data-testid="share-with-circle-option"]').check();
      cy.get('[data-testid="circle-selector"]').select('Food Lovers Circle');
      cy.get('[data-testid="confirm-share-button"]').click();
      
      // Then: Only circle members can view list
      cy.get('[data-testid="circle-badge"]').should('contain', 'Food Lovers Circle');
      cy.get('[data-testid="privacy-indicator"]').should('contain', 'Circle Only');
      
      // Verify sharing settings
      cy.get('[data-testid="list-sharing-info"]').should('contain', 'Shared with Food Lovers Circle');
    });
    
    it('should restrict access to non-circle members', () => {
      // Given: List is shared with specific circle
      cy.createPrivateListSharedWithCircle('Private List', 'Food Lovers Circle');
      
      // When: Non-circle member tries to access
      cy.loginAsUser('non-circle-member');
      cy.visit('/lists/1');
      
      // Then: Access is denied
      cy.get('[data-testid="access-denied-message"]').should('be.visible');
      cy.get('[data-testid="access-denied-message"]').should('contain', 'This list is private');
    });
  });

  describe('TC-CF-010: Public List Sharing', () => {
    it('should allow creating and sharing public list', () => {
      // Given: User creates a public list
      cy.createList('Public Food List', { visibility: 'public' });
      cy.visit('/lists/1');
      
      // When: User shares list publicly
      cy.get('[data-testid="share-list-button"]').click();
      cy.get('[data-testid="make-public-option"]').check();
      cy.get('[data-testid="confirm-share-button"]').click();
      
      // Then: Anyone can view the list
      cy.get('[data-testid="public-badge"]').should('be.visible');
      cy.get('[data-testid="privacy-indicator"]').should('contain', 'Public');
      
      // Verify public sharing URL
      cy.get('[data-testid="public-share-url"]').should('contain', '/lists/1');
    });
    
    it('should allow anonymous users to view public lists', () => {
      // Given: Public list exists
      cy.createPublicList('Public Restaurant List');
      
      // When: Anonymous user visits list
      cy.logout();
      cy.visit('/lists/1');
      
      // Then: List is viewable
      cy.get('[data-testid="list-title"]').should('contain', 'Public Restaurant List');
      cy.get('[data-testid="public-badge"]').should('be.visible');
      
      // But cannot edit
      cy.get('[data-testid="edit-list-button"]').should('not.exist');
    });
  });

  describe('Post Privacy Controls', () => {
    it('should allow creating circle-only post', () => {
      // Given: User is creating a post
      cy.get('[data-testid="create-post-button"]').click();
      
      // When: User sets post visibility to circle only
      cy.get('[data-testid="post-visibility"]').select('circle');
      cy.get('[data-testid="circle-selector"]').select('Food Lovers Circle');
      cy.get('[data-testid="restaurant-search"]').type('Circle Restaurant');
      cy.get('[data-testid="search-result"]').first().click();
      cy.get('[data-testid="post-content"]').type('Circle-only dining experience');
      cy.get('[data-testid="save-post-button"]').click();
      
      // Then: Post is visible only to circle members
      cy.get('[data-testid="circle-badge"]').should('contain', 'Food Lovers Circle');
      cy.get('[data-testid="visibility-indicator"]').should('contain', 'Circle Only');
    });
    
    it('should allow changing post visibility after creation', () => {
      // Given: User has a private post
      cy.createPost('Private post', 'Test Restaurant', 4, { visibility: 'private' });
      
      // When: User changes visibility to public
      cy.get('[data-testid="edit-post-button"]').click();
      cy.get('[data-testid="post-visibility"]').select('public');
      cy.get('[data-testid="save-post-button"]').click();
      
      // Then: Post becomes public
      cy.get('[data-testid="visibility-indicator"]').should('contain', 'Public');
    });
  });

  describe('Privacy Settings Validation', () => {
    it('should validate privacy settings consistency', () => {
      // Given: User is creating a list
      cy.get('[data-testid="create-list-button"]').click();
      
      // When: User tries to select both circle and public sharing
      cy.get('[data-testid="share-with-circle-checkbox"]').check();
      cy.get('[data-testid="make-public-checkbox"]').check();
      
      // Then: System should handle mutual exclusivity
      cy.get('[data-testid="privacy-warning"]').should('be.visible');
      cy.get('[data-testid="privacy-warning"]').should('contain', 'Choose one sharing option');
    });
    
    it('should show appropriate privacy indicators', () => {
      // Test different privacy levels have correct visual indicators
      const privacyLevels = [
        { level: 'private', indicator: 'Private', badge: 'lock-icon' },
        { level: 'circle', indicator: 'Circle Only', badge: 'circle-icon' },
        { level: 'public', indicator: 'Public', badge: 'globe-icon' }
      ];
      
      privacyLevels.forEach(({ level, indicator, badge }) => {
        cy.createList(`${level} List`, { visibility: level });
        cy.visit('/lists/1');
        
        cy.get('[data-testid="visibility-indicator"]').should('contain', indicator);
        cy.get(`[data-testid="${badge}"]`).should('be.visible');
        
        cy.deleteList();
      });
    });
  });

  afterEach(() => {
    cy.cleanupTestData();
  });
});