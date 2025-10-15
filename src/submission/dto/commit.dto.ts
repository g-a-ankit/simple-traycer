import { IsString, IsUUID, IsNotEmpty, IsOptional, IsBoolean, IsArray, IsEmail } from 'class-validator';

export class CommitDto {
  @IsUUID()
  @IsNotEmpty()
  executionId: string;

  @IsString()
  @IsNotEmpty()
  repositoryPath: string;

  @IsString()
  @IsNotEmpty()
  commitMessage: string;

  @IsOptional()
  @IsString()
  branchName?: string;

  @IsOptional()
  @IsBoolean()
  createBranch: boolean = false;

  @IsOptional()
  @IsString()
  baseBranch: string = 'main';

  @IsOptional()
  @IsBoolean()
  push: boolean = false;

  @IsOptional()
  @IsString()
  remote: string = 'origin';

  @IsOptional()
  @IsString()
  authorName?: string;

  @IsOptional()
  @IsEmail()
  authorEmail?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileFilter?: string[];

  @IsOptional()
  @IsBoolean()
  addAll: boolean = true;
}