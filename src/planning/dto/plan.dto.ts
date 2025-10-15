import {
  IsString,
  IsNumber,
  IsArray,
  IsDate,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CapacityLevel,
  FileOperationType,
  PlanningStatus,
} from '../planning.interface';

export class FileChangeDto {
  @IsString()
  filePath: string;

  @IsString()
  @IsEnum(FileOperationType)
  operation: string;

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  dependencies: string[];
}

export class PlanStepDto {
  @IsNumber()
  stepNumber: number;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileChangeDto)
  fileChanges: FileChangeDto[];

  @IsString()
  @IsEnum(CapacityLevel)
  estimatedComplexity: CapacityLevel;
}

export class PlanDto {
  @IsString()
  id: string;

  @IsString()
  featureRequest: string;

  @IsString()
  summary: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanStepDto)
  steps: PlanStepDto[];

  @IsNumber()
  totalSteps: number;

  @IsString()
  estimatedEffort: string;

  @IsArray()
  @IsString({ each: true })
  considerations: string[];

  @IsDate()
  createdAt: Date;

  @IsString()
  @IsEnum(PlanningStatus)
  status: string;
}

export class PlanSummaryDto {
  @IsString()
  id: string;

  @IsString()
  featureRequest: string;

  @IsNumber()
  totalSteps: number;

  @IsString()
  status: string;

  @IsDate()
  createdAt: Date;
}
