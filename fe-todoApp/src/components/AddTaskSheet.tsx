"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { ApiError, createTodo, updateTodo } from "@/lib/api";
import { Todo } from "@/lib/interface";
import { TodoPriority } from "@/lib/type";

type Props = {
    open: boolean;
    onClose: () => void;
    // Called with the created or updated task.
    onSaved: (todo: Todo) => void;
    // Pre-filled date for a new task (e.g. the day selected on the home screen).
    defaultDate: Date;
    // When set, the sheet edits this task instead of creating a new one.
    todo?: Todo | null;
};

const PRIORITIES: TodoPriority[] = ["low", "medium", "high"];

// ---------- helpers ----------

const pad = (n: number) => String(n).padStart(2, "0");

// Date -> "YYYY-MM-DD" in local time (what <input type="date"> expects).
function toDateInputValue(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ISO string -> "HH:mm" in local time (what <input type="time"> expects).
function toTimeInputValue(iso: string): string {
    const d = new Date(iso);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "YYYY-MM-DD" + "HH:mm" -> local Date.
function combine(date: string, time: string): Date {
    const [y, m, d] = date.split("-").map(Number);
    const [h, min] = time.split(":").map(Number);
    return new Date(y, m - 1, d, h, min);
}

// "2027-01-14" -> "Friday 14, January" (Figma format)
function formatDateLabel(date: string): string {
    const d = combine(date, "00:00");
    const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
    const month = d.toLocaleDateString("en-US", { month: "long" });
    return `${weekday} ${d.getDate()}, ${month}`;
}

// "14:30" -> "2:30 PM"
function formatTimeLabel(time: string): string {
    return combine("2000-01-01", time).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
    });
}

// Opens the browser's native picker; falls back to focus where showPicker()
// isn't supported.
function openPicker(input: HTMLInputElement | null) {
    if (!input) return;
    try {
        input.showPicker();
    } catch {
        input.focus();
    }
}

// ---------- icons ----------

function ClockIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" strokeLinecap="round" />
        </svg>
    );
}

function CalendarIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2M15 17h2" strokeLinecap="round" />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
    );
}

// ---------- shared styles ----------

const labelClass = "mb-2 block text-sm text-muted";
const boxClass =
    "flex h-10 w-full items-center border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus-within:border-accent focus:border-accent";

// ---------- component ----------

export default function AddTaskSheet({ open, onClose, onSaved, defaultDate, todo }: Props) {
    if (!open) return null;
    // Keyed so the form resets each time it opens (new task, or another task to edit).
    return (
        <Sheet
            key={todo ? `${todo._id}-${todo.updatedAt}` : defaultDate.toISOString()}
            onClose={onClose}
            onSaved={onSaved}
            defaultDate={defaultDate}
            todo={todo}
        />
    );
}

