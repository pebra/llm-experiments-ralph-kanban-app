import { Database } from "bun:sqlite";
import type { Column, Task } from "./types";

let dbPath: string = process.env.DB_PATH || "./kanban.db";
let db: Database | null = null;

export function getDbPath(): string {
  return dbPath;
}

export function setDbPath(path: string): void {
  if (db) {
    db.close();
    db = null;
  }
  dbPath = path;
}

export function getDb(): Database {
  if (!db) {
    try {
      db = new Database(dbPath);
      initDb(db);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to open database at ${dbPath}: ${message}`);
    }
  }
  return db;
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
  try {
    const database = getDb();
    return (
      database
        .prepare("SELECT * FROM columns ORDER BY position ASC")
        .all() as Column[]
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get columns: ${message}`);
  }
}

export function getTasksByColumn(columnId: number): Task[] {
  try {
    const database = getDb();
    return (
      database
        .prepare("SELECT * FROM tasks WHERE column_id = ? ORDER BY position ASC")
        .all(columnId) as Task[]
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get tasks for column ${columnId}: ${message}`);
  }
}

export function createTask(
  columnId: number,
  title: string,
  description: string | null,
): Task {
  try {
    const database = getDb();
    const maxPos = database
      .prepare(
        "SELECT COALESCE(MAX(position), -1) as maxPos FROM tasks WHERE column_id = ?",
      )
      .get(columnId) as { maxPos: number };
    const position = (maxPos?.maxPos ?? -1) + 1;
    const stmt = database.prepare(
      "INSERT INTO tasks (column_id, title, description, position) VALUES (?, ?, ?, ?)",
    );
    const result = stmt.run(columnId, title, description, position);
    const insertedId = Number(result.lastInsertRowid);
    const task = database
      .prepare("SELECT * FROM tasks WHERE id = ?")
      .get(insertedId) as Task;
    return task;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create task: ${message}`);
  }
}

export function updateTask(
  taskId: number,
  title: string,
  description: string | null,
): Task {
  try {
    const database = getDb();
    database.prepare(
      "UPDATE tasks SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).run(title, description, taskId);
    const task = database
      .prepare("SELECT * FROM tasks WHERE id = ?")
      .get(taskId) as Task;
    return task;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to update task ${taskId}: ${message}`);
  }
}

export function deleteTask(taskId: number): boolean {
  try {
    const database = getDb();
    const result = database
      .prepare("DELETE FROM tasks WHERE id = ?")
      .run(taskId);
    return (result.changes ?? 0) > 0;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete task ${taskId}: ${message}`);
  }
}

export function moveTask(
  taskId: number,
  targetColumnId: number,
  targetPosition: number,
): Task {
  try {
    const database = getDb();
    database.prepare(
      "UPDATE tasks SET column_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).run(targetColumnId, targetPosition, taskId);
    const task = database
      .prepare("SELECT * FROM tasks WHERE id = ?")
      .get(taskId) as Task;
    return task;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to move task ${taskId}: ${message}`);
  }
}

export function createColumn(name: string): Column {
  try {
    const database = getDb();
    const maxPos = database
      .prepare(
        "SELECT COALESCE(MAX(position), -1) as maxPos FROM columns",
      )
      .get() as { maxPos: number };
    const position = (maxPos?.maxPos ?? -1) + 1;
    const stmt = database.prepare(
      "INSERT INTO columns (name, position) VALUES (?, ?)",
    );
    stmt.run(name, position);
    const column = database
      .prepare("SELECT * FROM columns WHERE name = ? AND position = ?")
      .get(name, position) as Column;
    return column;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create column: ${message}`);
  }
}

export function renameColumn(columnId: number, newName: string): Column {
  try {
    const database = getDb();
    database.prepare(
      "UPDATE columns SET name = ? WHERE id = ?",
    ).run(newName, columnId);
    const column = database
      .prepare("SELECT * FROM columns WHERE id = ?")
      .get(columnId) as Column;
    return column;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to rename column ${columnId}: ${message}`);
  }
}

export function deleteColumn(columnId: number): boolean {
  try {
    const database = getDb();
    const column = database
      .prepare("SELECT * FROM columns WHERE id = ?")
      .get(columnId) as Column | undefined;
    if (!column) {
      return false;
    }
    if ((column as Column & { is_default: number }).is_default) {
      return false;
    }
    database.prepare("DELETE FROM tasks WHERE column_id = ?").run(columnId);
    database.prepare("DELETE FROM columns WHERE id = ?").run(columnId);
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete column ${columnId}: ${message}`);
  }
}

export function reorderColumn(columnId: number, targetPosition: number): Column {
  try {
    const database = getDb();
    const column = database
      .prepare("SELECT * FROM columns WHERE id = ?")
      .get(columnId) as Column;
    if (!column) {
      throw new Error("Column not found");
    }
    const oldPosition = column.position;
    if (oldPosition === targetPosition) {
      return column;
    }
    database.prepare(
      "UPDATE columns SET position = ? WHERE position = ?",
    ).run(oldPosition, targetPosition);
    database.prepare(
      "UPDATE columns SET position = ? WHERE id = ?",
    ).run(targetPosition, columnId);
    const updated = database
      .prepare("SELECT * FROM columns WHERE id = ?")
      .get(columnId) as Column;
    return updated;
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Column not found") {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to reorder column ${columnId}: ${message}`);
  }
}

export function resetDb(): void {
  db?.close();
  db = null;
}
