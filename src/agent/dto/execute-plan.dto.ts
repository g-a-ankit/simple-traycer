import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
} from 'class-validator';

export class ExecutePlanDto {
  @IsUUID()
  planId: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  stepNumbers?: number[];

  @IsOptional()
  @IsBoolean()
  parallelExecution: boolean = false;

  @IsOptional()
  @IsBoolean()
  persistToFile: boolean = true;

  @IsOptional()
  @IsBoolean()
  dryRun: boolean = false;

  @IsString()
  @IsOptional()
  model?: string;

  @IsNumber()
  @IsOptional()
  maxTokens?: number;
}