function Sheet({ onClose, onSaved, defaultDate, todo }: Omit<Props, "open">) {
    const isEdit = Boolean(todo);
    const titleId = useId();
    const [title, setTitle] = useState(todo?.title ?? "");
    const [date, setDate] = useState(() =>
        toDateInputValue(todo ? new Date(todo.startTime) : defaultDate),
    );
    const [start, setStart] = useState(todo ? toTimeInputValue(todo.startTime) : "");
    const [end, setEnd] = useState(todo?.endTime ? toTimeInputValue(todo.endTime) : "");
    const [priority, setPriority] = useState<TodoPriority | undefined>(todo?.priority ?? undefined);
    const [description, setDescription] = useState(todo?.description ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const startRef = useRef<HTMLInputElement>(null);
    const endRef = useRef<HTMLInputElement>(null);
    const dateRef = useRef<HTMLInputElement>(null);

    // Close on Escape and lock page scroll while open.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", onKey);
        };
    }, [onClose]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!title.trim()) return setError("Please enter a task title");
        if (!date) return setError("Please pick a date");
        if (!start) return setError("Please pick a start time");

        const startTime = combine(date, start);
        const endTime = end ? combine(date, end) : undefined;
        if (endTime && endTime <= startTime) {
            return setError("End time must be after start time");
        }

        setSaving(true);
        setError(null);
        try {
            const saved = todo
                ? await updateTodo(todo._id, {
                      title: title.trim(),
                      description: description.trim(),
                      startTime: startTime.toISOString(),
                      // null clears an end time / priority that was removed
                      endTime: endTime ? endTime.toISOString() : null,
                      priority: priority ?? null,
                  })
                : await createTodo({
                      title: title.trim(),
                      description: description.trim() || undefined,
                      startTime: startTime.toISOString(),
                      endTime: endTime?.toISOString(),
                      priority,
                  });
            onSaved(saved);
            onClose();
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : isEdit
                      ? "Could not save the task"
                      : "Could not create the task",
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50">
            {/* Dimmed backdrop (Figma: grey overlay over the home screen) */}
            <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="absolute inset-0 h-full w-full cursor-default bg-black/25"
            />

            {/* Sheet: 585 / 844 of the Figma frame, pinned to the bottom */}
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="absolute inset-x-0 bottom-0 mx-auto max-h-[90dvh] w-full max-w-md overflow-y-auto bg-white px-6 pt-6 pb-8"
            >
                <div className="flex items-center justify-between">
                    <h2 id={titleId} className="text-xl leading-7.5 font-medium text-gray-900">
                        {isEdit ? "Edit Task" : "Add New Task"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="-mr-1 p-1 text-gray-900"
                    >
                        <CloseIcon />
                    </button>
                </div>

                <form onSubmit={handleSubmit} noValidate className="mt-8">
                    {/* Task title */}
                    <label className={labelClass} htmlFor="task-title">
                        Task title
                    </label>
                    <input
                        id="task-title"
                        autoFocus
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={100}
                        placeholder="Doing Homework"
                        className={`${boxClass} placeholder:text-gray-400`}
                    />

                    {/* Set Time: Start (required) / Ends (optional) */}
                    <span className={`${labelClass} mt-6`}>Set Time</span>
                    <div className="grid grid-cols-2 gap-7.5">
                        <PickerBox
                            icon={<ClockIcon />}
                            label={start ? formatTimeLabel(start) : "Start"}
                            onOpen={() => openPicker(startRef.current)}
                        >
                            <input
                                ref={startRef}
                                type="time"
                                aria-label="Start time"
                                value={start}
                                onChange={(e) => setStart(e.target.value)}
                                className="absolute inset-0 opacity-0"
                            />
                        </PickerBox>
                        <PickerBox
                            icon={<ClockIcon />}
                            label={end ? formatTimeLabel(end) : "Ends"}
                            onOpen={() => openPicker(endRef.current)}
                        >
                            <input
                                ref={endRef}
                                type="time"
                                aria-label="End time (optional)"
                                value={end}
                                onChange={(e) => setEnd(e.target.value)}
                                className="absolute inset-0 opacity-0"
                            />
                        </PickerBox>
                    </div>

                    {/* Set Date */}
                    <span className={`${labelClass} mt-6`}>Set Date</span>
                    <PickerBox
                        icon={<CalendarIcon />}
                        iconRight
                        label={date ? formatDateLabel(date) : "Pick a date"}
                        onOpen={() => openPicker(dateRef.current)}
                    >
                        <input
                            ref={dateRef}
                            type="date"
                            aria-label="Date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="absolute inset-0 opacity-0"
                        />
                    </PickerBox>

                    {/* Priority (required by the spec; not in the Figma) */}
                    <span className={`${labelClass} mt-6`}>Priority</span>
                    <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Priority">
                        {PRIORITIES.map((p) => {
                            const active = priority === p;
                            return (
                                <button
                                    key={p}
                                    type="button"
                                    role="radio"
                                    aria-checked={active}
                                    // Click again to clear: priority is optional.
                                    onClick={() => setPriority(active ? undefined : p)}
                                    className={`h-10 border text-sm capitalize ${
                                        active
                                            ? "border-accent bg-accent text-white"
                                            : "border-gray-200 text-gray-900"
                                    }`}
                                >
                                    {p}
                                </button>
                            );
                        })}
                    </div>

                    {/* Description */}
                    <label className={`${labelClass} mt-6`} htmlFor="task-description">
                        Description
                    </label>
                    <textarea
                        id="task-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={500}
                        placeholder="Add Description"
                        className="h-25 w-full resize-none border border-gray-200 px-3 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-900 focus:border-accent"
                    />

                    {error && (
                        <p role="alert" className="mt-4 text-sm text-red-600">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={saving}
                        className="mt-6.5 flex h-12 w-full items-center justify-center bg-accent text-base font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                        {saving
                            ? isEdit
                                ? "Saving…"
                                : "Creating…"
                            : isEdit
                              ? "Save changes"
                              : "Create task"}
                    </button>
                </form>
            </div>
        </div>
    );
}

// A box styled like the Figma inputs, with an invisible native time/date input
// stretched over it so tapping anywhere opens the device's picker.
function PickerBox({
    icon,
    label,
    iconRight,
    onOpen,
    children,
}: {
    icon: React.ReactNode;
    label: string;
    iconRight?: boolean;
    onOpen: () => void;
    children: React.ReactNode;
}) {
    return (
        <div
            onClick={onOpen}
            className={`${boxClass} relative cursor-pointer gap-3.5 ${iconRight ? "justify-between" : ""}`}
        >
            {!iconRight && icon}
            <span>{label}</span>
            {iconRight && icon}
            {children}
        </div>
    );
}
