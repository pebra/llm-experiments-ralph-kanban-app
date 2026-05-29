import { useEffect, useState, useCallback, useRef } from "react";
import { marked } from "marked";
import type { Column, ColumnWithTasks, Task } from "./types";
import "./index.css";

const renderer = new marked.Renderer();
marked.setOptions({
  renderer: renderer,
  gfm: true,
  breaks: false,
});

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TaskCard({
  task,
  onEdit,
  onDelete,
  onDragStart,
  isDragging,
  onClick,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onDragStart: (task: Task, e: React.DragEvent) => void;
  isDragging: boolean;
  onClick: (task: Task) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const dragStarted = useRef(false);
  const htmlDescription = task.description
    ? marked.parse(task.description, { async: false })
    : null;
  const hasLongDescription = task.description && task.description.length > 120;

  const handleDragStart = (e: React.DragEvent) => {
    dragStarted.current = true;
    onDragStart(task, e);
  };

  const handleClick = () => {
    if (!dragStarted.current) {
      onClick(task);
    }
    dragStarted.current = false;
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      onDragEnd={() => { dragStarted.current = false; }}
      className={`bg-[var(--sol-base03)] rounded p-3 border border-[var(--sol-base01)] cursor-grab active:cursor-grabbing hover:border-[var(--sol-blue)] transition-colors group relative ${
        isDragging ? "opacity-40" : "opacity-100"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[var(--sol-base0)] font-medium flex-1">{task.title}</p>
        <div className="flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="opacity-0 group-hover:opacity-100 text-[var(--sol-base01)] hover:text-[var(--sol-blue)] transition-all p-0.5 rounded"
            title="Edit task"
          >
            &#9998;
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task); }}
            className="opacity-0 group-hover:opacity-100 text-[var(--sol-base01)] hover:text-[var(--sol-red)] transition-all p-0.5 rounded"
            title="Delete task"
          >
            &times;
          </button>
        </div>
      </div>
      {htmlDescription && (
        <>
          <div
            className={`text-[var(--sol-base01)] text-sm mt-1 prose prose-invert prose-max-w-none ${
              !expanded && !hasLongDescription ? "line-clamp-2" : ""
            } ${!expanded && hasLongDescription ? "line-clamp-3" : ""}`}
            dangerouslySetInnerHTML={{ __html: htmlDescription as string }}
          />
          {hasLongDescription && !expanded && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
              className="text-[var(--sol-magenta)] text-xs mt-0.5 hover:underline"
            >
              Show more
            </button>
          )}
          {expanded && hasLongDescription && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
              className="text-[var(--sol-magenta)] text-xs mt-0.5 hover:underline"
            >
              Show less
            </button>
          )}
        </>
      )}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--sol-base00)] text-[var(--sol-base01)] text-xs">
        <span title={`Created: ${formatDate(task.created_at)}`}>
          Created {formatDate(task.created_at)}
        </span>
        <span>&middot;</span>
        <span title={`Updated: ${formatDate(task.updated_at)}`}>
          Updated {formatDate(task.updated_at)}
        </span>
      </div>
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
    <div className="bg-[var(--sol-base03)] rounded p-3 border border-[var(--sol-blue)]">
      <p className="text-[var(--sol-base1)] text-sm mb-2">Adding task to {columnName}</p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Task title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-[var(--sol-base02)] text-[var(--sol-base0)] border border-[var(--sol-base01)] rounded px-3 py-2 mb-2 focus:outline-none focus:border-[var(--sol-blue)] placeholder-[var(--sol-base01)]"
          autoFocus
        />
        <textarea
          placeholder="Description (optional, markdown supported)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full bg-[var(--sol-base02)] text-[var(--sol-base0)] border border-[var(--sol-base01)] rounded px-3 py-2 mb-2 focus:outline-none focus:border-[var(--sol-blue)] placeholder-[var(--sol-base01)] resize-none"
        />
        {error && <p className="text-[var(--sol-red)] text-sm mb-2">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-[var(--sol-base1)] border border-[var(--sol-base01)] rounded hover:bg-[var(--sol-base02)] transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1 bg-[var(--sol-cyan)] text-[var(--sol-base03)] rounded font-medium hover:bg-[var(--sol-green)] transition-colors disabled:opacity-50"
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
        className="bg-[var(--sol-base02)] rounded-lg p-6 w-full max-w-md border border-[var(--sol-base01)] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[var(--sol-base1)] font-bold text-lg mb-4">Edit Task</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[var(--sol-base03)] text-[var(--sol-base0)] border border-[var(--sol-base01)] rounded px-3 py-2 mb-2 focus:outline-none focus:border-[var(--sol-blue)] placeholder-[var(--sol-base01)]"
            placeholder="Task title *"
            autoFocus
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full bg-[var(--sol-base03)] text-[var(--sol-base0)] border border-[var(--sol-base01)] rounded px-3 py-2 mb-2 focus:outline-none focus:border-[var(--sol-blue)] placeholder-[var(--sol-base01)] resize-none"
            placeholder="Description (optional, markdown supported)"
          />
          {error && <p className="text-[var(--sol-red)] text-sm mb-2">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 text-[var(--sol-base1)] border border-[var(--sol-base01)] rounded hover:bg-[var(--sol-base03)] transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-[var(--sol-cyan)] text-[var(--sol-base03)] rounded font-medium hover:bg-[var(--sol-green)] transition-colors disabled:opacity-50"
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

function RenameColumnForm({
  column,
  onCancel,
  onSave,
}: {
  column: { id: number; name: string };
  onCancel: () => void;
  onSave: (column: { id: number; name: string }) => void;
}) {
  const [name, setName] = useState(column.name);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Column name is required");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/columns/${column.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error || "Failed to rename column");
        return;
      }
      const updated = (await res.json()) as { id: number; name: string };
      onSave(updated);
    } catch {
      setError("Failed to rename column");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-[var(--sol-base02)] rounded-lg p-6 w-full max-w-sm border border-[var(--sol-base01)] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[var(--sol-base1)] font-bold text-lg mb-4">Rename Column</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[var(--sol-base03)] text-[var(--sol-base0)] border border-[var(--sol-base01)] rounded px-3 py-2 mb-2 focus:outline-none focus:border-[var(--sol-blue)] placeholder-[var(--sol-base01)]"
            placeholder="Column name *"
            autoFocus
          />
          {error && <p className="text-[var(--sol-red)] text-sm mb-2">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 text-[var(--sol-base1)] border border-[var(--sol-base01)] rounded hover:bg-[var(--sol-base03)] transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-[var(--sol-cyan)] text-[var(--sol-base03)] rounded font-medium hover:bg-[var(--sol-green)] transition-colors disabled:opacity-50"
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
        className="bg-[var(--sol-base02)] rounded-lg p-6 w-full max-w-sm border border-[var(--sol-base01)] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[var(--sol-base1)] font-bold text-lg mb-2">Delete Task</h2>
        <p className="text-[var(--sol-base0)] mb-4">
          Are you sure you want to delete &ldquo;{task.title}&rdquo;? This action cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-[var(--sol-base1)] border border-[var(--sol-base01)] rounded hover:bg-[var(--sol-base03)] transition-colors"
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="px-3 py-1 bg-[var(--sol-red)] text-[var(--sol-base3)] rounded font-medium hover:bg-[var(--sol-orange)] transition-colors disabled:opacity-50"
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddColumnForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (column: { id: number; name: string }) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Column name is required");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error || "Failed to create column");
        return;
      }
      const created = (await res.json()) as { id: number; name: string };
      onSave(created);
    } catch {
      setError("Failed to create column");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-[var(--sol-base02)] rounded-lg p-6 w-full max-w-sm border border-[var(--sol-base01)] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[var(--sol-base1)] font-bold text-lg mb-4">Add Column</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[var(--sol-base03)] text-[var(--sol-base0)] border border-[var(--sol-base01)] rounded px-3 py-2 mb-2 focus:outline-none focus:border-[var(--sol-blue)] placeholder-[var(--sol-base01)]"
            placeholder="Column name *"
            autoFocus
          />
          {error && <p className="text-[var(--sol-red)] text-sm mb-2">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 text-[var(--sol-base1)] border border-[var(--sol-base01)] rounded hover:bg-[var(--sol-base03)] transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-[var(--sol-cyan)] text-[var(--sol-base03)] rounded font-medium hover:bg-[var(--sol-green)] transition-colors disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Add Column"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteColumnConfirmation({
  column,
  onCancel,
  onConfirm,
}: {
  column: Column;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/columns/${column.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onConfirm();
      }
    } catch {
      // silently fail, user can retry
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-[var(--sol-base02)] rounded-lg p-6 w-full max-w-sm border border-[var(--sol-base01)] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[var(--sol-base1)] font-bold text-lg mb-2">Delete Column</h2>
        <p className="text-[var(--sol-base0)] mb-4">
          Are you sure you want to delete &ldquo;{column.name}&rdquo;? All tasks in this column will be permanently deleted. This action cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-[var(--sol-base1)] border border-[var(--sol-base01)] rounded hover:bg-[var(--sol-base03)] transition-colors"
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="px-3 py-1 bg-[var(--sol-red)] text-[var(--sol-base3)] rounded font-medium hover:bg-[var(--sol-orange)] transition-colors disabled:opacity-50"
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskDetailsModal({
  task,
  onClose,
}: {
  task: Task;
  onClose: () => void;
}) {
  const htmlDescription = task.description
    ? marked.parse(task.description, { async: false })
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[var(--sol-base02)] rounded-lg w-full max-w-lg border border-[var(--sol-base01)] mx-4 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-2">
          <h2 className="text-[var(--sol-base2)] font-bold text-xl flex-1">{task.title}</h2>
          <button
            onClick={onClose}
            className="text-[var(--sol-base01)] hover:text-[var(--sol-red)] transition-colors p-1 rounded ml-2"
            title="Close"
          >
            &times;
          </button>
        </div>
        <div className="px-6 pb-4 overflow-y-auto flex-1">
          {htmlDescription ? (
            <div
              className="text-[var(--sol-base0)] text-sm prose prose-invert prose-max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlDescription as string }}
            />
          ) : (
            <p className="text-[var(--sol-base01)] text-sm italic">No description</p>
          )}
        </div>
        <div className="flex items-center gap-2 px-6 py-3 border-t border-[var(--sol-base00)] text-[var(--sol-base01)] text-xs">
          <span title={`Created: ${formatDate(task.created_at)}`}>
            Created {formatDate(task.created_at)}
          </span>
          <span>&middot;</span>
          <span title={`Updated: ${formatDate(task.updated_at)}`}>
            Updated {formatDate(task.updated_at)}
          </span>
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
  onTaskDragStart,
  onTaskClick,
  onColumnDragStart,
  onDrop,
  onDragOver,
  draggedTaskId,
  draggedColumnId,
  isDragOver,
  onRename,
  onDelete,
}: {
  column: ColumnWithTasks["column"];
  tasks: Task[];
  onTaskCreated: (columnId: number, task: Task) => void;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (task: Task) => void;
  onTaskDragStart: (task: Task, e: React.DragEvent) => void;
  onTaskClick: (task: Task) => void;
  onColumnDragStart: (columnId: number, e: React.DragEvent) => void;
  onDrop: (columnId: number, e: React.DragEvent) => void;
  onDragOver: (columnId: number) => void;
  draggedTaskId: number | null;
  draggedColumnId: number | null;
  isDragOver: boolean;
  onRename: (column: ColumnWithTasks["column"]) => void;
  onDelete: (column: ColumnWithTasks["column"]) => void;
}) {
  const [addingTask, setAddingTask] = useState(false);

  const handleTaskCreated = (task: Task) => {
    setAddingTask(false);
    onTaskCreated(column.id, task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    onDragOver(column.id);
  };

  return (
    <div
      draggable
      onDragStart={(e) => onColumnDragStart(column.id, e)}
      className={`flex flex-col bg-[var(--sol-base02)] rounded-lg min-w-[280px] max-w-[320px] flex-1 transition-all ${
        isDragOver ? "ring-2 ring-[var(--sol-blue)]" : ""
      } ${draggedColumnId === column.id ? "opacity-40" : "opacity-100"}`}
      onDragOver={handleDragOver}
      onDrop={(e) => onDrop(column.id, e)}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--sol-base01)] group/header">
        <h2 className="text-[var(--sol-base2)] font-bold text-lg">{column.name}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRename(column)}
            className="opacity-0 group-hover/header:opacity-100 text-[var(--sol-base01)] hover:text-[var(--sol-blue)] transition-all p-0.5 rounded"
            title="Rename column"
          >
            &#9998;
          </button>
          {!(column as Column & { is_default: number }).is_default && (
            <button
              onClick={() => onDelete(column)}
              className="opacity-0 group-hover/header:opacity-100 text-[var(--sol-base01)] hover:text-[var(--sol-red)] transition-all p-0.5 rounded"
              title="Delete column"
            >
              &times;
            </button>
          )}
          <span className="text-[var(--sol-yellow)] text-sm font-semibold">{tasks.length}</span>
        </div>
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={onTaskEdit}
            onDelete={onTaskDelete}
            onDragStart={onTaskDragStart}
            isDragging={draggedTaskId === task.id}
            onClick={onTaskClick}
          />
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
            className="w-full py-2 text-[var(--sol-base01)] border border-dashed border-[var(--sol-base01)] rounded hover:border-[var(--sol-blue)] hover:text-[var(--sol-blue)] transition-colors"
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
  const [renamingColumn, setRenamingColumn] = useState<Column | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [deletingColumn, setDeletingColumn] = useState<Column | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<number | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<number | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

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

  const handleColumnRename = (column: Column) => {
    setRenamingColumn(column);
  };

  const handleColumnRenamed = () => {
    setRenamingColumn(null);
    refreshColumns();
  };

  const handleRenameCancel = () => {
    setRenamingColumn(null);
  };

  const handleAddColumnClick = () => {
    setAddingColumn(true);
  };

  const handleColumnAdded = () => {
    setAddingColumn(false);
    refreshColumns();
  };

  const handleAddColumnCancel = () => {
    setAddingColumn(false);
  };

  const handleColumnDelete = (column: Column) => {
    setDeletingColumn(column);
  };

  const handleColumnDeleted = () => {
    setDeletingColumn(null);
    refreshColumns();
  };

  const handleDeleteColumnCancel = () => {
    setDeletingColumn(null);
  };

  const handleTaskClick = (task: Task) => {
    setViewingTask(task);
  };

  const handleViewClose = () => {
    setViewingTask(null);
  };

  const handleDragStart = (task: Task, e: React.DragEvent) => {
    setDraggedTaskId(task.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(task.id));
  };

  const resetDragState = () => {
    setDraggedTaskId(null);
    setDragOverColumnId(null);
    setDraggedColumnId(null);
  };

  const handleColumnDragOver = (columnId: number) => {
    setDragOverColumnId(columnId);
  };

  const handleColumnDragStart = (columnId: number, e: React.DragEvent) => {
    if (!e.dataTransfer.getData("text/plain")) {
      setDraggedColumnId(columnId);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", `col-${columnId}`);
    }
  };

  const handleDrop = async (columnId: number, e: React.DragEvent) => {
    resetDragState();
    const data = e.dataTransfer.getData("text/plain");
    try {
      if (data.startsWith("col-")) {
        const draggedColId = parseInt(data.slice(4), 10);
        const targetColumn = columns.find((c) => c.column.id === columnId);
        if (targetColumn && draggedColId !== columnId) {
          const res = await fetch(`/api/columns/${draggedColId}/reorder`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetPosition: targetColumn.column.position }),
          });
          if (res.ok) {
            refreshColumns();
          }
        }
      } else if (draggedTaskId !== null) {
        const res = await fetch(`/api/tasks/${draggedTaskId}/move`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetColumnId: columnId }),
        });
        if (res.ok) {
          refreshColumns();
        }
      }
    } catch {
      // silently fail, user can retry
    }
  };

  useEffect(() => {
    window.addEventListener("dragend", resetDragState);
    return () => window.removeEventListener("dragend", resetDragState);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--sol-base03)] flex items-center justify-center">
        <p className="text-[var(--sol-base0)]">Loading board...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--sol-base03)] p-6">
      <h1 className="text-[var(--sol-base0)] text-2xl font-bold mb-6">Kanban Board</h1>
      <div className="h-0.5 w-24 bg-[var(--sol-violet)] rounded mb-6"></div>
      <div className="flex gap-4 overflow-x-auto items-start" onDragEnd={resetDragState}>
        {columns.map(({ column, tasks }) => (
          <ColumnCard
            key={column.id}
            column={column}
            tasks={tasks}
            onTaskCreated={handleTaskCreated}
            onTaskEdit={handleTaskEdit}
            onTaskDelete={handleTaskDelete}
            onTaskDragStart={handleDragStart}
            onTaskClick={handleTaskClick}
            onColumnDragStart={handleColumnDragStart}
            onDrop={handleDrop}
            onDragOver={handleColumnDragOver}
            draggedTaskId={draggedTaskId}
            draggedColumnId={draggedColumnId}
            isDragOver={dragOverColumnId === column.id}
            onRename={handleColumnRename}
            onDelete={handleColumnDelete}
          />
        ))}
          <button
            onClick={handleAddColumnClick}
            className="py-2 px-4 text-[var(--sol-base01)] border border-dashed border-[var(--sol-base01)] rounded-lg hover:border-[var(--sol-blue)] hover:text-[var(--sol-blue)] transition-colors min-w-[280px]"
          >
            + Add Column
          </button>
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
      {renamingColumn && (
        <RenameColumnForm
          column={renamingColumn}
          onCancel={handleRenameCancel}
          onSave={handleColumnRenamed}
        />
      )}
      {addingColumn && (
        <AddColumnForm
          onCancel={handleAddColumnCancel}
          onSave={handleColumnAdded}
        />
      )}
      {deletingColumn && (
        <DeleteColumnConfirmation
          column={deletingColumn}
          onCancel={handleDeleteColumnCancel}
          onConfirm={handleColumnDeleted}
        />
      )}
      {viewingTask && (
        <TaskDetailsModal
          task={viewingTask}
          onClose={handleViewClose}
        />
      )}
    </div>
  );
}

export default App;
