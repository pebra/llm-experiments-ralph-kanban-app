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

function TaskCard({ task, onEdit, onDelete }: { task: Task; onEdit: (task: Task) => void; onDelete: (task: Task) => void }) {
  const htmlDescription = task.description
    ? marked.parse(task.description, { async: false })
    : null;

  return (
    <div
      className="bg-[#002b36] rounded p-3 border border-[#586e75] cursor-pointer hover:border-[#268bd2] transition-colors group relative"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[#839496] font-medium flex-1">{task.title}</p>
        <div className="flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="opacity-0 group-hover:opacity-100 text-[#586e75] hover:text-[#268bd2] transition-all p-0.5 rounded"
            title="Edit task"
          >
            &#9998;
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task); }}
            className="opacity-0 group-hover:opacity-100 text-[#586e75] hover:text-[#dc322f] transition-all p-0.5 rounded"
            title="Delete task"
          >
            &times;
          </button>
        </div>
      </div>
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

function EditTaskForm({
  task,
  onCancel,
  onSave,
}: {
  task: Task;
  onCancel: () => void;
  onSave: (task: Task) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
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
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || null }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error || "Failed to update task");
        return;
      }
      const updated = (await res.json()) as Task;
      onSave(updated);
    } catch {
      setError("Failed to update task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-[#073642] rounded-lg p-6 w-full max-w-md border border-[#586e75] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[#93a1a1] font-bold text-lg mb-4">Edit Task</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#002b36] text-[#839496] border border-[#586e75] rounded px-3 py-2 mb-2 focus:outline-none focus:border-[#268bd2] placeholder-[#586e75]"
            placeholder="Task title *"
            autoFocus
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full bg-[#002b36] text-[#839496] border border-[#586e75] rounded px-3 py-2 mb-2 focus:outline-none focus:border-[#268bd2] placeholder-[#586e75] resize-none"
            placeholder="Description (optional, markdown supported)"
          />
          {error && <p className="text-[#dc322f] text-sm mb-2">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 text-[#93a1a1] border border-[#586e75] rounded hover:bg-[#002b36] transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-[#2aa198] text-[#002b36] rounded font-medium hover:bg-[#859900] transition-colors disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteTaskConfirmation({
  task,
  onCancel,
  onConfirm,
}: {
  task: Task;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        return;
      }
      onConfirm();
    } catch {
      // silently fail, user can retry
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-[#073642] rounded-lg p-6 w-full max-w-sm border border-[#586e75] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[#93a1a1] font-bold text-lg mb-2">Delete Task</h2>
        <p className="text-[#839496] mb-4">
          Are you sure you want to delete &ldquo;{task.title}&rdquo;? This action cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-[#93a1a1] border border-[#586e75] rounded hover:bg-[#002b36] transition-colors"
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="px-3 py-1 bg-[#dc322f] text-[#fdf6e3] rounded font-medium hover:bg-[#cb4b16] transition-colors disabled:opacity-50"
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ColumnCard({
  column,
  tasks,
  onTaskCreated,
  onTaskEdit,
  onTaskDelete,
}: {
  column: ColumnWithTasks["column"];
  tasks: Task[];
  onTaskCreated: (columnId: number, task: Task) => void;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (task: Task) => void;
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
          <TaskCard key={task.id} task={task} onEdit={onTaskEdit} onDelete={onTaskDelete} />
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
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

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

  const handleTaskEdit = (task: Task) => {
    setEditingTask(task);
  };

  const handleTaskSaved = () => {
    setEditingTask(null);
    refreshColumns();
  };

  const handleEditCancel = () => {
    setEditingTask(null);
  };

  const handleTaskDelete = (task: Task) => {
    setDeletingTask(task);
  };

  const handleDeleteConfirm = () => {
    setDeletingTask(null);
    refreshColumns();
  };

  const handleDeleteCancel = () => {
    setDeletingTask(null);
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
            onTaskEdit={handleTaskEdit}
            onTaskDelete={handleTaskDelete}
          />
        ))}
      </div>
      {editingTask && (
        <EditTaskForm
          task={editingTask}
          onCancel={handleEditCancel}
          onSave={handleTaskSaved}
        />
      )}
      {deletingTask && (
        <DeleteTaskConfirmation
          task={deletingTask}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}

export default App;
