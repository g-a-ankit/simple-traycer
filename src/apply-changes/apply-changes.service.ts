import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentService } from '../agent/agent.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  ApplyChangesDto,
  RollbackDto,
  AppliedFileDto,
  ApplicationResultDto,
  RollbackResultDto,
} from './dto';
import { ContentType, FileOperation, Status } from '../common/enum';
import { CodebaseService } from '../codebase/codebase.service';
import { applyPatch, parsePatch } from 'diff';

@Injectable()
export class ApplyChangesService {
  private applications: Map<string, ApplicationResultDto> = new Map();
  private readonly applicationsDirectory: string = './applications';
  private readonly backupsDirectory: string = './backups';
  private readonly logger: Logger = new Logger(ApplyChangesService.name);

  constructor(
    private configService: ConfigService,
    private agentService: AgentService,
    private codebaseService: CodebaseService,
  ) {
    this.loadApplicationsFromFiles()
      .then(() => {})
      .catch(() => {});
  }

  async applyExecution(dto: ApplyChangesDto): Promise<ApplicationResultDto> {
    const applicationId = randomUUID();
    const execution = this.agentService.getPlanExecutionStatus(dto.executionId);
    if (!execution) {
      throw new Error('Execution not found');
    }
    const result: ApplicationResultDto = {
      applicationId,
      executionId: dto.executionId,
      status: Status.PENDING,
      targetDirectory:
        this.codebaseService.getStoredContext()?.rootPath || process.cwd(),
      appliedFiles: [],
      totalFiles: 0,
      successfulFiles: 0,
      failedFiles: 0,
      startedAt: new Date(),
      completedAt: null,
      dryRun: dto.dryRun || false,
      canRollback: false,
    };
    this.applications.set(applicationId, result);
    result.status = Status.IN_PROGRESS;
    this.logger.log(
      `Starting application ${applicationId} for execution ${dto.executionId}`,
    );
    let taskResults = execution.taskResults.filter((tr) => tr.generatedCode);
    if (dto.fileFilter && dto.fileFilter.length > 0) {
      taskResults = taskResults.filter((tr) =>
        dto.fileFilter!.includes(tr.generatedCode!.filePath),
      );
    }
    let backupsCreated = false;
    for (const taskResult of taskResults) {
      const generatedCode = taskResult.generatedCode!;
      let backupPath: string | null = null;
      if (
        dto.createBackup !== false &&
        (generatedCode.operation === FileOperation.MODIFY ||
          generatedCode.operation === FileOperation.DELETE)
      ) {
        try {
          const absolutePath = path.join(
            result.targetDirectory,
            generatedCode.filePath,
          );
          backupPath = await this.createBackup(
            absolutePath,
            applicationId,
            generatedCode.filePath,
          );
          backupsCreated = true;
          this.logger.log(`Backup created for ${generatedCode.filePath}`);
        } catch (error) {
          this.logger.error(
            `Failed to create backup for ${generatedCode.filePath}: ${error.message}`,
          );
        }
      }
      const appliedFile = await this.applyFileChange(
        generatedCode.filePath,
        generatedCode.content,
        generatedCode.operation,
        result.targetDirectory,
        dto.createBackup !== false,
        dto.overwriteExisting !== false,
        dto.createDirectories !== false,
        dto.dryRun || false,
        generatedCode.contentType,
        dto.useDiffMode !== false,
      );
      appliedFile.backupPath = backupPath;
      result.appliedFiles.push(appliedFile);
      this.logger.log(
        `Applied ${generatedCode.operation} to ${generatedCode.filePath}: ${appliedFile.status}`,
      );
    }
    result.totalFiles = result.appliedFiles.length;
    result.successfulFiles = result.appliedFiles.filter(
      (f) => f.status === 'SUCCESS',
    ).length;
    result.failedFiles = result.appliedFiles.filter(
      (f) => f.status === 'FAILED',
    ).length;
    if (result.failedFiles === 0) {
      result.status = Status.COMPLETED;
    } else if (result.successfulFiles > 0) {
      result.status = Status.PARTIALLY_COMPLETED;
    } else {
      result.status = Status.FAILED;
    }
    result.canRollback = backupsCreated;
    result.completedAt = new Date();
    await this.persistApplicationToFile(result);
    this.logger.log(
      `Application ${applicationId} completed: ${result.successfulFiles} success, ${result.failedFiles} failed`,
    );
    return result;
  }

