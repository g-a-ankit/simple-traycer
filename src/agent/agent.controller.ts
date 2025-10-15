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
import { AgentService } from './agent.service';
import {
  ExecuteTaskDto,
  ExecutePlanDto,
  TaskResultDto,
  PlanExecutionResultDto,
} from './dto';

@Controller('agent')
export class AgentController {
  private readonly logger = new Logger(AgentController.name);
  constructor(private readonly agentService: AgentService) {}

  @Post('execute-task')
  @HttpCode(201)
  async executeTask(@Body() dto: ExecuteTaskDto): Promise<TaskResultDto> {
    this.logger.log('initiating task execution ', { dto });
    return this.agentService.executeTask(dto);
  }

  @Post('execute-plan')
  @HttpCode(201)
  async executePlan(
    @Body() dto: ExecutePlanDto,
  ): Promise<PlanExecutionResultDto> {
    this.logger.log('initiating plan execution ', { dto });
    return this.agentService.executePlan(dto);
  }

  @Get('status/:taskId')
  getStatus(
    @Param('taskId') taskId: string,
  ): TaskResultDto | PlanExecutionResultDto {
    this.logger.log('getting all status for task execution ', { taskId });
    let result = this.agentService.getStatus(taskId);
    if (result) {
      return result;
    }
    result = this.agentService.getPlanExecutionStatus(taskId) as any;
    if (result) {
      return result;
    }
    this.logger.error('error getting task');
    throw new NotFoundException('Task or execution not found');
  }

  @Get('tasks')
  getAllTasks(): TaskResultDto[] {
    this.logger.log('getting all task execution ');
    return this.agentService.getAllTasks();
  }

  @Get('executions')
  getAllExecutions(): PlanExecutionResultDto[] {
    this.logger.log('getting all plan execution ');
    return this.agentService.getAllExecutions();
  }
}
