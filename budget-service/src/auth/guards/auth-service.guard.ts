import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConsulClientService } from '../../consul/consul-client.service';

@Injectable()
export class AuthServiceGuard implements CanActivate {
  private readonly logger = new Logger(AuthServiceGuard.name);

  constructor(
    private httpService: HttpService,
    private consulClient: ConsulClientService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Resolve auth-service URL từ Consul
      const authServiceUrl = await this.consulClient.resolveService('auth-service');
      
      // Gọi auth-service để validate token
      const response = await firstValueFrom(
        this.httpService.get(`${authServiceUrl}/auth/validate`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );

      // Nếu token hợp lệ, set user vào request
      if (response.data && response.data.valid) {
        request.user = response.data.user;
        return true;
      }

      throw new UnauthorizedException('Invalid token');
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      this.logger.error(`Failed to validate token with auth-service: ${error.message}`);
      throw new UnauthorizedException('Authentication service unavailable');
    }
  }
}

