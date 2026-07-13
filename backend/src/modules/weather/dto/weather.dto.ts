import { z } from 'zod';

export interface CurrentWeather {
  temperature: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  icon: string;
  updatedAt: Date;
}

export interface Forecast {
  date: Date;
  minTemp: number;
  maxTemp: number;
  condition: string;
}

export const WeatherQuerySchema = z
  .object({
    lat: z
      .string({ required_error: 'Latitude is required' })
      .transform((val) => Number.parseFloat(val))
      .pipe(z.number().min(-90, 'Latitude must be at least -90').max(90, 'Latitude must be at most 90')),
    lon: z
      .string({ required_error: 'Longitude is required' })
      .transform((val) => Number.parseFloat(val))
      .pipe(z.number().min(-180, 'Longitude must be at least -180').max(180, 'Longitude must be at most 180')),
  })
  .strict();

export type WeatherQueryDto = z.infer<typeof WeatherQuerySchema>;

export const ForecastQuerySchema = z
  .object({
    lat: z
      .string({ required_error: 'Latitude is required' })
      .transform((val) => Number.parseFloat(val))
      .pipe(z.number().min(-90, 'Latitude must be at least -90').max(90, 'Latitude must be at most 90')),
    lon: z
      .string({ required_error: 'Longitude is required' })
      .transform((val) => Number.parseFloat(val))
      .pipe(z.number().min(-180, 'Longitude must be at least -180').max(180, 'Longitude must be at most 180')),
    days: z
      .string()
      .optional()
      .transform((val) => (val ? Number.parseInt(val, 10) : 3))
      .pipe(z.number().int().min(1).max(16)),
  })
  .strict();

export type ForecastQueryDto = z.infer<typeof ForecastQuerySchema>;

export interface CurrentWeatherResponseDto {
  temperature: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  icon: string;
  updatedAt: string;
}

export interface ForecastResponseDto {
  date: string;
  minTemp: number;
  maxTemp: number;
  condition: string;
}
