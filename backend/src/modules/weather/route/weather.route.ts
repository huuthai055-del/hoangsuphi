import { container } from '@/common/di/container';
import { validateQuery } from '@/middleware/validator';
import { Hono } from 'hono';
import { ForecastQuerySchema, WeatherQuerySchema } from '../dto/weather.dto';
import type { WeatherController } from './weather.controller';

const weatherRouter = new Hono();

const getController = (): WeatherController =>
  container.resolve<WeatherController>('WeatherController');

// Public weather routes
weatherRouter.get('/current', validateQuery(WeatherQuerySchema), (c) =>
  getController().getCurrentWeather(c)
);

weatherRouter.get('/forecast', validateQuery(ForecastQuerySchema), (c) =>
  getController().getForecast(c)
);

export { weatherRouter };
