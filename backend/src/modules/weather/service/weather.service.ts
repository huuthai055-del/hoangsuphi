import type { IWeatherProvider } from '../interfaces/weather-provider.interface';
import type { CurrentWeather, Forecast } from '../dto/weather.dto';
import { ValidationError } from '@/common/errors/http.errors';

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

  public async getCurrentWeather(latitude: number, longitude: number): Promise<CurrentWeather> {
    this.validateCoordinates(latitude, longitude);
    try {
      return await this.provider.getCurrentWeather(latitude, longitude);
    } catch (error) {
      throw new ValidationError(
        `Failed to fetch current weather: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  public async getForecast(
    latitude: number,
    longitude: number,
    days = 3
  ): Promise<Forecast[]> {
    this.validateCoordinates(latitude, longitude);
    if (days < 1 || days > 16) {
      throw new ValidationError('Forecast days must be between 1 and 16 days');
    }
    try {
      return await this.provider.getForecast(latitude, longitude, days);
    } catch (error) {
      throw new ValidationError(
        `Failed to fetch weather forecast: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
