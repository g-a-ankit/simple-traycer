import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  AnalyzeCodebaseDto,
  CodebaseContextDto,
  FileMetadataDto,
  DirectoryMetadataDto,
} from './dto';
import { ScanOptions, ScanResult } from './codebase.interface';

@Injectable()
export class CodebaseService {
  private readonly logger = new Logger(CodebaseService.name);
  private latestContext: CodebaseContextDto | null = null;

  async analyzeCodebase(dto: AnalyzeCodebaseDto): Promise<CodebaseContextDto> {
    this.logger.log('received req to analyse codebase ', { dto });
    const rootPath = path.resolve(dto.path);
    try {
      const stat = await fs.stat(rootPath);
      if (!stat.isDirectory()) {
        this.logger.error('current path is not a directory', { rootPath });
        throw new Error('Path is not a directory');
      }
    } catch (error) {
      this.logger.error(
        `Failed to access path: ${rootPath}`,
        error.stack,
        'FileService',
      );
      throw new Error('Path does not exist or is not accessible');
    }

    const options: ScanOptions = {
      rootPath,
      maxDepth: dto.maxDepth || Infinity,
      includePatterns: dto.includePatterns || [],
      excludePatterns: dto.excludePatterns || [],
      extractImports: dto.extractImports !== false,
    };

    this.logger.log('initiating scanning for path', { rootPath });

    const { allFiles, allDirectories } = await this.scanDirectory(
      rootPath,
      options,
      0,
    );

    const files = allFiles;
    const directories = allDirectories;
    const totalFiles = files.length;
    const totalDirectories = directories.length;
    const fileTypes: Record<string, number> = {};
    files.forEach((file) => {
      const type = file.type;
      fileTypes[type] = (fileTypes[type] || 0) + 1;
    });
    const dependencies = Array.from(
      new Set(files.flatMap((file) => file.imports)),
    );
    const analyzedAt = new Date();

    const context: CodebaseContextDto = {
      rootPath,
      files,
      directories,
      totalFiles,
      totalDirectories,
      fileTypes,
      dependencies,
      analyzedAt,
    };

    this.latestContext = context;
    this.logger.log('successfully created context for ', { rootPath });
    return context;
  }

  private async scanDirectory(
    dirPath: string,
    options: ScanOptions,
    currentDepth: number,
  ): Promise<ScanResult> {
    this.logger.log('scanning the path', { dirPath, options, currentDepth });
    const allFiles: FileMetadataDto[] = [];
    const allDirectories: DirectoryMetadataDto[] = [];

    if (currentDepth > options.maxDepth) {
      return { allFiles, allDirectories };
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(options.rootPath, fullPath);

        if (this.matchesPattern(relativePath, options.excludePatterns)) {
          continue;
        }

        if (entry.isDirectory()) {
          const subResult = await this.scanDirectory(
            fullPath,
            options,
            currentDepth + 1,
          );
          const dirMetadata: DirectoryMetadataDto = {
            path: relativePath,
            absolutePath: fullPath,
            fileCount: subResult.allFiles.filter(
              (f) => path.dirname(f.path) === relativePath,
            ).length,
            subdirectoryCount: subResult.allDirectories.filter(
              (d) => path.dirname(d.path) === relativePath,
            ).length,
          };
          allDirectories.push(dirMetadata);
          allFiles.push(...subResult.allFiles);
          allDirectories.push(...subResult.allDirectories);
        } else if (entry.isFile()) {
          if (
            options.includePatterns.length > 0 &&
            !this.matchesPattern(relativePath, options.includePatterns)
          ) {
            continue;
          }
          const metadata = await this.extractFileMetadata(
            fullPath,
            options.extractImports,
          );
          metadata.path = relativePath;
          metadata.absolutePath = fullPath;
          allFiles.push(metadata);
        }
      }
    } catch (error) {
      this.logger.error('error scanning the path ', { error, dirPath });
    }

    this.logger.log('returning scanned response ', {
      dirPath,
      allFiles,
      allDirectories,
    });
    return { allFiles, allDirectories };
  }

  private async extractFileMetadata(
    filePath: string,
    extractImports: boolean,
  ): Promise<FileMetadataDto> {
    this.logger.log('extarcting file metadata ', { filePath });
    const stat = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').length;
    const type = path.extname(filePath).slice(1);
    let imports: string[] = [];
    if (extractImports) {
      imports = this.extractImports(content, type);
    }
    this.logger.log('file metadata extraction complete ', { filePath });
    return {
      path: '',
      absolutePath: filePath,
      type,
      size: stat.size,
      imports,
      lines,
    };
  }

  private extractImports(fileContent: string, fileType: string): string[] {
    const imports: string[] = [];
    if (['ts', 'js', 'tsx', 'jsx'].includes(fileType)) {
      const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(fileContent)) !== null) {
        imports.push(match[1]);
      }
      const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      while ((match = requireRegex.exec(fileContent)) !== null) {
        imports.push(match[1]);
      }
      const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      while ((match = dynamicImportRegex.exec(fileContent)) !== null) {
        imports.push(match[1]);
      }
    } else if (fileType === 'py') {
      const importRegex = /^import\s+([^\s]+)/gm;
      let match;
      while ((match = importRegex.exec(fileContent)) !== null) {
        imports.push(match[1]);
      }
      const fromImportRegex = /^from\s+([^\s]+)\s+import/gm;
      while ((match = fromImportRegex.exec(fileContent)) !== null) {
        imports.push(match[1]);
      }
    }
    return Array.from(new Set(imports));
  }

  private matchesPattern(filePath: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (this.simpleGlobMatch(filePath, pattern)) {
        return true;
      }
    }
    return false;
  }

  private simpleGlobMatch(filePath: string, pattern: string): boolean {
    const regexStr = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]');
    return new RegExp(regexStr).test(filePath);
  }

  getStoredContext(): CodebaseContextDto | null {
    return this.latestContext;
  }
}