  async rollback(dto: RollbackDto): Promise<RollbackResultDto> {
    const rollbackId = randomUUID();
    const application = this.getApplicationStatus(dto.applicationId);
    if (!application || !application.canRollback) {
      throw new Error('Application not found or cannot rollback');
    }
    const result: RollbackResultDto = {
      rollbackId,
      applicationId: dto.applicationId,
      status: Status.PENDING,
      filesRestored: [],
      filesDeleted: [],
      totalFiles: 0,
      successfulFiles: 0,
      failedFiles: 0,
      startedAt: new Date(),
      completedAt: null,
      error: null,
    };
    result.status = Status.IN_PROGRESS;
    this.logger.log(
      `Starting rollback ${rollbackId} for application ${dto.applicationId}`,
    );
    let appliedFiles = application.appliedFiles;
    if (dto.fileFilter && dto.fileFilter.length > 0) {
      appliedFiles = appliedFiles.filter((af) =>
        dto.fileFilter!.includes(af.filePath),
      );
    }
    for (const appliedFile of appliedFiles) {
      try {
        if (
          appliedFile.operation === FileOperation.CREATE &&
          dto.deleteNewFiles !== false
        ) {
          await this.deleteFile(appliedFile.absolutePath);
          result.filesDeleted.push(appliedFile.filePath);
          result.successfulFiles++;
        } else if (
          appliedFile.operation === FileOperation.MODIFY &&
          appliedFile.backupPath
        ) {
          await this.restoreFromBackup(
            appliedFile.backupPath,
            appliedFile.absolutePath,
          );
          result.filesRestored.push(appliedFile.filePath);
          result.successfulFiles++;
        } else if (
          appliedFile.operation === FileOperation.DELETE &&
          dto.restoreDeletedFiles !== false &&
          appliedFile.backupPath
        ) {
          await this.restoreFromBackup(
            appliedFile.backupPath,
            appliedFile.absolutePath,
          );
          result.filesRestored.push(appliedFile.filePath);
          result.successfulFiles++;
        }
      } catch (error) {
        result.failedFiles++;
        this.logger.error(
          `Failed to rollback ${appliedFile.filePath}: ${error.message}`,
        );
      }
    }
    result.totalFiles = appliedFiles.length;
    if (result.failedFiles === 0) {
      result.status = Status.COMPLETED;
    } else if (result.successfulFiles > 0) {
      result.status = Status.PARTIALLY_COMPLETED;
    } else {
      result.status = Status.FAILED;
    }
    result.completedAt = new Date();
    this.logger.log(
      `Rollback ${rollbackId} completed: ${result.successfulFiles} success, ${result.failedFiles} failed`,
    );
    return result;
  }

  getApplicationStatus(applicationId: string): ApplicationResultDto | null {
    return this.applications.get(applicationId) || null;
  }

