import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KEEP_ALIVE } from '../core/constants/enums.constants.js';

/**
 * Keeps a free Render instance awake.
 *
 * Render spins a free web service down after ~15 minutes without inbound
 * traffic. While the app is running, this pings its own *public* URL on an
 * interval; the request goes through Render's proxy, so it counts as traffic
 * and the instance never goes idle.
 *
 * - Enabled only when a public URL is known: KEEP_ALIVE_URL, or
 *   RENDER_EXTERNAL_URL (set automatically by Render). Off in local dev.
 * - KEEP_ALIVE_INTERVAL_MS sets the interval (default 30s, minimum 10s).
 * - KEEP_ALIVE_ENABLED=false turns it off.
 */
@Injectable()
export class KeepAliveService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly _logger = new Logger(KeepAliveService.name);
  private _timer?: NodeJS.Timeout;
  private _failing = false;

  constructor(private readonly _config: ConfigService) {}

  onApplicationBootstrap(): void {
    if (this._config.get<string>('KEEP_ALIVE_ENABLED') === 'false') return;

    const baseUrl =
      this._config.get<string>('KEEP_ALIVE_URL') ??
      this._config.get<string>('RENDER_EXTERNAL_URL');
    if (!baseUrl) {
      this._logger.log('Keep-alive disabled (no public URL configured)');
      return;
    }

    const interval = Math.max(
      KEEP_ALIVE.MIN_INTERVAL_MS,
      Number(this._config.get('KEEP_ALIVE_INTERVAL_MS')) ||
        KEEP_ALIVE.DEFAULT_INTERVAL_MS,
    );
    const url = new URL(KEEP_ALIVE.PATH, baseUrl).toString();

    this._timer = setInterval(() => void this._ping(url), interval);
    // Don't let the timer keep the process alive on shutdown.
    this._timer.unref();
    this._logger.log(`Keep-alive pinging ${url} every ${interval / 1000}s`);
  }

  onModuleDestroy(): void {
    if (this._timer) clearInterval(this._timer);
  }

  private async _ping(url: string): Promise<void> {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(KEEP_ALIVE.TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Log only state changes, not every successful ping.
      if (this._failing) this._logger.log('Keep-alive ping recovered');
      this._failing = false;
    } catch (error) {
      if (!this._failing) {
        const reason = error instanceof Error ? error.message : String(error);
        this._logger.warn(`Keep-alive ping failed: ${reason}`);
      }
      this._failing = true;
    }
  }
}
