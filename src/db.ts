import { Database } from "bun:sqlite";
import type { Column, Task } from "./types";

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
      is_default INTEGER NOT NULL DEFAULT 0,
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

  migrateIsDefault(database);

  const count = database
    .prepare("SELECT COUNT(*) as count FROM columns")
    .get() as { count: number } | undefined;

  if ((count?.count ?? 0) === 0) {
    const insertColumn = database.prepare(
      "INSERT INTO columns (name, position, is_default) VALUES (?, ?, 1)",
    );
    insertColumn.run("Todo", 0);
    insertColumn.run("In Progress", 1);
    insertColumn.run("Done", 2);
  }
}

function migrateIsDefault(database: Database) {
  const info = database
    .prepare("PRAGMA table_info(columns)")
    .all() as Array<{ name: string }>;
  const hasIsDefault = info.some((col) => col.name === "is_default");
  if (!hasIsDefault) {
    database.exec("ALTER TABLE columns ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0");
    database.exec(
      "UPDATE columns SET is_default = 1 WHERE name IN ('Todo', 'In Progress', 'Done') AND position IN (0, 1, 2)",
    );
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

export function createTask(
  columnId: number,
  title: string,
  description: string | null,
): Task {
  const db = getDb();
  const maxPos = db
    .prepare(
      "SELECT COALESCE(MAX(position), -1) as maxPos FROM tasks WHERE column_id = ?",
    )
    .get(columnId) as { maxPos: number };
  const position = (maxPos?.maxPos ?? -1) + 1;
  const stmt = db.prepare(
    "INSERT INTO tasks (column_id, title, description, position) VALUES (?, ?, ?, ?)",
  );
  const result = stmt.run(columnId, title, description, position);
  const insertedId = Number(result.lastInsertRowid);
  const task = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(insertedId) as Task;
  return task;
}

export function updateTask(
  taskId: number,
  title: string,
  description: string | null,
): Task {
  const db = getDb();
  db.prepare(
    "UPDATE tasks SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  ).run(title, description, taskId);
  const task = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(taskId) as Task;
  return task;
}

export function deleteTask(taskId: number): boolean {
  const db = getDb();
  const result = db
    .prepare("DELETE FROM tasks WHERE id = ?")
    .run(taskId);
  return (result.changes ?? 0) > 0;
}

export function moveTask(
  taskId: number,
  targetColumnId: number,
  targetPosition: number,
): Task {
  const db = getDb();
  db.prepare(
    "UPDATE tasks SET column_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  ).run(targetColumnId, targetPosition, taskId);
  const task = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(taskId) as Task;
  return task;
}

export function createColumn(name: string): Column {
  const db = getDb();
  const maxPos = db
    .prepare(
      "SELECT COALESCE(MAX(position), -1) as maxPos FROM columns",
    )
    .get() as { maxPos: number };
  const position = (maxPos?.maxPos ?? -1) + 1;
  const stmt = db.prepare(
    "INSERT INTO columns (name, position) VALUES (?, ?)",
  );
  stmt.run(name, position);
  const column = db
    .prepare("SELECT * FROM columns WHERE name = ? AND position = ?")
    .get(name, position) as Column;
  return column;
}

export function renameColumn(columnId: number, newName: string): Column {
  const db = getDb();
  db.prepare(
    "UPDATE columns SET name = ? WHERE id = ?",
  ).run(newName, columnId);
  const column = db
    .prepare("SELECT * FROM columns WHERE id = ?")
    .get(columnId) as Column;
  return column;
}

export function deleteColumn(columnId: number): boolean {
  const db = getDb();
  const column = db
    .prepare("SELECT * FROM columns WHERE id = ?")
    .get(columnId) as Column | undefined;
  if (!column) {
    return false;
  }
  if ((column as Column & { is_default: number }).is_default) {
    return false;
  }
  db.prepare("DELETE FROM tasks WHERE column_id = ?").run(columnId);
  db.prepare("DELETE FROM columns WHERE id = ?").run(columnId);
  return true;
}

export function reorderColumn(columnId: number, targetPosition: number): Column {
  const db = getDb();
  const column = db
    .prepare("SELECT * FROM columns WHERE id = ?")
    .get(columnId) as Column;
  if (!column) {
    throw new Error("Column not found");
  }
  const oldPosition = column.position;
  if (oldPosition === targetPosition) {
    return column;
  }
  db.prepare(
    "UPDATE columns SET position = ? WHERE position = ?",
  ).run(oldPosition, targetPosition);
  db.prepare(
    "UPDATE columns SET position = ? WHERE id = ?",
  ).run(targetPosition, columnId);
  const updated = db
    .prepare("SELECT * FROM columns WHERE id = ?")
    .get(columnId) as Column;
  return updated;
}

export function resetDb(): void {
  db?.close();
  db = null;
}
