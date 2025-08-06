#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Econ Empire Setup Script');
console.log('============================\n');

// Check if we're in WebContainer environment
const isWebContainer = !fs.existsSync('/usr/bin/psql') && !fs.existsSync('/usr/local/bin/psql') && process.env.NODE_ENV !== 'production';

if (isWebContainer) {
  console.log('📦 WebContainer environment detected');
  console.log('✅ Skipping PostgreSQL check (using alternative database setup)');
} else {
  // Original PostgreSQL check for local development
  try {
    execSync('psql --version', { stdio: 'ignore' });
    console.log('✅ PostgreSQL is installed');
  } catch (error) {
    console.log('❌ PostgreSQL is not installed or not in PATH');
    console.log('Please install PostgreSQL and try again.');
    process.exit(1);
  }
}

// Install dependencies for both frontend and backend
console.log('\n📦 Installing dependencies...');

try {
  console.log('Installing server dependencies...');
  process.chdir('./server');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('Installing frontend dependencies...');
  process.chdir('../frontend');
  execSync('npm install', { stdio: 'inherit' });
  
  // Return to root directory
  process.chdir('..');
  
  console.log('\n✅ Setup completed successfully!');
  
  if (isWebContainer) {
    console.log('\n📝 Next steps for WebContainer:');
    console.log('1. The application is configured for WebContainer environment');
    console.log('2. Database will use SQLite or in-memory storage');
    console.log('3. Run the development servers from the respective directories');
  } else {
    console.log('\n📝 Next steps:');
    console.log('1. Set up your PostgreSQL database');
    console.log('2. Configure your environment variables');
    console.log('3. Run the development servers');
  }
  
} catch (error) {
  console.error('❌ Error during setup:', error.message);
  process.exit(1);
}