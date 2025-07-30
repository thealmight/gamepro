const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Econ Empire Setup Script');
console.log('============================\n');

// Check if PostgreSQL is available
try {
  execSync('psql --version', { stdio: 'ignore' });
  console.log('✅ PostgreSQL is installed');
} catch (error) {
  console.log('❌ PostgreSQL is not installed or not in PATH');
  console.log('Please install PostgreSQL and try again.');
  process.exit(1);
}

// Check if Node.js version is compatible
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion < 16) {
  console.log(`❌ Node.js version ${nodeVersion} is not supported. Please use Node.js 16 or higher.`);
  process.exit(1);
}
console.log(`✅ Node.js version ${nodeVersion} is compatible`);

// Create database
console.log('\n📊 Setting up database...');
try {
  execSync('createdb econempire', { stdio: 'ignore' });
  console.log('✅ Database "econempire" created');
} catch (error) {
  console.log('⚠️  Database "econempire" might already exist');
}

// Run database schema
try {
  execSync('psql -d econempire -f database/schema.sql', { stdio: 'ignore' });
  console.log('✅ Database schema applied');
} catch (error) {
  console.log('❌ Failed to apply database schema');
  console.log('Please check your PostgreSQL connection and try manually:');
  console.log('psql -d econempire -f database/schema.sql');
}

// Install server dependencies
console.log('\n📦 Installing server dependencies...');
try {
  execSync('cd server && npm install', { stdio: 'inherit' });
  console.log('✅ Server dependencies installed');
} catch (error) {
  console.log('❌ Failed to install server dependencies');
  process.exit(1);
}

// Install frontend dependencies
console.log('\n🎨 Installing frontend dependencies...');
try {
  execSync('cd frontend && npm run build', { stdio: 'inherit' });
  console.log('✅ Frontend dependencies installed');
} catch (error) {
  console.log('❌ Failed to install frontend dependencies');
  process.exit(1);
}

// Create environment file if it doesn't exist
const envPath = path.join(__dirname, 'server', '.env');
if (!fs.existsSync(envPath)) {
  const envContent = `JWT_SECRET=econ-empire-secret-key-change-in-production
DATABASE_URL=postgresql://postgres:12345659@localhost:5432/econempire
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
`;
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Environment file created at server/.env');
} else {
  console.log('⚠️  Environment file already exists at server/.env');
}

// Create production environment file if it doesn't exist
const prodEnvPath = path.join(__dirname, 'server', '.env.production');
if (!fs.existsSync(prodEnvPath)) {
  const prodEnvContent = `# Production Environment Variables for Econ Empire Server

# JWT Secret - CHANGE THIS IN PRODUCTION
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@database:5432/econempire
DB_HOST=database
DB_PORT=5432
DB_NAME=econempire
DB_USER=postgres
DB_PASSWORD=postgres

# Server Configuration
PORT=4000
NODE_ENV=production

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# Logging
LOG_LEVEL=info
`;
  fs.writeFileSync(prodEnvPath, prodEnvContent);
  console.log('✅ Production environment file created at server/.env.production');
} else {
  console.log('⚠️  Production environment file already exists at server/.env.production');
}

// Create frontend environment files if they don't exist
const frontendDevEnvPath = path.join(__dirname, 'frontend', '.env.development');
if (!fs.existsSync(frontendDevEnvPath)) {
  const frontendDevEnvContent = `# Development environment variables for Econ Empire Frontend

# API base URL for development
REACT_APP_API_URL=http://localhost:4000

# Socket.IO server URL for development
REACT_APP_SOCKET_URL=http://localhost:4000
`;
  fs.writeFileSync(frontendDevEnvPath, frontendDevEnvContent);
  console.log('✅ Frontend development environment file created at frontend/.env.development');
} else {
  console.log('⚠️  Frontend development environment file already exists at frontend/.env.development');
}

const frontendProdEnvPath = path.join(__dirname, 'frontend', '.env.production');
if (!fs.existsSync(frontendProdEnvPath)) {
  const frontendProdEnvContent = `# Production environment variables for Econ Empire Frontend

# API base URL for production (empty for relative paths)
REACT_APP_API_URL=

# Socket.IO server URL for production (empty for same origin)
REACT_APP_SOCKET_URL=
`;
  fs.writeFileSync(frontendProdEnvPath, frontendProdEnvContent);
  console.log('✅ Frontend production environment file created at frontend/.env.production');
} else {
  console.log('⚠️  Frontend production environment file already exists at frontend/.env.production');
}

console.log('\n🎉 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Start the backend server:');
console.log('   cd server && npm run dev');
console.log('\n2. In a new terminal, start the frontend:');
console.log('   cd frontend && npm start');
console.log('\n3. Open your browser and go to:');
console.log('   http://localhost:3000');
console.log('\n4. Login as operator with username "pavan" or as a player with any other username');
console.log('\n🎮 Enjoy playing Econ Empire!');