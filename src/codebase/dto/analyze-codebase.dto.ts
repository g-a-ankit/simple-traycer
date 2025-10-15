import { IsString, IsOptional, IsArray, IsBoolean, IsNumber } from 'class-validator';

export class AnalyzeCodebaseDto {
  @IsString()
  path: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includePatterns?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePatterns?: string[];

  @IsOptional()
  @IsNumber()
  maxDepth?: number;

  @IsOptional()
  @IsBoolean()
  extractImports?: boolean;
}