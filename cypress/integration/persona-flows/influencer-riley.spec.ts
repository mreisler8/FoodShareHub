describe('Influencer Riley - Content Creator', () => {
  // Goal: Seamless content creation & sharing
  
  beforeEach(() => {
    cy.login();
    cy.visit('/');
  });

  describe('IR-001: Create Post with Multiple Photos', () => {
    it('should create rich post with multiple photos', () => {
      // Given: User wants to create a detailed post
      cy.get('[data-testid="create-post-button"]').click();
      
      // When: User searches and selects restaurant
      cy.get('[data-testid="restaurant-search"]').type('Trendy Bistro');
      cy.get('[data-testid="search-result"]').first().click();
      
      // And: Fills detailed post content
      cy.get('[data-testid="post-content"]').type('Amazing brunch experience! The atmosphere is perfect for content creation and the food is Instagram-worthy. Must try the avocado toast and matcha latte!');
      cy.get('[data-testid="post-rating"]').find('[data-rating="5"]').click();
      cy.get('[data-testid="dishes-tried"]').type('Avocado Toast, Matcha Latte, Acai Bowl');
      
      // And: Uploads multiple photos
      cy.get('[data-testid="photo-upload"]').attachFile('food-photo-1.jpg');
      cy.get('[data-testid="photo-upload"]').attachFile('food-photo-2.jpg');
      cy.get('[data-testid="photo-upload"]').attachFile('restaurant-ambiance.jpg');
      
      // And: Adds hashtags and location
      cy.get('[data-testid="post-hashtags"]').type('#foodie #brunch #trendy #instafood');
      cy.get('[data-testid="post-location"]').type('Downtown District');
      
      // And: Saves post
      cy.get('[data-testid="save-post-button"]').click();
      
      // Then: Post is created with all elements
      cy.get('[data-testid="post-success-message"]').should('be.visible');
      cy.get('[data-testid="feed-post"]').should('contain', 'Amazing brunch experience');
      cy.get('[data-testid="post-photos"]').should('have.length', 3);
      cy.get('[data-testid="post-hashtags"]').should('contain', '#foodie');
    });
  });

  describe('IR-002: Share Post to Circle', () => {
    it('should share post to specific circle', () => {
      // Given: User has created a post
      cy.createPost('Great dining experience!', 'Trendy Restaurant', 5);
      
      // When: User shares to circle
      cy.get('[data-testid="share-post-button"]').click();
      cy.get('[data-testid="share-to-circle-option"]').click();
      cy.get('[data-testid="circle-selector"]').select('Food Influencers');
      cy.get('[data-testid="add-share-message"]').type('Check out this amazing spot! Perfect for content creation 📸');
      cy.get('[data-testid="confirm-share-button"]').click();
      
      // Then: Post is shared to circle
      cy.get('[data-testid="share-success-message"]').should('be.visible');
      cy.get('[data-testid="shared-to-indicator"]').should('contain', 'Food Influencers');
      
      // Verify circle members can see it
      cy.loginAsCircleMember('Food Influencers');
      cy.visit('/circles/1');
      cy.get('[data-testid="circle-feed"]').should('contain', 'Great dining experience');
    });
  });

  describe('IR-003: Make Post Public', () => {
    it('should make post public for maximum reach', () => {
      // Given: User has created a post
      cy.createPost('Incredible food discovery!', 'Hidden Gem Restaurant', 5);
      
      // When: User makes post public
      cy.get('[data-testid="post-visibility-button"]').click();
      cy.get('[data-testid="make-public-option"]').click();
      cy.get('[data-testid="confirm-public-button"]').click();
      
      // Then: Post becomes public
      cy.get('[data-testid="public-badge"]').should('be.visible');
      cy.get('[data-testid="public-share-url"]').should('be.visible');
      
      // And: Can be viewed by non-authenticated users
      cy.logout();
      cy.visit('/posts/1');
      cy.get('[data-testid="post-content"]').should('contain', 'Incredible food discovery');
    });
    
    it('should provide social sharing options for public posts', () => {
      // Given: User has a public post
      cy.createPost('Must-try restaurant!', 'Amazing Place', 5, { visibility: 'public' });
      
      // When: User clicks share button
      cy.get('[data-testid="share-post-button"]').click();
      
      // Then: Social sharing options are available
      cy.get('[data-testid="share-twitter"]').should('be.visible');
      cy.get('[data-testid="share-facebook"]').should('be.visible');
      cy.get('[data-testid="share-instagram"]').should('be.visible');
      cy.get('[data-testid="copy-link"]').should('be.visible');
      
      // User can copy link
      cy.get('[data-testid="copy-link"]').click();
      cy.get('[data-testid="copy-success-message"]').should('be.visible');
    });
  });

  describe('IR-004: Edit Post After Publication', () => {
    it('should edit post while preserving engagement', () => {
      // Given: User has a published post with engagement
      cy.createPostWithEngagement('Original post content', 'Test Restaurant', 4);
      
      // When: User edits the post
      cy.get('[data-testid="edit-post-button"]').click();
      cy.get('[data-testid="post-content"]').clear().type('Updated: Original post content with new insights!');
      cy.get('[data-testid="post-rating"]').find('[data-rating="5"]').click();
      cy.get('[data-testid="save-post-button"]').click();
      
      // Then: Post is updated
      cy.get('[data-testid="post-content"]').should('contain', 'Updated: Original post content with new insights!');
      cy.get('[data-testid="post-rating"]').should('contain', '5');
      
      // And: Previous engagement is preserved
      cy.get('[data-testid="like-count"]').should('not.contain', '0');
      cy.get('[data-testid="comment-count"]').should('not.contain', '0');
      
      // And: Edit history is available
      cy.get('[data-testid="edited-indicator"]').should('be.visible');
    });
  });

  describe('Riley\'s Content Strategy', () => {
    it('should support content calendar and scheduling', () => {
      // Given: User wants to plan content
      cy.visit('/content-calendar');
      
      // When: User schedules a post
      cy.get('[data-testid="schedule-post-button"]').click();
      cy.get('[data-testid="restaurant-search"]').type('Upcoming Restaurant');
      cy.get('[data-testid="search-result"]').first().click();
      cy.get('[data-testid="post-content"]').type('Coming soon: Review of this amazing place!');
      cy.get('[data-testid="schedule-date"]').type('2025-01-15');
      cy.get('[data-testid="schedule-time"]').type('12:00');
      cy.get('[data-testid="schedule-post-button"]').click();
      
      // Then: Post is scheduled
      cy.get('[data-testid="scheduled-posts"]').should('contain', 'Coming soon: Review');
      cy.get('[data-testid="schedule-indicator"]').should('contain', 'Jan 15, 2025');
    });
    
    it('should provide analytics for content performance', () => {
      // Given: User has multiple posts
      cy.createMultiplePosts();
      
      // When: User views analytics
      cy.visit('/analytics');
      
      // Then: Performance metrics are shown
      cy.get('[data-testid="post-analytics"]').should('be.visible');
      cy.get('[data-testid="engagement-metrics"]').should('be.visible');
      cy.get('[data-testid="reach-metrics"]').should('be.visible');
      
      // And: Individual post performance
      cy.get('[data-testid="post-performance"]').should('have.length.greaterThan', 0);
      cy.get('[data-testid="likes-metric"]').should('be.visible');
      cy.get('[data-testid="comments-metric"]').should('be.visible');
      cy.get('[data-testid="shares-metric"]').should('be.visible');
    });
    
    it('should support content collaboration', () => {
      // Given: User wants to collaborate on content
      cy.createPost('Collaborative post', 'Restaurant Name', 4);
      
      // When: User invites collaborators
      cy.get('[data-testid="collaborate-button"]').click();
      cy.get('[data-testid="invite-collaborator"]').type('collaborator@example.com');
      cy.get('[data-testid="collaboration-role"]').select('Co-Author');
      cy.get('[data-testid="send-invitation"]').click();
      
      // Then: Collaboration is set up
      cy.get('[data-testid="collaboration-success"]').should('be.visible');
      cy.get('[data-testid="collaborators-list"]').should('contain', 'collaborator@example.com');
    });
  });

  describe('Content Quality and Engagement', () => {
    it('should provide content optimization suggestions', () => {
      // Given: User is creating a post
      cy.get('[data-testid="create-post-button"]').click();
      cy.get('[data-testid="restaurant-search"]').type('Test Restaurant');
      cy.get('[data-testid="search-result"]').first().click();
      
      // When: User enters content
      cy.get('[data-testid="post-content"]').type('Good food');
      
      // Then: Optimization suggestions appear
      cy.get('[data-testid="content-suggestions"]').should('be.visible');
      cy.get('[data-testid="content-suggestions"]').should('contain', 'Add more details');
      cy.get('[data-testid="content-suggestions"]').should('contain', 'Include hashtags');
      cy.get('[data-testid="content-suggestions"]').should('contain', 'Add photos');
    });
    
    it('should track engagement and provide insights', () => {
      // Given: User has posts with varying engagement
      cy.createPostWithEngagement('High engagement post', 'Popular Restaurant', 5);
      cy.createPostWithEngagement('Low engagement post', 'Unknown Restaurant', 3);
      
      // When: User views engagement insights
      cy.visit('/insights');
      
      // Then: Engagement patterns are shown
      cy.get('[data-testid="engagement-trends"]').should('be.visible');
      cy.get('[data-testid="best-performing-content"]').should('be.visible');
      cy.get('[data-testid="optimization-tips"]').should('be.visible');
    });
  });

  afterEach(() => {
    cy.cleanupTestData();
  });
});