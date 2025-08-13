const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

(async () => {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error('DATABASE_URL is not set');
      process.exit(1);
    }

    const ssl = connectionString.includes('render.com') ? { rejectUnauthorized: false } : undefined;
    const pool = new Pool({ connectionString, ssl });

    const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Applying database schema...');
    await pool.query(sql);
    console.log('Schema applied successfully');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
})();