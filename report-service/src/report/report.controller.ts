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
import { AuthServiceGuard } from '../auth/guards/auth-service.guard';

@Controller('reports')
@UseGuards(AuthServiceGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createReportDto: CreateReportDto, @Request() req) {
    const authToken = req.headers.authorization;
    const userId = req.user?.userId || req.user?.id;
    return this.reportService.create(createReportDto, userId, authToken);
  }

  @Get()
  findAll(@Request() req, @Query('period') period?: string, @Query('category') category?: string) {
    const userId = req.user?.userId || req.user?.id;
    return this.reportService.findAll(userId, { period, category });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    const userId = req.user?.userId || req.user?.id;
    return this.reportService.findOne(id, userId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateReportDto: UpdateReportDto, @Request() req) {
    const userId = req.user?.userId || req.user?.id;
    return this.reportService.update(id, updateReportDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req) {
    const userId = req.user?.userId || req.user?.id;
    return this.reportService.remove(id, userId);
  }

  @Get(':id/export')
  async exportReport(
    @Param('id') id: string,
    @Query('format') format: string = 'pdf',
    @Res() res: Response,
    @Request() req,
  ) {
    try {
      console.log(`[ExportController] Export request - id: ${id}, format: ${format}, type: ${typeof format}`);
      const userId = req.user?.userId || req.user?.id;
      console.log(`[ExportController] User ID: ${userId}`);
      if (!userId) {
        console.error('[ExportController] User ID is missing');
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      const formatValue = Array.isArray(format) ? format[0] : format;
      const normalizedFormat = (formatValue?.toLowerCase() || 'pdf').split(',')[0];
      console.log(`[ExportController] Normalized format: ${normalizedFormat}`);
      if (normalizedFormat !== 'pdf' && normalizedFormat !== 'excel') {
        console.error(`[ExportController] Invalid format: ${normalizedFormat}`);
        return res.status(400).json({ message: 'Invalid format. Use "pdf" or "excel"' });
      }
      
      console.log(`[ExportController] Calling reportService.exportReport`);
      const buffer = await this.reportService.exportReport(id, normalizedFormat as 'pdf' | 'excel', userId);
      console.log(`[ExportController] Buffer received, length: ${buffer.length}`);
      const filename = `report_${id}.${normalizedFormat}`;
      res.set({
        'Content-Type': normalizedFormat === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
      res.send(buffer);
      console.log(`[ExportController] Response sent successfully`);
    } catch (error: any) {
      console.error(`[ExportController] Error: ${error.message}`, error.stack);
      return res.status(400).json({ 
        message: error.message || 'Failed to export report',
        error: error.constructor.name 
      });
    }
  }
}