"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
    addDays,
    isSameDay,
    startOfDay,
    startOfWeek,
    weekDays,
} from "@/lib/dates";

import {
    ApiError,
    deleteTodo,
    getWeeklySummary,
    listTodos,
    updateTodo,
} from "@/lib/api";
import { Todo, WeeklySummary } from "@/lib/interface";
import AddTaskSheet from "@/components/AddTaskSheet";
import TaskRow from "@/components/TaskRow";

// "Today" must come from the user's browser: reading the clock during the
// prerender fails `next build` (cacheComponents) and would use the server's
// timezone. useSyncExternalStore returns the server snapshot (null) during
// prerender + hydration, then the browser's value. The ISO string is stable
// between calls, so React doesn't re-render needlessly.
const noSubscribe = () => () => {};
const getTodayKey = () => startOfDay(new Date()).toISOString();
const getServerTodayKey = () => null;

export default function HomePage() {
    const todayKey = useSyncExternalStore(noSubscribe, getTodayKey, getServerTodayKey);

    if (!todayKey) {
        // First frame only (prerendered shell), before the browser's date is known.
        return (
            <main className="mx-auto min-h-dvh w-full max-w-md px-5 pt-6">
                <p className="mt-16 text-center text-sm text-gray-500">Loading…</p>
            </main>
        );
    }
    return <HomeScreen today={new Date(todayKey)} />;
}

