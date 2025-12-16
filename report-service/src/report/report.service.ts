import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';  
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';  
import { Report } from '../database/entities/report.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import * as PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';

interface ReportFilters {
  period?: string;
  category?: string;
}

@Injectable()
export class ReportService {
  private readonly gatewayUrl = 'http://localhost:3100';  // API Gateway

  constructor(
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    private httpService: HttpService,
  ) {}

  async create(createReportDto: CreateReportDto, userId: string): Promise<Report> {
    // Fetch transactions từ Transaction Service qua Gateway (type response)
    const transactionRes: AxiosResponse<any[]> = await firstValueFrom(
      this.httpService.get(`${this.gatewayUrl}/transaction/transactions`, {
        params: { userId, period: createReportDto.period },
        headers: { Authorization: 'Bearer dummy-token' }, 
      }),
    );
    const transactions = transactionRes.data;  

    // Fetch budgets từ Budget Service (type response)
    const budgetRes: AxiosResponse<any[]> = await firstValueFrom(
      this.httpService.get(`${this.gatewayUrl}/budget/status`, {
        params: { userId, category: createReportDto.category },
        headers: { Authorization: 'Bearer dummy-token' },
      }),
    );
    const budgets = budgetRes.data;  

    // Aggregate data
    const totalIncome = transactions.filter(t => t.type === 'thu').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'chi').reduce((sum, t) => sum + t.amount, 0);
    const categories = budgets.reduce((acc, b) => ({ ...acc, [b.category]: b.usedAmount }), {});

    const dataJson = JSON.stringify({
      totalIncome,
      totalExpense,
      categories,
      charts: { pie: 'pie data JSON', bar: 'bar data JSON' },
    });

    const report = this.reportRepository.create({
      userId,
      period: createReportDto.period,
      dataJson,
      generatedDate: new Date(),
    });
    return this.reportRepository.save(report);
  }

  async findAll(userId: string, filters?: ReportFilters): Promise<Report[]> {
    const where: any = { userId };
    if (filters?.period) where.period = filters.period;
    if (filters?.category) where.category = filters.category;  
    return this.reportRepository.find({ where });
  }

  async findOne(id: string, userId: string): Promise<Report> {
    const report = await this.reportRepository.findOne({ where: { id, userId } });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    report.dataJson = JSON.parse(report.dataJson);
    return report;
  }

  async update(id: string, updateReportDto: UpdateReportDto, userId: string): Promise<Report> {
    await this.findOne(id, userId);
    await this.reportRepository.update({ id, userId }, updateReportDto);
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.reportRepository.delete({ id, userId });
    if (result.affected === 0) {
      throw new NotFoundException('Report not found');
    }
  }

  async exportReport(id: string, format: 'pdf' | 'excel', userId: string): Promise<Buffer> {
    const report = await this.findOne(id, userId);
    const data = JSON.parse(report.dataJson);

    if (format === 'pdf') {
      return new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument();
        const chunks: Uint8Array[] = [];
        doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        doc.fontSize(25).text(`Report for Period: ${report.period}`, 100, 100);
        doc.text(`Total Income: ${data.totalIncome} VND`);
        doc.text(`Total Expense: ${data.totalExpense} VND`);
        doc.end();
      });
    } else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Report');
      worksheet.addRow(['Period', report.period]);
      worksheet.addRow(['Total Income', data.totalIncome]);
      worksheet.addRow(['Total Expense', data.totalExpense]);
      Object.entries(data.categories).forEach(([cat, amt]) => worksheet.addRow([cat, amt]));
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer as unknown as Buffer;
    }
    throw new BadRequestException('Unsupported format');
  }
}