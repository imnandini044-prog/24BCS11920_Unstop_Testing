// Dismiss only the known, non-binding cookie/announcement banner when present.
Cypress.Commands.add('dismissPublicNotice', () => {
  cy.get('body').then(($body) => {
    const buttons = [...$body.find('button')];
    const known = buttons.find((button) => /^(accept necessary|reject optional|close cookie notice|got it|ok, continue)$/i.test(button.innerText.trim()));
    if (known) cy.wrap(known).click();
  });
});

afterEach(function () {
  const test = this.currentTest;
  if (!test) return;
  const err = test.err;
  const titlePath = typeof test.titlePath === 'function' ? test.titlePath() : test.titlePath;
  cy.task('reportTest', {
    title: test.title,
    fullTitle: Array.isArray(titlePath) ? titlePath.join(' > ') : String(titlePath || test.title),
    state: test.state || 'pending',
    duration: test.duration || 0,
    error: err ? { message: err.message, stack: err.stack } : null,
    timestamp: new Date().toISOString()
  }, { log: false }).then(() => {
    // Intentional viewing pause: lets an observer see the completed result and
    // current Unstop page before the next E2E case starts.
    if (!/^12\./.test(test.title)) cy.wait(3000, { log: false });
  });
});
