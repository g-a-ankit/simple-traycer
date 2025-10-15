export class FileMetadataDto {
  path: string;
  absolutePath: string;
  type: string;
  size: number;
  imports: string[];
  lines: number;
}

export class DirectoryMetadataDto {
  path: string;
  absolutePath: string;
  fileCount: number;
  subdirectoryCount: number;
}

export class CodebaseContextDto {
  rootPath: string;
  files: FileMetadataDto[];
  directories: DirectoryMetadataDto[];
  totalFiles: number;
  totalDirectories: number;
  fileTypes: Record<string, number>;
  dependencies: string[];
  analyzedAt: Date;
}
