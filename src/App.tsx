import { useEffect, useState, useCallback } from "react";
import { marked } from "marked";
import type { ColumnWithTasks, Task } from "./types";
import "./index.css";

const renderer = new marked.Renderer();
marked.setOptions({
  renderer: renderer,
  gfm: true,
  breaks: false,
});

function TaskCard({ task }: { task: Task }) {
  const htmlDescription = task.description
    ? marked.parse(task.description, { async: false })
    : null;

  return (
    <div
      className="bg-[#002b36] rounded p-3 border border-[#586e75] cursor-pointer hover:border-[#268bd2] transition-colors"
    >
      <p className="text-[#839496] font-medium">{task.title}</p>
      {htmlDescription && (
        <div
          className="text-[#586e75] text-sm mt-1 line-clamp-2 prose prose-invert prose-max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlDescription as string }}
        />
      )}
    </div>
  );
}

function AddTaskForm({
  columnId,
  columnName,
  onCancel,
  onTaskCreated,
}: {
  columnId: number;
  columnName: string;
  onCancel: () => void;
  onTaskCreated: (task: Task) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/columns/${columnId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || null }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error || "Failed to create task");
        return;
      }
      const task = (await res.json()) as Task;
      onTaskCreated(task);
    } catch {
      setError("Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#002b36] rounded p-3 border border-[#268bd2]">
      <p className="text-[#93a1a1] text-sm mb-2">Adding task to {columnName}</p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Task title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-[#073642] text-[#839496] border border-[#586e75] rounded px-3 py-2 mb-2 focus:outline-none focus:border-[#268bd2] placeholder-[#586e75]"
          autoFocus
        />
        <textarea
          placeholder="Description (optional, markdown supported)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full bg-[#073642] text-[#839496] border border-[#586e75] rounded px-3 py-2 mb-2 focus:outline-none focus:border-[#268bd2] placeholder-[#586e75] resize-none"
        />
        {error && <p className="text-[#dc322f] text-sm mb-2">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-[#93a1a1] border border-[#586e75] rounded hover:bg-[#073642] transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1 bg-[#2aa198] text-[#002b36] rounded font-medium hover:bg-[#859900] transition-colors disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Add Task"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ColumnCard({
  column,
  tasks,
  onTaskCreated,
}: {
  column: ColumnWithTasks["column"];
  tasks: Task[];
  onTaskCreated: (columnId: number, task: Task) => void;
}) {
  const [addingTask, setAddingTask] = useState(false);

  const handleTaskCreated = (task: Task) => {
    setAddingTask(false);
    onTaskCreated(column.id, task);
  };

  return (
    <div className="flex flex-col bg-[#073642] rounded-lg min-w-[280px] max-w-[320px] flex-1">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#586e75]">
        <h2 className="text-[#93a1a1] font-bold text-lg">{column.name}</h2>
        <span className="text-[#586e75] text-sm">{tasks.length}</span>
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
        {addingTask ? (
          <AddTaskForm
            columnId={column.id}
            columnName={column.name}
            onCancel={() => setAddingTask(false)}
            onTaskCreated={handleTaskCreated}
          />
        ) : (
          <button
            onClick={() => setAddingTask(true)}
            className="w-full py-2 text-[#586e75] border border-dashed border-[#586e75] rounded hover:border-[#268bd2] hover:text-[#268bd2] transition-colors"
          >
            + Add Task
          </button>
        )}
      </div>
    </div>
  );
}

export function App() {
  const [columns, setColumns] = useState<ColumnWithTasks[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshColumns = useCallback(async () => {
    const res = await fetch("/api/columns");
    const data = (await res.json()) as ColumnWithTasks[];
    setColumns(data);
  }, []);

  useEffect(() => {
    setLoading(true);
    refreshColumns().finally(() => setLoading(false));
  }, [refreshColumns]);

  const handleTaskCreated = (_columnId: number, task: Task) => {
    refreshColumns();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#002b36] flex items-center justify-center">
        <p className="text-[#839496]">Loading board...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#002b36] p-6">
      <h1 className="text-[#839496] text-2xl font-bold mb-6">Kanban Board</h1>
      <div className="flex gap-4 overflow-x-auto">
        {columns.map(({ column, tasks }) => (
          <ColumnCard
            key={column.id}
            column={column}
            tasks={tasks}
            onTaskCreated={handleTaskCreated}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
