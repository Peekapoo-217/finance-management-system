import { HealthCheck } from '../consul.config';

export class RegisterServiceDto {
  id: string;
  name: string;
  address: string;
  port: number;
  tags?: string[];
  meta?: Record<string, string>;
  check?: HealthCheck;
}

export class DeregisterServiceDto {
  serviceId: string;
}

export class GetServiceDto {
  serviceName: string;
}

