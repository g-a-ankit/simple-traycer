import { IsString, IsUUID, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class IterateDto {
  @IsUUID()
  @IsString()
  reviewId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specificFiles?: string[];

  @IsOptional()
  @IsString()
  additionalInstructions?: string;

  @IsOptional()
  @IsBoolean()
  parallelExecution: boolean = false;

  @IsOptional()
  @IsBoolean()
  persistToFile: boolean = true;
}