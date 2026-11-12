"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AddTaskSheet from "@/components/AddTaskSheet";
import TaskRow from "@/components/TaskRow";
import { ApiError, deleteTodo, getWeeklySummary, listTodos, updateTodo } from "@/lib/api";
import { Todo, WeeklySummary } from "@/lib/interface";

// Tasks loaded for one expanded week, keyed by weekStart.
type WeekTasks = { items: Todo[]; loading: boolean; error: string | null };

const errorMessage = (err: unknown) =>
    err instanceof ApiError && err.status === 0
        ? "Waking up the server, please try again in a moment…"
        : err instanceof Error
          ? err.message
          : "Something went wrong";

// "9 – 15 Nov" (adds the year when it isn't the current one)
function formatWeekRange(week: WeeklySummary): string {
    const start = new Date(week.weekStart);
    // weekEnd is exclusive (next Monday 00:00), so the last day is 1ms earlier.
    const end = new Date(new Date(week.weekEnd).getTime() - 1);
    const sameYear = start.getFullYear() === new Date().getFullYear();
    const fmt = (d: Date, withMonth: boolean) =>
        d.toLocaleDateString("en-GB", {
            day: "numeric",
            ...(withMonth && { month: "short" }),
        });
    const startLabel = fmt(start, start.getMonth() !== end.getMonth());
    const endLabel = fmt(end, true);
    return `${startLabel} – ${endLabel}${sameYear ? "" : ` ${end.getFullYear()}`}`;
}

function isCurrentWeek(week: WeeklySummary): boolean {
    const now = Date.now();
    return new Date(week.weekStart).getTime() <= now && now < new Date(week.weekEnd).getTime();
}

