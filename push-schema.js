import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

// Load environment from .env if it exists
dotenv.config();

// Try to get DATABASE_URL from environment
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL not found in environment');
  console.error('   Set it in the host environment, or in a local .env file.');
  process.exit(1);
}

console.log('✅ Found DATABASE_URL');
console.log('🔄 Pushing schema to PostgreSQL...\n');

try {
  // Run drizzle-kit push with the environment variable available
  execSync('npm run db:push', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: dbUrl }
  });
  console.log('\n✅ Schema pushed successfully!');
} catch (error) {
  console.error('\n❌ Error pushing schema:', error.message);
  process.exit(1);
}
