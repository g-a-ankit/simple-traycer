import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SatisfactionLevel } from '../review.enum';

class FileSpecificFeedback {
  @IsString()
  @IsNotEmpty()
  filePath: string;

  @IsString()
  @IsNotEmpty()
  feedback: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  lineNumbers?: number[];
}

export class SubmitFeedbackDto {
  @IsString()
  @IsNotEmpty()
  reviewId: string;

  @IsString()
  @IsNotEmpty()
  feedback: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileSpecificFeedback)
  fileSpecificFeedback?: FileSpecificFeedback[];

  @IsOptional()
  @IsEnum(SatisfactionLevel)
  overallSatisfaction?: SatisfactionLevel;

  @IsOptional()
  @IsBoolean()
  requestIteration?: boolean = false;
}
