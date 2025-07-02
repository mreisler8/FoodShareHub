
// cypress/integration/create_list_flow.spec.js

describe('Create List Flow', () => {
  before(() => {
    // log in once for all tests
    cy.visit('/auth');
    cy.get('input[name="username"]').type('mitch.reisler@gmail.com');
    cy.get('input[name="password"]').type('coach000');
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/auth');
  });

  it('navigates to the home page and shows the Create List button', () => {
    cy.visit('/');
    cy.contains('Create a List').should('be.visible');
  });

  it('opens the Create List modal with all fields', () => {
    cy.contains('Create a List').click();
    cy.get('[role="dialog"]').within(() => {
      cy.contains('Create New List').should('be.visible');
      cy.get('input[placeholder*="Best Pizza"]').should('exist');
      cy.get('textarea[placeholder*="Tell people about this list"]').should('exist');
      cy.contains('Public').should('exist');
      cy.contains('Circle').should('exist');
      cy.contains('Create').should('be.disabled');
    });
  });

  it('enables the Create button when a name is entered', () => {
    cy.get('input[placeholder*="Best Pizza"]').type('Best Pizza');
    cy.contains('Create').should('not.be.disabled');
  });

  it('creates a new list and redirects to its page', () => {
    cy.contains('Create').click();
    cy.url().should('match', /\/lists\/\d+$/);
    cy.contains('Best Pizza').should('be.visible');
  });

  it('canceling the modal does not create a list', () => {
    cy.visit('/');
    cy.contains('Create a List').click();
    cy.contains('Cancel').click();
    cy.get('[data-testid="restaurant-list"]').should('contain', 'Best Pizza').and('have.length.at.least', 1);
  });

  it('allows creating duplicate list names', () => {
    cy.contains('Create a List').click();
    cy.get('input[placeholder*="Best Pizza"]').clear().type('Best Pizza');
    cy.contains('Create').click();
    cy.visit('/');
    cy.get('[data-testid="restaurant-list"]')
      .filter(':contains("Best Pizza")')
      .should('have.length', 2);
  });
});
