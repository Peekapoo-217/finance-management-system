import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const Consul = require('consul');

@Injectable()
export class ConsulClientService {
    private readonly logger = new Logger(ConsulClientService.name);
    private consul: any;

    constructor(private configService: ConfigService) {
        const consulHost = this.configService.get<string>('CONSUL_HOST', '127.0.0.1');
        const consulPort = this.configService.get<number>('CONSUL_PORT', 8500);

        this.consul = new Consul({
            host: consulHost,
            port: consulPort,
        });

        this.logger.log(`Consul client connected to ${consulHost}:${consulPort}`);
    }

    async resolveService(serviceName: string): Promise<string> {
        try {
            const healthResult = await this.consul.health.service({
                service: serviceName,
                passing: true,
            });

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

            const randomIndex = Math.floor(Math.random() * validInstances.length);
            const selectedInstance = validInstances[randomIndex];
            const service = selectedInstance.Service;

            const address = service.Address || service.ServiceAddress;
            const port = service.Port;

            const url = `http://${address}:${port}`;

            this.logger.log(
                `Resolved ${serviceName} -> ${url} (${randomIndex + 1}/${validInstances.length} available instances)`
            );

            return url;
        } catch (error) {
            this.logger.error(
                `Failed to resolve service ${serviceName} from Consul registry: ${error.message}`
            );
            throw error;
        }
    }

    async getServiceInstances(serviceName: string): Promise<any[]> {
        const result = await this.consul.catalog.service.nodes(serviceName);
        return result;
    }

    getConsulClient(): any {
        return this.consul;
    }
}