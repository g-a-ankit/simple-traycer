import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlanningService } from '../planning/planning.service';
import { AgentService } from '../agent/agent.service';
import { createTwoFilesPatch } from 'diff';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  SubmitFeedbackDto,
  IterateDto,
  FileDiffDto,
  FeedbackItemDto,
  IterationResultDto,
  ReviewSessionDto,
} from './dto';
import { PlanDto, PlanStepDto, FileChangeDto } from '../planning/dto';
import {
  PlanExecutionResultDto,
  TaskResultDto,
  ExecuteTaskDto,
} from '../agent/dto';
import { IterationStatus } from './review.enum';

@Injectable()
export class ReviewService {
  private reviewSessions: Map<string, ReviewSessionDto> = new Map();
  private readonly reviewsDirectory: string = './reviews';
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    private configService: ConfigService,
    private planningService: PlanningService,
    private agentService: AgentService,
  ) {
    this.loadReviewsFromFiles()
      .then(() => {})
      .catch(() => {});
  }

  async generateDiff(planId: string): Promise<ReviewSessionDto> {
    const reviewId = randomUUID();
    const plan = this.planningService.getPlanById(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }
    const executions = this.agentService
      .getAllExecutions()
      .filter((e) => e.planId === planId);
    if (executions.length === 0) {
      throw new Error('Plan has not been executed yet');
    }
    const execution = executions.sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
    )[0]; // most recent
    const reviewSession: ReviewSessionDto = {
      reviewId,
      planId,
      executionId: execution.executionId,
      fileDiffs: [],
      overallStatus: IterationStatus.PENDING_REVIEW,
      feedbackHistory: [],
      iterations: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    for (const step of plan.steps) {
      for (const fileChange of step.fileChanges) {
        const actualTask =
          execution.taskResults.find(
            (t) => t.generatedCode?.filePath === fileChange.filePath,
          ) || null;
        const fileDiff = this.compareFileChange(fileChange, actualTask);
        reviewSession.fileDiffs.push(fileDiff);
      }
    }

    const hasIssues = reviewSession.fileDiffs.some((d) => d.hasIssues);
    reviewSession.overallStatus = hasIssues
      ? IterationStatus.NEEDS_ITERATION
      : IterationStatus.APPROVED;
    this.reviewSessions.set(reviewId, reviewSession);
    await this.persistReviewToFile(reviewSession);
    return reviewSession;
  }

  getDiffByPlanId(planId: string): ReviewSessionDto | null {
    const reviews = Array.from(this.reviewSessions.values()).filter(
      (r) => r.planId === planId,
    );
    if (reviews.length === 0) return null;
    return reviews.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )[0]; // most recent
  }

  getReviewById(reviewId: string): ReviewSessionDto | null {
    return this.reviewSessions.get(reviewId) || null;
  }

  async submitFeedback(dto: SubmitFeedbackDto): Promise<ReviewSessionDto> {
    const review = this.getReviewById(dto.reviewId);
    if (!review) {
      throw new Error('Review session not found');
    }
    const feedbackId = randomUUID();
    const feedbackItem: FeedbackItemDto = {
      feedbackId,
      feedback: dto.feedback,
      fileSpecificFeedback: dto.fileSpecificFeedback || [],
      overallSatisfaction: dto.overallSatisfaction as any,
      submittedAt: new Date(),
    };
    review.feedbackHistory.push(feedbackItem);
    review.overallStatus = IterationStatus.IN_REVIEW;
    review.updatedAt = new Date();
    await this.persistReviewToFile(review);
    if (dto.requestIteration) {
      await this.iterate({
        reviewId: dto.reviewId,
        specificFiles: undefined,
        additionalInstructions: undefined,
        parallelExecution: false,
        persistToFile: true,
      });
    }
    return review;
  }

  async iterate(dto: IterateDto): Promise<IterationResultDto> {
    const review = this.getReviewById(dto.reviewId);
    if (!review) {
      throw new Error('Review session not found');
    }
    const iterationId = randomUUID();
    const iteration: IterationResultDto = {
      iterationId,
      reviewId: dto.reviewId,
      executionId: '',
      status: IterationStatus.PENDING,
      filesRegenerated: [],
      startedAt: new Date(),
      completedAt: null,
    };
    let filesToRegenerate: string[];
    if (dto.specificFiles && dto.specificFiles.length > 0) {
      filesToRegenerate = dto.specificFiles;
    } else {
      filesToRegenerate = review.fileDiffs
        .filter((d) => d.hasIssues)
        .map((d) => d.filePath);
    }
    const taskPromises: Promise<TaskResultDto>[] = [];
    const plan = this.planningService.getPlanById(review.planId);
    if (!plan) {
      throw new Error('Plan not found');
    }
    for (const filePath of filesToRegenerate) {
      const fileChange = plan.steps
        .flatMap((s) => s.fileChanges)
        .find((fc) => fc.filePath === filePath);
      if (!fileChange) continue;
      const enhancedDescription =
        this.buildEnhancedTaskDescription(
          fileChange.description,
          review.feedbackHistory,
          filePath,
        ) +
        (dto.additionalInstructions
          ? `\nAdditional Instructions: ${dto.additionalInstructions}`
          : '');
      const taskDto: ExecuteTaskDto = {
        taskDescription: enhancedDescription,
        filePath,
        operation: fileChange.operation as any,
        context: {},
        codebaseContext: null as any,
        useStoredContext: true,
        persistToFile: false,
      };
      taskPromises.push(this.agentService.executeTask(taskDto));
    }
    let taskResults: TaskResultDto[];
    if (dto.parallelExecution) {
      taskResults = await Promise.all(taskPromises);
    } else {
      taskResults = [];
      for (const promise of taskPromises) {
        taskResults.push(await promise);
      }
    }

    iteration.executionId = randomUUID();
    iteration.status = IterationStatus.COMPLETED;
    iteration.filesRegenerated = filesToRegenerate;
    iteration.completedAt = new Date();
    review.iterations.push(iteration);
    review.overallStatus = IterationStatus.NEEDS_ITERATION;
    review.updatedAt = new Date();
    await this.persistReviewToFile(review);
    return iteration;
  }

  getAllReviews(): ReviewSessionDto[] {
    return Array.from(this.reviewSessions.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  private compareFileChange(
    expectedChange: FileChangeDto,
    actualTask: TaskResultDto | null,
  ): FileDiffDto {
    const fileDiff: FileDiffDto = {
      filePath: expectedChange.filePath,
      operation: expectedChange.operation,
      expectedDescription: expectedChange.description,
      actualContent: null,
      diffOutput: '',
      status: IterationStatus.MATCHED,
      hasIssues: false,
    };
    if (!actualTask) {
      ((fileDiff.status = IterationStatus.MISSING),
        (fileDiff.hasIssues = true));
      fileDiff.diffOutput = 'File was not generated as expected.';
      return fileDiff;
    }
    fileDiff.actualContent = actualTask?.generatedCode?.content as any;
    const diff = this.generateUnifiedDiff(
      expectedChange.description,
      actualTask.generatedCode?.explanation as any,
      fileDiff.filePath,
    );
    fileDiff.diffOutput = diff;
    if (diff.trim() === '') {
      fileDiff.status = IterationStatus.MATCHED;
      fileDiff.hasIssues = false;
    } else {
      fileDiff.status = IterationStatus.MODIFIED;
      fileDiff.hasIssues = true;
    }
    return fileDiff;
  }

  private generateUnifiedDiff(
    expected: string,
    actual: string,
    filePath: string,
  ): string {
    return createTwoFilesPatch(filePath, filePath, expected, actual);
  }

  private buildEnhancedTaskDescription(
    originalDescription: string,
    feedbackItems: FeedbackItemDto[],
    filePath: string,
  ): string {
    let description = originalDescription;
    for (const feedback of feedbackItems) {
      description += `\nUser Feedback: ${feedback.feedback}`;
      const fileFeedback = feedback.fileSpecificFeedback.find(
        (f) => f.filePath === filePath,
      );
      if (fileFeedback) {
        description += `\nFile-specific Feedback: ${fileFeedback.feedback}`;
      }
    }
    return description;
  }

  private async persistReviewToFile(review: ReviewSessionDto): Promise<void> {
    try {
      await fs.mkdir(this.reviewsDirectory, { recursive: true });
      const filePath = path.join(
        this.reviewsDirectory,
        `${review.reviewId}.json`,
      );
      await fs.writeFile(filePath, JSON.stringify(review, null, 2));
    } catch (error) {
      this.logger.error('Error persisting review:', error);
    }
  }

  private async loadReviewsFromFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.reviewsDirectory);
      for (const file of files) {
        if (path.extname(file) === '.json') {
          const filePath = path.join(this.reviewsDirectory, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const review: ReviewSessionDto = JSON.parse(content);
          this.reviewSessions.set(review.reviewId, review);
        }
      }
    } catch (error) {
      // this.logger.warn("failed to load reviews from file")
    }
  }
}
