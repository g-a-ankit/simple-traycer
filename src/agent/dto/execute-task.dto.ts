import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsObject,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { CodebaseContextDto } from '../../codebase/dto/codebase-context.dto';
import { FileOperation } from 'src/common/enum';

export class ExecuteTaskDto {
  @IsString()
  @IsNotEmpty()
  taskDescription: string;

  @IsString()
  @IsNotEmpty()
  filePath: string;

  @IsEnum(FileOperation)
  operation: FileOperation;

  @IsObject()
  @IsOptional()
  context?: any;

  @IsObject()
  @IsOptional()
  codebaseContext?: CodebaseContextDto;

  @IsBoolean()
  @IsOptional()
  useStoredContext?: boolean = true;

  @IsBoolean()
  @IsOptional()
  persistToFile?: boolean = true;

  @IsString()
  @IsOptional()
  model?: string;

  @IsNumber()
  @IsOptional()
  temperature?: number;

  @IsNumber()
  @IsOptional()
  maxTokens?: number;
}
