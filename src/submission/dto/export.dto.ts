import {
  IsString,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class ExportDto {
  @IsUUID()
  @IsNotEmpty()
  executionId: string;

  @IsString()
  @IsNotEmpty()
  outputDirectory: string;

  @IsOptional()
  @IsBoolean()
  overwriteExisting?: boolean = false;

  @IsOptional()
  @IsBoolean()
  createDirectories?: boolean = true;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileFilter?: string[];

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean = false;

  @IsOptional()
  @IsBoolean()
  preserveStructure?: boolean = true;
}