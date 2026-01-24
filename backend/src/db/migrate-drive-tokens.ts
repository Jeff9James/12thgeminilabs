import { getDatabase } from './connection';

/**
 * Migration script to add Google Drive token columns to users table
 * Run this manually if the automatic migration fails
 */
export async function migrateDriveTokens(): Promise<void> {
  const db = getDatabase();

  console.log('Starting Google Drive tokens migration...');

  try {
    // Check existing columns
    const columns: Array<{ name: string }> = await db.all('PRAGMA table_info(users)');
    const columnNames = new Set(columns.map((c) => c.name));

    console.log('Existing columns:', Array.from(columnNames).join(', '));

    // Add google_drive_access_token if not exists
    if (!columnNames.has('google_drive_access_token')) {
      console.log('Adding google_drive_access_token column...');
      await db.run('ALTER TABLE users ADD COLUMN google_drive_access_token TEXT');
      console.log('✓ Added google_drive_access_token');
    } else {
      console.log('✓ google_drive_access_token already exists');
    }

    // Add google_drive_refresh_token if not exists
    if (!columnNames.has('google_drive_refresh_token')) {
      console.log('Adding google_drive_refresh_token column...');
      await db.run('ALTER TABLE users ADD COLUMN google_drive_refresh_token TEXT');
      console.log('✓ Added google_drive_refresh_token');
    } else {
      console.log('✓ google_drive_refresh_token already exists');
    }

    // Add google_drive_token_expiry if not exists
    if (!columnNames.has('google_drive_token_expiry')) {
      console.log('Adding google_drive_token_expiry column...');
      await db.run('ALTER TABLE users ADD COLUMN google_drive_token_expiry DATETIME');
      console.log('✓ Added google_drive_token_expiry');
    } else {
      console.log('✓ google_drive_token_expiry already exists');
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  const { initDatabase } = require('./connection');
  const { config } = require('../utils/env');

  (async () => {
    try {
      const db = initDatabase(config.databasePath);
      await db.connect();
      await db.initialize();
      await migrateDriveTokens();
      process.exit(0);
    } catch (error) {
      console.error('Failed to run migration:', error);
      process.exit(1);
    }
  })();
}
