import { getDatabase, initDatabase } from './connection';
import { config } from '../utils/env';

/**
 * Initialize demo user for simplified demo mode
 * This creates a single user that everyone shares
 */
export async function initDemoUser(): Promise<void> {
  const db = getDatabase();
  
  const DEMO_USER = {
    id: 'demo-user-id',
    email: 'demo@example.com',
    name: 'Demo User',
    google_id: 'demo-google-id',
  };

  try {
    // Check if demo user exists
    const existingUser = await db.get(
      'SELECT * FROM users WHERE id = ?',
      [DEMO_USER.id]
    );

    if (!existingUser) {
      console.log('Creating demo user...');
      await db.run(
        `INSERT INTO users (id, email, name, google_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          DEMO_USER.id,
          DEMO_USER.email,
          DEMO_USER.name,
          DEMO_USER.google_id,
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      );
      console.log('✓ Demo user created');
    } else {
      console.log('✓ Demo user already exists');
    }
  } catch (error) {
    console.error('Failed to initialize demo user:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  (async () => {
    try {
      const database = initDatabase(config.databasePath);
      await database.connect();
      await database.initialize();
      await initDemoUser();
      console.log('Demo user initialization complete!');
      process.exit(0);
    } catch (error) {
      console.error('Failed:', error);
      process.exit(1);
    }
  })();
}
