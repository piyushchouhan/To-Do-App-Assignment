import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  InternalServerErrorException,
  Logger,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PAGINATION } from '../core/constants/enums.constants.js';
import { MESSAGE } from '../core/constants/messages.constants.js';
import { TApiResponse } from '../core/types/response.js';
import { CreateTodoDto } from './dto/create-todo.dto.js';
import { QuerySummaryDto } from './dto/query-summary.dto.js';
import { QueryTodoDto } from './dto/query-todo.dto.js';
import { UpdateTodoDto } from './dto/update-todo.dto.js';
import { ITodo, IWeeklySummary } from './interfaces/todo.interface.js';
import { TodoService } from './todo.service.js';

@Controller('todo')
export class TodoController {
  private readonly _logger = new Logger(TodoController.name);

  constructor(private readonly _todoService: TodoService) {}

  private _handleError(error: unknown, defaultMessage: string): never {
    const err = error instanceof Error ? error : new Error(String(error));
    this._logger.error(`${defaultMessage}: ${err.message}`, err.stack);

    // Known HTTP errors (400, 404, ...) pass through unchanged.
    if (error instanceof HttpException) throw error;
    throw new InternalServerErrorException(defaultMessage);
  }

  @Get()
  async findAll(@Query() query: QueryTodoDto): Promise<TApiResponse<ITodo[]>> {
    try {
      const page = query.page ?? PAGINATION.DEFAULT_PAGE;
      const limit = query.limit ?? PAGINATION.DEFAULT_LIMIT;
      const todos = await this._todoService.findAll(query);
      return {
        data: todos.data,
        message: MESSAGE.TODO.FETCHED,
        total: todos.total,
        page,
        limit,
        pageCount: Math.ceil(todos.total / limit),
      };
    } catch (error) {
      this._handleError(error, MESSAGE.TODO.ERRORS.FETCHING);
    }
  }

  // Declared before ':id' so "summary" isn't parsed as an ObjectId.
  @Get('summary')
  async getWeeklySummary(
    @Query() query: QuerySummaryDto,
  ): Promise<TApiResponse<IWeeklySummary[]>> {
    try {
      const summary = await this._todoService.getWeeklySummary(query);
      return { data: summary, message: MESSAGE.TODO.SUMMARY_FETCHED };
    } catch (error) {
      this._handleError(error, MESSAGE.TODO.ERRORS.FETCHING_SUMMARY);
    }
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ): Promise<TApiResponse<ITodo>> {
    try {
      const todo = await this._todoService.findOne(id);
      return { data: todo, message: MESSAGE.TODO.FETCHED_ONE };
    } catch (error) {
      this._handleError(error, MESSAGE.TODO.ERRORS.FETCHING_ONE);
    }
  }

  @Post()
  async create(@Body() dto: CreateTodoDto): Promise<TApiResponse<ITodo>> {
    try {
      const todo = await this._todoService.create(dto);
      return { data: todo, message: MESSAGE.TODO.CREATED };
    } catch (error) {
      this._handleError(error, MESSAGE.TODO.ERRORS.CREATING);
    }
  }

  @Patch(':id')
  async update(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() dto: UpdateTodoDto,
  ): Promise<TApiResponse<ITodo>> {
    try {
      const todo = await this._todoService.update(id, dto);
      return { data: todo, message: MESSAGE.TODO.UPDATED };
    } catch (error) {
      this._handleError(error, MESSAGE.TODO.ERRORS.UPDATING);
    }
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ): Promise<TApiResponse<ITodo>> {
    try {
      const todo = await this._todoService.remove(id);
      return { data: todo, message: MESSAGE.TODO.DELETED };
    } catch (error) {
      this._handleError(error, MESSAGE.TODO.ERRORS.DELETING);
    }
  }
}
