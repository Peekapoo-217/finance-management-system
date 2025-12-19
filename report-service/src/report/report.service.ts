import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';  
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';  
import { Report } from '../database/entities/report.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ConsulClientService } from '../consul/consul-client.service';
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { PassThrough } = require('stream');

interface ReportFilters {
  period?: string;
  category?: string;
}

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    private httpService: HttpService,
    private consulClient: ConsulClientService,
  ) {}

  async create(createReportDto: CreateReportDto, userId: string, authToken?: string): Promise<Report> {
    try {
      const transactionServiceUrl = await this.consulClient.resolveService('transaction-service');
      const budgetServiceUrl = await this.consulClient.resolveService('budget-service');

      const transactionRes: AxiosResponse<any[]> = await firstValueFrom(
        this.httpService.get(`${transactionServiceUrl}/transactions`, {
          headers: { 
            Authorization: authToken || 'Bearer dummy-token',
            'Content-Type': 'application/json',
          }, 
        }),
      );
      const allTransactions = transactionRes.data || [];
      
      
      let transactions = allTransactions;

      if (createReportDto.category) {
        transactions = transactions.filter((t: any) => 
          t.category?.name === createReportDto.category
        );
      }

      const budgetRes: AxiosResponse<any[]> = await firstValueFrom(
        this.httpService.get(`${budgetServiceUrl}/budgets`, {
          headers: { 
            Authorization: authToken || 'Bearer dummy-token',
            'Content-Type': 'application/json',
          },
        }),
      );
      let budgets = budgetRes.data || [];
      
      if (budgets.length > 0) {
      }
      
      if (createReportDto.category) {
        budgets = budgets.filter((b: any) => {
          const categoryName = b.category?.name || '';
          return categoryName === createReportDto.category;
        });
      }
      

      const totalIncome = transactions
        .filter((t: any) => t.category?.type === 'income')
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      
      const totalExpense = transactions
        .filter((t: any) => t.category?.type === 'expense')
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

      const categoryExpenseData = transactions
        .filter((t: any) => t.category?.type === 'expense')
        .reduce((acc: any, t: any) => {
          const categoryName = t.category?.name || 'Khác';
          const existing = acc.find((item: any) => item.name === categoryName);
          if (existing) {
            existing.value += Number(t.amount || 0);
          } else {
            acc.push({ name: categoryName, value: Number(t.amount || 0) });
          }
          return acc;
        }, []);

      const monthlyComparison = this.calculateMonthlyData(transactions, createReportDto.category);
      const trendData = this.calculateTrendData(transactions, createReportDto.category);

      const budgetStatus = budgets.map((b: any) => ({
        category: b.category?.name || 'N/A',
        limitAmount: Number(b.limitAmount || 0),
        spentAmount: Number(b.spentAmount || 0),
        percentage: b.limitAmount > 0 
          ? (Number(b.spentAmount || 0) / Number(b.limitAmount)) * 100 
          : 0,
      }));

      const dataJson = JSON.stringify({
        totalIncome,
        totalExpense,
        savings: totalIncome - totalExpense,
        categoryExpenseData,
        monthlyComparison,
        trendData,
        budgetStatus,
        category: createReportDto.category || 'all',
        generatedAt: new Date().toISOString(),
      });

      const periodForStorage = createReportDto.category || 'all';
      
      const report = this.reportRepository.create({
        userId,
        period: periodForStorage,
        dataJson,
        generatedDate: new Date(),
      });
      
      const savedReport = await this.reportRepository.save(report);
      return savedReport;
    } catch (error) {
      this.logger.error(`Failed to create report: ${error.message}`, error.stack);
      throw error;
    }
  }

  private calculateMonthlyData(transactions: any[], category?: string): any[] {
    const now = new Date();
    const months: any[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = `T${date.getMonth() + 1}`;
      
      const monthTransactions = transactions.filter((t: any) => {
        const tDate = new Date(t.transactionDate);
        return tDate.getFullYear() === date.getFullYear() && 
               tDate.getMonth() === date.getMonth();
      });
      
      const income = monthTransactions
        .filter((t: any) => t.category?.type === 'income')
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      
      const expense = monthTransactions
        .filter((t: any) => t.category?.type === 'expense')
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      
      months.push({ month: monthLabel, income, expense });
    }
    
    return months;
  }

  private calculateTrendData(transactions: any[], category?: string): any[] {
    const now = new Date();
    const weeks: any[] = [];
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7) - 6);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekTransactions = transactions.filter((t: any) => {
        const tDate = new Date(t.transactionDate);
        return tDate >= weekStart && tDate <= weekEnd;
      });
      
      const expense = weekTransactions
        .filter((t: any) => t.category?.type === 'expense')
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      
      weeks.push({ name: `Tuần ${4 - i}`, amount: expense });
    }
    
    return weeks;
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
    const updateData: any = {};
    if (updateReportDto.category !== undefined) {
      updateData.period = updateReportDto.category;
    }
    if (Object.keys(updateData).length > 0) {
      await this.reportRepository.update({ id, userId }, updateData);
    }
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.reportRepository.delete({ id, userId });
    if (result.affected === 0) {
      throw new NotFoundException('Report not found');
    }
  }

  async invalidateUserReports(userId: string): Promise<void> {
    try {
      // Xóa TẤT CẢ reports cũ của user khi có transaction mới
      // Đảm bảo user phải tạo report mới để có data mới nhất
      const result = await this.reportRepository
        .createQueryBuilder()
        .delete()
        .from(Report)
        .where('userId = :userId', { userId })
        .execute();
      
      if (result.affected && result.affected > 0) {
        this.logger.log(`Invalidated ${result.affected} reports for user: ${userId} (data outdated due to new transaction)`);
      } else {
        this.logger.debug(`No reports to invalidate for user: ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to invalidate reports for user ${userId}: ${error.message}`, error.stack);
      // Không throw error để không ảnh hưởng đến event processing
    }
  }

  async exportReport(id: string, format: 'pdf' | 'excel', userId: string): Promise<Buffer> {
    try {
      const report = await this.findOne(id, userId);
      
      let data: any;
      try {
        if (typeof report.dataJson === 'string') {
          data = JSON.parse(report.dataJson);
        } else {
          data = report.dataJson;
        }
      } catch (parseError: any) {
        this.logger.error(`Failed to parse report dataJson: ${parseError.message}`, parseError.stack);
        throw new BadRequestException(`Invalid report data format: ${parseError.message}`);
      }

      if (!data) {
        this.logger.error('Report data is empty');
        throw new BadRequestException('Report data is empty');
      }

      const normalizedFormat = (format || 'pdf').toLowerCase();
      
      if (normalizedFormat === 'pdf') {
        return new Promise<Buffer>((resolve, reject) => {
          try {
            const doc = new PDFDocument({ margin: 50 });
            const stream = new PassThrough();
            const chunks: Buffer[] = [];
            
            doc.pipe(stream);
            
            stream.on('data', (chunk: Buffer) => {
              chunks.push(chunk);
            });
            
            stream.on('end', () => {
              const buffer = Buffer.concat(chunks);
              if (buffer.length === 0) {
                reject(new Error('PDF buffer is empty'));
                return;
              }
              resolve(buffer);
            });
            
            stream.on('error', (error: Error) => {
              this.logger.error(`PDF stream error: ${error.message}`, error.stack);
              reject(error);
            });
            
            doc.on('error', (error: Error) => {
              this.logger.error(`PDF generation error: ${error.message}`, error.stack);
              reject(error);
            });

          // Header
          doc.fontSize(20)
            .text('BAO CAO TAI CHINH', 50, 50);
          
          doc.fontSize(12)
            .text('Test line 1', 50, 100)
            .text('Test line 2', 50, 120);
          
          const categoryFilter = data.category && data.category !== 'all' ? `Danh muc: ${data.category}` : 'Tat ca danh muc';
          doc.text(categoryFilter, 50, 140);
          doc.text(`Ngay tao: ${new Date(report.generatedDate).toLocaleDateString('vi-VN')}`, 50, 160);
          doc.moveDown(2);

          doc.fontSize(16)
            .text('TONG QUAN', 50, 200);
          
          doc.fontSize(12);
          const totalIncome = Number(data.totalIncome || 0).toLocaleString('vi-VN');
          const totalExpense = Number(data.totalExpense || 0).toLocaleString('vi-VN');
          const savings = Number(data.savings || 0).toLocaleString('vi-VN');
          doc.text(`Tong thu nhap: ${totalIncome} VND`, 50, 230);
          doc.text(`Tong chi tieu: ${totalExpense} VND`, 50, 250);
          doc.text(`Tiet kiem: ${savings} VND`, 50, 270);
          doc.moveDown(2);

          let yPos = 300;
          if (data.categoryExpenseData && data.categoryExpenseData.length > 0) {
            doc.fontSize(16)
              .text('CHI TIEU THEO HANG MUC', 50, yPos);
            yPos += 30;
            doc.fontSize(12);
            data.categoryExpenseData.forEach((item: any) => {
              const value = Number(item.value).toLocaleString('vi-VN');
              doc.text(`${item.name}: ${value} VND`, 50, yPos);
              yPos += 20;
            });
          }

          yPos += 20;
          if (data.budgetStatus && data.budgetStatus.length > 0) {
            doc.fontSize(16)
              .text('TINH TRANG NGAN SACH', 50, yPos);
            yPos += 30;
            doc.fontSize(12);
            data.budgetStatus.forEach((budget: any) => {
              const percentage = budget.percentage != null ? Number(budget.percentage) : 0;
              const spent = Number(budget.spentAmount || 0).toLocaleString('vi-VN');
              const limit = Number(budget.limitAmount || 0).toLocaleString('vi-VN');
              doc.text(`${budget.category || 'N/A'}: ${spent} / ${limit} VND (${percentage.toFixed(1)}%)`, 50, yPos);
              yPos += 20;
            });
          }

          doc.end();
        } catch (error: any) {
          this.logger.error(`Error creating PDF: ${error.message}`, error.stack);
          reject(error);
        }
      });
    } else if (normalizedFormat === 'excel') {
      try {
        const workbook = new ExcelJS.Workbook();
        
        // Sheet 1: Tổng quan
        const overviewSheet = workbook.addWorksheet('Tổng quan');
        overviewSheet.addRow(['BÁO CÁO TÀI CHÍNH']);
        const categoryFilter = (data.category && data.category !== 'all') ? data.category : 'Tất cả danh mục';
        overviewSheet.addRow(['Danh mục', categoryFilter]);
        overviewSheet.addRow(['Ngày tạo', new Date(report.generatedDate).toLocaleDateString('vi-VN')]);
        overviewSheet.addRow([]);
        overviewSheet.addRow(['Tổng thu nhập', Number(data.totalIncome || 0)]);
        overviewSheet.addRow(['Tổng chi tiêu', Number(data.totalExpense || 0)]);
        overviewSheet.addRow(['Tiết kiệm', Number(data.savings || 0)]);
        
        overviewSheet.getRow(1).font = { bold: true, size: 14 };
        overviewSheet.getColumn(1).width = 20;
        overviewSheet.getColumn(2).width = 20;

        if (data.categoryExpenseData && data.categoryExpenseData.length > 0) {
          const categorySheet = workbook.addWorksheet('Chi tiêu theo hạng mục');
          categorySheet.addRow(['Hạng mục', 'Số tiền']);
          data.categoryExpenseData.forEach((item: any) => {
            categorySheet.addRow([item.name, Number(item.value)]);
          });
          categorySheet.getRow(1).font = { bold: true };
          categorySheet.getColumn(1).width = 30;
          categorySheet.getColumn(2).width = 20;
        }

        if (data.monthlyComparison && data.monthlyComparison.length > 0) {
          const monthlySheet = workbook.addWorksheet('So sánh theo tháng');
          monthlySheet.addRow(['Tháng', 'Thu nhập', 'Chi tiêu']);
          data.monthlyComparison.forEach((item: any) => {
            monthlySheet.addRow([item.month, Number(item.income), Number(item.expense)]);
          });
          monthlySheet.getRow(1).font = { bold: true };
          monthlySheet.getColumn(1).width = 15;
          monthlySheet.getColumn(2).width = 20;
          monthlySheet.getColumn(3).width = 20;
        }

        if (data.budgetStatus && data.budgetStatus.length > 0) {
          const budgetSheet = workbook.addWorksheet('Ngân sách');
          budgetSheet.addRow(['Hạng mục', 'Hạn mức', 'Đã chi', 'Tỷ lệ (%)']);
          data.budgetStatus.forEach((budget: any) => {
            const percentage = budget.percentage != null ? Number(budget.percentage) : 0;
            budgetSheet.addRow([
              budget.category || 'N/A',
              Number(budget.limitAmount || 0),
              Number(budget.spentAmount || 0),
              Number(percentage.toFixed(2)),
            ]);
          });
          budgetSheet.getRow(1).font = { bold: true };
          budgetSheet.getColumn(1).width = 30;
          budgetSheet.getColumn(2).width = 20;
          budgetSheet.getColumn(3).width = 20;
          budgetSheet.getColumn(4).width = 15;
        }

        const buffer = await workbook.xlsx.writeBuffer();
        this.logger.log(`Excel buffer created, size: ${buffer.length} bytes`);
        return Buffer.from(buffer);
      } catch (excelError) {
        this.logger.error(`Failed to generate Excel file: ${excelError.message}`, excelError.stack);
        throw new BadRequestException(`Failed to generate Excel file: ${excelError.message}`);
      }
    }
    throw new BadRequestException('Unsupported format. Use "pdf" or "excel"');
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to export report: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to export report: ${error.message}`);
    }
  }
}