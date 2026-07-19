import { authMiddleware } from '@/modules/identity/middleware/auth.middleware';
import { DrizzlePermissionRepository } from '@/modules/identity/repository/permissions.repository';
import { DrizzleRefreshTokenRepository } from '@/modules/identity/repository/refresh-tokens.repository';
import { DrizzleSessionRepository } from '@/modules/identity/repository/sessions.repository';
import { DrizzleUserRepository } from '@/modules/identity/repository/users.repository';
import { IdentityController } from '@/modules/identity/route/identity.controller';
import { DrizzleOneTimeTokenRepository } from '@/modules/identity/repository/drizzle-one-time-token.repository';
import { EmailVerificationController } from '@/modules/identity/route/email-verification.controller';
import { PasswordRecoveryController } from '@/modules/identity/route/password-recovery.controller';
import { AuthService } from '@/modules/identity/service/auth.service';
import { EmailVerificationService } from '@/modules/identity/service/email-verification.service';
import { PasswordRecoveryService } from '@/modules/identity/service/password-recovery.service';
import { PasswordService } from '@/modules/identity/service/password.service';
import { SessionService } from '@/modules/identity/service/session.service';
import { TokenService } from '@/modules/identity/service/token.service';

import { FakeEmailSender } from '@/modules/email/fake-email-sender';
import type { IEmailSender } from '@/modules/email/email-sender.interface';
import { FakeRedisStore } from '@/lib/redis/fake-redis-store';
import { RedisStoreAdapter } from '@/lib/redis/redis-store.adapter';

import { logger } from '@/lib/logger';
import { DrizzleArticlesRepository } from '@/modules/articles/repository/articles.repository';
import { DrizzleCategoriesRepository } from '@/modules/articles/repository/categories.repository';
import { DrizzleTagsRepository } from '@/modules/articles/repository/tags.repository';
import { ArticlesController } from '@/modules/articles/route/articles.controller';
import { ArticlesService } from '@/modules/articles/service/articles.service';

import { DrizzleAttractionsRepository } from '@/modules/attractions/repository/attractions.repository';
import { AttractionsController } from '@/modules/attractions/route/attractions.controller';
import { AttractionsService } from '@/modules/attractions/service/attractions.service';

import { DrizzleBusinessesRepository } from '@/modules/businesses/repository/businesses.repository';
import { BusinessesController } from '@/modules/businesses/route/businesses.controller';
import { BusinessesService } from '@/modules/businesses/service/businesses.service';

import { CloudinaryStorageAdapter } from '@/modules/media/repository/cloudinary-storage.adapter';
import { LocalStorageAdapter } from '@/modules/media/repository/local-storage.adapter';
import { DrizzleMediaRepository } from '@/modules/media/repository/media.repository';
import { SharpImageProcessor } from '@/modules/media/repository/sharp-image-processor';
import { MediaController } from '@/modules/media/route/media.controller';
import { MediaIngestionService } from '@/modules/media/service/media-ingestion.service';
import { MediaProcessingService } from '@/modules/media/service/media-processing.service';
import { MediaStorageResolver } from '@/modules/media/service/media-storage.resolver';
import { MediaUploadService } from '@/modules/media/service/media-upload.service';

import { DrizzleTouristPlacesRepository } from '@/modules/regions/repository/places.repository';
import { DrizzleRegionsRepository } from '@/modules/regions/repository/regions.repository';
import { PlacesController } from '@/modules/regions/route/places.controller';
import { RegionsController } from '@/modules/regions/route/regions.controller';
import { PlacesService } from '@/modules/regions/service/places.service';
import { RegionsService } from '@/modules/regions/service/regions.service';

import {
  DrizzleFavoritesRepository,
  DrizzleReviewsRepository,
} from '@/modules/reviews/repository/reviews.repository';
import { FavoritesController } from '@/modules/reviews/route/favorites.controller';
import { ReviewsController } from '@/modules/reviews/route/reviews.controller';
import { FavoritesService } from '@/modules/reviews/service/favorites.service';
import { ReviewsService } from '@/modules/reviews/service/reviews.service';

import { DrizzleItineraryRepository } from '@/modules/itineraries/repository/itinerary.repository';
import { ItinerariesController } from '@/modules/itineraries/route/itineraries.controller';
import { ItineraryService } from '@/modules/itineraries/service/itinerary.service';

import { DrizzleFaqRepository } from '@/modules/faqs/repository/faq.repository';
import { FaqsController } from '@/modules/faqs/route/faqs.controller';
import { FaqService } from '@/modules/faqs/service/faq.service';

import { DrizzleTopListRepository } from '@/modules/faqs/repository/top-list.repository';
import { TopListsController } from '@/modules/faqs/route/top-lists.controller';
import { TopListService } from '@/modules/faqs/service/top-list.service';

