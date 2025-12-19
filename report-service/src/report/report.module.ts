import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ReportController } from './report.controller';
import { ReportEventsController } from './report-events.controller';
import { ReportService } from './report.service';
import { Report } from '../database/entities/report.entity';
import { ConsulClientService } from '../consul/consul-client.service';
import { AuthServiceGuard } from '../auth/guards/auth-service.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Report]),
    HttpModule,  
  ],
  controllers: [ReportController, ReportEventsController],
  providers: [ReportService, ConsulClientService, AuthServiceGuard],
  exports: [ReportService],
})
export class ReportModule {}