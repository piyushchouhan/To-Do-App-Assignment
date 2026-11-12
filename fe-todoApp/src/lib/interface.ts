import { TodoPriority, TodoStatus } from "./type";

export interface Todo {
  _id: string;
  title: string;
  description?: string;
  startTime: string; // ISO date string
  endTime?: string | null; // null once removed via edit
  priority?: TodoPriority | null;
  status: TodoStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklySummary {
  weekStart: string; // ISO, inclusive
  weekEnd: string; // ISO, exclusive
  open: number;
  completed: number;
  total: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

export interface CreateTodoInput {
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  priority?: TodoPriority;
}

export type UpdateTodoInput = Partial<Omit<CreateTodoInput, "endTime" | "priority">> & {
  status?: TodoStatus;
  // null removes the value
  endTime?: string | null;
  priority?: TodoPriority | null;
};

export interface ListTodosParams {
  searchTerm?: string;
  status?: TodoStatus[];
  priority?: TodoPriority[];
  from?: string; // -> startTime.gte
  to?: string; // -> startTime.lt
  sort?: "startTime" | "createdAt" | "updatedAt" | "title";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface SummaryParams {
  timezone?: string;
  from?: string;
  to?: string;
}
