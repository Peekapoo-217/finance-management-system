import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ReportService } from './report.service';

@Controller()
export class ReportEventsController {
  private readonly logger = new Logger(ReportEventsController.name);

  constructor(
    private readonly reportService: ReportService,
  ) {}

  @EventPattern('transaction.created')
  async handleTransactionCreated(@Payload() data: any) {
    const { userId } = data;

    this.logger.log(
      `Received transaction.created event: userId=${userId}`,
    );

    try {
      // Invalidate cache cho user này (nếu có cache)
      // Có thể thêm logic để xóa reports cũ hoặc mark as stale
      await this.reportService.invalidateUserReports(userId);
      this.logger.log(`Invalidated reports cache for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate reports: ${error.message}`, error.stack);
    }
  }

  @EventPattern('transaction.updated')
  async handleTransactionUpdated(@Payload() data: any) {
    const { userId } = data;

    this.logger.log(
      `Received transaction.updated event: userId=${userId}`,
    );

    try {
      // Invalidate cache khi có transaction được update
      await this.reportService.invalidateUserReports(userId);
      this.logger.log(`Invalidated reports cache for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate reports: ${error.message}`, error.stack);
    }
  }

  @EventPattern('transaction.deleted')
  async handleTransactionDeleted(@Payload() data: any) {
    const { userId } = data;

    this.logger.log(
      `Received transaction.deleted event: userId=${userId}`,
    );

    try {
      // Invalidate cache khi có transaction bị xóa
      await this.reportService.invalidateUserReports(userId);
      this.logger.log(`Invalidated reports cache for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate reports: ${error.message}`, error.stack);
    }
  }
}

