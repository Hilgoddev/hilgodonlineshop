// Runs before every unit test file (see "jest.setupFiles" in package.json).
// Unit tests must never load the real backend/.env or reach the live
// database: dotenv is stubbed out and Supabase points at an unreachable local
// address, so any query a test forgets to fake fails fast instead of hitting
// production. Real-DB tests live in tests/integration (npm run test:integration).
jest.mock('dotenv', () => ({ config: () => ({}) }));

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
