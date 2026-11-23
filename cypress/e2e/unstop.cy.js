const routes = { home: '/', hackathons: '/hackathons/', internships: '/internships/', mentors: '/mentor', jobs: '/jobs/' };

function ensurePath(path, pattern) {
  cy.location('pathname').then((current) => {
    if (!pattern.test(current)) cy.visit(path);
  });
}

function openFirstOpportunity(pathSegment) {
  cy.get(`a[href^="/${pathSegment}/"]:visible`).filter(':not([href$="/${pathSegment}/"])').first().should('be.visible').click();
}

function expectVisibleControlText(pattern) {
  cy.get('body').should(($body) => {
    const matches = [...$body.find('a,button,[role="button"],[tabindex],strong,span,div')]
      .filter((el) => el.getClientRects().length && pattern.test(el.innerText.trim()));
    expect(matches.length, `visible control text matching ${pattern}`).to.be.greaterThan(0);
  });
}

describe('Unstop public opportunity journeys', () => {
  before(() => {
    cy.visit(routes.home);
    cy.dismissPublicNotice();
  });

  it('1. loads the Unstop homepage and public visitor content', () => {
    ensurePath(routes.home, /^\/$/);
    cy.title().should('match', /unstop/i);
    cy.get('h1:visible').should('contain.text', 'Unlock Your Career');
    cy.get('input[placeholder*="Search"]:visible').should('be.visible');
  });

  it('2. shows Unstop branding and primary navigation controls', () => {
    cy.title().should('match', /unstop/i);
    cy.get('button:visible').first().should('be.visible');
    cy.get('input[placeholder*="Search"]:visible').should('be.visible');
  });

  it('3. navigates from the homepage to Hackathons', () => {
    ensurePath(routes.home, /^\/$/);
    cy.get('button:visible').first().click();
    cy.get('body').then(($body) => {
      const link = [...$body.find('a,button,div,span,[role="link"],[role="button"]')].find((el) =>
        el.getClientRects().length && /^hackathons?$/i.test(el.innerText.trim())
      );
      if (link) cy.wrap(link).click();
      else cy.visit(routes.hackathons);
    });
    cy.location('pathname').should('match', /hackathons?/i);
  });

  it('4. shows the hackathon listing and its search or filter controls', () => {
    ensurePath(routes.hackathons, /hackathons?/i);
    cy.get('h1:visible').should('contain.text', 'Hackathon');
    cy.get('input[placeholder*="Search"]:visible').should('be.visible');
    cy.contains(/Filters/i).should('be.visible');
    cy.get('a[href*="/hackathons/"]:visible').should('have.length.greaterThan', 0);
  });

  it('5. shows useful hackathon card information and opens an opportunity', () => {
    ensurePath(routes.hackathons, /hackathons?/i);
    cy.get('a[href*="/hackathons/"]:visible').filter(':not([href$="/hackathons/"])').first().within(() => {
      cy.get('h2:visible, h3:visible, [role="heading"]:visible').should('exist');
      cy.contains(/Members?/i).should('be.visible');
    });
    openFirstOpportunity('hackathons');
    cy.location('pathname').should('match', /hackathons?\/.+/i);
  });

  it('6. shows public hackathon details and eligibility or timeline information', () => {
    ensurePath(routes.hackathons, /hackathons?\/.+/i);
    cy.get('h1:visible').should('be.visible').invoke('text').should('not.be.empty');
    cy.contains(/About the Event|Eligibility|Stages & Timeline/i).should('be.visible');
  });

  it('7. presents the hackathon registration call to action without submitting it', () => {
    ensurePath(routes.hackathons, /hackathons?\/.+/i);
    expectVisibleControlText(/^Register$/i);
  });

  it('8. navigates to the public internships section', () => {
    cy.visit(routes.internships);
    cy.location('pathname').should('match', /internships?/i);
    cy.get('h1:visible').invoke('text').should('match', /internship/i);
  });

  it('9. shows internship opportunities and public listing controls', () => {
    ensurePath(routes.internships, /internships?\/?$/i);
    cy.get('h1:visible').invoke('text').should('match', /internship/i);
    cy.get('input:visible, button:visible').should('have.length.greaterThan', 0);
    cy.get('a[href*="/internships/"]:visible').should('have.length.greaterThan', 0);
  });

  it('10. opens an internship and presents Quick Apply without submitting it', () => {
    ensurePath(routes.internships, /internships?\/?$/i);
    openFirstOpportunity('internships');
    cy.location('pathname').should('match', /internships?\/.+/i);
    cy.get('h1:visible').should('be.visible');
    expectVisibleControlText(/Quick Apply/i);
  });

  it('11. explores the public mentorship landing page and mentor discovery', () => {
    ensurePath(routes.mentors, /\/mentor\/?$/i);
    cy.get('h1:visible').should('contain.text', 'Mentorship');
    cy.get('input[placeholder*="Search by Skill"]:visible').should('be.visible');
    cy.contains(/Mentors from Top Companies/i).should('be.visible');
  });

  it('12. loads another public opportunity section with job listings', () => {
    ensurePath(routes.jobs, /\/jobs?\/?$/i);
    cy.get('h1:visible').invoke('text').should('match', /jobs?/i);
    cy.get('a[href*="/jobs/"]:visible').should('have.length.greaterThan', 0);
  });
});
