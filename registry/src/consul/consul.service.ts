import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Consul from 'consul';
import type { ConsulConfig, ServiceConfig } from './consul.config';

@Injectable()
export class ConsulService implements OnModuleDestroy {
  private readonly logger = new Logger(ConsulService.name);
  private readonly consul: any;
  private registeredServices: Set<string> = new Set();

  constructor(private readonly config: ConsulConfig) {
    this.consul = new (Consul as any)({
      host: config.host,
      port: config.port,
      secure: config.secure || false,
      defaults: config.defaults,
    });

    this.logger.log(
      `Consul client initialized: ${config.host}:${config.port}`,
    );
  }

  /**
   * Đăng ký một service với Consul
   */
  async registerService(serviceConfig: ServiceConfig): Promise<void> {
    try {
      const registerOptions: any = {
        id: serviceConfig.id,
        name: serviceConfig.name,
        address: serviceConfig.address,
        port: parseInt(serviceConfig.port.toString(), 10),
        tags: serviceConfig.tags || [],
        meta: serviceConfig.meta || {},
      };

      // Thêm health check nếu có
      if (serviceConfig.check) {
        registerOptions.check = {
          http: serviceConfig.check.http,
          interval: serviceConfig.check.interval || '10s',
          timeout: serviceConfig.check.timeout || '5s',
          deregistercriticalserviceafter:
            serviceConfig.check.deregisterCriticalServiceAfter || '1m',
        };

        if (serviceConfig.check.tcp) {
          registerOptions.check.tcp = serviceConfig.check.tcp;
          delete registerOptions.check.http;
        }

        if (serviceConfig.check.grpc) {
          registerOptions.check.grpc = serviceConfig.check.grpc;
          delete registerOptions.check.http;
        }
      }

      await this.consul.agent.service.register(registerOptions);
      this.registeredServices.add(serviceConfig.id);
      this.logger.log(`Service registered: ${serviceConfig.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to register service ${serviceConfig.id}: ${error.message}`,
      );
      throw new Error(error.message);
    }
  }

  /**
   * Hủy đăng ký một service
   */
  async deregisterService(serviceId: string): Promise<void> {
    try {
      await this.consul.agent.service.deregister(serviceId);
      this.registeredServices.delete(serviceId);
      this.logger.log(`Service deregistered: ${serviceId}`);
    } catch (error) {
      this.logger.error(
        `Failed to deregister service ${serviceId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Lấy danh sách tất cả services
   */
  async getServices(): Promise<any> {
    try {
      const services = await this.consul.agent.service.list();
      return services;
    } catch (error) {
      this.logger.error(`Failed to get services: ${error.message}`);
      throw error;
    }
  }

  /**
   * Lấy thông tin một service theo tên
   */
  async getServiceByName(serviceName: string): Promise<any[]> {
    try {
      const services = await this.consul.health.service({
        service: serviceName,
        passing: true,
      });
      return services;
    } catch (error) {
      this.logger.error(
        `Failed to get service ${serviceName}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Lấy thông tin một service instance cụ thể
   */
  async getServiceById(serviceId: string): Promise<any> {
    try {
      const services = await this.consul.agent.service.list();
      return services[serviceId] || null;
    } catch (error) {
      this.logger.error(
        `Failed to get service ${serviceId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Kiểm tra health của Consul
   */
  async checkHealth(): Promise<boolean> {
    try {
      const leader = await this.consul.status.leader();
      return !!leader;
    } catch (error) {
      this.logger.error(`Consul health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Lấy tất cả nodes trong cluster
   */
  async getNodes(): Promise<any[]> {
    try {
      const nodes = await this.consul.catalog.node.list();
      return nodes;
    } catch (error) {
      this.logger.error(`Failed to get nodes: ${error.message}`);
      throw error;
    }
  }

  /**
   * Lấy danh sách tất cả service names
   */
  async getServiceNames(): Promise<string[]> {
    try {
      const catalog = await this.consul.catalog.service.list();
      return Object.keys(catalog);
    } catch (error) {
      this.logger.error(`Failed to get service names: ${error.message}`);
      throw error;
    }
  }

  /**
   * Watch service changes
   */
  watchService(serviceName: string, callback: (err: any, result: any) => void) {
    const watch = this.consul.watch({
      method: this.consul.health.service,
      options: {
        service: serviceName,
        passing: true,
      },
    });

    watch.on('change', (data) => {
      callback(null, data);
    });

    watch.on('error', (err) => {
      callback(err, null);
    });

    return watch;
  }

  /**
   * Cleanup khi module bị destroy
   */
  async onModuleDestroy() {
    this.logger.log('Deregistering all services...');
    for (const serviceId of this.registeredServices) {
      await this.deregisterService(serviceId);
    }
  }

  /**
   * Get raw consul client
   */
  getClient(): any {
    return this.consul;
  }
}

