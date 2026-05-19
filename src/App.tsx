import { useEffect, useState } from "react";
import { ColumnWithTasks, Task } from "./types";
import "./index.css";

function ColumnCard({
  name,
  tasks,
}: {
  name: string;
  tasks: Task[];
}) {
  return (
    <div className="flex flex-col bg-[#073642] rounded-lg min-w-[280px] max-w-[320px] flex-1">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#586e75]">
        <h2 className="text-[#93a1a1] font-bold text-lg">{name}</h2>
        <span className="text-[#586e75] text-sm">{tasks.length}</span>
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="bg-[#002b36] rounded p-3 border border-[#586e75] cursor-pointer hover:border-[#268bd2] transition-colors"
          >
            <p className="text-[#839496] font-medium">{task.title}</p>
            {task.description && (
              <p className="text-[#586e75] text-sm mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function App() {
  const [columns, setColumns] = useState<ColumnWithTasks[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/columns")
      .then((res) => res.json())
      .then((data) => {
        setColumns(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
          <ColumnCard key={column.id} name={column.name} tasks={tasks} />
        ))}
      </div>
    </div>
  );
}

export default App;
