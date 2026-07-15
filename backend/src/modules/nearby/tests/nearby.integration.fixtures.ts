import type postgres from 'postgres';

export const origin = { lng: 104.6644, lat: 22.7844 }; // Bản Phùng Commune Center

// Deterministic UUIDs to prevent collisions
export const ids = {
  // Users
  user1: 'e1200000-0000-4000-8000-000000000001',
  user2: 'e1200000-0000-4000-8000-000000000002',
  userPending: 'e1200000-0000-4000-8000-000000000003',
  userDeleted: 'e1200000-0000-4000-8000-000000000004',
  userRejected: 'e1200000-0000-4000-8000-000000000005',

  // Regions
  regionActive: 'e2200000-0000-4000-8000-000000000001',
  regionDeleted: 'e2200000-0000-4000-8000-000000000002',
  regionSibling: 'e2200000-0000-4000-8000-000000000003',

  // Categories & Types
  attractionCat: 'e3200000-0000-4000-8000-000000000001',
  utilityCat: 'e3200000-0000-4000-8000-000000000002',
  attractionCat2: 'e3200000-0000-4000-8000-000000000003',
  activeBusinessType: 'e4200000-0000-4000-8000-000000000001',
  inactiveBusinessType: 'e4200000-0000-4000-8000-000000000002',
  activeBusinessType2: 'e4200000-0000-4000-8000-000000000003',

  // Tourist Places
  placeVeryClose: 'e5200000-0000-4000-8000-000000000001',
  placeWithin1km: 'e5200000-0000-4000-8000-000000000002',
  placeWithin5km: 'e5200000-0000-4000-8000-000000000003',
  placeOutside5km: 'e5200000-0000-4000-8000-000000000004',
  placeInactive: 'e5200000-0000-4000-8000-000000000005',
  placeDeleted: 'e5200000-0000-4000-8000-000000000006',
  placeInDeletedRegion: 'e5200000-0000-4000-8000-000000000007',
  placeInSiblingRegion: 'e5200000-0000-4000-8000-000000000008',
  placeEqualDistance1: 'e5200000-0000-4000-8000-000000000009',
  placeEqualDistance2: 'e5200000-0000-4000-8000-000000000010',

  // Attractions & Utilities
  attractionVeryClose: 'e7200000-0000-4000-8000-000000000001',
  attractionDeleted: 'e7200000-0000-4000-8000-000000000002',
  attractionInactive: 'e7200000-0000-4000-8000-000000000003',
  utilityWithin1km: 'e7200000-0000-4000-8000-000000000004',
  utilityDeleted: 'e7200000-0000-4000-8000-000000000005',
  attractionEqualDistance: 'e7200000-0000-4000-8000-000000000006',
  attractionDifferentCategory: 'e7200000-0000-4000-8000-000000000007',

  // Businesses
  businessWithin5kmActiveType: 'e6200000-0000-4000-8000-000000000001',
  businessWithin5kmInactiveType: 'e6200000-0000-4000-8000-000000000002',
  businessDeleted: 'e6200000-0000-4000-8000-000000000003',
  businessInactive: 'e6200000-0000-4000-8000-000000000004',
  businessEqualDistance: 'e6200000-0000-4000-8000-000000000005',
  businessDifferentType: 'e6200000-0000-4000-8000-000000000006',

  // Reviews
  reviewApproved1: 'e8200000-0000-4000-8000-000000000001',
  reviewApproved2: 'e8200000-0000-4000-8000-000000000002',
  reviewPending: 'e8200000-0000-4000-8000-000000000003',
  reviewDeleted: 'e8200000-0000-4000-8000-000000000004',
  reviewRejected: 'e8200000-0000-4000-8000-000000000005',
} as const;

export async function cleanFixtures(tx: postgres.TransactionSql): Promise<void> {
  const allIds = Object.values(ids);
  await tx`DELETE FROM reviews WHERE id IN ${tx(allIds)}`;
  await tx`DELETE FROM tourist_places WHERE id IN ${tx(allIds)}`;
  await tx`DELETE FROM attractions WHERE id IN ${tx(allIds)}`;
  await tx`DELETE FROM businesses WHERE id IN ${tx(allIds)}`;
  await tx`DELETE FROM attraction_categories WHERE id IN ${tx(allIds)}`;
  await tx`DELETE FROM business_types WHERE id IN ${tx(allIds)}`;
  await tx`DELETE FROM regions WHERE id IN ${tx(allIds)}`;
  await tx`DELETE FROM users WHERE id IN ${tx(allIds)}`;
}

