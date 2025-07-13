
// cypress/support/e2e.ts

declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>
      createList(name: string): Chainable<void>
      createListWithItems(listName: string, restaurantNames: string[]): Chainable<void>
      createPost(content: string, restaurantName: string, rating: number): Chainable<void>
      cleanupTestData(): Chainable<void>
    }
  }
}

// Custom command to login
Cypress.Commands.add('login', () => {
  // Visit the auth page and perform login through the UI
  cy.visit('/auth')
  cy.get('input[type="email"]').type('mitch.reisler@gmail.com')
  cy.get('input[type="password"]').type('testpassword')
  cy.get('button[type="submit"]').click()
  
  // Wait for redirect to home page
  cy.url().should('include', '/')
  cy.get('[data-testid="user-profile"]', { timeout: 10000 }).should('exist')
})

// Custom command to create a list
Cypress.Commands.add('createList', (name: string) => {
  cy.request({
    method: 'POST',
    url: '/api/lists',
    body: {
      name,
      description: 'Test list description',
      visibility: 'private',
      isPublic: false
    }
  })
})

// Custom command to create a list with items
Cypress.Commands.add('createListWithItems', (listName: string, restaurantNames: string[]) => {
  cy.createList(listName).then((response) => {
    const listId = response.body.id
    restaurantNames.forEach(restaurantName => {
      cy.request({
        method: 'POST',
        url: `/api/lists/${listId}/items`,
        body: {
          restaurantId: 1, // Use a default restaurant ID
          notes: `Test note for ${restaurantName}`,
          rating: 4
        }
      })
    })
  })
})

// Custom command to create a post
Cypress.Commands.add('createPost', (content: string, restaurantName: string, rating: number) => {
  cy.request({
    method: 'POST',
    url: '/api/posts',
    body: {
      restaurantId: 1, // Use a default restaurant ID
      content,
      rating,
      visibility: 'public'
    }
  })
})

// Custom command to cleanup test data
Cypress.Commands.add('cleanupTestData', () => {
  // This would typically clean up any test data created during tests
  cy.log('Cleaning up test data')
})