import { OpenWeatherProvider } from '@/modules/weather/providers/open-weather.provider';
import { WeatherController } from '@/modules/weather/route/weather.controller';
import { WeatherService } from '@/modules/weather/service/weather.service';

import { DrizzleNotificationRepository } from '@/modules/notifications/repository/notification.repository';
import { NotificationsController } from '@/modules/notifications/route/notifications.controller';
import { NotificationService } from '@/modules/notifications/service/notification.service';

import { SearchConfig } from '@/modules/search/config/search.config';
import { DrizzleSearchRepository } from '@/modules/search/repository/search.repository';
import { SearchController } from '@/modules/search/route/search.controller';
import { SearchCursorCodec } from '@/modules/search/service/search-cursor';
import { SearchService } from '@/modules/search/service/search.service';

import { db } from '@/lib/database/client';
import { NearbyCursorCodec } from '@/modules/nearby/application/nearby-cursor.codec';
import { NearbySearchService } from '@/modules/nearby/application/nearby-search.service';
import { NearbyController } from '@/modules/nearby/http/nearby.controller';
import { DrizzleNearbyRepository } from '@/modules/nearby/repository/nearby.repository';

import { env } from '@/config/env';
import { DrizzleSeoRepository } from '@/modules/seo/repository/seo.repository';
import { SeoController } from '@/modules/seo/route/seo.controller';
import { SeoService } from '@/modules/seo/service/seo.service';
import { ContactService } from '@/modules/contact/service/contact.service';
import { ContactController } from '@/modules/contact/route/contact.controller';

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
    this.factories.set('OneTimeTokenRepository', () => new DrizzleOneTimeTokenRepository());
    this.factories.set('TokenService', () => new TokenService());
    this.factories.set('PasswordService', () => new PasswordService());

    this.factories.set('SessionService', () => {
      const repo = this.resolve<DrizzleSessionRepository>('SessionRepository');
      const tokenRepo = this.resolve<DrizzleRefreshTokenRepository>('RefreshTokenRepository');
      return new SessionService(repo, tokenRepo);
    });

    this.factories.set('EmailVerificationService', () => {
      const userRepo = this.resolve<DrizzleUserRepository>('UserRepository');
      const tokenRepo = this.resolve<DrizzleOneTimeTokenRepository>('OneTimeTokenRepository');
      const emailSender = this.resolve<IEmailSender>('EmailSender');
      const redisStore = this.resolve<RedisStoreAdapter>('RedisStore');
      return new EmailVerificationService(userRepo, tokenRepo, emailSender, redisStore);
    });

    this.factories.set('EmailVerificationController', () => {
      const emailVerificationService =
        this.resolve<EmailVerificationService>('EmailVerificationService');
      return new EmailVerificationController(emailVerificationService);
    });

    this.factories.set('PasswordRecoveryService', () => {
      const userRepo = this.resolve<DrizzleUserRepository>('UserRepository');
      const tokenRepo = this.resolve<DrizzleOneTimeTokenRepository>('OneTimeTokenRepository');
      const sessionService = this.resolve<SessionService>('SessionService');
      const passwordService = this.resolve<PasswordService>('PasswordService');
      const emailSender = this.resolve<IEmailSender>('EmailSender');
      const redisStore = this.resolve<RedisStoreAdapter>('RedisStore');
      return new PasswordRecoveryService(
        userRepo,
        tokenRepo,
        sessionService,
        passwordService,
        emailSender,
        redisStore
      );
    });

    this.factories.set('PasswordRecoveryController', () => {
      const passwordRecoveryService =
        this.resolve<PasswordRecoveryService>('PasswordRecoveryService');
      return new PasswordRecoveryController(passwordRecoveryService);
    });

    this.factories.set('AuthService', () => {
      const passwordService = this.resolve<PasswordService>('PasswordService');
      const tokenService = this.resolve<TokenService>('TokenService');
      const sessionService = this.resolve<SessionService>('SessionService');
      const userRepo = this.resolve<DrizzleUserRepository>('UserRepository');
      const emailVerificationService =
        this.resolve<EmailVerificationService>('EmailVerificationService');
      return new AuthService(
        passwordService,
        tokenService,
        sessionService,
        userRepo,
        emailVerificationService
      );
    });

    this.factories.set('IdentityController', () => {
      const authService = this.resolve<AuthService>('AuthService');
      return new IdentityController(authService);
    });

    this.factories.set('AuthGuard', () => {
      const tokenService = this.resolve<TokenService>('TokenService');
      const sessionService = this.resolve<SessionService>('SessionService');
      const userRepo = this.resolve<DrizzleUserRepository>('UserRepository');
      const permissionRepo = this.resolve<DrizzlePermissionRepository>('PermissionRepository');
      return authMiddleware(tokenService, sessionService, userRepo, permissionRepo);
    });

    // Email & Redis
    this.factories.set('EmailSender', () => {
      if (env.EMAIL_PROVIDER === 'resend') {
        throw new Error(
          'Resend email provider is not yet implemented (Step 4.5.6). Production email sending fails closed until step completion.'
        );
      }
      if (env.EMAIL_PROVIDER !== 'fake') {
        throw new Error(`Unsupported EMAIL_PROVIDER: ${env.EMAIL_PROVIDER}`);
      }
      return new FakeEmailSender();
    });
    this.factories.set('RedisStore', () => {
      if (env.NODE_ENV === 'test') {
        return new FakeRedisStore();
      }
      return new RedisStoreAdapter(env.REDIS_URL);
    });

    // Articles
    this.factories.set('ArticlesRepository', () => new DrizzleArticlesRepository());
    this.factories.set('CategoriesRepository', () => new DrizzleCategoriesRepository());
    this.factories.set('TagsRepository', () => new DrizzleTagsRepository());

    this.factories.set('ArticlesService', () => {
      const articlesRepo = this.resolve<DrizzleArticlesRepository>('ArticlesRepository');
      const categoriesRepo = this.resolve<DrizzleCategoriesRepository>('CategoriesRepository');
      const tagsRepo = this.resolve<DrizzleTagsRepository>('TagsRepository');
      const clock = { now: () => new Date() };
      return new ArticlesService(articlesRepo, categoriesRepo, tagsRepo, logger, clock);
    });

    this.factories.set('ArticlesController', () => {
      const service = this.resolve<ArticlesService>('ArticlesService');
      return new ArticlesController(service);
    });

    // Attractions
    this.factories.set('AttractionsRepository', () => new DrizzleAttractionsRepository());

    this.factories.set('AttractionsService', () => {
      const regionsRepo = this.resolve<DrizzleRegionsRepository>('RegionsRepository');
      const attractionsRepo = this.resolve<DrizzleAttractionsRepository>('AttractionsRepository');
      return new AttractionsService(regionsRepo, attractionsRepo);
    });

    this.factories.set('AttractionsController', () => {
      const service = this.resolve<AttractionsService>('AttractionsService');
      return new AttractionsController(service);
    });

    // Businesses
    this.factories.set('BusinessesRepository', () => new DrizzleBusinessesRepository());

    this.factories.set('BusinessesService', () => {
      const regionsRepo = this.resolve<DrizzleRegionsRepository>('RegionsRepository');
      const businessesRepo = this.resolve<DrizzleBusinessesRepository>('BusinessesRepository');
      return new BusinessesService(regionsRepo, businessesRepo);
    });

    this.factories.set('BusinessesController', () => {
      const service = this.resolve<BusinessesService>('BusinessesService');
      return new BusinessesController(service);
    });

    // Media
    this.factories.set('MediaRepository', () => new DrizzleMediaRepository());
    this.factories.set('MediaStorage', () => new LocalStorageAdapter());
    this.factories.set('CloudinaryStorage', () => new CloudinaryStorageAdapter());
    this.factories.set('ImageProcessor', () => new SharpImageProcessor());
    this.factories.set(
      'MediaStorageResolver',
      () =>
        new MediaStorageResolver(
          this.resolve<LocalStorageAdapter>('MediaStorage'),
          this.resolve<CloudinaryStorageAdapter>('CloudinaryStorage')
        )
    );

    this.factories.set('MediaUploadService', () => {
      const mediaRepo = this.resolve<DrizzleMediaRepository>('MediaRepository');
      const storage = this.resolve<LocalStorageAdapter>('MediaStorage');
      return new MediaUploadService(mediaRepo, storage);
    });

    this.factories.set('MediaProcessingService', () => {
      const mediaRepo = this.resolve<DrizzleMediaRepository>('MediaRepository');
      const storage = this.resolve<LocalStorageAdapter>('MediaStorage');
      const imageProcessor = this.resolve<SharpImageProcessor>('ImageProcessor');
      return new MediaProcessingService(mediaRepo, storage, imageProcessor);
    });

    this.factories.set('MediaIngestionService', () => {
      const mediaRepo = this.resolve<DrizzleMediaRepository>('MediaRepository');
      const storage = this.resolve<CloudinaryStorageAdapter>('CloudinaryStorage');
      const imageProcessor = this.resolve<SharpImageProcessor>('ImageProcessor');
      return new MediaIngestionService(mediaRepo, storage, imageProcessor);
    });

    this.factories.set('MediaController', () => {
      const ingestionService = this.resolve<MediaIngestionService>('MediaIngestionService');
      const mediaRepo = this.resolve<DrizzleMediaRepository>('MediaRepository');
      const storageResolver = this.resolve<MediaStorageResolver>('MediaStorageResolver');
      return new MediaController(ingestionService, mediaRepo, storageResolver);
    });

    // Regions & Places
    this.factories.set('RegionsRepository', () => new DrizzleRegionsRepository());
    this.factories.set('PlacesRepository', () => new DrizzleTouristPlacesRepository());

    this.factories.set('RegionsService', () => {
      const regionsRepo = this.resolve<DrizzleRegionsRepository>('RegionsRepository');
      const placesRepo = this.resolve<DrizzleTouristPlacesRepository>('PlacesRepository');
      return new RegionsService(regionsRepo, placesRepo);
    });

    this.factories.set('PlacesService', () => {
      const regionsRepo = this.resolve<DrizzleRegionsRepository>('RegionsRepository');
      const placesRepo = this.resolve<DrizzleTouristPlacesRepository>('PlacesRepository');
      return new PlacesService(regionsRepo, placesRepo);
    });

    this.factories.set('RegionsController', () => {
      const service = this.resolve<RegionsService>('RegionsService');
      return new RegionsController(service);
    });

    this.factories.set('PlacesController', () => {
      const service = this.resolve<PlacesService>('PlacesService');
      return new PlacesController(service);
    });

    // Reviews & Favorites
    this.factories.set('ReviewsRepository', () => new DrizzleReviewsRepository());
    this.factories.set('FavoritesRepository', () => new DrizzleFavoritesRepository());

    this.factories.set('ReviewsService', () => {
      const reviewsRepo = this.resolve<DrizzleReviewsRepository>('ReviewsRepository');
      return new ReviewsService(reviewsRepo);
    });

    this.factories.set('FavoritesService', () => {
      const favoritesRepo = this.resolve<DrizzleFavoritesRepository>('FavoritesRepository');
      return new FavoritesService(favoritesRepo);
    });

    this.factories.set('ReviewsController', () => {
      const service = this.resolve<ReviewsService>('ReviewsService');
      return new ReviewsController(service);
    });

    this.factories.set('FavoritesController', () => {
      const service = this.resolve<FavoritesService>('FavoritesService');
      return new FavoritesController(service);
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

    // Search read projection
    this.factories.set('SearchRepository', () => new DrizzleSearchRepository());
    this.factories.set(
      'SearchCursorCodec',
      () => new SearchCursorCodec(SearchConfig.cursorKeyring)
    );
    this.factories.set('SearchService', () => {
      const repository = this.resolve<DrizzleSearchRepository>('SearchRepository');
      const cursorCodec = this.resolve<SearchCursorCodec>('SearchCursorCodec');
      return new SearchService(repository, cursorCodec);
    });
    this.factories.set('SearchController', () => {
      const service = this.resolve<SearchService>('SearchService');
      return new SearchController(service);
    });

    // Nearby module read projection
    this.factories.set('NearbyRepository', () => new DrizzleNearbyRepository(db));
    this.factories.set(
      'NearbyCursorCodec',
      () => new NearbyCursorCodec(SearchConfig.cursorKeyring)
    );
    this.factories.set('NearbySearchService', () => {
      const repository = this.resolve<DrizzleNearbyRepository>('NearbyRepository');
      const cursorCodec = this.resolve<NearbyCursorCodec>('NearbyCursorCodec');
      return new NearbySearchService(repository, cursorCodec);
    });
    this.factories.set('NearbyController', () => {
      const service = this.resolve<NearbySearchService>('NearbySearchService');
      return new NearbyController(service);
    });

    // SEO module
    this.factories.set('SeoRepository', () => new DrizzleSeoRepository());
    this.factories.set('SeoService', () => {
      const seoRepo = this.resolve<DrizzleSeoRepository>('SeoRepository');
      const mediaResolver = this.resolve<MediaStorageResolver>('MediaStorageResolver');
      return new SeoService(seoRepo, mediaResolver, env.PUBLIC_SITE_URL ?? '');
    });
    this.factories.set('SeoController', () => {
      const seoService = this.resolve<SeoService>('SeoService');
      return new SeoController(seoService);
    });

    // Contact module
    this.factories.set('ContactService', () => {
      const emailSender = this.resolve<IEmailSender>('EmailSender');
      const redisStore = this.resolve<RedisStoreAdapter | FakeRedisStore>('RedisStore');
      return new ContactService(emailSender, redisStore);
    });
    this.factories.set('ContactController', () => {
      const service = this.resolve<ContactService>('ContactService');
      return new ContactController(service);
    });
  }
}

export const container = new Container();
