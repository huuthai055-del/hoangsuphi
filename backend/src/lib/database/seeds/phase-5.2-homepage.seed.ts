import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { eq, sql } from 'drizzle-orm';
import { generateUuidV7 } from '@/common/utils/uuid';
import { db } from '../client';
import {
  articleCategories,
  articles,
  attractionCategories,
  businessTypes,
  businesses,
  harvestUpdates,
  media,
  regions,
  touristPlaces,
  users,
} from '../schema';

if (process.env.NODE_ENV === 'production') {
  console.error('❌ SEEDING IS NOT ALLOWED IN PRODUCTION ENVIRONMENT');
  process.exit(1);
}

// Fixed IDs for reproducible seeding
const SEED_AUTHOR_ID = '018f4a0c-9999-7000-8000-000000000001';
const HA_GIANG_ID = '018f4a0c-1111-7000-8000-000000000001';
const HSP_ID = '018f4a0c-1111-7000-8000-000000000002';
const BAN_PHUNG_ID = '018f4a0c-1111-7000-8000-000000000003';

const PLACE_IDS: [string, string, string] = [
  '018f4a0c-4234-7000-8000-000000000001',
  '018f4a0c-4234-7000-8000-000000000002',
  '018f4a0c-4234-7000-8000-000000000003',
];

const BIZ_IDS: [string, string, string] = [
  '018f4a0c-6234-7000-8000-000000000001',
  '018f4a0c-6234-7000-8000-000000000002',
  '018f4a0c-6234-7000-8000-000000000003',
];

const ARTICLE_IDS: [string, string, string] = [
  '018f4a0c-8234-7000-8000-000000000001',
  '018f4a0c-8234-7000-8000-000000000002',
  '018f4a0c-8234-7000-8000-000000000003',
];

const HARVEST_ID = '018f4a0c-3234-7000-8000-000000000001';
const BIZ_TYPE_ID = '018f4a0c-5234-7000-8000-000000000001';
const ARTICLE_CAT_ID = '018f4a0c-7234-7000-8000-000000000001';

/**
 * Generates a 1x1 PNG file and computes its SHA-256 hash.
 */
async function generatePlaceholderImage(fileName: string): Promise<{ hash: string; size: number }> {
  // 1x1 transparent PNG
  const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
  const buffer = Buffer.from(base64Png, 'base64');
  
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'seed');
  await fs.mkdir(uploadDir, { recursive: true });
  
  const filePath = path.join(uploadDir, fileName);
  await fs.writeFile(filePath, buffer);
  
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  return { hash, size: buffer.length };
}

