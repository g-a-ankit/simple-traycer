import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsObject,
  IsNumber,
} from 'class-validator';
import { CodebaseContextDto } from '../../codebase/dto/codebase-context.dto';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  featureRequest: string;

  @IsBoolean()
  @IsOptional()
  useStoredContext?: boolean = true;

  @IsObject()
  @IsOptional()
  customContext?: CodebaseContextDto;

  @IsString()
  @IsOptional()
  additionalInstructions?: string;

  @IsBoolean()
  @IsOptional()
  persistToFile?: boolean = false;

  @IsString()
  @IsOptional()
  model?: string; // Override AI model for plan generation

  @IsNumber()
  @IsOptional()
  maxTokens?: number; // Maximum tokens in plan response
}
