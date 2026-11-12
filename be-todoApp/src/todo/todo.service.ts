import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import {
  TODO_SORT_FIELD,
  TODO_STATUS,
} from '../core/constants/enums.constants.js';
import { MESSAGE } from '../core/constants/messages.constants.js';
import { APIFeatures } from '../core/utils/apiFeatures.js';
import { CreateTodoDto } from './dto/create-todo.dto.js';
import { QuerySummaryDto } from './dto/query-summary.dto.js';
import { QueryTodoDto } from './dto/query-todo.dto.js';
import { UpdateTodoDto } from './dto/update-todo.dto.js';
import {
  IPaginatedResult,
  ITodo,
  IWeeklySummary,
} from './interfaces/todo.interface.js';
import { Todo } from './schemas/todo.schema.js';

@Injectable()
export class TodoService {
  constructor(
    @InjectModel(Todo.name) private readonly _todoModel: Model<Todo>,
  ) {}

  async findAll(query: QueryTodoDto): Promise<IPaginatedResult<ITodo>> {
    const features = new APIFeatures(this._todoModel, query, {
      searchFields: ['title', 'description'],
      dateFields: ['startTime', 'endTime', 'createdAt', 'updatedAt'],
      defaultSort: TODO_SORT_FIELD.START_TIME,
    })
      .filter()
      .search()
      .sort()
      .limitFields()
      .paginate();

    const [data, total] = await Promise.all([
      features.getQuery().lean<ITodo[]>().exec(),
      // Same filter as the data query, so search/filters are reflected in total.
      this._todoModel.countDocuments(features.getFilter()).exec(),
    ]);

    return { data, total };
  }

  async getWeeklySummary(query: QuerySummaryDto): Promise<IWeeklySummary[]> {
    const timezone = query.timezone ?? 'UTC';
    const from = query['startTime.gte'];
    const to = query['startTime.lt'];
    const match: QueryFilter<Todo> = {};
    if (from || to) {
      match.startTime = {
        ...(from && { $gte: new Date(from) }),
        ...(to && { $lt: new Date(to) }),
      };
    }

    return this._todoModel
      .aggregate<IWeeklySummary>([
        { $match: match },
        {
          $group: {
            // Monday 00:00 of the task's week, in the user's timezone.
            _id: {
              $dateTrunc: {
                date: '$startTime',
                unit: 'week',
                startOfWeek: 'monday',
                timezone,
              },
            },
            completed: {
              $sum: {
                $cond: [{ $eq: ['$status', TODO_STATUS.COMPLETED] }, 1, 0],
              },
            },
            total: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            weekStart: '$_id',
            weekEnd: {
              $dateAdd: {
                startDate: '$_id',
                unit: 'week',
                amount: 1,
                timezone,
              },
            },
            open: { $subtract: ['$total', '$completed'] },
            completed: 1,
            total: 1,
          },
        },
      ])
      .exec();
  }

  async findOne(id: Types.ObjectId): Promise<ITodo> {
    const todo = await this._todoModel.findById(id).lean<ITodo>().exec();
    if (!todo) throw new NotFoundException(MESSAGE.TODO.NOT_FOUND);
    return todo;
  }

  async create(dto: CreateTodoDto): Promise<ITodo> {
    this._assertValidTimeRange(dto.startTime, dto.endTime);
    const todo = await this._todoModel.create(dto);
    return todo.toObject<ITodo>();
  }

  async update(id: Types.ObjectId, dto: UpdateTodoDto): Promise<ITodo> {
    if (dto.startTime || dto.endTime) {
      const existing = await this.findOne(id);
      this._assertValidTimeRange(
        dto.startTime ?? existing.startTime,
        // null means the end time is being removed, so don't fall back to the old one
        dto.endTime === undefined ? existing.endTime : dto.endTime,
      );
    }

    const todo = await this._todoModel
      .findByIdAndUpdate(id, dto, {
        returnDocument: 'after',
        runValidators: true,
      })
      .lean<ITodo>()
      .exec();
    if (!todo) throw new NotFoundException(MESSAGE.TODO.NOT_FOUND);
    return todo;
  }

  async remove(id: Types.ObjectId): Promise<ITodo> {
    const todo = await this._todoModel
      .findByIdAndDelete(id)
      .lean<ITodo>()
      .exec();
    if (!todo) throw new NotFoundException(MESSAGE.TODO.NOT_FOUND);
    return todo;
  }

  private _assertValidTimeRange(
    start: string | Date,
    end?: string | Date,
  ): void {
    if (end && new Date(end) <= new Date(start)) {
      throw new BadRequestException(MESSAGE.TODO.INVALID_TIME_RANGE);
    }
  }
}
