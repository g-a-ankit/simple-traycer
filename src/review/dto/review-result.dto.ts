import {
  IsString,
  IsBoolean,
  IsArray,
  IsDate,
  IsOptional,
  IsNumber,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IterationStatus } from '../review.enum';

export class FileSpecificFeedbackDto {
  @IsString()
  filePath: string;

  @IsString()
  feedback: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  lineNumbers?: number[];
}

export class FileDiffDto {
  @IsString()
  filePath: string;

  @IsString()
  operation: string;

  @IsString()
  expectedDescription: string;

  @IsOptional()
  @IsString()
  actualContent: string | null;

  @IsString()
  diffOutput: string;

  @IsString()
  status: string;

  @IsBoolean()
  hasIssues: boolean;
}

export class FeedbackItemDto {
  @IsString()
  feedbackId: string;

  @IsString()
  feedback: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileSpecificFeedbackDto)
  fileSpecificFeedback: FileSpecificFeedbackDto[];

  @IsString()
  overallSatisfaction: string;

  @IsDate()
  submittedAt: Date;

  @IsOptional()
  @IsString()
  submittedBy?: string;
}

export class IterationResultDto {
  @IsString()
  iterationId: string;

  @IsString()
  reviewId: string;

  @IsString()
  executionId: string;

  @IsString()
  @IsEnum(IterationStatus)
  status: IterationStatus;

  @IsArray()
  @IsString({ each: true })
  filesRegenerated: string[];

  @IsDate()
  startedAt: Date;

  @IsOptional()
  @IsDate()
  completedAt: Date | null;
}

export class ReviewSessionDto {
  @IsString()
  reviewId: string;

  @IsString()
  planId: string;

  @IsString()
  executionId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileDiffDto)
  fileDiffs: FileDiffDto[];

  @IsString()
  @IsEnum(IterationStatus)
  overallStatus: IterationStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeedbackItemDto)
  feedbackHistory: FeedbackItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IterationResultDto)
  iterations: IterationResultDto[];

  @IsDate()
  createdAt: Date;

  @IsDate()
  updatedAt: Date;
}
