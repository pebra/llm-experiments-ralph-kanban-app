import { Database } from "bun:sqlite";
import { Column, Task } from "./types";

const DB_PATH = process.env.DB_PATH || ":memory:";

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    db = new Database(DB_PATH);
    initDb(db!);
  }
  return db!;
}

function initDb(database: Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS columns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      column_id INTEGER NOT NULL REFERENCES columns(id),
      title TEXT NOT NULL,
      description TEXT,
      position INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const count = database
    .prepare("SELECT COUNT(*) as count FROM columns")
    .get() as { count: number } | undefined;

  if ((count?.count ?? 0) === 0) {
    const insertColumn = database.prepare(
      "INSERT INTO columns (name, position) VALUES (?, ?)",
    );
    insertColumn.run("Todo", 0);
    insertColumn.run("In Progress", 1);
    insertColumn.run("Done", 2);
  }
}

export function getAllColumns(): Column[] {
  const db = getDb();
  return (
    db
      .prepare("SELECT * FROM columns ORDER BY position ASC")
      .all() as Column[]
  );
}

export function getTasksByColumn(columnId: number): Task[] {
  const db = getDb();
  return (
    db
      .prepare("SELECT * FROM tasks WHERE column_id = ? ORDER BY position ASC")
      .all(columnId) as Task[]
  );
}

export function resetDb(): void {
  db?.close();
  db = null;
}
