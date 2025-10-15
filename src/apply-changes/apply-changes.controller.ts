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
import { ApplyChangesService } from './apply-changes.service';
import {
  ApplyChangesDto,
  RollbackDto,
  ApplicationResultDto,
  RollbackResultDto,
} from './dto';

@Controller('apply-changes')
export class ApplyChangesController {
  private readonly logger = new Logger(ApplyChangesController.name);
  constructor(private readonly applyChangesService: ApplyChangesService) {}

  @Post('apply')
  @HttpCode(201)
  async applyChanges(
    @Body() dto: ApplyChangesDto,
  ): Promise<ApplicationResultDto> {
    return this.applyChangesService.applyExecution(dto);
  }

  @Post('rollback')
  @HttpCode(200)
  async rollback(@Body() dto: RollbackDto): Promise<RollbackResultDto> {
    return this.applyChangesService.rollback(dto);
  }

  @Get('status/:id')
  getStatus(@Param('id') id: string): ApplicationResultDto {
    const result = this.applyChangesService.getApplicationStatus(id);
    if (!result) {
      throw new NotFoundException('Application not found');
    }
    return result;
  }

  @Get('list')
  getAllApplications(): ApplicationResultDto[] {
    return this.applyChangesService.getAllApplications();
  }

  @Get('execution/:executionId')
  getApplicationsByExecution(
    @Param('executionId') executionId: string,
  ): ApplicationResultDto[] {
    return this.applyChangesService.getApplicationsByExecutionId(executionId);
  }
}
