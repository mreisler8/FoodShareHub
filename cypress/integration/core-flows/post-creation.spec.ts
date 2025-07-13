describe('Post Creation Flow', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/');
  });

  describe('Post Creation and Editing', () => {
    it('should allow user to create post with restaurant selection', () => {
      // Given: User is on home page
      cy.get('[data-testid="create-post-button"]').should('be.visible');
      
      // When: User clicks create post
      cy.get('[data-testid="create-post-button"]').click();
      
      // And: Searches for restaurant
      cy.get('[data-testid="restaurant-search"]').type('Italian Bistro');
      cy.get('[data-testid="search-result"]').first().click();
      
      // And: Fills post details
      cy.get('[data-testid="post-content"]').type('Amazing pasta and great atmosphere!');
      cy.get('[data-testid="post-rating"]').find('[data-rating="5"]').click();
      cy.get('[data-testid="dishes-tried"]').type('Carbonara, Tiramisu');
      
      // And: Uploads photos
      cy.get('[data-testid="photo-upload"]').attachFile('test-food-image.jpg');
      
      // And: Saves post
      cy.get('[data-testid="save-post-button"]').click();
      
      // Then: Post is created successfully
      cy.get('[data-testid="post-success-message"]').should('be.visible');
      cy.get('[data-testid="feed-post"]').should('contain', 'Amazing pasta');
      cy.get('[data-testid="post-rating"]').should('contain', '5');
    });
    
    it('should allow user to edit existing post', () => {
      // Given: User has created a post
      cy.createPost('Great food!', 'Test Restaurant', 4);
      
      // When: User clicks edit on post
      cy.get('[data-testid="edit-post-button"]').click();
      
      // And: Modifies content
      cy.get('[data-testid="post-content"]').clear().type('Updated: Really great food!');
      cy.get('[data-testid="post-rating"]').find('[data-rating="5"]').click();
      
      // And: Saves changes
      cy.get('[data-testid="save-post-button"]').click();
      
      // Then: Changes are reflected
      cy.get('[data-testid="post-content"]').should('contain', 'Updated: Really great food!');
      cy.get('[data-testid="post-rating"]').should('contain', '5');
    });
    
    it('should allow user to delete post', () => {
      // Given: User has created a post
      cy.createPost('Post to delete', 'Test Restaurant', 3);
      
      // When: User clicks delete
      cy.get('[data-testid="delete-post-button"]').click();
      cy.get('[data-testid="confirm-delete-button"]').click();
      
      // Then: Post is removed
      cy.get('[data-testid="feed-post"]').should('not.contain', 'Post to delete');
    });
  });

  describe('Post Visibility and Sharing', () => {
    it('should allow creating private post', () => {
      // Given: User is creating a post
      cy.get('[data-testid="create-post-button"]').click();
      
      // When: User sets visibility to private
      cy.get('[data-testid="post-visibility"]').select('private');
      cy.get('[data-testid="restaurant-search"]').type('Private Restaurant');
      cy.get('[data-testid="search-result"]').first().click();
      cy.get('[data-testid="post-content"]').type('Private dining experience');
      cy.get('[data-testid="save-post-button"]').click();
      
      // Then: Post is created as private
      cy.get('[data-testid="post-visibility-badge"]').should('contain', 'Private');
    });
    
    it('should allow creating public post', () => {
      // Given: User is creating a post
      cy.get('[data-testid="create-post-button"]').click();
      
      // When: User sets visibility to public
      cy.get('[data-testid="post-visibility"]').select('public');
      cy.get('[data-testid="restaurant-search"]').type('Public Restaurant');
      cy.get('[data-testid="search-result"]').first().click();
      cy.get('[data-testid="post-content"]').type('Public dining experience');
      cy.get('[data-testid="save-post-button"]').click();
      
      // Then: Post is created as public
      cy.get('[data-testid="post-visibility-badge"]').should('contain', 'Public');
    });
  });

  describe('Post Interactions', () => {
    it('should allow liking and commenting on posts', () => {
      // Given: There is a post in the feed
      cy.createPost('Great meal!', 'Test Restaurant', 5);
      
      // When: User likes the post
      cy.get('[data-testid="like-button"]').click();
      
      // Then: Like count increases
      cy.get('[data-testid="like-count"]').should('contain', '1');
      
      // When: User adds a comment
      cy.get('[data-testid="comment-input"]').type('I agree, looks delicious!');
      cy.get('[data-testid="add-comment-button"]').click();
      
      // Then: Comment appears
      cy.get('[data-testid="comment"]').should('contain', 'I agree, looks delicious!');
      cy.get('[data-testid="comment-count"]').should('contain', '1');
    });
  });

  afterEach(() => {
    cy.cleanupTestData();
  });
});