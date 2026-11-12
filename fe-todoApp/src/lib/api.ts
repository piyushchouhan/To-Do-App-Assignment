// ---------- Core request helper ----------
import { CreateTodoInput, ListTodosParams, Paginated, SummaryParams, Todo, UpdateTodoInput, WeeklySummary } from "./interface";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

// Render's free tier can take ~30-60s to wake up, so allow a long timeout.
const TIMEOUT_MS = 60_000;

// Mirrors TApiResponse<T> on the backend
interface ApiResponse<T> {
  message: string;
  data?: T;
  total?: number;
  page?: number;
  limit?: number;
  pageCount?: number;
}

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

// ---------- Generic request function ----------//
// this function is a generic function that takes a type parameter T, 
// which represents the expected type of the response data. 
// It returns a Promise that resolves to an object containing the
// response data of type T and the HTTP status code.
async function request<T>(
    path: string,
    options: RequestInit = {},
): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const res = await fetch(`${BASE_URL}${path}`, {
            ...options, // keeps method + body (POST / PATCH / DELETE)
            headers: { "Content-Type": "application/json", ...options.headers },
            signal: controller.signal
        });

        const body = await res.json().catch(() => null);

         if (!res.ok) {
        // Nest validation errors return message as string[]
        const msg = Array.isArray(body?.message)
            ? body.message.join(", ")
            : (body?.message ?? "Something went wrong");
        throw new ApiError(msg, res.status);
        }

       return body as ApiResponse<T>; 
    } catch (err) {
            if (err instanceof ApiError) throw err;
            if (err instanceof DOMException && err.name === "AbortError") {
            throw new ApiError("The server took too long to respond", 0);
            }
            throw new ApiError("Could not reach the server", 0);

    } finally {
        clearTimeout(timeoutId);
    }
}

function toQuery(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") qs.set(key, String(value));
  }
  const str = qs.toString();
  return str ? `?${str}` : "";
}

// ---------- API functions ----------
export async function listTodos(
  params: ListTodosParams = {},
): Promise<Paginated<Todo>> {
    const query = toQuery({
    searchTerm: params.searchTerm?.trim(),
    status: params.status?.join(","),
    priority: params.priority?.join(","),
    "startTime.gte": params.from,
    "startTime.lt": params.to,
    sort: params.sort,
    sortOrder: params.sortOrder,
    page: params.page,
    limit: params.limit,
  });
  const res = await request<Todo[]>(`/todo${query}`);
    return {
        items: res.data ?? [],
        total: res.total ?? 0,
        page: res.page ?? 1,
        limit: res.limit ?? 10,
        pageCount: res.pageCount ?? 1,
    };
}

export async function getWeeklySummary(
  params: SummaryParams = {},
): Promise<WeeklySummary[]> {
  const query = toQuery({
    timezone: params.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    "startTime.gte": params.from,
    "startTime.lt": params.to,
  });
  const res = await request<WeeklySummary[]>(`/todo/summary${query}`);
  return res.data ?? [];
}

export async function getTodo(id: string): Promise<Todo> {
  const res = await request<Todo>(`/todo/${id}`);
  return res.data as Todo;
}

export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const res = await request<Todo>("/todo", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data as Todo;
}

export async function updateTodo(
  id: string,
  input: UpdateTodoInput,
): Promise<Todo> {
  const res = await request<Todo>(`/todo/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.data as Todo;
}

export async function deleteTodo(id: string): Promise<Todo> {
  const res = await request<Todo>(`/todo/${id}`, { method: "DELETE" });
  return res.data as Todo;
}