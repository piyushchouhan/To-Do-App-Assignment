import { IsDateString, IsOptional, IsTimeZone } from 'class-validator';

export class QuerySummaryDto {
  // IANA timezone of the user, e.g. "Asia/Kolkata". Weeks run Monday 00:00
  // to Sunday 23:59 in this timezone.
  @IsOptional()
  @IsTimeZone()
  timezone?: string;

  // Optional startTime range, same params as QueryTodoDto.
  // Inclusive start, e.g. Monday 00:00 of the first week.
  @IsOptional()
  @IsDateString()
  'startTime.gte'?: string;

  // Exclusive end, e.g. Monday 00:00 after the last week.
  @IsOptional()
  @IsDateString()
  'startTime.lt'?: string;
}
