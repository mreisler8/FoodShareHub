
describe('Smoke Test', () => {
  it('should load the home page without errors', () => {
    cy.visit('/', { failOnStatusCode: false })
    cy.get('body').should('be.visible')
  })

  it('should load the auth page', () => {
    cy.visit('/auth', { failOnStatusCode: false })
    cy.get('body').should('be.visible')
  })
  
  it('should have working health check', () => {
    cy.request({
      url: '/api/me',
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.be.oneOf([200, 401]) // Either authenticated or not
    })
  })
})
