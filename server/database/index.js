const { Sequelize } = require('sequelize');

// Check if we're in WebContainer environment (no PostgreSQL available)
const isWebContainer = !process.env.DATABASE_URL && !process.env.DB_HOST;

let sequelize;

if (isWebContainer) {
  // Use SQLite for WebContainer environment
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:', // Use in-memory database for WebContainer
    logging: false
  });
} else {
  // Use PostgreSQL for production/local development
  const databaseUrl = process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || '12345659'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'econempire'}`;
  
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
}

// Common configuration
sequelize.options = {
  ...sequelize.options,
  logging: false, // Set to console.log to see SQL queries
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

// Test the connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(`Database connection established successfully (${sequelize.getDialect()}).`);
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

testConnection();

module.exports = sequelize;
