import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CodebaseService } from '../codebase/codebase.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { CreatePlanDto, PlanDto, PlanSummaryDto } from './dto';
import { CodebaseContextDto } from '../codebase/dto/codebase-context.dto';
import { AIProviderFactory } from '../agent/ai-provider';
import { PlanningStatus } from './planning.interface';

@Injectable()
export class PlanningService {
  private plans: Map<string, PlanDto> = new Map();
  private readonly logger = new Logger(PlanningService.name);
  private readonly plansDirectory: string = './plans';

  constructor(
    private configService: ConfigService,
    private codebaseService: CodebaseService,
    private providerFactory: AIProviderFactory,
  ) {
    this.loadPlansFromFiles()
      .then(() => {})
      .catch(() => {});
    this.logger.log('PlanningService initialized with AI provider factory');
  }

  async createPlan(dto: CreatePlanDto): Promise<PlanDto> {
    this.logger.log(' creating plan for ', { dto });
    const id = randomUUID();
    let context: CodebaseContextDto | null = null;
    if (dto.useStoredContext) {
      context = this.codebaseService.getStoredContext();
    } else if (dto.customContext) {
      context = dto.customContext;
    }
    if (!context) {
      this.logger.error('no codebase context available for ', { dto });
      throw new Error('No codebase context available');
    }

    //  TODO: use template engine
    const prompt = this.buildPrompt(
      dto.featureRequest,
      context,
      dto.additionalInstructions,
    );

    const response = await this.providerFactory.executeWithFallback(
      async (provider) => {
        this.logger.log(
          `Creating plan ${id} with provider: ${provider.getProviderName()}`,
        );
        return provider.generatePlan(prompt);
      },
    );

    const provider = this.providerFactory.getProvider();
    this.logger.log(
      `Parsing plan response using ${provider.getProviderName()} parser`,
    );
    let planData;
    try {
      planData = provider.parseStructuredResponse(response.content);
    } catch (error) {
      this.logger.warn(`Provider parsing failed: ${error.message}`);
    }

    this.logger.log(
      `Plan ${id} created successfully with provider: ${response.provider}`,
    );
    const plan: PlanDto = {
      ...planData,
      id,
      createdAt: new Date(),
      status: PlanningStatus.DRAFT,
    };
    this.plans.set(id, plan);

    if (dto.persistToFile) {
      await this.persistPlanToFile(plan);
    }
    return plan;
  }

  getPlanById(id: string): PlanDto | null {
    // TODO: database operations should be implemented here
    this.logger.log('retrieving plan by id', { id });
    return this.plans.get(id) || null;
  }

  getAllPlans(): PlanSummaryDto[] {
    // TODO: database operations should be implemented here
    this.logger.log('retrieving all plans');
    const summaries: PlanSummaryDto[] = Array.from(this.plans.values()).map(
      (plan) => ({
        id: plan.id,
        featureRequest:
          plan.featureRequest.length > 100
            ? plan.featureRequest.substring(0, 100) + '...'
            : plan.featureRequest,
        totalSteps: plan.totalSteps,
        status: plan.status,
        createdAt: plan.createdAt,
      }),
    );
    summaries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return summaries;
  }

  // this should be moved to handlebar template
  private buildPrompt(
    featureRequest: string,
    context: CodebaseContextDto,
    additionalInstructions?: string,
  ): string {
    let prompt = `You are a senior software architect tasked with creating a detailed implementation plan for the following feature request:\n\n${featureRequest}\n\n`;
    prompt += `Codebase Context:\n`;
    prompt += `- Root Path: ${context.rootPath}\n`;
    prompt += `- Total Files: ${context.totalFiles}\n`;
    prompt += `- Total Directories: ${context.totalDirectories}\n`;
    prompt += `- File Types: ${Object.entries(context.fileTypes)
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ')}\n`;
    prompt += `- Dependencies: ${context.dependencies.join(', ')}\n`;
    prompt += `- Key Files: ${context.files
      .slice(0, 10)
      .map((f) => f.path)
      .join(', ')}\n\n`;
    if (additionalInstructions) {
      prompt += `Additional Instructions: ${additionalInstructions}\n\n`;
    }
    prompt += `Please provide a structured implementation plan in JSON format with the following structure:\n`;
    prompt += `{\n`;
    prompt += `  "featureRequest": "string",\n`;
    prompt += `  "summary": "string",\n`;
    prompt += `  "steps": [\n`;
    prompt += `    {\n`;
    prompt += `      "stepNumber": number,\n`;
    prompt += `      "title": "string",\n`;
    prompt += `      "description": "string",\n`;
    prompt += `      "fileChanges": [\n`;
    prompt += `        {\n`;
    prompt += `          "filePath": "string",\n`;
    prompt += `          "operation": "CREATE" | "MODIFY" | "DELETE",\n`;
    prompt += `          "description": "string",\n`;
    prompt += `          "dependencies": ["string"]\n`;
    prompt += `        }\n`;
    prompt += `      ],\n`;
    prompt += `      "estimatedComplexity": "LOW" | "MEDIUM" | "HIGH"\n`;
    prompt += `    }\n`;
    prompt += `  ],\n`;
    prompt += `  "totalSteps": number,\n`;
    prompt += `  "estimatedEffort": "string",\n`;
    prompt += `  "considerations": ["string"]\n`;
    prompt += `}\n\n`;
    prompt += `Ensure the plan is comprehensive, modular, and follows best practices.`;
    return prompt;
  }

  private async persistPlanToFile(plan: PlanDto): Promise<void> {
    try {
      this.logger.log('saving plant to file');
      await fs.mkdir(this.plansDirectory, { recursive: true });
      const filePath = path.join(this.plansDirectory, `${plan.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(plan, null, 2));
    } catch (error) {
      this.logger.error('Error persisting plan to file:', error);
    }
  }

  private async loadPlansFromFiles(): Promise<void> {
    try {
      this.logger.log('loading plans if exists');
      const files = await fs.readdir(this.plansDirectory);
      for (const file of files) {
        if (path.extname(file) === '.json') {
          const filePath = path.join(this.plansDirectory, file);
          const content = await fs.readFile(filePath, 'utf-8');
          try {
            const plan: PlanDto = JSON.parse(content);
            this.plans.set(plan.id, plan);
          } catch (error) {
            this.logger.error(`Error parsing plan file ${file}:`, error);
          }
        }
      }
    } catch (error) {
      // this.logger.warn('error loading existing plans', { error });
    }
  }
}
