import { test, expect, beforeEach } from "bun:test";
import { getDb, getAllColumns, getTasksByColumn, resetDb, createTask } from "./db";

beforeEach(() => {
  resetDb();
});

test("initializes database with default columns", () => {
  const columns = getAllColumns();
  expect(columns).toHaveLength(3);
});

test("default columns have correct names", () => {
  const columns = getAllColumns();
  const names = columns.map((c) => c.name);
  expect(names).toEqual(["Todo", "In Progress", "Done"]);
});

test("default columns have correct positions", () => {
  const columns = getAllColumns();
  const positions = columns.map((c) => c.position);
  expect(positions).toEqual([0, 1, 2]);
});

test("columns are ordered by position", () => {
  const columns = getAllColumns();
  for (let i = 1; i < columns.length; i++) {
    expect(columns[i]!.position).toBeGreaterThan(columns[i - 1]!.position);
  }
});

test("default columns have no tasks", () => {
  const columns = getAllColumns();
  for (const col of columns) {
    const tasks = getTasksByColumn(col.id);
    expect(tasks).toHaveLength(0);
  }
});

test("columns have valid IDs", () => {
  const columns = getAllColumns();
  for (const col of columns) {
    expect(typeof col.id).toBe("number");
    expect(col.id).toBeGreaterThan(0);
  }
});

test("columns have created_at timestamp", () => {
  const columns = getAllColumns();
  for (const col of columns) {
    expect(col.created_at).toBeTruthy();
    expect(typeof col.created_at).toBe("string");
  }
});

test("database is initialized only once per getDb call", () => {
  const db1 = getDb();
  const db2 = getDb();
  expect(db1).toBe(db2);
});

test("does not duplicate default columns on re-init", () => {
  resetDb();
  const columns1 = getAllColumns();
  const columns2 = getAllColumns();
  expect(columns1).toHaveLength(3);
  expect(columns2).toHaveLength(3);
});

test("createTask adds a task to a column", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const task = createTask(todoId, "Test Task", "Test description");
  expect(task.id).toBeGreaterThan(0);
  expect(task.title).toBe("Test Task");
  expect(task.description).toBe("Test description");
  expect(task.column_id).toBe(todoId);
});

test("createTask assigns incremental position", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const task1 = createTask(todoId, "Task 1", null);
  const task2 = createTask(todoId, "Task 2", null);
  expect(task2.position).toBeGreaterThan(task1.position);
});

test("createTask handles null description", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const task = createTask(todoId, "No Desc Task", null);
  expect(task.description).toBeNull();
});

test("createTask returns task with timestamps", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const task = createTask(todoId, "Timestamp Task", null);
  expect(task.created_at).toBeTruthy();
  expect(task.updated_at).toBeTruthy();
});

test("createTask task is retrievable via getTasksByColumn", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  createTask(todoId, "Retrievable Task", "desc");
  const tasks = getTasksByColumn(todoId);
  expect(tasks).toHaveLength(1);
  expect(tasks[0]!.title).toBe("Retrievable Task");
});

test("createTask tasks are ordered by position", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  createTask(todoId, "C", null);
  createTask(todoId, "A", null);
  createTask(todoId, "B", null);
  const tasks = getTasksByColumn(todoId);
  expect(tasks.map((t) => t.title)).toEqual(["C", "A", "B"]);
});
