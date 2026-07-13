import type { CurrentWeather, Forecast } from '../dto/weather.dto';

export interface IWeatherProvider {
  getCurrentWeather(latitude: number, longitude: number): Promise<CurrentWeather>;
  getForecast(latitude: number, longitude: number, days: number): Promise<Forecast[]>;
}
