"use client";

import Image from "next/image";
import { MouseEvent, PointerEvent, useRef, useState } from "react";
import { formatTime } from "@/lib/dates";
import { Todo } from "@/lib/interface";
import { TodoPriority } from "@/lib/type";

const PRIORITY_STYLES: Record<TodoPriority, string> = {
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-red-100 text-red-700",
};

type Props = {
    todo: Todo;
    onToggle: (todo: Todo) => void;
    onDelete: (todo: Todo) => void;
    onEdit?: (todo: Todo) => void;
    // Show the date as well as the time (search results span many days).
    showDate?: boolean;
};

function formatWhen(todo: Todo, showDate: boolean): string {
    const time = `${formatTime(todo.startTime)}${todo.endTime ? ` – ${formatTime(todo.endTime)}` : ""}`;
    if (!showDate) return time;
    const date = new Date(todo.startTime).toLocaleDateString([], {
        weekday: "short",
        day: "numeric",
        month: "short",
    });
    return `${date}, ${time}`;
}

// Swipe-to-delete (spec user flow: "Swipe left on a task … Tap 'Delete'").
const REVEAL_PX = 80; // width of the red Delete button
const DRAG_THRESHOLD_PX = 6; // movement before a press counts as a swipe

// Tracks a horizontal swipe on the row. Vertical drags are left to the browser
// (touch-action: pan-y), so the list still scrolls normally.
function useSwipeToReveal() {
    const [offset, setOffset] = useState(0); // 0 = closed, -REVEAL_PX = open
    const [dragging, setDragging] = useState(false);
    const start = useRef<{ x: number; y: number; base: number } | null>(null);
    const swiped = useRef(false); // true right after a swipe, to swallow its click

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        start.current = { x: e.clientX, y: e.clientY, base: offset };
        swiped.current = false;
    };

    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        const s = start.current;
        if (!s) return;
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        if (!dragging) {
            if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
            // Mostly vertical: it's a scroll, not a swipe.
            if (Math.abs(dy) > Math.abs(dx)) {
                start.current = null;
                return;
            }
            swiped.current = true;
            setDragging(true);
            e.currentTarget.setPointerCapture(e.pointerId);
        }
        setOffset(Math.min(0, Math.max(-REVEAL_PX, s.base + dx)));
    };

    const onPointerEnd = () => {
        if (!start.current) return;
        start.current = null;
        if (dragging) {
            setDragging(false);
            // Snap open past halfway, otherwise closed.
            setOffset((o) => (o < -REVEAL_PX / 2 ? -REVEAL_PX : 0));
        }
    };

    // Runs before any child's click: swallow the click that ends a swipe, and
    // let a tap on an open row close it instead of toggling/editing.
    const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
        if (swiped.current) {
            swiped.current = false;
            e.preventDefault();
            e.stopPropagation();
        } else if (offset !== 0) {
            e.preventDefault();
            e.stopPropagation();
            setOffset(0);
        }
    };

    return {
        open: offset === -REVEAL_PX,
        close: () => setOffset(0),
        style: {
            transform: `translateX(${offset}px)`,
            transition: dragging ? "none" : "transform 200ms ease-out",
        },
        handlers: {
            onPointerDown,
            onPointerMove,
            onPointerUp: onPointerEnd,
            onPointerCancel: onPointerEnd,
            onClickCapture,
        },
    };
}

// One task row as in the Figma: blue square checkbox, title, divider that
// starts at the title, trash + edit icons on the right. ~62px tall.
// Swipe left to reveal a Delete button (the trash icon does the same, and is
// the keyboard / screen-reader path).
export default function TaskRow({ todo, onToggle, onDelete, onEdit, showDate = false }: Props) {
    const done = todo.status === "completed";
    const swipe = useSwipeToReveal();

    return (
        <li className="relative overflow-hidden">
            {/* Revealed by swiping the row left */}
            <button
                type="button"
                onClick={() => {
                    swipe.close();
                    onDelete(todo);
                }}
                tabIndex={swipe.open ? 0 : -1}
                aria-hidden={!swipe.open}
                className="absolute inset-y-0 right-0 w-20 bg-red-600 text-sm font-medium text-white"
            >
                Delete
            </button>

            <div
                {...swipe.handlers}
                style={swipe.style}
                className="relative flex h-15.5 touch-pan-y items-center gap-3 bg-white select-none"
            >
                {/* Square blue checkbox; the native input stays for keyboard + screen readers */}
                <label className="relative flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center border-[1.5px] border-accent">
                    <input
                        type="checkbox"
                        checked={done}
                        onChange={() => onToggle(todo)}
                        className="peer absolute inset-0 cursor-pointer opacity-0"
                        aria-label={`Mark "${todo.title}" as ${done ? "in progress" : "completed"}`}
                    />
                    {done && (
                        <svg
                            viewBox="0 0 24 24"
                            className="h-3.5 w-3.5 text-accent"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            aria-hidden="true"
                        >
                            <path
                                d="M5 12.5l4.5 4.5L19 7.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    )}
                    <span className="pointer-events-none absolute -inset-0.75 hidden outline-2 outline-accent peer-focus-visible:block" />
                </label>

                {/* Divider starts at the title, as in the Figma */}
                <div className="flex h-full min-w-0 flex-1 items-center gap-2.5 border-b border-gray-200">
                    <div className="min-w-0 flex-1">
                        <p
                            className={`truncate text-[15px] text-gray-900 ${done ? "line-through" : ""}`}
                        >
                            {todo.title}
                        </p>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                            <span className="truncate">{formatWhen(todo, showDate)}</span>
                            {todo.priority && (
                                <span
                                    className={`shrink-0 px-1.5 text-[10px] leading-4 capitalize ${PRIORITY_STYLES[todo.priority]}`}
                                >
                                    {todo.priority}
                                </span>
                            )}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => onDelete(todo)}
                        aria-label={`Delete "${todo.title}"`}
                        className="shrink-0 transition-opacity hover:opacity-70"
                    >
                        <Image src="/trash-2.svg" alt="" width={24} height={24} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onEdit?.(todo)}
                        aria-label={`Edit "${todo.title}"`}
                        className="shrink-0 transition-opacity hover:opacity-70"
                    >
                        <Image src="/edit.svg" alt="" width={24} height={24} />
                    </button>
                </div>
            </div>
        </li>
    );
}
