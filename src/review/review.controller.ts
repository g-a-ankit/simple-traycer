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
import { ReviewService } from './review.service';
import {
  SubmitFeedbackDto,
  IterateDto,
  ReviewSessionDto,
  IterationResultDto,
} from './dto';

@Controller('review')
export class ReviewController {
  private readonly logger = new Logger(ReviewController.name);
  constructor(private readonly reviewService: ReviewService) {}

  @Get('diff/:planId')
  @HttpCode(200)
  async getDiff(@Param('planId') planId: string): Promise<ReviewSessionDto> {
    this.logger.log('generating diff for plan', { planId });
    let review = this.reviewService.getDiffByPlanId(planId);
    if (!review) {
      review = await this.reviewService.generateDiff(planId);
    }
    return review;
  }

  @Post('feedback')
  @HttpCode(200)
  async submitFeedback(
    @Body() dto: SubmitFeedbackDto,
  ): Promise<ReviewSessionDto> {
    this.logger.log('submittign feedbacl ', { dto });
    return this.reviewService.submitFeedback(dto);
  }

  @Post('iterate')
  @HttpCode(201)
  async iterate(@Body() dto: IterateDto): Promise<IterationResultDto> {
    return this.reviewService.iterate(dto);
  }

  @Get('session/:reviewId')
  getReviewSession(@Param('reviewId') reviewId: string): ReviewSessionDto {
    const review = this.reviewService.getReviewById(reviewId);
    if (!review) {
      throw new NotFoundException('Review session not found');
    }
    return review;
  }

  @Get('list')
  getAllReviews(): ReviewSessionDto[] {
    return this.reviewService.getAllReviews();
  }
}
