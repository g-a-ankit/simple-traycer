import {
  IsString,
  IsEnum,
  IsArray,
  IsDate,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContentType, FileOperation, Status } from '../../common/enum';

export class GeneratedCodeDto {
  @IsString()
  filePath: string;

  @IsEnum(FileOperation)
  operation: FileOperation;

  @IsString()
  content: string;

  @IsEnum(ContentType)
  contentType: ContentType;

  @IsString()
  language: string;

  @IsString()
  explanation: string;

  @IsArray()
  @IsString({ each: true })
  dependencies: string[];
}

export class TaskResultDto {
  @IsString()
  taskId: string;

  @IsString()
  taskDescription: string;

  @IsEnum(Status)
  status: Status;

  @IsOptional()
  // @ValidateNested()
  @Type(() => GeneratedCodeDto)
  generatedCode: GeneratedCodeDto | null;

  @IsOptional()
  @IsString()
  error: string | null;

  @IsDate()
  startedAt: Date;

  @IsOptional()
  @IsDate()
  completedAt: Date | null;

  @IsOptional()
  @IsNumber()
  executionTimeMs: number | null;
}

export class PlanExecutionResultDto {
  @IsString()
  executionId: string;

  @IsString()
  planId: string;

  @IsEnum(Status)
  status: string;

  @IsArray()
  // @ValidateNested({ each: true })
  @Type(() => TaskResultDto)
  taskResults: TaskResultDto[];

  @IsNumber()
  totalTasks: number;

  @IsNumber()
  completedTasks: number;

  @IsNumber()
  failedTasks: number;

  @IsDate()
  startedAt: Date;

  @IsOptional()
  @IsDate()
  completedAt: Date | null;

  @IsNumber()
  progress: number;
}