function Chevron({ open }: { open: boolean }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={`h-5 w-5 shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
        >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// Spec 3.2: tasks grouped by Monday–Sunday week; each week's card shows open
// and completed counts and expands to show that week's tasks.
export default function WeeksPage() {
    const [weeks, setWeeks] = useState<WeeklySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [tasks, setTasks] = useState<Record<string, WeekTasks>>({});
    const [editing, setEditing] = useState<Todo | null>(null);

    // Fetch one week's tasks. State is only set inside promise callbacks.
    const loadWeek = useCallback((week: WeeklySummary) => {
        const key = week.weekStart;
        setTasks((t) => ({ ...t, [key]: { items: t[key]?.items ?? [], loading: true, error: null } }));
        return listTodos({
            from: week.weekStart,
            to: week.weekEnd,
            sort: "startTime",
            sortOrder: "asc",
            limit: 100,
        })
            .then((res) =>
                setTasks((t) => ({ ...t, [key]: { items: res.items, loading: false, error: null } })),
            )
            .catch((err: unknown) =>
                setTasks((t) => ({
                    ...t,
                    [key]: { items: t[key]?.items ?? [], loading: false, error: errorMessage(err) },
                })),
            );
    }, []);

    // Fetch the week cards; optionally reload the tasks of the expanded weeks.
    const loadSummary = useCallback(
        (expandedWeeks?: Set<string>) =>
            getWeeklySummary()
                .then((data) => {
                    setError(null);
                    setWeeks(data);
                    // First load: open the current week.
                    const open =
                        expandedWeeks ??
                        new Set(data.filter(isCurrentWeek).map((w) => w.weekStart));
                    setExpanded(open);
                    data.filter((w) => open.has(w.weekStart)).forEach((w) => void loadWeek(w));
                })
                .catch((err: unknown) => setError(errorMessage(err)))
                .finally(() => setLoading(false)),
        [loadWeek],
    );

    useEffect(() => {
        void loadSummary();
    }, [loadSummary]);

    function toggleWeek(week: WeeklySummary) {
        const key = week.weekStart;
        const next = new Set(expanded);
        if (next.has(key)) {
            next.delete(key);
        } else {
            next.add(key);
            if (!tasks[key]) void loadWeek(week);
        }
        setExpanded(next);
    }

    // After any change, refresh the counts and the open weeks
    // (an edit can move a task into another week).
    const refresh = () => void loadSummary(expanded);

    async function toggleTask(todo: Todo) {
        await updateTodo(todo._id, {
            status: todo.status === "completed" ? "in_progress" : "completed",
        }).catch(() => undefined);
        refresh();
    }

    async function removeTask(todo: Todo) {
        await deleteTodo(todo._id).catch(() => undefined);
        refresh();
    }

    return (
        <main className="mx-auto min-h-dvh w-full max-w-md bg-white px-6 pt-7 pb-10">
            <div className="flex items-center gap-3">
                <Link href="/home" aria-label="Back to home" className="-ml-1 inline-flex p-1">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 text-gray-900" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </Link>
                <h1 className="text-lg leading-6.75 font-semibold text-gray-900">All Tasks</h1>
            </div>

            <div className="mt-6" aria-live="polite">
                {loading && <p className="text-sm text-gray-500">Loading…</p>}
                {error && (
                    <p className="text-sm text-red-600">
                        {error}{" "}
                        <button
                            type="button"
                            onClick={() => {
                                setLoading(true);
                                void loadSummary();
                            }}
                            className="underline"
                        >
                            Retry
                        </button>
                    </p>
                )}
                {!loading && !error && weeks.length === 0 && (
                    <p className="text-sm text-gray-500">No tasks yet. Add one from the home screen.</p>
                )}
            </div>

            <ul className="space-y-4">
                {weeks.map((week) => {
                    const key = week.weekStart;
                    const open = expanded.has(key);
                    const current = isCurrentWeek(week);
                    const progress = week.total ? Math.round((week.completed / week.total) * 100) : 0;
                    const weekTasks = tasks[key];
                    const panelId = `week-${key}`;

                    return (
                        <li key={key} className="border border-gray-200">
                            <button
                                type="button"
                                onClick={() => toggleWeek(week)}
                                aria-expanded={open}
                                aria-controls={panelId}
                                className="w-full px-4 py-4 text-left transition-colors hover:bg-gray-50"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <span className="truncate text-[15px] font-semibold text-gray-900">
                                            {formatWeekRange(week)}
                                        </span>
                                        {current && (
                                            <span className="shrink-0 bg-accent px-1.5 text-[10px] leading-4 text-white">
                                                This week
                                            </span>
                                        )}
                                    </div>
                                    <Chevron open={open} />
                                </div>

                                {/* Open vs completed counts (spec: Task Summary Cards) */}
                                <div className="mt-3 grid grid-cols-2 gap-3">
                                    <div className="bg-[#FFE4E4] px-3 py-2">
                                        <p className="text-xs text-gray-600">Open</p>
                                        <p className="text-xl leading-7 font-semibold text-gray-900">
                                            {String(week.open).padStart(2, "0")}
                                        </p>
                                    </div>
                                    <div className="bg-[#EEF2FF] px-3 py-2">
                                        <p className="text-xs text-gray-600">Completed</p>
                                        <p className="text-xl leading-7 font-semibold text-gray-900">
                                            {String(week.completed).padStart(2, "0")}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 h-1.5 bg-lavender" aria-hidden="true">
                                    <div className="h-full bg-navy" style={{ width: `${progress}%` }} />
                                </div>
                            </button>

                            {open && (
                                <div id={panelId} className="border-t border-gray-200 px-4 pb-2">
                                    {weekTasks?.loading && weekTasks.items.length === 0 && (
                                        <p className="py-3 text-sm text-gray-500">Loading tasks…</p>
                                    )}
                                    {weekTasks?.error && (
                                        <p className="py-3 text-sm text-red-600">
                                            {weekTasks.error}{" "}
                                            <button type="button" onClick={() => void loadWeek(week)} className="underline">
                                                Retry
                                            </button>
                                        </p>
                                    )}
                                    {weekTasks && !weekTasks.loading && !weekTasks.error && weekTasks.items.length === 0 && (
                                        <p className="py-3 text-sm text-gray-500">No tasks this week.</p>
                                    )}
                                    <ul>
                                        {weekTasks?.items.map((todo) => (
                                            <TaskRow
                                                key={todo._id}
                                                todo={todo}
                                                onToggle={toggleTask}
                                                onDelete={removeTask}
                                                onEdit={setEditing}
                                                showDate
                                            />
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>

            <AddTaskSheet
                open={editing !== null}
                todo={editing}
                defaultDate={editing ? new Date(editing.startTime) : new Date(0)}
                onClose={() => setEditing(null)}
                onSaved={refresh}
            />
        </main>
    );
}
