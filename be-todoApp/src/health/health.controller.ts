import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
// mongoose is CommonJS: in this ESM project, runtime values (ConnectionStates)
// must come from the default export; Connection is only needed as a type.
import mongoose from 'mongoose';
import type { Connection } from 'mongoose';

const { ConnectionStates } = mongoose;
import { MESSAGE } from '../core/constants/messages.constants.js';
import type { TApiResponse } from '../core/types/response.js';

type THealth = {
  status: 'ok' | 'degraded';
  database: string;
  uptimeSeconds: number;
  timestamp: string;
};

// GET /api/health — used by the keep-alive ping and by uptime monitors.
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly _connection: Connection) {}

  @Get()
  check(): TApiResponse<THealth> {
    const connected =
      this._connection.readyState === ConnectionStates.connected;
    return {
      message: connected ? MESSAGE.HEALTH.OK : MESSAGE.HEALTH.DEGRADED,
      data: {
        status: connected ? 'ok' : 'degraded',
        database: ConnectionStates[this._connection.readyState],
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    };
  }
}
