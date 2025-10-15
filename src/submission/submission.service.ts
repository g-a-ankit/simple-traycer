import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentService } from '../agent/agent.service';
import { ReviewService } from '../review/review.service';
import { simpleGit, SimpleGit } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  ExportDto,
  CommitDto,
  ExportedFileDto,
  ExportResultDto,
  CommitResultDto,
} from './dto';
import { FileOperation, Status } from 'src/common/enum';

@Injectable()
export class SubmissionService {
  private submissions: Map<string, ExportResultDto | CommitResultDto> =
    new Map();
  private gitClient: SimpleGit;
  private readonly submissionsDirectory: string = './submissions';
  private readonly logger = new Logger(SubmissionService.name);
  constructor(
    private configService: ConfigService,
    private agentService: AgentService,
    private reviewService: ReviewService,
  ) {
    this.gitClient = simpleGit();
    this.loadSubmissionsFromFiles()
      .then(() => {})
      .catch(() => {});
  }

  async exportFiles(dto: ExportDto): Promise<ExportResultDto> {
    const submissionId = randomUUID();
    const execution = this.agentService.getPlanExecutionStatus(dto.executionId);
    if (!execution) {
      this.logger.error('execution not found');
      throw new Error('Execution not found');
    }
    const result: ExportResultDto = {
      submissionId,
      executionId: dto.executionId,
      type: 'EXPORT',
      status: Status.PENDING,
      outputDirectory: dto.outputDirectory,
      exportedFiles: [],
      totalFiles: 0,
      successfulFiles: 0,
      failedFiles: 0,
      startedAt: new Date(),
      completedAt: null,
      dryRun: dto.dryRun || false,
    };
    this.submissions.set(submissionId, result);
    result.status = Status.IN_PROGRESS;
    let taskResults = execution.taskResults;
    if (dto.fileFilter && dto.fileFilter.length > 0) {
      taskResults = taskResults.filter(
        (tr) =>
          tr.generatedCode &&
          dto.fileFilter!.includes(tr.generatedCode.filePath),
      );
    }
    for (const taskResult of taskResults) {
      if (!taskResult.generatedCode) {
        continue;
      }
      const generatedCode = taskResult.generatedCode;
      let exportedFile: ExportedFileDto;
      if (generatedCode.operation === FileOperation.DELETE) {
        exportedFile = await this.deleteFileFromSystem(
          generatedCode.filePath,
          dto.outputDirectory,
          dto.preserveStructure !== false,
        );
      } else {
        if (dto.dryRun) {
          exportedFile = {
            filePath: generatedCode.filePath,
            exportedPath:
              dto.preserveStructure !== false
                ? path.join(dto.outputDirectory, generatedCode.filePath)
                : path.join(
                    dto.outputDirectory,
                    path.basename(generatedCode.filePath),
                  ),
            operation: generatedCode.operation,
            status: Status.SUCCESS,
            error: null,
            bytesWritten: generatedCode.content.length,
          };
        } else {
          exportedFile = await this.writeFileToSystem(
            generatedCode.filePath,
            generatedCode.content,
            dto.outputDirectory,
            dto.preserveStructure !== false,
            dto.overwriteExisting !== false,
            dto.createDirectories !== false,
            generatedCode.operation,
          );
        }
      }
      result.exportedFiles.push(exportedFile);
    }
    result.totalFiles = result.exportedFiles.length;
    result.successfulFiles = result.exportedFiles.filter(
      (f) => f.status === Status.SUCCESS,
    ).length;
    result.failedFiles = result.exportedFiles.filter(
      (f) => f.status === Status.FAILED,
    ).length;
    if (result.failedFiles === 0) {
      result.status = Status.COMPLETED;
    } else if (result.successfulFiles > 0) {
      result.status = Status.PARTIALLY_COMPLETED;
    } else {
      result.status = Status.FAILED;
    }
    result.completedAt = new Date();
    await this.persistSubmissionToFile(result);
    return result;
  }

