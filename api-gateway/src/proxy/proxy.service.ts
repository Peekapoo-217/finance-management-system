import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ConsulClientService } from '../consul/consul-client.service';
import { firstValueFrom } from 'rxjs';
import axios, { AxiosRequestConfig } from 'axios';

@Injectable()
export class ProxyService {
    private readonly logger = new Logger(ProxyService.name);
    private serviceCache: Map<string, { url: string; timestamp: number }> = new Map();
    private readonly CACHE_TTL = 30000; // 30 seconds cache

    constructor(
        private httpService: HttpService,
        private configService: ConfigService,
        private consulClient: ConsulClientService,
    ) {
        this.logger.log('ProxyService initialized - Using Consul for service discovery');
        this.logger.log(`Cache TTL: ${this.CACHE_TTL}ms`);
    }

    private async getServiceUrl(serviceName: string): Promise<string> {
        const cached = this.serviceCache.get(serviceName);
        const now = Date.now();

        if (cached && now - cached.timestamp < this.CACHE_TTL) {
            return cached.url;
        }

        try {
            const url = await this.consulClient.resolveService(serviceName);
            this.serviceCache.set(serviceName, { url, timestamp: now });
            this.logger.log(`Resolved ${serviceName} from Consul: ${url}`);
            return url;
        } catch (error) {
            this.logger.error(`Failed to resolve ${serviceName} from Consul: ${error.message}`);
            this.serviceCache.delete(serviceName);

            throw new HttpException(
                `Service ${serviceName} is not available in service registry. Please ensure the service is registered in Consul.`,
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }
    }

    async forwardRequest(
        serviceName: string,
        path: string,
        method: string,
        headers?: any,
        body?: any,
        queryParams?: any,
    ): Promise<any> {
        try {
            const serviceUrl = await this.getServiceUrl(serviceName);
            const url = `${serviceUrl}${path}`;

            this.logger.log(`Forwarding ${method} request to: ${url}`);

            const cleanHeaders = { ...headers };
            delete cleanHeaders['if-modified-since'];
            delete cleanHeaders['if-none-match'];
            delete cleanHeaders['cache-control'];

            const config: AxiosRequestConfig = {
                method: method.toLowerCase() as any,
                url,
                headers: {
                    ...cleanHeaders,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache',
                },
                params: queryParams,
                validateStatus: (status) => status >= 200 && status < 400,
            };

            if (body && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
                config.data = body;
            }

            const response = await axios.request(config);

            return response.data;
        } catch (error) {
            if (error.response && error.response.status >= 400) {
                this.logger.error(`Error forwarding request to ${serviceName}: ${error.message}`);
                this.logger.error(`URL: ${error.config?.url}, Status: ${error.response.status}`);
            } else {
                this.logger.warn(`Request to ${serviceName} failed: ${error.message}`);
            }

            this.serviceCache.delete(serviceName);

            if (error.response) {
                throw new HttpException(
                    error.response.data,
                    error.response.status,
                );
            }

            throw new HttpException(
                `Service ${serviceName} is unavailable`,
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }
    }

}
