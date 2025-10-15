import { DirectoryMetadataDto, FileMetadataDto } from './dto';

export interface ScanOptions {
  rootPath: string;
  maxDepth: number;
  includePatterns: string[];
  excludePatterns: string[];
  extractImports: boolean;
}

export interface ScanResult {
  allFiles: FileMetadataDto[];
  allDirectories: DirectoryMetadataDto[];
}