export async function seedFixtures(tx: postgres.TransactionSql): Promise<void> {
  // 0. Seed Users
  await tx`
    INSERT INTO users (id, email, password_hash, status)
    VALUES
      (${ids.user1}, 'nearby.e2e.user1@example.test', 'passhash', 'active'::public.user_status),
      (${ids.user2}, 'nearby.e2e.user2@example.test', 'passhash', 'active'::public.user_status),
      (${ids.userPending}, 'nearby.e2e.userpending@example.test', 'passhash', 'active'::public.user_status),
      (${ids.userDeleted}, 'nearby.e2e.userdeleted@example.test', 'passhash', 'active'::public.user_status),
      (${ids.userRejected}, 'nearby.e2e.userrejected@example.test', 'passhash', 'active'::public.user_status)
  `;

  // 1. Seed Regions
  await tx`
    INSERT INTO regions (id, parent_id, name, slug, level, path, deleted_at)
    VALUES
      (${ids.regionActive}, NULL, 'Active Region E2E', 'region-active-e2e', 3, 'ha_giang.hoang_su_phi.region_active_e2e'::ltree, NULL),
      (${ids.regionDeleted}, NULL, 'Deleted Region E2E', 'region-deleted-e2e', 3, 'ha_giang.hoang_su_phi.region_deleted_e2e'::ltree, CURRENT_TIMESTAMP),
      (${ids.regionSibling}, NULL, 'Sibling Region E2E', 'region-sibling-e2e', 3, 'ha_giang.hoang_su_phi.region_sibling_e2e'::ltree, NULL)
  `;

  // 2. Seed Categories & Business Types
  await tx`
    INSERT INTO attraction_categories (id, code, name, is_utility)
    VALUES
      (${ids.attractionCat}, 'e2e-attraction', 'E2E Attraction Cat', FALSE),
      (${ids.utilityCat}, 'e2e-utility', 'E2E Utility Cat', TRUE),
      (${ids.attractionCat2}, 'e2e-attraction-2', 'E2E Attraction Cat 2', FALSE)
  `;
  await tx`
    INSERT INTO business_types (id, code, name, is_active)
    VALUES
      (${ids.activeBusinessType}, 'e2e-business-active', 'E2E Active Business Type', TRUE),
      (${ids.inactiveBusinessType}, 'e2e-business-inactive', 'E2E Inactive Business Type', FALSE),
      (${ids.activeBusinessType2}, 'e2e-business-active-2', 'E2E Active Business Type 2', TRUE)
  `;

  // 3. Seed Tourist Places
  await tx`
    INSERT INTO tourist_places (id, region_id, name, slug, location, status, deleted_at)
    VALUES
      (${ids.placeVeryClose}, ${ids.regionActive}, 'E2E Place Very Close', 'place-very-close', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'active', NULL),
      (${ids.placeWithin1km}, ${ids.regionActive}, 'E2E Place 1km', 'place-1km', ST_SetSRID(ST_MakePoint(104.6680, 22.7844), 4326)::geography, 'active', NULL),
      (${ids.placeWithin5km}, ${ids.regionActive}, 'E2E Place 5km', 'place-5km', ST_SetSRID(ST_MakePoint(104.6900, 22.7844), 4326)::geography, 'active', NULL),
      (${ids.placeOutside5km}, ${ids.regionActive}, 'E2E Place Outside 5km', 'place-outside-5km', ST_SetSRID(ST_MakePoint(104.7400, 22.7844), 4326)::geography, 'active', NULL),
      (${ids.placeInactive}, ${ids.regionActive}, 'E2E Place Inactive', 'place-inactive', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'inactive', NULL),
      (${ids.placeDeleted}, ${ids.regionActive}, 'E2E Place Deleted', 'place-deleted', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'active', CURRENT_TIMESTAMP),
      (${ids.placeInDeletedRegion}, ${ids.regionDeleted}, 'E2E Place Deleted Region', 'place-deleted-region', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'active', NULL),
      (${ids.placeInSiblingRegion}, ${ids.regionSibling}, 'E2E Place Sibling Region', 'place-sibling-region', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'active', NULL),
      (${ids.placeEqualDistance1}, ${ids.regionActive}, 'E2E Place Equal Distance 1', 'place-equal-distance-1', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'active', NULL),
      (${ids.placeEqualDistance2}, ${ids.regionActive}, 'E2E Place Equal Distance 2', 'place-equal-distance-2', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'active', NULL)
  `;

  // 4. Seed Attractions & Utilities
  await tx`
    INSERT INTO attractions (id, region_id, category_id, name, slug, location, status, deleted_at)
    VALUES
      (${ids.attractionVeryClose}, ${ids.regionActive}, ${ids.attractionCat}, 'E2E Attraction Very Close', 'attraction-very-close', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'active', NULL),
      (${ids.attractionDeleted}, ${ids.regionActive}, ${ids.attractionCat}, 'E2E Attraction Deleted', 'attraction-deleted', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'active', CURRENT_TIMESTAMP),
      (${ids.attractionInactive}, ${ids.regionActive}, ${ids.attractionCat}, 'E2E Attraction Inactive', 'attraction-inactive', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'inactive', NULL),
      (${ids.utilityWithin1km}, ${ids.regionActive}, ${ids.utilityCat}, 'E2E Utility 1km', 'utility-1km', ST_SetSRID(ST_MakePoint(104.6680, 22.7844), 4326)::geography, 'active', NULL),
      (${ids.utilityDeleted}, ${ids.regionActive}, ${ids.utilityCat}, 'E2E Utility Deleted', 'utility-deleted', ST_SetSRID(ST_MakePoint(104.6680, 22.7844), 4326)::geography, 'active', CURRENT_TIMESTAMP),
      (${ids.attractionEqualDistance}, ${ids.regionActive}, ${ids.attractionCat}, 'E2E Attraction Equal Distance', 'attraction-equal-distance', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'active', NULL),
      (${ids.attractionDifferentCategory}, ${ids.regionActive}, ${ids.attractionCat2}, 'E2E Attraction Diff Cat', 'attraction-diff-cat', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'active', NULL)
  `;

  // 5. Seed Businesses
  await tx`
    INSERT INTO businesses (id, region_id, business_type_id, name, slug, location, status, deleted_at)
    VALUES
      (${ids.businessWithin5kmActiveType}, ${ids.regionActive}, ${ids.activeBusinessType}, 'E2E Business 5km Active Type', 'business-5km-active-type', ST_SetSRID(ST_MakePoint(104.6900, 22.7844), 4326)::geography, 'active', NULL),
      (${ids.businessWithin5kmInactiveType}, ${ids.regionActive}, ${ids.inactiveBusinessType}, 'E2E Business 5km Inactive Type', 'business-5km-inactive-type', ST_SetSRID(ST_MakePoint(104.6900, 22.7844), 4326)::geography, 'active', NULL),
      (${ids.businessDeleted}, ${ids.regionActive}, ${ids.activeBusinessType}, 'E2E Business Deleted', 'business-deleted', ST_SetSRID(ST_MakePoint(104.6900, 22.7844), 4326)::geography, 'active', CURRENT_TIMESTAMP),
      (${ids.businessInactive}, ${ids.regionActive}, ${ids.activeBusinessType}, 'E2E Business Inactive', 'business-inactive', ST_SetSRID(ST_MakePoint(104.6900, 22.7844), 4326)::geography, 'inactive', NULL),
      (${ids.businessEqualDistance}, ${ids.regionActive}, ${ids.activeBusinessType}, 'E2E Business Equal Distance', 'business-equal-distance', ST_SetSRID(ST_MakePoint(104.6645, 22.7844), 4326)::geography, 'active', NULL),
      (${ids.businessDifferentType}, ${ids.regionActive}, ${ids.activeBusinessType2}, 'E2E Business Diff Type', 'business-diff-type', ST_SetSRID(ST_MakePoint(104.6900, 22.7844), 4326)::geography, 'active', NULL)
  `;

  // 6. Seed Reviews
  await tx`
    INSERT INTO reviews (id, user_id, owner_type, owner_id, rating, title, content, status, deleted_at)
    VALUES
      (${ids.reviewApproved1}, ${ids.user1}, 'PLACE'::public.owner_type, ${ids.placeVeryClose}, 4, 'Ok', 'Good', 'APPROVED'::public.review_status, NULL),
      (${ids.reviewApproved2}, ${ids.user2}, 'PLACE'::public.owner_type, ${ids.placeVeryClose}, 5, 'Super', 'Great', 'APPROVED'::public.review_status, NULL),
      (${ids.reviewPending}, ${ids.userPending}, 'PLACE'::public.owner_type, ${ids.placeVeryClose}, 5, 'Pending', 'Waiting', 'PENDING'::public.review_status, NULL),
      (${ids.reviewDeleted}, ${ids.userDeleted}, 'PLACE'::public.owner_type, ${ids.placeVeryClose}, 5, 'Deleted', 'Removed', 'APPROVED'::public.review_status, CURRENT_TIMESTAMP),
      (${ids.reviewRejected}, ${ids.userRejected}, 'PLACE'::public.owner_type, ${ids.placeVeryClose}, 5, 'Rejected', 'Bad', 'REJECTED'::public.review_status, NULL)
  `;
}
