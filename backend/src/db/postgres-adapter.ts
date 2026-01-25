import { Pool, QueryResult } from 'pg';
import { ALL_TABLES_POSTGRES, ADD_BOOKMARKS_INDEXES_POSTGRES, ADD_RATE_LIMITS_INDEXES_POSTGRES } from './schema';

class PostgresDatabase {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10, // maximum connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // 10 second timeout
    });
  }

  async connect(): Promise<void> {
    try {
      console.log('Attempting PostgreSQL connection...');
      const result = await Promise.race([
        this.pool.query('SELECT NOW()'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 10s')), 10000)
        )
      ]);
      console.log('✅ Connected to PostgreSQL database');
    } catch (error) {
      console.error('❌ PostgreSQL connection error:', error);
      throw error;
    }
  }

  async initialize(): Promise<void> {
    try {
      console.log('Initializing PostgreSQL schema...');
      
      // Create all tables with timeout
      for (let i = 0; i < ALL_TABLES_POSTGRES.length; i++) {
        console.log(`Creating table ${i + 1}/${ALL_TABLES_POSTGRES.length}...`);
        await Promise.race([
          this.pool.query(ALL_TABLES_POSTGRES[i]),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Table creation ${i + 1} timeout`)), 5000)
          )
        ]);
      }

      // Run schema upgrades with timeout
      console.log('Running schema upgrades...');
      await Promise.race([
        this.ensureSchemaUpgrades(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Schema upgrade timeout')), 10000)
        )
      ]);
      
      console.log('✅ PostgreSQL database schema initialized');
    } catch (error) {
      console.error('❌ PostgreSQL initialization error:', error);
      // Don't throw - allow server to start even if some migrations fail
      console.warn('⚠️  Continuing despite initialization errors...');
    }
  }

  private async ensureSchemaUpgrades(): Promise<void> {
    await this.ensureVideosGoogleDriveColumns();
    await this.ensureBookmarksTable();
    await this.ensureRateLimitsTable();
    await this.ensureGoogleDriveTokenColumns();
  }

  private async ensureVideosGoogleDriveColumns(): Promise<void> {
    try {
      // Check if columns exist
      const result = await this.pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'videos'
      `);
      
      const existing = new Set(result.rows.map((r: any) => r.column_name));

      if (!existing.has('google_drive_id')) {
        await this.pool.query('ALTER TABLE videos ADD COLUMN google_drive_id TEXT');
      }

      if (!existing.has('google_drive_url')) {
        await this.pool.query('ALTER TABLE videos ADD COLUMN google_drive_url TEXT');
      }
    } catch (error) {
      // Ignore errors if table doesn't exist yet
    }
  }

  private async ensureBookmarksTable(): Promise<void> {
    try {
      const result = await this.pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'bookmarks'
      `);

      if (result.rows.length === 0) {
        await this.pool.query(`
          CREATE TABLE IF NOT EXISTS bookmarks (
            id TEXT PRIMARY KEY,
            video_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            conversation_id TEXT,
            timestamp_seconds REAL NOT NULL,
            note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
          )
        `);
      }

      // Create indexes
      await this.pool.query(ADD_BOOKMARKS_INDEXES_POSTGRES);
    } catch (error) {
      // Ignore errors
    }
  }

  private async ensureRateLimitsTable(): Promise<void> {
    try {
      const result = await this.pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'rate_limits'
      `);

      if (result.rows.length === 0) {
        await this.pool.query(`
          CREATE TABLE IF NOT EXISTS rate_limits (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            video_id TEXT NOT NULL,
            action TEXT NOT NULL DEFAULT 'chat',
            count INTEGER NOT NULL DEFAULT 0,
            reset_time TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
          )
        `);
      }

      // Create indexes
      await this.pool.query(ADD_RATE_LIMITS_INDEXES_POSTGRES);
    } catch (error) {
      // Ignore errors
    }
  }

  private async ensureGoogleDriveTokenColumns(): Promise<void> {
    try {
      const result = await this.pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users'
      `);
      
      const existing = new Set(result.rows.map((r: any) => r.column_name));

      if (!existing.has('google_drive_access_token')) {
        await this.pool.query('ALTER TABLE users ADD COLUMN google_drive_access_token TEXT');
      }

      if (!existing.has('google_drive_refresh_token')) {
        await this.pool.query('ALTER TABLE users ADD COLUMN google_drive_refresh_token TEXT');
      }

      if (!existing.has('google_drive_token_expiry')) {
        await this.pool.query('ALTER TABLE users ADD COLUMN google_drive_token_expiry TIMESTAMP');
      }
    } catch (error) {
      // Ignore errors
    }
  }

  async run(sql: string, params: any[] = []): Promise<any> {
    const result = await this.pool.query(sql, params);
    return { changes: result.rowCount, lastID: result.rows[0]?.id };
  }

  async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    const result = await this.pool.query(sql, params);
    return result.rows[0] as T | undefined;
  }

  async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    const result = await this.pool.query(sql, params);
    return result.rows as T[];
  }

  async close(): Promise<void> {
    await this.pool.end();
    console.log('PostgreSQL connection closed');
  }
}

export default PostgresDatabase;
