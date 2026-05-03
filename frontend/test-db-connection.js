// Test script to verify MongoDB connection
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

console.log('Testing MongoDB Connection...\n');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✓ SET' : '✗ NOT SET');
console.log('URI Value:', process.env.MONGODB_URI);
console.log('\n');

if (!process.env.MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not set in .env.local');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000
})
.then(() => {
  console.log('✅ SUCCESS: MongoDB connected!');
  console.log('Database name:', mongoose.connection.db.databaseName);
  mongoose.disconnect();
  process.exit(0);
})
.catch((error) => {
  console.error('❌ FAILED: MongoDB connection error');
  console.error('Error:', error.message);
  console.error('\nCommon issues:');
  console.error('1. MongoDB Atlas cluster is not running');
  console.error('2. IP address not whitelisted in MongoDB Atlas');
  console.error('3. Wrong username or password');
  console.error('4. Network connectivity issues');
  process.exit(1);
});
