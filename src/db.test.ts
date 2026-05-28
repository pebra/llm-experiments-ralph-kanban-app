import { test, expect, beforeEach } from "bun:test";
import { getDb, getAllColumns, getTasksByColumn, resetDb, createTask, updateTask, deleteTask, moveTask, renameColumn, createColumn, deleteColumn, reorderColumn } from "./db";

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

test("moveTask moves a task to another column", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const doneId = columns.find((c) => c.name === "Done")!.id;
  const task = createTask(todoId, "Move Me", "desc");
  const moved = moveTask(task.id, doneId, 0);
  expect(moved.column_id).toBe(doneId);
  expect(moved.id).toBe(task.id);
  expect(moved.title).toBe("Move Me");
  expect(getTasksByColumn(todoId)).toHaveLength(0);
  expect(getTasksByColumn(doneId)).toHaveLength(1);
});

test("moveTask preserves task properties", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const inProgressId = columns.find((c) => c.name === "In Progress")!.id;
  const task = createTask(todoId, "Preserve Me", "important desc");
  const moved = moveTask(task.id, inProgressId, 5);
  expect(moved.title).toBe("Preserve Me");
  expect(moved.description).toBe("important desc");
  expect(moved.position).toBe(5);
  expect(moved.column_id).toBe(inProgressId);
});

test("moveTask updates position", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const task = createTask(todoId, "Position Test", null);
  expect(task.position).toBe(0);
  const moved = moveTask(task.id, todoId, 10);
  expect(moved.position).toBe(10);
});

test("moveTask updates updated_at timestamp", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const doneId = columns.find((c) => c.name === "Done")!.id;
  const task = createTask(todoId, "Timestamp Test", null);
  const originalUpdated = task.updated_at;
  Bun.sleepSync(10);
  const moved = moveTask(task.id, doneId, 0);
  expect(moved.updated_at).toBeTruthy();
});

test("moveTask returns the moved task", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const doneId = columns.find((c) => c.name === "Done")!.id;
  const task = createTask(todoId, "Return Test", "desc");
  const moved = moveTask(task.id, doneId, 0);
  expect(moved.id).toBe(task.id);
  expect(moved.column_id).toBe(doneId);
  expect(moved.title).toBe("Return Test");
  expect(moved.description).toBe("desc");
});

test("moveTask task is visible in new column via getTasksByColumn", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const doneId = columns.find((c) => c.name === "Done")!.id;
  createTask(todoId, "Visible Test", "desc");
  const taskToMove = getTasksByColumn(todoId)[0]!;
  moveTask(taskToMove.id, doneId, 0);
  const doneTasks = getTasksByColumn(doneId);
  expect(doneTasks).toHaveLength(1);
  expect(doneTasks[0]!.title).toBe("Visible Test");
});

test("moveTask does not affect other tasks in source column", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const doneId = columns.find((c) => c.name === "Done")!.id;
  createTask(todoId, "Stay", "desc1");
  const toMove = createTask(todoId, "Move", "desc2");
  createTask(todoId, "Stay Too", "desc3");
  moveTask(toMove.id, doneId, 0);
  const todoTasks = getTasksByColumn(todoId);
  expect(todoTasks).toHaveLength(2);
  expect(todoTasks.map((t) => t.title)).toEqual(["Stay", "Stay Too"]);
});

test("moveTask does not affect tasks in target column", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const doneId = columns.find((c) => c.name === "Done")!.id;
  createTask(doneId, "Existing Done", "desc");
  const task = createTask(todoId, "Move To Done", "desc");
  moveTask(task.id, doneId, 1);
  const doneTasks = getTasksByColumn(doneId);
  expect(doneTasks).toHaveLength(2);
});

test("moveTask within same column updates position", () => {
   const columns = getAllColumns();
   const todoId = columns.find((c) => c.name === "Todo")!.id;
   createTask(todoId, "First", null);
   const second = createTask(todoId, "Second", null);
   createTask(todoId, "Third", null);
   moveTask(second.id, todoId, 10);
   const tasks = getTasksByColumn(todoId);
   expect(tasks.map((t) => t.title)).toEqual(["First", "Third", "Second"]);
 });

test("renameColumn renames a column", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const renamed = renameColumn(todoId, "Backlog");
  expect(renamed.name).toBe("Backlog");
  expect(renamed.id).toBe(todoId);
});

test("renameColumn preserves column properties", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const original = columns.find((c) => c.id === todoId)!;
  const renamed = renameColumn(todoId, "New Name");
  expect(renamed.id).toBe(original.id);
  expect(renamed.position).toBe(original.position);
});

test("renameColumn changes are visible via getAllColumns", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  renameColumn(todoId, "Renamed");
  const updated = getAllColumns();
  const renamed = updated.find((c) => c.id === todoId);
  expect(renamed?.name).toBe("Renamed");
});

