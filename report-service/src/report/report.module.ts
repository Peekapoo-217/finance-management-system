import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { Report } from '../database/entities/report.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Report]),
    HttpModule,  
  ],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}