  getAllApplications(): ApplicationResultDto[] {
    return Array.from(this.applications.values()).sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
    );
  }

  getApplicationsByExecutionId(executionId: string): ApplicationResultDto[] {
    return Array.from(this.applications.values())
      .filter((app) => app.executionId === executionId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  private async applyFileChange(
    filePath: string,
    content: string,
    operation: string,
    targetDirectory: string,
    createBackup: boolean,
    overwriteExisting: boolean,
    createDirectories: boolean,
    dryRun: boolean,
    contentType: string,
    useDiffMode: boolean,
  ): Promise<AppliedFileDto> {
    const absolutePath = path.join(targetDirectory, filePath);
    const exists = await fs
      .access(absolutePath)
      .then(() => true)
      .catch(() => false);
    const appliedFile: AppliedFileDto = {
      filePath,
      absolutePath,
      operation: operation as any,
      status: Status.SUCCESS,
      error: null,
      bytesWritten: 0,
      backupPath: null,
    };
    try {
      if (operation === 'CREATE') {
        if (exists && !overwriteExisting) {
          appliedFile.status = Status.SKIPPED;
          return appliedFile;
        }
        if (dryRun) {
          appliedFile.bytesWritten = content.length;
        } else {
          if (createDirectories) {
            await fs.mkdir(path.dirname(absolutePath), { recursive: true });
          }
          await fs.writeFile(absolutePath, content);
          const stats = await fs.stat(absolutePath);
          appliedFile.bytesWritten = stats.size;
        }
      } else if (operation === FileOperation.MODIFY) {
        if (!exists && contentType === ContentType.DIFF && useDiffMode) {
          this.logger.log(
            `File ${filePath} does not exist, creating from diff content`,
          );
          try {
            const newContent = this.extractNewContentFromDiff(content);
            if (dryRun) {
              appliedFile.bytesWritten = newContent.length;
            } else {
              if (createDirectories) {
                await fs.mkdir(path.dirname(absolutePath), { recursive: true });
              }
              await fs.writeFile(absolutePath, newContent);
              const stats = await fs.stat(absolutePath);
              appliedFile.bytesWritten = stats.size;
            }
          } catch (error) {
            appliedFile.status = Status.FAILED;
            appliedFile.error = `Failed to extract content from diff: ${error.message}`;
          }
          return appliedFile;
        }
        if (!exists) {
          appliedFile.status = Status.FAILED;
          appliedFile.error = 'File does not exist';
          return appliedFile;
        }
        if (contentType === ContentType.DIFF && useDiffMode) {
          this.logger.log(`Applying diff to ${filePath}`);
          try {
            const existingContent = await fs.readFile(absolutePath, 'utf-8');
            const patchedContent = applyPatch(existingContent, content);
            if (patchedContent === false) {
              this.logger.warn(
                `Patch failed for ${filePath}, falling back to full content extraction`,
              );
              const newContent = this.extractNewContentFromDiff(content);
              if (dryRun) {
                appliedFile.bytesWritten = newContent.length;
              } else {
                await fs.writeFile(absolutePath, newContent);
                const stats = await fs.stat(absolutePath);
                appliedFile.bytesWritten = stats.size;
              }
            } else {
              this.logger.log(`Patch applied successfully to ${filePath}`);
              if (dryRun) {
                appliedFile.bytesWritten = patchedContent.length;
              } else {
                await fs.writeFile(absolutePath, patchedContent);
                const stats = await fs.stat(absolutePath);
                appliedFile.bytesWritten = stats.size;
              }
            }
          } catch (error) {
            appliedFile.status = Status.FAILED;
            appliedFile.error = `Error applying diff: ${error.message}`;
          }
        } else {
          if (contentType === ContentType.DIFF && !useDiffMode) {
            this.logger.log(
              `Diff mode disabled, treating content as full file for ${filePath}`,
            );
          }
          if (dryRun) {
            appliedFile.bytesWritten = content.length;
          } else {
            await fs.writeFile(absolutePath, content);
            const stats = await fs.stat(absolutePath);
            appliedFile.bytesWritten = stats.size;
          }
        }
      } else if (operation === FileOperation.DELETE) {
        if (!exists) {
          appliedFile.status = Status.SKIPPED;
          return appliedFile;
        }
        if (dryRun) {
          // nothing
        } else {
          await fs.unlink(absolutePath);
        }
      }
    } catch (error) {
      appliedFile.status = Status.FAILED;
      appliedFile.error = error.message;
    }
    return appliedFile;
  }

  private async createBackup(
    absolutePath: string,
    applicationId: string,
    relativePath: string,
  ): Promise<string> {
    const backupPath = path.join(
      this.backupsDirectory,
      applicationId,
      relativePath,
    );
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.copyFile(absolutePath, backupPath);
    return backupPath;
  }

  private async restoreFromBackup(
    backupPath: string,
    originalPath: string,
  ): Promise<void> {
    const exists = await fs
      .access(backupPath)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      throw new Error('Backup file does not exist');
    }
    await fs.copyFile(backupPath, originalPath);
  }

  private async deleteFile(filePath: string): Promise<void> {
    await fs.unlink(filePath);
  }

  private async persistApplicationToFile(
    application: ApplicationResultDto,
  ): Promise<void> {
    try {
      await fs.mkdir(this.applicationsDirectory, { recursive: true });
      const filePath = path.join(
        this.applicationsDirectory,
        `${application.applicationId}.json`,
      );
      await fs.writeFile(filePath, JSON.stringify(application, null, 2));
    } catch (error) {
      this.logger.error(`Error persisting application: ${error.message}`);
    }
  }

  private async loadApplicationsFromFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.applicationsDirectory);
      for (const file of files) {
        if (path.extname(file) === '.json') {
          const filePath = path.join(this.applicationsDirectory, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const application: ApplicationResultDto = JSON.parse(content);
          this.applications.set(application.applicationId, application);
        }
      }
    } catch (error) {
      // ignore
    }
  }

  private extractNewContentFromDiff(diffContent: string): string {
    try {
      const parsedDiff = parsePatch(diffContent);
      if (!parsedDiff || parsedDiff.length === 0) {
        throw new Error('Invalid diff format');
      }
      const newLines: string[] = [];
      for (const file of parsedDiff) {
        for (const hunk of file.hunks) {
          for (const line of hunk.lines) {
            if (line.startsWith('+') && !line.startsWith('+++')) {
              newLines.push(line.substring(1)); // Remove the '+' prefix
            }
          }
        }
      }
      return newLines.join('\n');
    } catch (error) {
      throw new Error(`Failed to extract content from diff: ${error.message}`);
    }
  }
}
