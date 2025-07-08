describe("Search → Select → Create Post flow", () => {
  it("lets Tracker Taylor create a post after searching", () => {
    // GIVEN I’m logged in and on the homepage
    cy.login("testuser@example.com", "password");
    cy.visit("/");

    // WHEN I click the Search icon and type "pizza"
    cy.get(".hero-search-btn").click();
    cy.get(".unified-search-input").type("pizza");

    // AND I see at least 1 suggestion
    cy.get(".search-results li").should("have.length.at.least", 1);

    // AND I select "Best Pizza Place"
    cy.get(".search-results li").contains("Best Pizza Place").click();

    // AND I click "New Post"
    cy.get(".hero-cta").click();

    // AND I fill in the post form
    cy.get('textarea[name="liked"]').type("Great crust");
    cy.get(".star-rating").contains("4").click();
    cy.get("button").contains("Save").click();

    // THEN the post appears in the feed
    cy.get(".feed-item").first().contains("Great crust");

    // AND no console errors
    cy.window().then((win) => {
      expect(win.console.error).not.to.be.called;
    });
  });
});
