
describe('Smoke Test', () => {
  it('should load the home page', () => {
    cy.visit('/')
    cy.contains('Circles') // Adjust based on your app's content
  })

  it('should have working API endpoints', () => {
    cy.request('/api/user').then((response) => {
      expect(response.status).to.be.oneOf([200, 401]) // Either authenticated or not
    })
  })
})
