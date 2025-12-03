import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ConsulService } from './consul.service';
import { RegisterServiceDto } from './dto/register-service.dto';

@Controller('consul')
export class ConsulController {
  private readonly logger = new Logger(ConsulController.name);

  constructor(private readonly consulService: ConsulService) {}

  /**
   * Health check endpoint
   */
  @Get('health')
  async checkHealth() {
    const isHealthy = await this.consulService.checkHealth();
    if (!isHealthy) {
      throw new HttpException('Consul is not healthy', HttpStatus.SERVICE_UNAVAILABLE);
    }
    return {
      status: 'healthy',
      message: 'Consul is connected and operational',
    };
  }

  /**
   * Đăng ký service mới
   */
  @Post('services/register')
  async registerService(@Body() registerDto: RegisterServiceDto) {
    try {
      await this.consulService.registerService(registerDto);
      return {
        success: true,
        message: `Service ${registerDto.id} registered successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to register service: ${error.message}`);
      throw new HttpException(
        `Failed to register service: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Hủy đăng ký service
   */
  @Delete('services/:serviceId')
  async deregisterService(@Param('serviceId') serviceId: string) {
    try {
      await this.consulService.deregisterService(serviceId);
      return {
        success: true,
        message: `Service ${serviceId} deregistered successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to deregister service: ${error.message}`);
      throw new HttpException(
        `Failed to deregister service: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Lấy tất cả services
   */
  @Get('services')
  async getAllServices() {
    try {
      const services = await this.consulService.getServices();
      return {
        success: true,
        data: services,
      };
    } catch (error) {
      this.logger.error(`Failed to get services: ${error.message}`);
      throw new HttpException(
        `Failed to get services: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Lấy service theo tên
   */
  @Get('services/name/:serviceName')
  async getServiceByName(@Param('serviceName') serviceName: string) {
    try {
      const services = await this.consulService.getServiceByName(serviceName);
      return {
        success: true,
        data: services,
      };
    } catch (error) {
      this.logger.error(`Failed to get service: ${error.message}`);
      throw new HttpException(
        `Failed to get service: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Lấy service theo ID
   */
  @Get('services/id/:serviceId')
  async getServiceById(@Param('serviceId') serviceId: string) {
    try {
      const service = await this.consulService.getServiceById(serviceId);
      if (!service) {
        throw new HttpException('Service not found', HttpStatus.NOT_FOUND);
      }
      return {
        success: true,
        data: service,
      };
    } catch (error) {
      this.logger.error(`Failed to get service: ${error.message}`);
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Lấy danh sách tên services
   */
  @Get('services/names')
  async getServiceNames() {
    try {
      const names = await this.consulService.getServiceNames();
      return {
        success: true,
        data: names,
      };
    } catch (error) {
      this.logger.error(`Failed to get service names: ${error.message}`);
      throw new HttpException(
        `Failed to get service names: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Lấy tất cả nodes
   */
  @Get('nodes')
  async getNodes() {
    try {
      const nodes = await this.consulService.getNodes();
      return {
        success: true,
        data: nodes,
      };
    } catch (error) {
      this.logger.error(`Failed to get nodes: ${error.message}`);
      throw new HttpException(
        `Failed to get nodes: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

