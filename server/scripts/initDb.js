import 'dotenv/config';
import sql from "../configs/db.js";

const initializeDatabase = async () => {
  try {
    console.log('Initializing database...');

    // Drop existing table if it exists (to handle schema changes)
    try {
      await sql`DROP TABLE IF EXISTS creations CASCADE`;
      console.log('✓ Dropped existing creations table');
    } catch (err) {
      console.log('Note: Could not drop table (may not exist)');
    }

    // Create creations table with quoted identifiers to preserve case
    await sql`
      CREATE TABLE IF NOT EXISTS creations (
        id SERIAL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        prompt TEXT,
        content TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        publish BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        likes TEXT[] DEFAULT '{}',
        CONSTRAINT type_check CHECK (type IN ('article', 'image', 'resume-review'))
      )
    `;

    console.log('✓ creations table created/verified');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_creations_userid ON creations("userId")`;
    console.log('✓ userId index created');

    await sql`CREATE INDEX IF NOT EXISTS idx_creations_publish ON creations(publish)`;
    console.log('✓ publish index created');

    console.log('✓ Database initialization completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  }
};

initializeDatabase();