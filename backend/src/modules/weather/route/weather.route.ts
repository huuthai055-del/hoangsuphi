import { Hono } from 'hono';
import { container } from '@/common/di/container';
import { WeatherQuerySchema, ForecastQuerySchema } from '../dto/weather.dto';
import { validateQuery } from '@/middleware/validator';
import type { WeatherController } from './weather.controller';

const weatherRouter = new Hono();

const getController = (): WeatherController => container.resolve<WeatherController>('WeatherController');

// Public weather routes
weatherRouter.get(
  '/current',
  validateQuery(WeatherQuerySchema),
  (c) => getController().getCurrentWeather(c)
);

weatherRouter.get(
  '/forecast',
  validateQuery(ForecastQuerySchema),
  (c) => getController().getForecast(c)
);

export { weatherRouter };
