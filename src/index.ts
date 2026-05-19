import { serve } from "bun";
import index from "./index.html";
import { getAllColumns, getTasksByColumn } from "./db";

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
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at ${server.url}`);
