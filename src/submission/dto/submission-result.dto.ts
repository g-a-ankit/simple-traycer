import {
  IsString,
  IsArray,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDate,
  IsIn,
  IsEnum,
  // IsNullable,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FileOperation, Status } from 'src/common/enum';

export class ExportedFileDto {
  @IsString()
  filePath: string;

  @IsString()
  exportedPath: string;

  @IsEnum(FileOperation)
  operation: FileOperation;

  @IsEnum(Status)
  status: Status;

  @IsOptional()
  @IsString()
  // @IsNullable()
  error: string | null;

  @IsNumber()
  bytesWritten: number;
}

export class ExportResultDto {
  @IsString()
  submissionId: string;

  @IsString()
  executionId: string;

  @IsString()
  type: 'EXPORT';

  @IsEnum(Status)
  status: Status;

  @IsString()
  outputDirectory: string;

  @IsArray()
  @Type(() => ExportedFileDto)
  exportedFiles: ExportedFileDto[];

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
  // @IsNullable()
  completedAt: Date | null;

  @IsBoolean()
  dryRun: boolean;
}

export class CommitResultDto {
  @IsString()
  submissionId: string;

  @IsString()
  executionId: string;

  @IsString()
  type: 'COMMIT';

  @IsEnum(Status)
  status: Status;

  @IsString()
  repositoryPath: string;

  @IsOptional()
  @IsString()
  // @IsNullable()
  commitHash: string | null;

  @IsString()
  commitMessage: string;

  @IsString()
  branchName: string;

  @IsArray()
  @IsString({ each: true })
  filesCommitted: string[];

  @IsNumber()
  totalFiles: number;

  @IsBoolean()
  pushed: boolean;

  @IsOptional()
  @IsString()
  // @IsNullable()
  remote: string | null;

  @IsOptional()
  @IsString()
  // @IsNullable()
  error: string | null;

  @Type(() => Date)
  @IsDate()
  startedAt: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  // @IsNullable()
  completedAt: Date | null;
}

export type SubmissionResultDto = ExportResultDto | CommitResultDto;