  async commitToGit(dto: CommitDto): Promise<CommitResultDto> {
    const submissionId = randomUUID();
    const execution = this.agentService.getPlanExecutionStatus(dto.executionId);
    if (!execution) {
      throw new Error('Execution not found');
    }
    const result: CommitResultDto = {
      submissionId,
      executionId: dto.executionId,
      type: 'COMMIT',
      status: Status.PENDING,
      repositoryPath: dto.repositoryPath,
      commitHash: null,
      commitMessage: dto.commitMessage,
      branchName: dto.branchName || 'main',
      filesCommitted: [],
      totalFiles: 0,
      pushed: false,
      remote: dto.remote || 'origin',
      error: null,
      startedAt: new Date(),
      completedAt: null,
    };
    this.submissions.set(submissionId, result);
    result.status = Status.IN_PROGRESS;
    const git = simpleGit(dto.repositoryPath);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      result.status = Status.FAILED;
      result.error = 'Not a valid git repository';
      result.completedAt = new Date();
      await this.persistSubmissionToFile(result);
      return result;
    }
    try {
      if (dto.createBranch && dto.branchName) {
        await git.checkout(dto.baseBranch || 'main');
        await git.checkoutLocalBranch(dto.branchName);
      } else if (dto.branchName) {
        await git.checkout(dto.branchName);
      }
      // Export files to repository path
      const exportDto: ExportDto = {
        executionId: dto.executionId,
        outputDirectory: dto.repositoryPath,
        overwriteExisting: true,
        createDirectories: true,
        fileFilter: dto.fileFilter,
        dryRun: false,
        preserveStructure: true,
      };
      await this.exportFiles(exportDto);
      // Determine files to stage
      let filesToStage: string[];
      if (dto.fileFilter && dto.fileFilter.length > 0) {
        filesToStage = dto.fileFilter;
      } else {
        filesToStage = execution.taskResults
          .filter((tr) => tr.generatedCode)
          .map((tr) => tr.generatedCode!.filePath);
      }
      if (dto.addAll) {
        await git.add('.');
      } else {
        await git.add(filesToStage);
      }
      const authorString = this.buildAuthorString(
        dto.authorName,
        dto.authorEmail,
      );
      const commitOptions: any = {};
      if (authorString) {
        commitOptions['--author'] = authorString;
      }
      const commitResult = await git.commit(
        dto.commitMessage,
        undefined,
        commitOptions,
      );
      result.commitHash = commitResult.commit;
      result.filesCommitted = filesToStage;
      result.totalFiles = filesToStage.length;
      if (dto.push) {
        try {
          await git.push(dto.remote || 'origin', dto.branchName || 'HEAD');
          result.pushed = true;
        } catch (pushError) {
          result.error = `Commit successful but push failed: ${pushError.message}`;
        }
      }
      result.status = Status.COMPLETED;
    } catch (error) {
      result.status = Status.FAILED;
      result.error = error.message;
    }
    result.completedAt = new Date();
    await this.persistSubmissionToFile(result);
    return result;
  }

  getSubmissionStatus(
    submissionId: string,
  ): ExportResultDto | CommitResultDto | null {
    return this.submissions.get(submissionId) || null;
  }

  getAllSubmissions(): (ExportResultDto | CommitResultDto)[] {
    return Array.from(this.submissions.values()).sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
    );
  }

  getSubmissionsByExecutionId(
    executionId: string,
  ): (ExportResultDto | CommitResultDto)[] {
    return Array.from(this.submissions.values())
      .filter((s) => s.executionId === executionId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  private async writeFileToSystem(
    filePath: string,
    content: string,
    outputDirectory: string,
    preserveStructure: boolean,
    overwriteExisting: boolean,
    createDirectories: boolean,
    operation: string,
  ): Promise<ExportedFileDto> {
    let outputPath: string;
    if (preserveStructure) {
      outputPath = path.join(outputDirectory, filePath);
    } else {
      outputPath = path.join(outputDirectory, path.basename(filePath));
    }
    const exportedFile: ExportedFileDto = {
      filePath,
      exportedPath: outputPath,
      operation: operation as any,
      status: Status.SUCCESS,
      error: null,
      bytesWritten: 0,
    };
    try {
      const exists = await fs
        .access(outputPath)
        .then(() => true)
        .catch(() => false);
      if (exists && !overwriteExisting) {
        exportedFile.status = Status.SKIPPED;
        return exportedFile;
      }
      if (createDirectories) {
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
      }
      await fs.writeFile(outputPath, content);
      const stats = await fs.stat(outputPath);
      exportedFile.bytesWritten = stats.size;
    } catch (error) {
      exportedFile.status = Status.FAILED;
      exportedFile.error = error.message;
    }
    return exportedFile;
  }

  private async deleteFileFromSystem(
    filePath: string,
    outputDirectory: string,
    preserveStructure: boolean,
  ): Promise<ExportedFileDto> {
    let outputPath: string;
    if (preserveStructure) {
      outputPath = path.join(outputDirectory, filePath);
    } else {
      outputPath = path.join(outputDirectory, path.basename(filePath));
    }
    const exportedFile: ExportedFileDto = {
      filePath,
      exportedPath: outputPath,
      operation: FileOperation.DELETE,
      status: Status.SUCCESS,
      error: null,
      bytesWritten: 0,
    };
    try {
      await fs.unlink(outputPath);
    } catch (error) {
      exportedFile.status = Status.FAILED;
      exportedFile.error = error.message;
    }
    return exportedFile;
  }

  private buildAuthorString(name?: string, email?: string): string | undefined {
    if (name && email) {
      return `${name} <${email}>`;
    }
    return undefined;
  }

  private async persistSubmissionToFile(
    submission: ExportResultDto | CommitResultDto,
  ): Promise<void> {
    try {
      await fs.mkdir(this.submissionsDirectory, { recursive: true });
      const filePath = path.join(
        this.submissionsDirectory,
        `${submission.submissionId}.json`,
      );
      await fs.writeFile(filePath, JSON.stringify(submission, null, 2));
    } catch (error) {
      this.logger.error('Error persisting submission:', error);
    }
  }

  private async loadSubmissionsFromFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.submissionsDirectory);
      for (const file of files) {
        if (path.extname(file) === '.json') {
          const filePath = path.join(this.submissionsDirectory, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const submission: ExportResultDto | CommitResultDto =
            JSON.parse(content);
          this.submissions.set(submission.submissionId, submission);
        }
      }
    } catch (error) {
      // ignore
    }
  }
}
