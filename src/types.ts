export interface Column {
  id: number;
  name: string;
  position: number;
  is_default: number;
  created_at: string;
}

export interface Task {
  id: number;
  column_id: number;
  title: string;
  description: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ColumnWithTasks {
  column: Column;
  tasks: Task[];
}
