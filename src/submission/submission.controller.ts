import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { SubmissionService } from './submission.service';
import { ExportDto, CommitDto, ExportResultDto, CommitResultDto } from './dto';

@Controller('submission')
export class SubmissionController {
  private readonly logger = new Logger(SubmissionController.name);
  constructor(private readonly submissionService: SubmissionService) {}

  @Post('export')
  @HttpCode(201)
  async exportFiles(@Body() dto: ExportDto): Promise<ExportResultDto> {
    this.logger.log('initiating export ', { dto });
    return this.submissionService.exportFiles(dto);
  }

  @Post('commit')
  @HttpCode(201)
  async commitToGit(@Body() dto: CommitDto): Promise<CommitResultDto> {
    this.logger.log('intiating commit ', { dto });
    return this.submissionService.commitToGit(dto);
  }

  @Get('status/:id')
  getStatus(@Param('id') id: string): ExportResultDto | CommitResultDto {
    const result = this.submissionService.getSubmissionStatus(id);
    if (!result) {
      throw new NotFoundException('Submission not found');
    }
    return result;
  }

  @Get('list')
  getAllSubmissions(): (ExportResultDto | CommitResultDto)[] {
    return this.submissionService.getAllSubmissions();
  }

  @Get('execution/:executionId')
  getSubmissionsByExecution(
    @Param('executionId') executionId: string,
  ): (ExportResultDto | CommitResultDto)[] {
    return this.submissionService.getSubmissionsByExecutionId(executionId);
  }
}
