import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ConsulClientService {
  private readonly logger = new Logger(ConsulClientService.name);

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) { }

  async resolveService(serviceName: string): Promise<string> {
    try {
      const registryUrl = this.configService.get<string>(
        'REGISTRY_URL',
        'http://localhost:3100',
      );

      // Gọi Registry Service để resolve service
      const response = await firstValueFrom(
        this.httpService.get(`${registryUrl}/consul/services/name/${serviceName}`),
      );

      if (!response.data || !response.data.success) {
        throw new Error(`Registry Service returned unsuccessful response`);
      }

      const healthResult = response.data.data;

      if (!healthResult || healthResult.length === 0) {
        throw new Error(`No healthy instances of service ${serviceName} found in Consul registry`);
      }

      const validInstances = healthResult.filter((item: any) => {
        const service = item.Service;
        return service && (service.Address || service.ServiceAddress) && service.Port;
      });

      if (validInstances.length === 0) {
        throw new Error(`Service ${serviceName} found but no valid instances available`);
      }

      // Load balancing: chọn random instance
      const randomIndex = Math.floor(Math.random() * validInstances.length);
      const selectedInstance = validInstances[randomIndex];
      const service = selectedInstance.Service;

      const address = service.Address || service.ServiceAddress;
      const port = service.Port;

      const url = `http://${address}:${port}`;

      this.logger.log(
        `Resolved ${serviceName} -> ${url} via Registry Service (${randomIndex + 1}/${validInstances.length} available instances)`
      );

      return url;
    } catch (error) {
      this.logger.error(
        `Failed to resolve service ${serviceName} via Registry Service: ${error.message}`
      );
      throw error;
    }
  }
}

