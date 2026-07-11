import { mock } from 'bun:test';

// Regions Repository Mocks
export const mockFindRegionById = mock(() => Promise.resolve(null));
export const mockFindRegionBySlug = mock(() => Promise.resolve(null));
export const mockListRegions = mock(() => Promise.resolve([]));
export const mockSaveRegion = mock(() => Promise.resolve());
export const mockUpdateRegion = mock(() => Promise.resolve());
export const mockSoftDeleteRegion = mock(() => Promise.resolve());

// Tourist Places Repository Mocks
export const mockFindPlaceById = mock(() => Promise.resolve(null));
export const mockFindPlaceBySlug = mock(() => Promise.resolve(null));
export const mockFindPlaceByRegionId = mock(() => Promise.resolve([]));
export const mockListPlaces = mock(() => Promise.resolve([]));
export const mockFindPlacesNearby = mock(() => Promise.resolve([]));
export const mockSavePlace = mock(() => Promise.resolve());
export const mockUpdatePlace = mock(() => Promise.resolve());
export const mockSoftDeletePlace = mock(() => Promise.resolve());

// Businesses Repository Mocks
export const mockFindBusinessById = mock(() => Promise.resolve(null));
export const mockFindBusinessBySlug = mock(() => Promise.resolve(null));
export const mockFindBusinessByRegionId = mock(() => Promise.resolve([]));
export const mockListBusinesses = mock(() => Promise.resolve([]));
export const mockFindBusinessesNearby = mock(() => Promise.resolve([]));
export const mockSaveBusiness = mock(() => Promise.resolve());
export const mockUpdateBusiness = mock(() => Promise.resolve());
export const mockSoftDeleteBusiness = mock(() => Promise.resolve());
export const mockFindBusinessTypeById = mock(() => Promise.resolve(null));