async function main() {
  console.info('🌱 Starting Phase 5.2 Database Seeding...');

  try {
    await db.transaction(async (tx) => {
      // 1. Setup System User
      await tx.insert(users).values({
        id: SEED_AUTHOR_ID,
        email: 'system.seed@hoangsuphi.local',
        passwordHash: '$2b$12$L8F.Yg2M3E/6L.n3G6Wc.ee6XoYvN1.B.Pz4C1C.Q7iU1G5U.Q1Oa', // Valid bcrypt hash for dummy password
        status: 'active',
        failedLoginAttempts: 0,
        permissionsVersion: 1,
      }).onConflictDoNothing();

      // 2. Region Hierarchy
      await tx.insert(regions).values([
        {
          id: HA_GIANG_ID,
          parentId: null,
          name: 'Hà Giang',
          slug: 'ha-giang',
          level: 1,
          path: 'ha_giang',
        },
        {
          id: HSP_ID,
          parentId: HA_GIANG_ID,
          name: 'Hoàng Su Phì',
          slug: 'hoang-su-phi',
          level: 2,
          path: 'ha_giang.hoang_su_phi',
        },
        {
          id: BAN_PHUNG_ID,
          parentId: HSP_ID,
          name: 'Bản Phùng (Seed)',
          slug: 'ban-phung-seed',
          level: 3,
          path: 'ha_giang.hoang_su_phi.ban_phung_seed',
          description: 'Xã Bản Phùng có những ruộng bậc thang đẹp nhất Hoàng Su Phì',
          latitude: '22.784400',
          longitude: '104.664400',
          geom: { lng: 104.6644, lat: 22.7844 },
        }
      ]).onConflictDoNothing();

      // 3. Attraction Categories (Featured Topics)
      const topics = [
        { code: 'ruong-bac-thang', name: 'Ruộng bậc thang', mapColor: '#FFD700', isUtility: false },
        { code: 'cho-phien', name: 'Chợ phiên', mapColor: '#FF6347', isUtility: false },
        { code: 'van-hoa', name: 'Văn hóa bản địa', mapColor: '#8A2BE2', isUtility: false },
        { code: 'trekking', name: 'Trekking và thiên nhiên', mapColor: '#228B22', isUtility: false },
      ];
      for (const topic of topics) {
        await tx.insert(attractionCategories).values({
          id: generateUuidV7(),
          ...topic,
        }).onConflictDoNothing({ target: attractionCategories.code });
      }

      // 4. Business Type & Article Category
      await tx.insert(businessTypes).values({
        id: BIZ_TYPE_ID,
        code: 'homestay_seed',
        name: 'Homestay Seed',
        icon: 'home',
        mapColor: '#FF5733',
        sortOrder: 1,
      }).onConflictDoNothing();

      await tx.insert(articleCategories).values({
        id: ARTICLE_CAT_ID,
        code: 'cam-nang-seed',
        name: 'Cẩm Nang Seed',
        description: 'Cẩm nang du lịch Hoàng Su Phì',
      }).onConflictDoNothing();

      // 5. Insert Entities without Media
      // Tourist Places
      await tx.insert(touristPlaces).values([
        {
          id: PLACE_IDS[0],
          regionId: BAN_PHUNG_ID,
          name: 'Ruộng bậc thang Bản Phùng',
          slug: 'ruong-bac-thang-ban-phung',
          location: { lng: 104.6644, lat: 22.7844 },
          status: 'active',
          coverUrl: null, // Pending media
          createdAt: new Date('2026-07-01T00:00:00Z'),
        },
        {
          id: PLACE_IDS[1],
          regionId: BAN_PHUNG_ID,
          name: 'Đỉnh Tây Côn Lĩnh',
          slug: 'dinh-tay-con-linh',
          location: { lng: 104.8111, lat: 22.7750 },
          status: 'active',
          coverUrl: null,
          createdAt: new Date('2026-07-02T00:00:00Z'),
        },
        {
          id: PLACE_IDS[2],
          regionId: BAN_PHUNG_ID,
          name: 'Chợ phiên Hoàng Su Phì',
          slug: 'cho-phien-hoang-su-phi',
          location: { lng: 104.6833, lat: 22.7500 },
          status: 'active',
          coverUrl: null,
          createdAt: new Date('2026-07-03T00:00:00Z'),
        },
      ]).onConflictDoNothing();

      // Businesses
      await tx.insert(businesses).values([
        {
          id: BIZ_IDS[0],
          regionId: BAN_PHUNG_ID,
          businessTypeId: BIZ_TYPE_ID,
          name: 'Homestay Bản Phùng 1',
          slug: 'homestay-ban-phung-1',
          location: { lng: 104.6644, lat: 22.7844 },
          status: 'active',
          coverUrl: null,
          createdAt: new Date('2026-07-01T00:00:00Z'),
        },
        {
          id: BIZ_IDS[1],
          regionId: BAN_PHUNG_ID,
          businessTypeId: BIZ_TYPE_ID,
          name: 'Homestay Bản Phùng 2',
          slug: 'homestay-ban-phung-2',
          location: { lng: 104.6650, lat: 22.7850 },
          status: 'active',
          coverUrl: null,
          createdAt: new Date('2026-07-02T00:00:00Z'),
        },
        {
          id: BIZ_IDS[2],
          regionId: BAN_PHUNG_ID,
          businessTypeId: BIZ_TYPE_ID,
          name: 'Homestay Bản Phùng 3',
          slug: 'homestay-ban-phung-3',
          location: { lng: 104.6660, lat: 22.7860 },
          status: 'active',
          coverUrl: null,
          createdAt: new Date('2026-07-03T00:00:00Z'),
        },
      ]).onConflictDoNothing();

      // Articles
      await tx.insert(articles).values([
        {
          id: ARTICLE_IDS[0],
          title: 'Kinh nghiệm du lịch Hoàng Su Phì',
          slug: 'kinh-nghiem-du-lich-hoang-su-phi',
          excerpt: 'Tất cả những gì bạn cần biết để có một chuyến đi hoàn hảo',
          content: 'Nội dung chi tiết...',
          authorId: SEED_AUTHOR_ID,
          categoryId: ARTICLE_CAT_ID,
          status: 'published',
          thumbnailId: null,
          publishedAt: new Date('2026-07-01T00:00:00Z'),
        },
        {
          id: ARTICLE_IDS[1],
          title: 'Các món ăn đặc sản Hoàng Su Phì',
          slug: 'dac-san-hoang-su-phi',
          excerpt: 'Thịt trâu gác bếp, cốm nếp nương...',
          content: 'Nội dung chi tiết...',
          authorId: SEED_AUTHOR_ID,
          categoryId: ARTICLE_CAT_ID,
          status: 'published',
          thumbnailId: null,
          publishedAt: new Date('2026-07-02T00:00:00Z'),
        },
        {
          id: ARTICLE_IDS[2],
          title: 'Mùa lúa chín Hoàng Su Phì',
          slug: 'mua-lua-chin-hoang-su-phi',
          excerpt: 'Thời gian đẹp nhất để ngắm lúa chín',
          content: 'Nội dung chi tiết...',
          authorId: SEED_AUTHOR_ID,
          categoryId: ARTICLE_CAT_ID,
          status: 'published',
          thumbnailId: null,
          publishedAt: new Date('2026-07-03T00:00:00Z'),
        },
      ]).onConflictDoNothing();

      // Harvest Update
      await tx.insert(harvestUpdates).values({
        id: HARVEST_ID,
        regionId: BAN_PHUNG_ID,
        stage: 'RIPENING',
        observedAt: new Date('2026-07-20T12:00:00Z'),
        title: 'Mùa lúa chín 2026',
        summary: 'Lúa đã bắt đầu ngả vàng tại Bản Phùng',
        status: 'PUBLISHED',
        createdBy: SEED_AUTHOR_ID,
        publishedAt: new Date('2026-07-21T00:00:00Z'),
      }).onConflictDoNothing();

      // 6. Media Pipeline & Association
      const allOwners = [
        ...PLACE_IDS.map(id => ({ type: 'PLACE', id, table: touristPlaces, field: 'coverUrl' })),
        ...BIZ_IDS.map(id => ({ type: 'BUSINESS', id, table: businesses, field: 'coverUrl' })),
        ...ARTICLE_IDS.map(id => ({ type: 'ARTICLE', id, table: articles, field: 'thumbnailId' })),
        { type: 'HARVEST_UPDATE', id: HARVEST_ID, table: null, field: null } // No back-ref for harvest
      ];

      for (let i = 0; i < allOwners.length; i++) {
        const owner = allOwners[i];
        if (!owner) continue;

        const mediaId = generateUuidV7();
        const fileName = `${owner.type.toLowerCase()}-${owner.id}.png`;
        const storageKey = `seed/${fileName}`;
        
        // Ensure physical file exists and get hash
        const { hash, size } = await generatePlaceholderImage(fileName);

        // Insert Media record
        await tx.insert(media).values({
          id: mediaId,
          fileName,
          storageKey,
          mimeType: 'image/png',
          mediaType: 'IMAGE',
          fileSize: size,
          hash: hash, // Genuine SHA-256
          status: 'READY',
          storageProvider: 'LOCAL',
          ownerType: owner.type,
          ownerId: owner.id,
          uploadedBy: SEED_AUTHOR_ID,
          createdAt: new Date(),
        }).onConflictDoNothing();

        // Update Entity to point to Media (if applicable)
        if (owner.table && owner.field) {
          // Dynamic update based on the owner's schema
          if (owner.field === 'coverUrl') {
            // biome-ignore lint/suspicious/noExplicitAny: Dynamic table access by design
            await tx.update(owner.table as any).set({ coverUrl: `/uploads/${storageKey}` }).where(eq(sql`id`, owner.id));
          } else if (owner.field === 'thumbnailId') {
            // biome-ignore lint/suspicious/noExplicitAny: Dynamic table access by design
            await tx.update(owner.table as any).set({ thumbnailId: mediaId }).where(eq(sql`id`, owner.id));
          }
        }
      }
    });

    console.info('✅ Phase 5.2 Seeding completed successfully.');
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    process.exit(1);
  }
}

main().then(() => process.exit(0));
