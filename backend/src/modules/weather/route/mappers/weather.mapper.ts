import type {
  CurrentWeather,
  CurrentWeatherResponseDto,
  Forecast,
  ForecastResponseDto,
} from '../../dto/weather.dto';

export function mapCurrentWeatherToResponse(weather: CurrentWeather): CurrentWeatherResponseDto {
  return {
    temperature: weather.temperature,
    humidity: weather.humidity,
    windSpeed: weather.windSpeed,
    condition: weather.condition,
    icon: weather.icon,
    updatedAt: weather.updatedAt.toISOString(),
  };
}

export function mapForecastToResponse(forecast: Forecast): ForecastResponseDto {
  return {
    date: forecast.date.toISOString(),
    minTemp: forecast.minTemp,
    maxTemp: forecast.maxTemp,
    condition: forecast.condition,
  };
}
