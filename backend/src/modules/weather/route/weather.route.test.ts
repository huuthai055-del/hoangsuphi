import { expect, test, describe, beforeEach, mock } from 'bun:test';
import type { Hono } from 'hono';
import { WeatherController } from './weather.controller';
import { container } from '@/common/di/container';

describe('Weather API Routing & Controller', () => {
  let app: Hono;

  const mockGetCurrentWeather = mock(() => Promise.resolve({} as any));
  const mockGetForecast = mock(() => Promise.resolve([] as any[]));

  const mockWeatherService = {
    getCurrentWeather: mockGetCurrentWeather,
    getForecast: mockGetForecast,
  };

  const mockController = new WeatherController(mockWeatherService as any);

  beforeEach(async () => {
    container.reset();
    container.register('WeatherController', mockController);

    const { createApp } = await import('../../../app');
    app = createApp();

    mockGetCurrentWeather.mockClear();
    mockGetForecast.mockClear();
  });

  describe('Weather Route integrations', () => {
    test('GET /api/v1/weather/current - Get Success', async () => {
      const mockResult = {
        temperature: 25.5,
        humidity: 80,
        windSpeed: 5.5,
        condition: 'Sunny',
        icon: '01d',
        updatedAt: new Date(),
      };
      mockGetCurrentWeather.mockImplementation(() => Promise.resolve(mockResult));

      const res = await app.request('/api/v1/weather/current?lat=22.5&lon=104.5');

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.temperature).toBe(25.5);
      expect(json.condition).toBe('Sunny');
    });

    test('GET /api/v1/weather/current - Validation Coordinate Error 400', async () => {
      const res = await app.request('/api/v1/weather/current?lat=120.0&lon=104.5');

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe('VAL_001');
    });

    test('GET /api/v1/weather/forecast - Get Success', async () => {
      const mockResult = [
        {
          date: new Date(),
          minTemp: 18.0,
          maxTemp: 28.0,
          condition: 'Partly Cloudy',
        },
      ];
      mockGetForecast.mockImplementation(() => Promise.resolve(mockResult));

      const res = await app.request('/api/v1/weather/forecast?lat=22.5&lon=104.5&days=3');

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.length).toBe(1);
      expect(json.data[0].minTemp).toBe(18.0);
    });
  });
});
