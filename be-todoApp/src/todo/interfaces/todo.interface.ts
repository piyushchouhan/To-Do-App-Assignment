import { Types } from 'mongoose';
import {
  TODO_PRIORITY,
  TODO_STATUS,
} from '../../core/constants/enums.constants.js';

export interface ITodo {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  priority?: TODO_PRIORITY;
  status: TODO_STATUS;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaginatedResult<T> {
  data: T[];
  total: number;
}

export interface IWeeklySummary {
  // Monday 00:00 in the requested timezone, as a UTC instant.
  weekStart: Date;
  // Next Monday 00:00 (exclusive); pass weekStart/weekEnd as
  // `startTime.gte`/`startTime.lt` to list the week's tasks.
  weekEnd: Date;
  open: number;
  completed: number;
  total: number;
}
