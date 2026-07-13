import { DrizzleUserRepository } from '@/modules/identity/repository/users.repository';
import { DrizzleSessionRepository } from '@/modules/identity/repository/sessions.repository';
import { DrizzleRefreshTokenRepository } from '@/modules/identity/repository/refresh-tokens.repository';
import { DrizzlePermissionRepository } from '@/modules/identity/repository/permissions.repository';
import { TokenService } from '@/modules/identity/service/token.service';
import { SessionService } from '@/modules/identity/service/session.service';
import { authMiddleware } from '@/modules/identity/middleware/auth.middleware';

import { DrizzleItineraryRepository } from '@/modules/itineraries/repository/itinerary.repository';
import { ItineraryService } from '@/modules/itineraries/service/itinerary.service';
import { ItinerariesController } from '@/modules/itineraries/route/itineraries.controller';

import { DrizzleFaqRepository } from '@/modules/faqs/repository/faq.repository';
import { FaqService } from '@/modules/faqs/service/faq.service';
import { FaqsController } from '@/modules/faqs/route/faqs.controller';

import { DrizzleTopListRepository } from '@/modules/faqs/repository/top-list.repository';
import { TopListService } from '@/modules/faqs/service/top-list.service';
import { TopListsController } from '@/modules/faqs/route/top-lists.controller';

import { OpenWeatherProvider } from '@/modules/weather/providers/open-weather.provider';
import { WeatherService } from '@/modules/weather/service/weather.service';
import { WeatherController } from '@/modules/weather/route/weather.controller';

import { DrizzleNotificationRepository } from '@/modules/notifications/repository/notification.repository';
import { NotificationService } from '@/modules/notifications/service/notification.service';
import { NotificationsController } from '@/modules/notifications/route/notifications.controller';

class Container {
  private instances = new Map<string, unknown>();
  private factories = new Map<string, () => unknown>();

  constructor() {
    this.reset();
  }

  public register<T>(key: string, instance: T): void {
    this.instances.set(key, instance);
  }

  public resolve<T>(key: string): T {
    if (this.instances.has(key)) {
      return this.instances.get(key) as T;
    }
    const factory = this.factories.get(key);
    if (factory) {
      const instance = factory();
      this.instances.set(key, instance);
      return instance as T;
    }
    throw new Error(`Dependency not registered in container: ${key}`);
  }

  public reset(): void {
    this.instances.clear();
    this.factories.clear();

    // Register Identity factories
    this.factories.set('UserRepository', () => new DrizzleUserRepository());
    this.factories.set('SessionRepository', () => new DrizzleSessionRepository());
    this.factories.set('RefreshTokenRepository', () => new DrizzleRefreshTokenRepository());
    this.factories.set('PermissionRepository', () => new DrizzlePermissionRepository());
    this.factories.set('TokenService', () => new TokenService());
    
    this.factories.set('SessionService', () => {
      const repo = this.resolve<DrizzleSessionRepository>('SessionRepository');
      const tokenRepo = this.resolve<DrizzleRefreshTokenRepository>('RefreshTokenRepository');
      return new SessionService(repo, tokenRepo);
    });

    this.factories.set('AuthGuard', () => {
      const tokenService = this.resolve<TokenService>('TokenService');
      const sessionService = this.resolve<SessionService>('SessionService');
      const userRepo = this.resolve<DrizzleUserRepository>('UserRepository');
      const permissionRepo = this.resolve<DrizzlePermissionRepository>('PermissionRepository');
      return authMiddleware(tokenService, sessionService, userRepo, permissionRepo);
    });

    // Itineraries
    this.factories.set('ItineraryRepository', () => new DrizzleItineraryRepository());
    this.factories.set('ItineraryService', () => {
      const repo = this.resolve<DrizzleItineraryRepository>('ItineraryRepository');
      return new ItineraryService(repo);
    });
    this.factories.set('ItinerariesController', () => {
      const service = this.resolve<ItineraryService>('ItineraryService');
      return new ItinerariesController(service);
    });

    // FAQs & Top Lists
    this.factories.set('FaqRepository', () => new DrizzleFaqRepository());
    this.factories.set('FaqService', () => {
      const repo = this.resolve<DrizzleFaqRepository>('FaqRepository');
      return new FaqService(repo);
    });
    this.factories.set('FaqsController', () => {
      const service = this.resolve<FaqService>('FaqService');
      return new FaqsController(service);
    });

    this.factories.set('TopListRepository', () => new DrizzleTopListRepository());
    this.factories.set('TopListService', () => {
      const repo = this.resolve<DrizzleTopListRepository>('TopListRepository');
      return new TopListService(repo);
    });
    this.factories.set('TopListsController', () => {
      const service = this.resolve<TopListService>('TopListService');
      return new TopListsController(service);
    });

    // Weather
    this.factories.set('WeatherProvider', () => new OpenWeatherProvider());
    this.factories.set('WeatherService', () => {
      const provider = this.resolve<OpenWeatherProvider>('WeatherProvider');
      return new WeatherService(provider);
    });
    this.factories.set('WeatherController', () => {
      const service = this.resolve<WeatherService>('WeatherService');
      return new WeatherController(service);
    });

    // Notifications
    this.factories.set('NotificationRepository', () => new DrizzleNotificationRepository());
    this.factories.set('NotificationService', () => {
      const repo = this.resolve<DrizzleNotificationRepository>('NotificationRepository');
      return new NotificationService(repo);
    });
    this.factories.set('NotificationsController', () => {
      const service = this.resolve<NotificationService>('NotificationService');
      return new NotificationsController(service);
    });
  }
}

export const container = new Container();
