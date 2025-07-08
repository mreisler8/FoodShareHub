
describe('Smoke Test', () => {
  it('should load the home page', () => {
    cy.visit('/')
    cy.contains('Discover') // Based on your actual home page content
  })

  it('should have working API endpoints', () => {
    cy.request('/api/me').then((response) => {
      expect(response.status).to.be.oneOf([200, 401]) // Either authenticated or not
    })
  })
  
  it('should load the auth page', () => {
    cy.visit('/auth')
    cy.get('input[type="email"]').should('be.visible')
    cy.get('input[type="password"]').should('be.visible')
  })
})
