import { PartialType } from '@nestjs/mapped-types';
import { CreateTodoDto } from './create-todo.dto.js';

export class UpdateTodoDto extends PartialType(CreateTodoDto) {}
