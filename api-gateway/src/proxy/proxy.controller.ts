import { All, Controller, Req, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { ProxyService } from './proxy.service';

@Controller()
export class ProxyController {
    private readonly logger = new Logger(ProxyController.name);

    constructor(private readonly proxyService: ProxyService) { }

    @All('*')
    async forwardRequest(@Req() req: Request) {
        try {
            const { serviceName, targetPath } = this.parseRequest(req.url);

            this.logger.log(`Routing ${req.method} ${req.url} -> ${serviceName}${targetPath}`);

            return await this.proxyService.forwardRequest(
                serviceName,
                targetPath,
                req.method,
                req.headers,
                req.body,
                req.query,
            );
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                error.message || 'Failed to forward request',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    private parseRequest(url: string): { serviceName: string; targetPath: string } {
        const [path, queryString] = url.split('?');
        const segments = path.split('/').filter(segment => segment.length > 0);

        if (segments.length === 0) {
            throw new HttpException(
                'Invalid request path. Expected format: /{service-prefix}/...',
                HttpStatus.BAD_REQUEST,
            );
        }

        const prefix = segments[0];
        const serviceName = `${prefix}-service`;

        // Remove service prefix and reconstruct path
        const remainingSegments = segments.slice(1);
        const targetPath = '/' + prefix + (remainingSegments.length > 0 ? '/' + remainingSegments.join('/') : '');
        
        // Add query string back if exists
        const finalPath = queryString ? `${targetPath}?${queryString}` : targetPath;

        return { serviceName, targetPath: finalPath };
    }
}
