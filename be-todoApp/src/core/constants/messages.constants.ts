export const MESSAGE = {
  TODO: {
    FETCHED: 'Todos fetched successfully',
    FETCHED_ONE: 'Todo fetched successfully',
    SUMMARY_FETCHED: 'Weekly summary fetched successfully',
    CREATED: 'Todo created successfully',
    UPDATED: 'Todo updated successfully',
    DELETED: 'Todo deleted successfully',
    NOT_FOUND: 'Todo not found',
    INVALID_TIME_RANGE: 'End time must be after start time',
    ERRORS: {
      FETCHING: 'Error while fetching todos',
      FETCHING_ONE: 'Error while fetching todo',
      FETCHING_SUMMARY: 'Error while fetching weekly summary',
      CREATING: 'Error while creating todo',
      UPDATING: 'Error while updating todo',
      DELETING: 'Error while deleting todo',
    },
  },
  HEALTH: {
    OK: 'Service is healthy',
    DEGRADED: 'Service is running but the database is not connected',
  },
} as const;
