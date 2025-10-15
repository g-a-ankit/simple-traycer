import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { CodebaseService } from './codebase.service';
import { AnalyzeCodebaseDto, CodebaseContextDto } from './dto';

@Controller('codebase')
export class CodebaseController {
  private logger = new Logger(CodebaseController.name);

  constructor(private readonly codebaseService: CodebaseService) {}

  @Post('analyze')
  @HttpCode(200)
  async analyzeCodebase(
    @Body() dto: AnalyzeCodebaseDto,
  ): Promise<CodebaseContextDto> {
    this.logger.log('initiating code analyse for', { dto });
    return this.codebaseService.analyzeCodebase(dto);
  }

  @Get('context')
  getContext(): CodebaseContextDto | null {
    this.logger.log('retriving stored context from memory');
    const context = this.codebaseService.getStoredContext();
    if (!context) {
      throw new NotFoundException(
        'No codebase context available. Please perform an analysis first.',
      );
    }
    return context;
  }
}
