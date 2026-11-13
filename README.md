# To-Do List App

A mobile-first to-do app for creating, editing, searching and tracking tasks, organised into Monday–Sunday weeks with open and completed counts for each week.

| | Link |
|---|---|
| **Live app** | https://main.d385bamhh2xfsi.amplifyapp.com |
| **Live API** | https://todo-app-api-3uyh.onrender.com/api |
| **API health** | https://todo-app-api-3uyh.onrender.com/api/health |

> The API runs on Render's free tier. It keeps itself awake, but if it has been stopped, the first request can take up to a minute while it starts.

## Features

- **Create, edit and delete tasks** with a title, date, start and end time, priority (Low, Medium, High) and description.
- **Weekly overview.** The home screen shows the selected week's completed and pending counts, a progress bar and the selected day's tasks. **View All** lists every week as a card with open and completed counts; tap a card to expand its tasks. Weeks run Monday to Sunday in the user's own timezone.
- **Status updates.** Tick a task to mark it completed or untick it to set it back to in progress; the counts update straight away.
- **Search** by keyword across titles and descriptions, then view, edit or delete tasks from the results.
- **Swipe left on a task** to reveal Delete. The trash icon does the same for keyboard and screen-reader users.

## Tech stack

| Part | Stack |
|---|---|
| Frontend (`fe-todoApp`) | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Backend (`be-todoApp`) | NestJS 12 (Node.js + Express), TypeScript, Mongoose 9, class-validator |
| Database | MongoDB (MongoDB Atlas in production) |
| Hosting | AWS Amplify (frontend), Render (API), MongoDB Atlas (database) |

## Project structure

```text
.
├── fe-todoApp/                 # Next.js frontend
│   └── src/
│       ├── app/                # Pages: / (onboarding), /home, /search, /weeks
│       ├── components/         # AddTaskSheet (create + edit), TaskRow (swipe to delete)
│       └── lib/                # API client, date helpers, shared types
└── be-todoApp/                 # NestJS API
    └── src/
        ├── todo/               # Todo module: controller, service, dto/, schemas/, interfaces/
        ├── health/             # Health check endpoint and keep-alive ping
        └── core/               # Constants, response type, APIFeatures query builder
```

## Running locally

**Prerequisites:** Node.js 20.9 or newer, and MongoDB running locally (or a MongoDB Atlas connection string).

### 1. API

```bash
cd be-todoApp
npm install
cp .env.example .env      # then set MONGODB_URI if you're not using a local MongoDB
npm run start:dev         # http://localhost:3000/api
```

| Variable | Description | Default in `.env.example` |
|---|---|---|
| `PORT` | Port the API listens on | `3000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/todo-app` |
| `CLIENT_ORIGIN` | Allowed frontend origins for CORS (comma-separated) | `http://localhost:3001` |

### 2. Frontend

```bash
cd fe-todoApp
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:3000/api" > .env.local
npm run dev               # http://localhost:3001
```

`NEXT_PUBLIC_API_URL` is the base URL of the API. Next.js reads it at build time, so restart the dev server (or rebuild) after changing it.

### Checks

```bash
cd be-todoApp && npm run lint && npm test && npm run build
cd fe-todoApp && npm run lint && npm run build
```

## API

All routes are prefixed with `/api`. Responses use the shape `{ message, data, total?, page?, limit?, pageCount? }`.

| Method | Route | Description |
|---|---|---|
| `GET` | `/todo` | List tasks, with filters, search, sorting and pagination (see below) |
| `GET` | `/todo/summary` | Open, completed and total counts per Monday–Sunday week |
| `GET` | `/todo/:id` | Get one task |
| `POST` | `/todo` | Create a task |
| `PATCH` | `/todo/:id` | Update a task, including marking it completed or in progress |
| `DELETE` | `/todo/:id` | Delete a task |
| `GET` | `/health` | Service and database status |

**Task fields:** `title` (required), `startTime` (required, ISO date-time; decides the task's week), `endTime` (optional, must be after `startTime`), `description`, `priority` (`low` \| `medium` \| `high`), `status` (`in_progress` \| `completed`, default `in_progress`).

**`GET /todo` query parameters:**

| Parameter | Example | Notes |
|---|---|---|
| `searchTerm` | `searchTerm=report` | Case-insensitive match on title or description |
| `status`, `priority` | `priority=high,medium` | One value or a comma-separated list |
| `startTime.gte`, `startTime.lt` | ISO date-times | Date range, e.g. a week's Monday to the next Monday |
| `sort`, `sortOrder` | `sort=startTime&sortOrder=asc` | Sort by `startTime`, `createdAt`, `updatedAt` or `title` |
| `fields` | `fields=title,status` | Return only these fields |
| `page`, `limit` | `page=2&limit=20` | `limit` is at most 100 |

**`GET /todo/summary` query parameters:** `timezone` (IANA name such as `Asia/Kolkata`, default `UTC`), plus optional `startTime.gte` and `startTime.lt`. Each entry includes `weekStart` and `weekEnd`, which can be passed straight to `GET /todo` as the date range to list that week's tasks.

Invalid input, such as a missing title, an unknown field, an invalid id or an end time before the start time, returns a `400` response with a message explaining the problem.

## Design notes

- **Weeks follow the user's timezone.** Weeks are grouped in MongoDB with `$dateTrunc` (`startOfWeek: monday`) in the timezone the browser sends. A task at 11 pm on Sunday in India therefore stays in that week instead of moving to the next one in UTC.
- **Where the spec and the Figma differ:**
  - A priority picker is added, because the spec requires priority and the Figma has none.
  - Weeks start on Monday, as the spec says; the Figma's day strip starts on Sunday.
  - Tasks can be deleted with both the swipe gesture (spec) and the trash icon (Figma).
- **The free API instance is kept awake.** Render stops free services after about 15 minutes without traffic, so the API pings its own `/api/health` every 30 seconds while running. It can be configured with `KEEP_ALIVE_INTERVAL_MS`, or turned off with `KEEP_ALIVE_ENABLED=false`.
