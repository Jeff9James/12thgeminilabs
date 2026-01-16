import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { ALL_TABLES, ADD_BOOKMARKS_INDEXES, ADD_RATE_LIMITS_INDEXES } from './schema';

class Database {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`Connected to SQLite database at ${this.dbPath}`);
          resolve();
        }
      });
    });
  }

  initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.serialize(() => {
        let tableIndex = 0;
        const createNextTable = () => {
          if (tableIndex >= ALL_TABLES.length) {
            this.ensureSchemaUpgrades()
              .then(() => {
                console.log('Database schema initialized');
                resolve();
              })
              .catch(reject);
            return;
          }

          this.db!.run(ALL_TABLES[tableIndex], (err) => {
            if (err) {
              reject(err);
            } else {
              tableIndex++;
              createNextTable();
            }
          });
        };

        createNextTable();
      });
    });
  }

  private async ensureSchemaUpgrades(): Promise<void> {
    await this.ensureVideosGoogleDriveColumns();
    await this.ensureBookmarksTable();
    await this.ensureRateLimitsTable();
  }

  private async ensureVideosGoogleDriveColumns(): Promise<void> {
    if (!this.db) return;

    const columns: Array<{ name: string }> = await new Promise((resolve, reject) => {
      this.db!.all('PRAGMA table_info(videos)', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Array<{ name: string }>);
      });
    });

    const existing = new Set(columns.map((c) => c.name));

    if (!existing.has('google_drive_id')) {
      await this.run('ALTER TABLE videos ADD COLUMN google_drive_id TEXT');
    }

    if (!existing.has('google_drive_url')) {
      await this.run('ALTER TABLE videos ADD COLUMN google_drive_url TEXT');
    }
  }

  private async ensureBookmarksTable(): Promise<void> {
    if (!this.db) return;

    // Check if bookmarks table exists
    const tables: Array<{ name: string }> = await new Promise((resolve, reject) => {
      this.db!.all('SELECT name FROM sqlite_master WHERE type="table"', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Array<{ name: string }>);
      });
    });

    const existingTables = new Set(tables.map((t) => t.name));
    
    if (!existingTables.has('bookmarks')) {
      // Create bookmarks table
      await this.run(`
        CREATE TABLE IF NOT EXISTS bookmarks (
          id TEXT PRIMARY KEY,
          video_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          conversation_id TEXT,
          timestamp_seconds REAL NOT NULL,
          note TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
        )
      `);
    }

    // Create bookmarks indexes
    await this.run(ADD_BOOKMARKS_INDEXES);
  }

  private async ensureRateLimitsTable(): Promise<void> {
    if (!this.db) return;

    // Check if rate_limits table exists
    const tables: Array<{ name: string }> = await new Promise((resolve, reject) => {
      this.db!.all('SELECT name FROM sqlite_master WHERE type="table"', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Array<{ name: string }>);
      });
    });

    const existingTables = new Set(tables.map((t) => t.name));
    
    if (!existingTables.has('rate_limits')) {
      // Create rate_limits table
      await this.run(`
        CREATE TABLE IF NOT EXISTS rate_limits (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          video_id TEXT NOT NULL,
          action TEXT NOT NULL DEFAULT 'chat',
          count INTEGER NOT NULL DEFAULT 0,
          reset_time DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
        )
      `);
    }

    // Create rate limits indexes
    await this.run(ADD_RATE_LIMITS_INDEXES);
  }

  getDb(): sqlite3.Database {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    return this.db;
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database connection closed');
          resolve();
        }
      });
    });
  }

  run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      this.getDb().run(sql, params, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.getDb().get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.getDb().all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }
}

let databaseInstance: Database | null = null;

export function initDatabase(dbPath: string): Database {
  if (!databaseInstance) {
    databaseInstance = new Database(dbPath);
  }
  return databaseInstance;
}

export function getDatabase(): Database {
  if (!databaseInstance) {
    throw new Error('Database not initialized');
  }
  return databaseInstance;
}
