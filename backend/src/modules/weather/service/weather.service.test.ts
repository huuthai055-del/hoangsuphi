import { describe, test, expect, mock } from 'bun:test';
import { WeatherService } from './weather.service';
import type { IWeatherProvider } from '../interfaces/weather-provider.interface';
import { ValidationError } from '@/common/errors/http.errors';

describe('WeatherService', () => {
  const mockGetCurrentWeather = mock(() => Promise.resolve(null as any));
  const mockGetForecast = mock(() => Promise.resolve([] as any[]));

  const mockProvider: IWeatherProvider = {
    getCurrentWeather: mockGetCurrentWeather,
    getForecast: mockGetForecast,
  };

  const service = new WeatherService(mockProvider);

  test('should throw ValidationError on invalid coordinates', async () => {
    await expect(service.getCurrentWeather(-91, 100)).rejects.toThrow(ValidationError);
    await expect(service.getCurrentWeather(91, 100)).rejects.toThrow(ValidationError);
    await expect(service.getCurrentWeather(45, -181)).rejects.toThrow(ValidationError);
    await expect(service.getCurrentWeather(45, 181)).rejects.toThrow(ValidationError);
  });

  test('should throw ValidationError on invalid forecast days', async () => {
    await expect(service.getForecast(45, 100, 0)).rejects.toThrow(ValidationError);
    await expect(service.getForecast(45, 100, 17)).rejects.toThrow(ValidationError);
  });

  test('should return current weather data from provider', async () => {
    const mockData = {
      temperature: 25.5,
      humidity: 80,
      windSpeed: 5.5,
      condition: 'Sunny',
      icon: '01d',
      updatedAt: new Date(),
    };
    mockGetCurrentWeather.mockImplementation(() => Promise.resolve(mockData));

    const result = await service.getCurrentWeather(45.5, 100.2);
    expect(result.temperature).toBe(25.5);
    expect(result.condition).toBe('Sunny');
    expect(mockGetCurrentWeather).toHaveBeenCalledWith(45.5, 100.2);
  });

  test('should wrap provider error into ValidationError in getCurrentWeather', async () => {
    mockGetCurrentWeather.mockImplementation(() => Promise.reject(new Error('Network Error')));

    await expect(service.getCurrentWeather(45.5, 100.2)).rejects.toThrow(ValidationError);
  });

  test('should return forecast data from provider', async () => {
    const mockData = [
      {
        date: new Date(),
        minTemp: 18.0,
        maxTemp: 28.0,
        condition: 'Partly Cloudy',
      },
    ];
    mockGetForecast.mockImplementation(() => Promise.resolve(mockData));

    const result = await service.getForecast(45.5, 100.2, 5);
    expect(result.length).toBe(1);
    expect(result[0]?.minTemp).toBe(18.0);
    expect(mockGetForecast).toHaveBeenCalledWith(45.5, 100.2, 5);
  });

  test('should wrap provider error into ValidationError in getForecast', async () => {
    mockGetForecast.mockImplementation(() => Promise.reject(new Error('API Failure')));

    await expect(service.getForecast(45.5, 100.2, 3)).rejects.toThrow(ValidationError);
  });
});
