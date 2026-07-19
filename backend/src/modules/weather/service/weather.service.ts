import { ExternalServiceError, ValidationError } from '@/common/errors/http.errors';
import { logger } from '@/lib/logger';
import { requestStore } from '@/lib/logger/context';
import type { CurrentWeather, Forecast } from '../dto/weather.dto';
import type { IWeatherProvider } from '../interfaces/weather-provider.interface';

/** Maximum time (ms) to wait for the upstream weather provider. */
const PROVIDER_TIMEOUT_MS = 5_000;

/** Number of retries for transient failures (network / timeout errors only). */
const MAX_RETRIES = 1;

export class WeatherService {
  constructor(private readonly provider: IWeatherProvider) {}

  private validateCoordinates(latitude: number, longitude: number): void {
    if (latitude < -90 || latitude > 90) {
      throw new ValidationError('Latitude must be between -90 and 90 degrees');
    }
    if (longitude < -180 || longitude > 180) {
      throw new ValidationError('Longitude must be between -180 and 180 degrees');
    }
  }

  /**
   * Runs `fn` with a timeout of PROVIDER_TIMEOUT_MS.
   * Retries up to MAX_RETRIES times on transient errors (network / timeout).
   * Does NOT retry on structured provider errors (e.g. 4xx from upstream).
   */
  private async callWithResiliency<T>(
    fn: () => Promise<T>,
    coords?: { lat: number; lng: number }
  ): Promise<T> {
    let lastErr: unknown;
    const store = requestStore.getStore();

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Weather provider request timed out')),
            PROVIDER_TIMEOUT_MS
          )
        );
        return await Promise.race([fn(), timeoutPromise]);
      } catch (err) {
        lastErr = err;
        // Only retry on network / timeout errors, not on structured provider responses.
        const isTransient =
          err instanceof Error &&
          (err.message.includes('timed out') ||
            err.message.includes('ECONNREFUSED') ||
            err.message.includes('ENOTFOUND') ||
            err.message.includes('network'));

        if (isTransient && attempt < MAX_RETRIES) {
          logger.warn(
            {
              traceId: store?.requestId,
              attempt: attempt + 1,
              coordinates: coords,
              error: err instanceof Error ? err.message : String(err),
            },
            'Weather provider request failed. Retrying...'
          );
          // Small backoff before retry (100ms * attempt).
          await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
        } else {
          break;
        }
      }
    }

    logger.error(
      {
        traceId: store?.requestId,
        coordinates: coords,
        error: lastErr instanceof Error ? lastErr.message : String(lastErr),
      },
      'Weather provider request failed after all attempts.'
    );

    throw new ExternalServiceError(
      `Weather provider unavailable: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
      undefined,
      lastErr instanceof Error ? lastErr : undefined
    );
  }

  public async getCurrentWeather(latitude: number, longitude: number): Promise<CurrentWeather> {
    this.validateCoordinates(latitude, longitude);
    return this.callWithResiliency(() => this.provider.getCurrentWeather(latitude, longitude), {
      lat: latitude,
      lng: longitude,
    });
  }

  public async getForecast(latitude: number, longitude: number, days = 3): Promise<Forecast[]> {
    this.validateCoordinates(latitude, longitude);
    if (days < 1 || days > 16) {
      throw new ValidationError('Forecast days must be between 1 and 16 days');
    }
    return this.callWithResiliency(() => this.provider.getForecast(latitude, longitude, days), {
      lat: latitude,
      lng: longitude,
    });
  }
}
