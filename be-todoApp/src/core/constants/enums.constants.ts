export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export enum TODO_STATUS {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum TODO_PRIORITY {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum TODO_SORT_FIELD {
  START_TIME = 'startTime',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  TITLE = 'title',
}

// Fields a client may request via `fields=`.
export const TODO_SELECTABLE_FIELDS = [
  '_id',
  'title',
  'description',
  'startTime',
  'endTime',
  'priority',
  'status',
  'createdAt',
  'updatedAt',
];

export enum SORT_ORDER {
  ASC = 'asc',
  DESC = 'desc',
}
