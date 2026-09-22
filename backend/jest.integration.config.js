// Integration tests: run against the database configured in backend/.env.
// Never run these against production data you care about.
module.exports = {
  testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
};
