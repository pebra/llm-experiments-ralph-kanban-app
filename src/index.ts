import { serve } from "bun";
import index from "./index.html";
import { getAllColumns, getTasksByColumn, createTask, updateTask } from "./db";

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
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at ${server.url}`);
