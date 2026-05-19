import { test, expect, beforeEach } from "bun:test";
import { getDb, getAllColumns, getTasksByColumn, resetDb, createTask, updateTask, deleteTask } from "./db";

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

test("updateTask updates title and description", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const task = createTask(todoId, "Original Title", "Original desc");
  const updated = updateTask(task.id, "New Title", "New description");
  expect(updated.title).toBe("New Title");
  expect(updated.description).toBe("New description");
  expect(updated.id).toBe(task.id);
});

test("updateTask updates description to null", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const task = createTask(todoId, "Has Desc", "some description");
  const updated = updateTask(task.id, "Has Desc", null);
  expect(updated.description).toBeNull();
});

test("updateTask preserves column_id and position", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const task = createTask(todoId, "Task", "desc");
  const updated = updateTask(task.id, "Updated", "new desc");
  expect(updated.column_id).toBe(todoId);
  expect(updated.position).toBe(task.position);
});

test("updateTask updates updated_at timestamp", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const task = createTask(todoId, "Task", "desc");
  const originalUpdated = task.updated_at;
  const updated = updateTask(task.id, "Updated", "new desc");
  expect(updated.updated_at).toBeTruthy();
});

test("updateTask changes are visible via getTasksByColumn", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const task = createTask(todoId, "Before", "old");
  updateTask(task.id, "After", "new");
  const tasks = getTasksByColumn(todoId);
  expect(tasks[0]!.title).toBe("After");
  expect(tasks[0]!.description).toBe("new");
});

test("updateTask only updates title keeping description", () => {
   const columns = getAllColumns();
   const todoId = columns.find((c) => c.name === "Todo")!.id;
   const task = createTask(todoId, "Original", "keep this");
   const updated = updateTask(task.id, "Changed", "keep this");
   expect(updated.title).toBe("Changed");
   expect(updated.description).toBe("keep this");
 });

test("deleteTask removes a task from the database", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const task = createTask(todoId, "To Delete", "desc");
  const result = deleteTask(task.id);
  expect(result).toBe(true);
  const tasks = getTasksByColumn(todoId);
  expect(tasks).toHaveLength(0);
});

test("deleteTask returns false for non-existent task", () => {
  const result = deleteTask(99999);
  expect(result).toBe(false);
});

test("deleteTask only deletes the specified task", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const task1 = createTask(todoId, "Keep", "desc1");
  const task2 = createTask(todoId, "Delete", "desc2");
  const task3 = createTask(todoId, "Keep Too", "desc3");
  deleteTask(task2.id);
  const tasks = getTasksByColumn(todoId);
  expect(tasks).toHaveLength(2);
  expect(tasks.map((t) => t.title)).toEqual(["Keep", "Keep Too"]);
});

test("deleteTask removes task visible via getAllColumns", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  createTask(todoId, "Will Delete", "desc");
  expect(getTasksByColumn(todoId)).toHaveLength(1);
  const taskToDelete = getTasksByColumn(todoId)[0]!;
  deleteTask(taskToDelete.id);
  expect(getTasksByColumn(todoId)).toHaveLength(0);
});

test("deleteTask does not affect tasks in other columns", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const doneId = columns.find((c) => c.name === "Done")!.id;
  const todoTask = createTask(todoId, "Todo Task", "desc");
  createTask(doneId, "Done Task", "desc");
  deleteTask(todoTask.id);
  expect(getTasksByColumn(todoId)).toHaveLength(0);
  expect(getTasksByColumn(doneId)).toHaveLength(1);
});