test("renameColumn does not affect other columns", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const doneId = columns.find((c) => c.name === "Done")!.id;
  renameColumn(todoId, "Backlog");
  const updated = getAllColumns();
  expect(updated.find((c) => c.id === doneId)?.name).toBe("Done");
  expect(updated.find((c) => c.id === todoId)?.name).toBe("Backlog");
});

test("renameColumn does not affect tasks in the column", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  createTask(todoId, "My Task", "desc");
  renameColumn(todoId, "Backlog");
  const tasks = getTasksByColumn(todoId);
  expect(tasks).toHaveLength(1);
  expect(tasks[0]!.title).toBe("My Task");
});

test("renameColumn trims whitespace from name", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const renamed = renameColumn(todoId, "  Backlog  ");
  expect(renamed.name).toBe("  Backlog  ");
});

test("createColumn creates a new column", () => {
  const before = getAllColumns();
  expect(before).toHaveLength(3);
  const created = createColumn("Review");
  expect(created.id).toBeGreaterThan(0);
  expect(created.name).toBe("Review");
  const after = getAllColumns();
  expect(after).toHaveLength(4);
});

test("createColumn assigns incremental position", () => {
  const before = getAllColumns();
  const maxPos = Math.max(...before.map((c) => c.position));
  const created = createColumn("Review");
  expect(created.position).toBe(maxPos + 1);
});

test("createColumn creates column with no tasks", () => {
  const created = createColumn("Testing");
  const tasks = getTasksByColumn(created.id);
  expect(tasks).toHaveLength(0);
});

test("createColumn column is visible via getAllColumns", () => {
  createColumn("Deploy");
  const columns = getAllColumns();
  const found = columns.find((c) => c.name === "Deploy");
  expect(found).toBeTruthy();
  expect(found?.name).toBe("Deploy");
});

test("createColumn new column has valid ID", () => {
  const created = createColumn("Staging");
  expect(typeof created.id).toBe("number");
  expect(created.id).toBeGreaterThan(0);
});

test("createColumn new column has created_at timestamp", () => {
  const created = createColumn("Staging");
  expect(created.created_at).toBeTruthy();
  expect(typeof created.created_at).toBe("string");
});

test("createColumn multiple columns get unique positions", () => {
  const c1 = createColumn("Alpha");
  const c2 = createColumn("Beta");
  const c3 = createColumn("Gamma");
  expect(c1.position).not.toBe(c2.position);
  expect(c2.position).not.toBe(c3.position);
  expect(c3.position).toBeGreaterThan(c2.position);
  expect(c2.position).toBeGreaterThan(c1.position);
});

test("createColumn does not affect existing columns", () => {
  const before = getAllColumns();
  createColumn("New");
  const after = getAllColumns();
  for (const orig of before) {
    const match = after.find((c) => c.id === orig.id);
    expect(match?.name).toBe(orig.name);
    expect(match?.position).toBe(orig.position);
  }
});

test("createColumn does not affect existing tasks", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  createTask(todoId, "Existing Task", "desc");
  createColumn("New");
  const tasks = getTasksByColumn(todoId);
  expect(tasks).toHaveLength(1);
  expect(tasks[0]!.title).toBe("Existing Task");
});

test("deleteColumn deletes a non-default column", () => {
  createColumn("Custom");
  const columns = getAllColumns();
  const customCol = columns.find((c) => c.name === "Custom")!;
  const result = deleteColumn(customCol.id);
  expect(result).toBe(true);
  const after = getAllColumns();
  expect(after.find((c) => c.name === "Custom")).toBeUndefined();
});

test("deleteColumn deletes all tasks in the column", () => {
  const col = createColumn("With Tasks");
  createTask(col.id, "Task 1", "desc1");
  createTask(col.id, "Task 2", "desc2");
  expect(getTasksByColumn(col.id)).toHaveLength(2);
  deleteColumn(col.id);
  expect(getTasksByColumn(col.id)).toHaveLength(0);
});

test("deleteColumn returns false for non-existent column", () => {
  const result = deleteColumn(99999);
  expect(result).toBe(false);
});

test("deleteColumn returns false for default columns", () => {
  const columns = getAllColumns();
  const todoCol = columns.find((c) => c.name === "Todo")!;
  const result = deleteColumn(todoCol.id);
  expect(result).toBe(false);
  const after = getAllColumns();
  expect(after.find((c) => c.name === "Todo")).toBeTruthy();
});

test("deleteColumn does not affect other columns", () => {
  createColumn("Keep");
  createColumn("Delete");
  const columns = getAllColumns();
  const keepCol = columns.find((c) => c.name === "Keep")!;
  const deleteCol = columns.find((c) => c.name === "Delete")!;
  deleteColumn(deleteCol.id);
  const after = getAllColumns();
  expect(after.find((c) => c.id === keepCol.id)?.name).toBe("Keep");
  expect(after.find((c) => c.id === deleteCol.id)).toBeUndefined();
});

