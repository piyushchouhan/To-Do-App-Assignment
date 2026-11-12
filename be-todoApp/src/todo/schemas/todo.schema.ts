import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  TODO_PRIORITY,
  TODO_STATUS,
} from '../../core/constants/enums.constants.js';

export type TodoDocument = HydratedDocument<Todo>;

@Schema({ timestamps: true, versionKey: false })
export class Todo {
  @Prop({ required: true, trim: true, maxlength: 100 })
  title: string;

  @Prop({ trim: true, maxlength: 500 })
  description?: string;

  // The task's scheduled date & time; also decides which week it belongs to.
  @Prop({ required: true, type: Date, index: true })
  startTime: Date;

  @Prop({ type: Date })
  endTime?: Date;

  @Prop({ type: String, enum: Object.values(TODO_PRIORITY) })
  priority?: TODO_PRIORITY;

  @Prop({
    type: String,
    enum: Object.values(TODO_STATUS),
    default: TODO_STATUS.IN_PROGRESS,
    index: true,
  })
  status: TODO_STATUS;
}

export const TodoSchema = SchemaFactory.createForClass(Todo);
