import {
  IsString,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class ApplyChangesDto {
  @IsUUID()
  @IsNotEmpty()
  executionId: string;

  @IsString()
  @IsOptional()
  targetDirectory?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fileFilter?: string[];

  @IsBoolean()
  @IsOptional()
  dryRun?: boolean = false;

  @IsBoolean()
  @IsOptional()
  createBackup?: boolean = true;

  @IsBoolean()
  @IsOptional()
  overwriteExisting?: boolean = true;

  @IsBoolean()
  @IsOptional()
  createDirectories?: boolean = true;
}