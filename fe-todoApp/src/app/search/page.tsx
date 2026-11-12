"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import AddTaskSheet from "@/components/AddTaskSheet";
import TaskRow from "@/components/TaskRow";
import { ApiError, deleteTodo, listTodos, updateTodo } from "@/lib/api";
import { Todo } from "@/lib/interface";

const DEBOUNCE_MS = 300;

// Figma "Frame 9": back arrow, search box (342 x 47), matching tasks below.
export default function SearchPage() {
    const [term, setTerm] = useState("");
    const [results, setResults] = useState<Todo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Bumped to re-run the current search (Retry).
    const [reloadKey, setReloadKey] = useState(0);
    // Task open in the edit sheet (view / edit from the search results).
    const [editing, setEditing] = useState<Todo | null>(null);

    const query = term.trim();

    // Debounced search. State is only set inside the timer / promise callbacks,
    // never synchronously in the effect body.
    useEffect(() => {
        if (!query) return;
        let cancelled = false;
        const timer = setTimeout(() => {
            listTodos({ searchTerm: query, sort: "startTime", sortOrder: "asc", limit: 50 })
                .then((res) => {
                    if (cancelled) return;
                    setError(null);
                    setResults(res.items);
                })
                .catch((err: unknown) => {
                    if (cancelled) return;
                    setError(err instanceof ApiError ? err.message : "Something went wrong");
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        }, DEBOUNCE_MS);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [query, reloadKey]);

    function handleChange(value: string) {
        setTerm(value);
        const hasQuery = value.trim() !== "";
        setLoading(hasQuery);
        if (!hasQuery) {
            setResults([]);
            setError(null);
        }
    }

    async function toggle(todo: Todo) {
        const next = todo.status === "completed" ? "in_progress" : "completed";
        const snapshot = results;
        setResults((r) => r.map((x) => (x._id === todo._id ? { ...x, status: next } : x)));
        try {
            await updateTodo(todo._id, { status: next });
        } catch {
            setResults(snapshot);
        }
    }

    async function remove(todo: Todo) {
        const snapshot = results;
        setResults((r) => r.filter((x) => x._id !== todo._id));
        try {
            await deleteTodo(todo._id);
        } catch {
            setResults(snapshot);
        }
    }

    return (
        <main className="mx-auto min-h-dvh w-full max-w-md bg-white px-6 pt-7 pb-10">
            {/* Back arrow */}
            <Link href="/home" aria-label="Back to home" className="-ml-1 inline-flex p-1">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-gray-900" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </Link>

            {/* Search box: 47px tall, 84px from the top */}
            <form
                role="search"
                onSubmit={(e) => e.preventDefault()}
                className="mt-6 flex h-11.75 items-center rounded-sm border border-gray-200 pr-3 pl-5 focus-within:border-accent"
            >
                <label htmlFor="search-input" className="sr-only">
                    Search tasks
                </label>
                <input
                    id="search-input"
                    type="search"
                    autoFocus
                    value={term}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder="Search for a task"
                    enterKeyHint="search"
                    className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />
                <Image src="/Search.svg" alt="" width={24} height={24} className="shrink-0" />
            </form>

            {/* Results */}
            <div className="mt-5.5" aria-live="polite">
                {!query && (
                    <p className="text-sm text-gray-400">Search by title or description.</p>
                )}
                {query && loading && <p className="text-sm text-gray-500">Searching…</p>}
                {query && error && (
                    <p className="text-sm text-red-600">
                        {error}{" "}
                        <button
                            type="button"
                            onClick={() => {
                                setLoading(true);
                                setReloadKey((k) => k + 1);
                            }}
                            className="underline"
                        >
                            Retry
                        </button>
                    </p>
                )}
                {query && !loading && !error && results.length === 0 && (
                    <p className="text-sm text-gray-500">No tasks match &ldquo;{query}&rdquo;.</p>
                )}
            </div>

            {query && results.length > 0 && (
                <ul>
                    {results.map((todo) => (
                        <TaskRow
                            key={todo._id}
                            todo={todo}
                            onToggle={toggle}
                            onDelete={remove}
                            onEdit={setEditing}
                            showDate
                        />
                    ))}
                </ul>
            )}

            <AddTaskSheet
                open={editing !== null}
                todo={editing}
                defaultDate={editing ? new Date(editing.startTime) : new Date(0)}
                onClose={() => setEditing(null)}
                onSaved={(saved) =>
                    setResults((r) => r.map((x) => (x._id === saved._id ? saved : x)))
                }
            />
        </main>
    );
}
