export interface ConsulConfig {
  host: string;
  port: number;
  secure?: boolean;
  defaults?: {
    token?: string;
  };
}

export interface ServiceConfig {
  id: string;
  name: string;
  address: string;
  port: number;
  tags?: string[];
  meta?: Record<string, string>;
  check?: HealthCheck;
}

export interface HealthCheck {
  http?: string;
  interval?: string;
  timeout?: string;
  deregisterCriticalServiceAfter?: string;
  tcp?: string;
  grpc?: string;
}

