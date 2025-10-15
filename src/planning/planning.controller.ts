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
import { PlanningService } from './planning.service';
import { CreatePlanDto, PlanDto, PlanSummaryDto } from './dto';

@Controller('planning')
export class PlanningController {
  private readonly logger = new Logger(PlanningController.name);
  constructor(private readonly planningService: PlanningService) {}

  @Post('create')
  @HttpCode(201)
  async createPlan(@Body() dto: CreatePlanDto): Promise<PlanDto> {
    this.logger.log('received request to create plan ', { dto });
    return this.planningService.createPlan(dto);
  }

  @Get('list')
  getAllPlans(): PlanSummaryDto[] {
    this.logger.log('received request to retrieve all plans ');
    return this.planningService.getAllPlans();
  }

  @Get(':id')
  getPlanById(@Param('id') id: string): PlanDto {
    this.logger.log('received request to retrieve plan for ', { id });
    const plan = this.planningService.getPlanById(id);
    if (!plan) {
      this.logger.error('plan not found for ', { id });
      throw new NotFoundException('Plan not found');
    }
    return plan;
  }
}
