import { serve } from "bun";
import index from "./index.html";
import { getAllColumns, getTasksByColumn, createTask, updateTask, deleteTask, moveTask, getDb } from "./db";
import type { Task } from "./types";

const server = serve({
  routes: {
    "/*": index,

    "/api/columns": {
      async GET() {
        const columns = getAllColumns();
        const columnsWithTasks = columns.map((col) => ({
          column: col,
          tasks: getTasksByColumn(col.id),
        }));
        return Response.json(columnsWithTasks);
      },
    },

    "/api/columns/:id/tasks": {
      async GET(req) {
        const id = parseInt(req.params.id, 10);
        const tasks = getTasksByColumn(id);
        return Response.json(tasks);
      },
      async POST(req) {
        const id = parseInt(req.params.id, 10);
        const body = (await req.json()) as { title: string; description?: string };
        if (!body.title || !body.title.trim()) {
          return Response.json({ error: "Title is required" }, { status: 400 });
        }
        const task = createTask(id, body.title.trim(), body.description || null);
        return Response.json(task, { status: 201 });
      },
    },

    "/api/tasks/:id": {
      async PATCH(req) {
        const id = parseInt(req.params.id, 10);
        const body = (await req.json()) as { title: string; description?: string | null };
        if (!body.title || !body.title.trim()) {
          return Response.json({ error: "Title is required" }, { status: 400 });
        }
        const task = updateTask(id, body.title.trim(), body.description ?? null);
        return Response.json(task);
      },
      async DELETE(req) {
        const id = parseInt(req.params.id, 10);
        const deleted = deleteTask(id);
        if (!deleted) {
          return Response.json({ error: "Task not found" }, { status: 404 });
        }
        return new Response(null, { status: 204 });
      },
    },

    "/api/tasks/:id/move": {
      async PUT(req) {
        const id = parseInt(req.params.id, 10);
        const body = (await req.json()) as { targetColumnId: number; targetPosition?: number };
        const db = getDb();
        const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined;
        if (!existing) {
          return Response.json({ error: "Task not found" }, { status: 404 });
        }
        let targetPosition: number;
        if (body.targetPosition !== undefined) {
          targetPosition = body.targetPosition;
        } else {
          const maxPos = db
            .prepare(
              "SELECT COALESCE(MAX(position), -1) as maxPos FROM tasks WHERE column_id = ?",
            )
            .get(body.targetColumnId) as { maxPos: number };
          targetPosition = (maxPos?.maxPos ?? -1) + 1;
        }
        const task = moveTask(id, body.targetColumnId, targetPosition);
        return Response.json(task);
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at ${server.url}`);
