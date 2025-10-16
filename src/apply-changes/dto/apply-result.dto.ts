import {
  IsString,
  IsArray,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDate,
  IsIn,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FileOperation, Status } from '../../common/enum';

export class AppliedFileDto {
  @IsString()
  filePath: string;

  @IsString()
  absolutePath: string;

  @IsEnum(FileOperation)
  operation: FileOperation;

  @IsEnum(Status)
  status: Status;

  @IsOptional()
  @IsString()
  error: string | null;

  @IsNumber()
  bytesWritten: number;

  @IsOptional()
  @IsString()
  backupPath: string | null;
}

export class ApplicationResultDto {
  @IsString()
  applicationId: string;

  @IsString()
  executionId: string;

  @IsEnum(Status)
  status: Status;

  @IsString()
  targetDirectory: string;

  @IsArray()
  @Type(() => AppliedFileDto)
  appliedFiles: AppliedFileDto[];

  @IsNumber()
  totalFiles: number;

  @IsNumber()
  successfulFiles: number;

  @IsNumber()
  failedFiles: number;

  @Type(() => Date)
  @IsDate()
  startedAt: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  completedAt: Date | null;

  @IsBoolean()
  dryRun: boolean;

  @IsBoolean()
  canRollback: boolean;
}

export class RollbackResultDto {
  @IsString()
  rollbackId: string;

  @IsString()
  applicationId: string;

  @IsEnum(Status)
  status: Status;

  @IsArray()
  @IsString({ each: true })
  filesRestored: string[];

  @IsArray()
  @IsString({ each: true })
  filesDeleted: string[];

  @IsNumber()
  totalFiles: number;

  @IsNumber()
  successfulFiles: number;

  @IsNumber()
  failedFiles: number;

  @Type(() => Date)
  @IsDate()
  startedAt: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  completedAt: Date | null;

  @IsOptional()
  @IsString()
  error: string | null;
}
