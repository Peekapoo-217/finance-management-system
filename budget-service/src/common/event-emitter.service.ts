import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

export interface EmitOptions {
    maxRetries?: number;
    initialDelayMs?: number;
}

@Injectable()
export class EventEmitterService {
    private readonly logger = new Logger(EventEmitterService.name);
    private readonly DEFAULT_MAX_RETRIES = 3;
    private readonly DEFAULT_INITIAL_DELAY = 1000; // 1 second

    constructor(
        @Inject('REDIS_SERVICE')
        private readonly redisClient: ClientProxy,
    ) { }

    /**
     * Emit event to Redis with retry mechanism and exponential backoff
     * @param eventName - Name of the event to emit
     * @param eventData - Event payload
     * @param options - Optional configuration for retries
     * @returns Promise<boolean> - true if success, false if all retries failed
     */
    async emitWithRetry(
        eventName: string,
        eventData: any,
        options?: EmitOptions,
    ): Promise<boolean> {
        const maxRetries = options?.maxRetries ?? this.DEFAULT_MAX_RETRIES;
        const initialDelay = options?.initialDelayMs ?? this.DEFAULT_INITIAL_DELAY;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                this.redisClient.emit(eventName, eventData);

                if (attempt === 0) {
                    this.logger.log(`Event '${eventName}' emitted successfully`);
                } else {
                    this.logger.log(
                        `Event '${eventName}' emitted successfully after ${attempt} retry(s)`,
                    );
                }

                return true;
            } catch (error) {
                const isLastAttempt = attempt === maxRetries;

                if (isLastAttempt) {
                    this.logger.error(
                        `CRITICAL: All ${maxRetries} retries failed for event '${eventName}'. Event lost!`,
                        error instanceof Error ? error.stack : String(error),
                    );
                    return false;
                }

                const delayMs = initialDelay * Math.pow(2, attempt);

                this.logger.warn(
                    `[Retry ${attempt + 1}/${maxRetries}] Failed to emit event '${eventName}'. ` +
                    `Retrying in ${delayMs}ms... Error: ${error instanceof Error ? error.message : String(error)}`,
                );

                await this.sleep(delayMs);
            }
        }

        return false;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
