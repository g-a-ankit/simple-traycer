import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CodebaseService } from '../codebase/codebase.service';
import { PlanningService } from '../planning/planning.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  ExecuteTaskDto,
  ExecutePlanDto,
  GeneratedCodeDto,
  TaskResultDto,
  PlanExecutionResultDto,
} from './dto';
import { AIProviderFactory } from './ai-provider';
import { AIProviderOptions } from './ai-provider/ai-provider.interface';
import { Status } from 'src/common/enum';

@Injectable()
export class AgentService {
  private tasks: Map<string, TaskResultDto> = new Map();
  private planExecutions: Map<string, PlanExecutionResultDto> = new Map();
  private readonly logger = new Logger(AgentService.name);
  private readonly tasksDirectory: string = './tasks';
  private readonly executionsDirectory: string = './executions';

  constructor(
    private configService: ConfigService,
    private codebaseService: CodebaseService,
    private planningService: PlanningService,
    private providerFactory: AIProviderFactory,
  ) {
    this.loadTasksFromFiles()
      .then(() => {})
      .catch(() => {});
    this.loadExecutionsFromFiles()
      .then(() => {})
      .catch(() => {});
    this.logger.log('AgentService initialized with AI provider factory');
  }

  async executeTask(dto: ExecuteTaskDto): Promise<TaskResultDto> {
    this.logger.log('executing task ', { dto });
    const taskId = randomUUID();
    const task: TaskResultDto = {
      taskId,
      taskDescription: dto.taskDescription,
      status: Status.PENDING,
      generatedCode: null,
      error: null,
      startedAt: new Date(),
      completedAt: null,
      executionTimeMs: null,
    };
    this.tasks.set(taskId, task);
    task.status = Status.IN_PROGRESS;
    try {
      let context: any = null;
      if (dto.useStoredContext) {
        context = this.codebaseService.getStoredContext();
      } else {
        context = dto.codebaseContext;
      }
      // TODO: implement this using handlebar template engine
      const prompt = this.buildTaskPrompt(
        dto.taskDescription,
        dto.filePath,
        dto.operation,
        context,
      );
      const providerOptions: AIProviderOptions = {
        temperature: dto.temperature,
        maxTokens: dto.maxTokens,
        model: dto.model,
      };
      const response = await this.providerFactory.executeWithFallback(
        async (provider) => {
          this.logger.log(
            `Executing task ${taskId} with provider: ${provider.getProviderName()}`,
          );
          return provider.generateCode(prompt, providerOptions);
        },
      );
      const provider = this.providerFactory.getProvider();
      this.logger.log(
        `Parsing code generation response using ${provider.getProviderName()} parser`,
      );
      let parsed;
      try {
        parsed = provider.parseStructuredResponse(response.content);
      } catch (error) {
        this.logger.warn(
          `Provider parsing failed, falling back to generic parser: ${error.message}`,
        );
        parsed = this.parseCodeGenerationResponse(response.content);
      }
      this.logger.log(
        `Task ${taskId} completed successfully with provider: ${response.provider}`,
      );
      const generatedCode: GeneratedCodeDto = {
        filePath: dto.filePath,
        operation: dto.operation,
        content: parsed.content,
        language: this.detectLanguage(dto.filePath),
        explanation: parsed.explanation,
        dependencies: parsed.dependencies,
      };
      task.generatedCode = generatedCode;
      task.status = Status.COMPLETED;
      task.completedAt = new Date();
      task.executionTimeMs =
        task.completedAt.getTime() - task.startedAt.getTime();
      if (dto.persistToFile) {
        await this.persistTaskToFile(task);
      }
    } catch (error) {
      task.status = Status.FAILED;
      task.error = error.message;
      task.completedAt = new Date();
      task.executionTimeMs =
        task.completedAt.getTime() - task.startedAt.getTime();
    }
    return task;
  }

