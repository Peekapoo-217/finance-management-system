import { Controller, Get } from '@nestjs/common';

@Controller('report')
export class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}