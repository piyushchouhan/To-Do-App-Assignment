import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  PAGINATION,
  SORT_ORDER,
  TODO_PRIORITY,
  TODO_SELECTABLE_FIELDS,
  TODO_SORT_FIELD,
  TODO_STATUS,
} from '../../core/constants/enums.constants.js';

// "a,b" -> ['a', 'b'], so comma-separated lists are validated per item.
const toList = ({ value }: { value: unknown }) =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    : value;

export class QueryTodoDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION.MAX_LIMIT)
  limit?: number;

  // Keyword matched against title and description.
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  searchTerm?: string;

  // One or more, comma-separated: status=in_progress,completed
  @IsOptional()
  @Transform(toList)
  @IsEnum(TODO_STATUS, { each: true })
  status?: TODO_STATUS[];

  // One or more, comma-separated: priority=high,medium
  @IsOptional()
  @Transform(toList)
  @IsEnum(TODO_PRIORITY, { each: true })
  priority?: TODO_PRIORITY[];

  // Inclusive start of the startTime range (e.g. Monday 00:00 of a week).
  @IsOptional()
  @IsDateString()
  'startTime.gte'?: string;

  // Exclusive end of the startTime range (e.g. next Monday 00:00).
  @IsOptional()
  @IsDateString()
  'startTime.lt'?: string;

  @IsOptional()
  @IsEnum(TODO_SORT_FIELD)
  sort?: TODO_SORT_FIELD;

  @IsOptional()
  @IsEnum(SORT_ORDER)
  sortOrder?: SORT_ORDER;

  // Fields to return, comma-separated: fields=title,status,startTime
  @IsOptional()
  @Transform(toList)
  @IsIn(TODO_SELECTABLE_FIELDS, { each: true })
  fields?: string[];
}