  async executePlan(dto: ExecutePlanDto): Promise<PlanExecutionResultDto> {
    const executionId = randomUUID();
    const plan = this.planningService.getPlanById(dto.planId);
    if (!plan) {
      this.logger.error('plan not found', { dto });
      throw new Error('Plan not found');
    }
    const execution: PlanExecutionResultDto = {
      executionId,
      planId: dto.planId,
      status: Status.PENDING,
      taskResults: [],
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      startedAt: new Date(),
      completedAt: null,
      progress: 0,
    };
    this.planExecutions.set(executionId, execution);
    execution.status = Status.IN_PROGRESS;
    const stepsToExecute = dto.stepNumbers
      ? (plan.steps.filter((step) =>
          dto?.stepNumbers?.includes(step.stepNumber),
        ) as any)
      : plan.steps;
    const allTasks: Promise<TaskResultDto>[] = [];
    for (const step of stepsToExecute) {
      for (const fileChange of step.fileChanges) {
        const taskDto: ExecuteTaskDto = {
          taskDescription: `${step.title}: ${fileChange.description}`,
          filePath: fileChange.filePath,
          operation: fileChange.operation as any,
          context: {},
          codebaseContext: null as any,
          useStoredContext: true,
          persistToFile: false,
        };
        if (!dto.dryRun) {
          allTasks.push(this.executeTask(taskDto));
        } else {
          const simulatedTask: TaskResultDto = {
            taskId: randomUUID(),
            taskDescription: taskDto.taskDescription,
            status: Status.COMPLETED,
            generatedCode: {
              filePath: taskDto.filePath,
              operation: taskDto.operation,
              content: '// Simulated code',
              language: this.detectLanguage(taskDto.filePath),
              explanation: 'Simulated execution',
              dependencies: [],
            },
            error: null,
            startedAt: new Date(),
            completedAt: new Date(),
            executionTimeMs: 0,
          };
          allTasks.push(Promise.resolve(simulatedTask));
        }
      }
    }
    if (dto.parallelExecution) {
      execution.taskResults = await Promise.all(allTasks);
    } else {
      execution.taskResults = [];
      for (const taskPromise of allTasks) {
        execution.taskResults.push(await taskPromise);
      }
    }
    execution.totalTasks = execution.taskResults.length;
    execution.completedTasks = execution.taskResults.filter(
      (t) => t.status === Status.COMPLETED,
    ).length;
    execution.failedTasks = execution.taskResults.filter(
      (t) => t.status === Status.FAILED,
    ).length;
    if (execution.failedTasks === 0) {
      execution.status = Status.COMPLETED;
    } else if (execution.completedTasks > 0) {
      execution.status = Status.PARTIALLY_COMPLETED;
    } else {
      execution.status = Status.FAILED;
    }
    execution.completedAt = new Date();
    execution.progress =
      (execution.completedTasks / execution.totalTasks) * 100;
    if (dto.persistToFile) {
      await this.persistExecutionToFile(execution);
    }
    return execution;
  }

  getStatus(taskId: string): TaskResultDto | null {
    this.logger.log('getting task for ', { taskId });
    return this.tasks.get(taskId) || null;
  }

  getPlanExecutionStatus(executionId: string): PlanExecutionResultDto | null {
    this.logger.log('getting plan execution status for ', { executionId });
    return this.planExecutions.get(executionId) || null;
  }

  getAllTasks(): TaskResultDto[] {
    this.logger.log('getting all tasks ');
    return Array.from(this.tasks.values()).sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
    );
  }

  getAllExecutions(): PlanExecutionResultDto[] {
    this.logger.log('getting all executions ');
    return Array.from(this.planExecutions.values()).sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
    );
  }

  // TODO: implement this using handlebars
  private buildTaskPrompt(
    taskDescription: string,
    filePath: string,
    operation: string,
    context: any,
  ): string {
    let prompt = `You are an expert software developer. Your task is to generate code for the following:\n\n`;
    prompt += `Task Description: ${taskDescription}\n`;
    prompt += `File Path: ${filePath}\n`;
    prompt += `Operation: ${operation}\n\n`;
    if (context) {
      prompt += `Codebase Context:\n${JSON.stringify(context, null, 2)}\n\n`;
    }
    prompt += `Please generate the code and provide a JSON response with:\n`;
    prompt += `{\n`;
    prompt += `  "content": "the generated code",\n`;
    prompt += `  "explanation": "explanation of changes",\n`;
    prompt += `  "dependencies": ["list of new dependencies"]\n`;
    prompt += `}\n`;
    return prompt;
  }

  private parseCodeGenerationResponse(response: string): {
    content: string;
    explanation: string;
    dependencies: string[];
  } {
    try {
      const parsed = JSON.parse(response);
      return {
        content: parsed.content || '',
        explanation: parsed.explanation || '',
        dependencies: parsed.dependencies || [],
      };
    } catch {
      return {
        content: response,
        explanation: 'Generated code',
        dependencies: [],
      };
    }
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.ts':
        return 'typescript';
      case '.js':
        return 'javascript';
      default:
        return 'unknown';
    }
  }

  private async persistTaskToFile(task: TaskResultDto): Promise<void> {
    try {
      await fs.mkdir(this.tasksDirectory, { recursive: true });
      const filePath = path.join(this.tasksDirectory, `${task.taskId}.json`);
      await fs.writeFile(filePath, JSON.stringify(task, null, 2));
    } catch (error) {
      console.error('Error persisting task:', error);
    }
  }

  private async persistExecutionToFile(
    execution: PlanExecutionResultDto,
  ): Promise<void> {
    try {
      await fs.mkdir(this.executionsDirectory, { recursive: true });
      const filePath = path.join(
        this.executionsDirectory,
        `${execution.executionId}.json`,
      );
      await fs.writeFile(filePath, JSON.stringify(execution, null, 2));
    } catch (error) {
      console.error('Error persisting execution:', error);
    }
  }

  private async loadTasksFromFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.tasksDirectory);
      for (const file of files) {
        if (path.extname(file) === '.json') {
          const filePath = path.join(this.tasksDirectory, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const task: TaskResultDto = JSON.parse(content);
          this.tasks.set(task.taskId, task);
        }
      }
    } catch (error) {
      // ignore
    }
  }

  private async loadExecutionsFromFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.executionsDirectory);
      for (const file of files) {
        if (path.extname(file) === '.json') {
          const filePath = path.join(this.executionsDirectory, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const execution: PlanExecutionResultDto = JSON.parse(content);
          this.planExecutions.set(execution.executionId, execution);
        }
      }
    } catch (error) {
      // ignore
    }
  }
}
