import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';  
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createReportDto: CreateReportDto, @Request() req) {
    return this.reportService.create(createReportDto, req.user.userId);
  }

  @Get()
  findAll(@Request() req, @Query('period') period?: string, @Query('category') category?: string) {
    return this.reportService.findAll(req.user.userId, { period, category });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.reportService.findOne(id, req.user.userId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateReportDto: UpdateReportDto, @Request() req) {
    return this.reportService.update(id, updateReportDto, req.user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req) {
    return this.reportService.remove(id, req.user.userId);
  }

  @Get(':id/export')
  async exportReport(
    @Param('id') id: string,
    @Query('format') format: 'pdf' | 'excel' = 'pdf',
    @Res() res: Response,
    @Request() req,
  ) {
    const buffer = await this.reportService.exportReport(id, format, req.user.userId);
    const filename = `report_${id}.${format}`;
    res.set({
      'Content-Type': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }
}