import { IsString, IsUUID, IsNotEmpty, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class RollbackDto {
  @IsString()
  @IsUUID()
  @IsNotEmpty()
  applicationId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileFilter?: string[];

  @IsOptional()
  @IsBoolean()
  deleteNewFiles?: boolean = true;

  @IsOptional()
  @IsBoolean()
  restoreDeletedFiles?: boolean = true;
}