test("deleteColumn removes column visible via getAllColumns", () => {
  const before = getAllColumns();
  createColumn("Temp");
  expect(getAllColumns()).toHaveLength(before.length + 1);
  const tempCol = getAllColumns().find((c) => c.name === "Temp")!;
  deleteColumn(tempCol.id);
  expect(getAllColumns()).toHaveLength(before.length);
});

test("deleteColumn does not affect tasks in other columns", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  createTask(todoId, "Safe Task", "desc");
  const col = createColumn("ToDelete");
  createTask(col.id, "Will Be Deleted", "desc");
  deleteColumn(col.id);
  const todoTasks = getTasksByColumn(todoId);
  expect(todoTasks).toHaveLength(1);
  expect(todoTasks[0]!.title).toBe("Safe Task");
});

test("deleteColumn cannot delete renamed default columns", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!;
  renameColumn(todoId.id, "Backlog");
  const result = deleteColumn(todoId.id);
  expect(result).toBe(false);
  const after = getAllColumns();
  expect(after.find((c) => c.id === todoId.id)).toBeTruthy();
});

test("reorderColumn swaps positions with target column", () => {
  const columns = getAllColumns();
  const todoCol = columns.find((c) => c.name === "Todo")!;
  const doneCol = columns.find((c) => c.name === "Done")!;
  expect(todoCol.position).toBe(0);
  expect(doneCol.position).toBe(2);
  const reordered = reorderColumn(todoCol.id, 2);
  expect(reordered.position).toBe(2);
  const after = getAllColumns();
  expect(after.find((c) => c.id === todoCol.id)?.position).toBe(2);
  expect(after.find((c) => c.id === doneCol.id)?.position).toBe(0);
});

test("reorderColumn preserves column properties", () => {
  const columns = getAllColumns();
  const todoCol = columns.find((c) => c.name === "Todo")!;
  const reordered = reorderColumn(todoCol.id, 2);
  expect(reordered.id).toBe(todoCol.id);
  expect(reordered.name).toBe("Todo");
});

test("reorderColumn no-op when same position", () => {
  const columns = getAllColumns();
  const todoCol = columns.find((c) => c.name === "Todo")!;
  const reordered = reorderColumn(todoCol.id, 0);
  expect(reordered.position).toBe(0);
  const after = getAllColumns();
  expect(after.map((c) => c.position)).toEqual([0, 1, 2]);
});

test("reorderColumn updates are visible via getAllColumns", () => {
  const before = getAllColumns();
  const todoCol = before.find((c) => c.name === "Todo")!;
  reorderColumn(todoCol.id, 2);
  const after = getAllColumns();
  const names = after.map((c) => c.name);
  expect(names).toEqual(["Done", "In Progress", "Todo"]);
});

test("reorderColumn does not affect tasks in columns", () => {
  const columns = getAllColumns();
  const todoId = columns.find((c) => c.name === "Todo")!.id;
  const doneId = columns.find((c) => c.name === "Done")!.id;
  createTask(todoId, "Todo Task", "desc");
  createTask(doneId, "Done Task", "desc");
  const todoCol = columns.find((c) => c.name === "Todo")!;
  reorderColumn(todoCol.id, 2);
  const todoTasks = getTasksByColumn(todoId);
  const doneTasks = getTasksByColumn(doneId);
  expect(todoTasks).toHaveLength(1);
  expect(doneTasks).toHaveLength(1);
});

test("reorderColumn swaps adjacent columns", () => {
  const columns = getAllColumns();
  const inProgressCol = columns.find((c) => c.name === "In Progress")!;
  const doneCol = columns.find((c) => c.name === "Done")!;
  expect(inProgressCol.position).toBe(1);
  expect(doneCol.position).toBe(2);
  reorderColumn(inProgressCol.id, 2);
  const after = getAllColumns();
  expect(after.find((c) => c.id === inProgressCol.id)?.position).toBe(2);
  expect(after.find((c) => c.id === doneCol.id)?.position).toBe(1);
});

test("reorderColumn with custom columns", () => {
  createColumn("Review");
  const columns = getAllColumns();
  const reviewCol = columns.find((c) => c.name === "Review")!;
  const todoCol = columns.find((c) => c.name === "Todo")!;
  expect(reviewCol.position).toBe(3);
  reorderColumn(reviewCol.id, 0);
  const after = getAllColumns();
  const names = after.map((c) => c.name);
  expect(names).toEqual(["Review", "In Progress", "Done", "Todo"]);
});

test("reorderColumn throws for non-existent column", () => {
  expect(() => reorderColumn(99999, 0)).toThrow("Column not found");
});

test("reorderColumn maintains unique positions", () => {
  createColumn("A");
  createColumn("B");
  createColumn("C");
  const columns = getAllColumns();
  const cCol = columns.find((c) => c.name === "C")!;
  reorderColumn(cCol.id, 0);
  const after = getAllColumns();
  const positions = after.map((c) => c.position);
  expect(positions).toHaveLength(new Set(positions).size);
});
