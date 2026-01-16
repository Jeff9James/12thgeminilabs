import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { ALL_TABLES } from './schema';

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
