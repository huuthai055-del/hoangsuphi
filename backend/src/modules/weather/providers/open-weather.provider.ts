import type { CurrentWeather, Forecast } from '../dto/weather.dto';
import type { IWeatherProvider } from '../interfaces/weather-provider.interface';

/**
 * @stub MOCK IMPLEMENTATION — NOT PRODUCTION READY
 *
 * This class returns deterministic synthetic data computed from coordinate
 * arithmetic. It makes NO HTTP calls and uses NO real API key.
 *
 * Before deploying to production you must replace this class with a real
 * IWeatherProvider implementation (e.g. actual OpenWeather API client) and
 * update the binding in src/common/di/container.ts.
 *
 * DO NOT expose this stub to real users without disclosing that the data
 * is fabricated.
 */
export class OpenWeatherProvider implements IWeatherProvider {
  public async getCurrentWeather(latitude: number, longitude: number): Promise<CurrentWeather> {
    // Return mock data calculated based on coordinates (deterministic mock)
    const baseTemp = 20 + (latitude % 10);
    return {
      temperature: Math.round(baseTemp * 10) / 10,
      humidity: Math.round((60 + (longitude % 20)) * 10) / 10,
      windSpeed: Math.round((3 + (latitude % 5)) * 10) / 10,
      condition: latitude > 22 ? 'Rainy' : 'Sunny',
      icon: '01d',
      updatedAt: new Date(),
    };
  }

  public async getForecast(
    latitude: number,
    _longitude: number,
    days: number
  ): Promise<Forecast[]> {
    const forecastList: Forecast[] = [];
    const baseTemp = 20 + (latitude % 10);
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      forecastList.push({
        date,
        minTemp: Math.round((baseTemp - 5 + (i % 3)) * 10) / 10,
        maxTemp: Math.round((baseTemp + 5 + (i % 4)) * 10) / 10,
        condition: (latitude + i) % 2 === 0 ? 'Cloudy' : 'Sunny',
      });
    }
    return forecastList;
  }
}