function HomeScreen({ today }: { today: Date }) {
    const [selectedDay, setSelectedDay] = useState(today);
    const [todos, setTodos] = useState<Todo[]>([]);
    const [summary, setSummary] = useState<WeeklySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    // Task being edited in the sheet; null = the sheet creates a new task.
    const [editing, setEditing] = useState<Todo | null>(null);

    const days = useMemo(() => weekDays(today), [today]);
    const weekStart = useMemo(() => startOfWeek(today), [today]);
    const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

    // State is only set inside the promise callbacks (never synchronously),
    // which is what react-hooks/set-state-in-effect requires.
    const load = useCallback(
        () =>
            Promise.all([
                listTodos({
                    // Only the selected day's tasks ("Tasks Today")
                    from: selectedDay.toISOString(),
                    to: addDays(selectedDay, 1).toISOString(),
                    sort: "startTime",
                    sortOrder: "asc",
                    limit: 100,
                }),
                getWeeklySummary({
                    from: weekStart.toISOString(),
                    to: weekEnd.toISOString(),
                }),
            ])
                .then(([list, weeks]) => {
                    setError(null);
                    setTodos(list.items);
                    setSummary(weeks[0] ?? null);
                })
                .catch((err: unknown) => {
                    setError(
                        err instanceof ApiError && err.status === 0
                            ? "Waking up the server, please try again in a moment…"
                            : err instanceof Error
                                ? err.message
                                : "Something went wrong",
                    );
                })
                .finally(() => setLoading(false)),
        [selectedDay, weekStart, weekEnd],
    );

    // `loading` starts as true; set it back to true wherever selectedDay
    // changes (e.g. the day-strip click handler), not inside this effect.
    useEffect(() => {
        void load();
    }, [load]);

    async function toggle(todo: Todo) {
        const next = todo.status === "completed" ? "in_progress" : "completed";
        const snapshot = todos;
        setTodos((t) => t.map((x) => (x._id === todo._id ? { ...x, status: next } : x)));
        try {
            await updateTodo(todo._id, { status: next });
            load(); // refresh the counts
        } catch {
            setTodos(snapshot);
        }
    }

    async function remove(todo: Todo) {
        const snapshot = todos;
        setTodos((t) => t.filter((x) => x._id !== todo._id));
        try {
            await deleteTodo(todo._id);
            load();
        } catch {
            setTodos(snapshot);
        }
    }

    const completed = summary?.completed ?? 0;
    const open = summary?.open ?? 0;
    const total = summary?.total ?? 0;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

    return (
        <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-28 pt-6">
            {/* Figma "Group 43": 339 x 47 search bar, 37px from the top -> search screen */}
            <Link
                href="/search"
                className="mt-3.25 flex h-11.75 items-center justify-between rounded-sm border border-gray-200 bg-white pr-3 pl-4 transition-colors hover:border-gray-300"
            >
                <span className="text-sm text-gray-400">Search for a task</span>
                <Image src="/Search.svg" alt="" width={24} height={24} />
            </Link>
            {/* Figma "Calendar": 355 x 63 day strip (Mon–Sun), 12px below the search bar */}
            <div className="mt-3 grid h-15.75 grid-cols-7">
                {days.map((day) => {
                    const active = isSameDay(day, selectedDay);
                    return (
                        <div key={day.toISOString()} className="flex justify-center">
                            <button
                                type="button"
                                onClick={() => setSelectedDay(day)}
                                aria-pressed={active}
                                // Fixed locale so the server and browser render the same text (no hydration mismatch)
                                aria-label={day.toLocaleDateString("en-US", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                })}
                                className={`flex h-full w-9.75 flex-col items-center pt-2 transition-colors ${
                                    active ? "bg-accent text-white" : "hover:bg-gray-50"
                                }`}
                            >
                                <span className={`text-xs leading-4.5 ${active ? "" : "text-gray-400"}`}>
                                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                                </span>
                                <span className={`mt-0.5 text-base leading-6 ${active ? "" : "text-gray-500"}`}>
                                    {String(day.getDate()).padStart(2, "0")}
                                </span>
                                {/* Dot marks the selected day */}
                                {active && <span className="mt-1 h-1 w-1 rounded-full bg-white" />}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Count cards */}
            {/* Figma "Reminder": 341 x 96, two cards with a 17px gap */}
            <div className="mt-6 grid h-24 grid-cols-2 gap-4.25">
                <div className="bg-[#EEF2FF] px-3.75 pt-4">
                    <div className="flex items-center gap-2.75">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-[#8FA6FF]">
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#1E3A8A" strokeWidth="1.8" aria-hidden="true">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <path d="M8 12.5l2.5 2.5L16 9.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </span>
                        <p className="text-sm text-gray-900">Task Complete</p>
                    </div>
                    <p className="mt-2 flex items-baseline gap-1.5 pl-10">
                        <span className="text-2xl leading-none font-semibold text-gray-900">
                            {String(completed).padStart(2, "0")}
                        </span>
                        <span className="text-[11px] text-gray-500">This Week</span>
                    </p>
                </div>
                <div className="bg-[#FFE4E4] px-3.75 pt-4">
                    <div className="flex items-center gap-2.75">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-[#FFB1B4]">
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#C0262D" strokeWidth="1.8" aria-hidden="true">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" strokeLinecap="round" />
                            </svg>
                        </span>
                        <p className="text-sm text-gray-900">Task Pending</p>
                    </div>
                    <p className="mt-2 flex items-baseline gap-1.5 pl-10">
                        <span className="text-2xl leading-none font-semibold text-gray-900">
                            {String(open).padStart(2, "0")}
                        </span>
                        <span className="text-[11px] text-gray-500">This Week</span>
                    </p>
                </div>
            </div>

            {/* Figma "Progress": 342 x 65 (27 heading + 16 gap + 22 bar), 30px below the cards */}
            <div className="mt-7.5 h-16.25">
                <h2 className="text-lg leading-6.75 font-semibold text-gray-900">
                    Weekly Progress
                </h2>
                <div
                    role="progressbar"
                    aria-label="Weekly progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                    aria-valuetext={`${completed} of ${total} tasks completed`}
                    className="mt-4 h-5.5 bg-lavender"
                >
                    <div
                        className="h-full bg-navy transition-[width] duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Figma "Task Today": 343 x 288, 30px below the progress block */}
            <div className="mt-7.5 flex items-center justify-between">
                <h2 className="text-lg leading-6.75 font-semibold text-gray-900">
                    {isSameDay(selectedDay, today) ? "Tasks Today" : "Tasks"}
                </h2>
                <Link href="/weeks" className="text-sm text-accent hover:underline">
                    View All
                </Link>
            </div>

            {loading && <p className="mt-4 text-sm text-gray-500">Loading…</p>}

            {error && (
                <p className="mt-4 text-sm text-red-600">
                    {error}{" "}
                    <button onClick={load} className="underline">
                        Retry
                    </button>
                </p>
            )}
            {!loading && !error && todos.length === 0 && (
                <p className="mt-4 text-sm text-gray-500">No tasks for this day.</p>
            )}

            <ul className="mt-2">
                {todos.map((todo) => (
                    <TaskRow
                        key={todo._id}
                        todo={todo}
                        onToggle={toggle}
                        onDelete={remove}
                        onEdit={(t) => {
                            setEditing(t);
                            setSheetOpen(true);
                        }}
                    />
                ))}
            </ul>

            {/* Figma "Group 40": 76 x 76, centred, 28px from the bottom (844 - 740 - 76); opens the New Task sheet */}
            <button
                type="button"
                aria-label="Add task"
                onClick={() => {
                    setEditing(null);
                    setSheetOpen(true);
                }}
                className="fixed bottom-7 left-1/2 flex h-19 w-19 -translate-x-1/2 items-center justify-center rounded-full bg-accent text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M12 4v16M4 12h16" strokeLinecap="round" />
                </svg>
            </button>

            <AddTaskSheet
                open={sheetOpen}
                onClose={() => {
                    setSheetOpen(false);
                    setEditing(null);
                }}
                // Refresh the list and the counts (an edit can move a task to another day/week)
                onSaved={() => load()}
                defaultDate={selectedDay}
                todo={editing}
            />

        </main>
    )


}
