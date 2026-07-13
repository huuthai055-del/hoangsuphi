import type { Context } from 'hono';
import type { WeatherService } from '../service/weather.service';
import { mapCurrentWeatherToResponse, mapForecastToResponse } from './mappers/weather.mapper';
import type { WeatherQueryDto, ForecastQueryDto } from '../dto/weather.dto';

export class WeatherController {
  constructor(private readonly service: WeatherService) {}

  public getCurrentWeather = async (c: Context): Promise<Response> => {
    const query = c.get('validQuery') as WeatherQueryDto;
    const weather = await this.service.getCurrentWeather(query.lat, query.lon);
    return c.json(mapCurrentWeatherToResponse(weather), 200);
  };

  public getForecast = async (c: Context): Promise<Response> => {
    const query = c.get('validQuery') as ForecastQueryDto;
    const forecast = await this.service.getForecast(query.lat, query.lon, query.days);
    const mapped = forecast.map(mapForecastToResponse);
    return c.json({ data: mapped }, 200);
  };
}
