import { db } from './client';
import {
  businessTypes,
  attractionCategories,
  amenities,
  regions,
  users,
  userProfiles,
} from './schema';

// Helper to generate UUIDv7 in application layer
function generateUuidV7(): string {
  const timestamp = Date.now();
  const hexTimestamp = timestamp.toString(16).padStart(12, '0');
  const randomBytes = crypto.getRandomValues(new Uint8Array(10));
  randomBytes[0] = (randomBytes[0] & 0x0f) | 0x70; // version 7
  randomBytes[2] = (randomBytes[2] & 0x3f) | 0x80; // variant 1
  const hexRandom = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return [
    hexTimestamp.slice(0, 8),
    hexTimestamp.slice(8, 12),
    hexRandom.slice(0, 4),
    hexRandom.slice(4, 8),
    hexRandom.slice(8),
  ].join('-');
}

async function main() {
  console.info('🌱 Starting database seeding...');

  try {
    // ─── 1. SEED BUSINESS TYPES ──────────────────────────────────────────────────
    console.info('Seeding business types...');
    const bTypes = [
      {
        id: generateUuidV7(),
        code: 'homestay',
        name: 'Homestay',
        icon: 'home',
        mapColor: '#FF5733',
        sortOrder: 1,
      },
      {
        id: generateUuidV7(),
        code: 'bungalow',
        name: 'Bungalow',
        icon: 'tent',
        mapColor: '#E67E22',
        sortOrder: 2,
      },
      {
        id: generateUuidV7(),
        code: 'resort',
        name: 'Resort',
        icon: 'hotel',
        mapColor: '#9B59B6',
        sortOrder: 3,
      },
      {
        id: generateUuidV7(),
        code: 'guesthouse',
        name: 'Nhà nghỉ',
        icon: 'bed',
        mapColor: '#34495E',
        sortOrder: 4,
      },
      {
        id: generateUuidV7(),
        code: 'restaurant',
        name: 'Nhà hàng',
        icon: 'utensils',
        mapColor: '#E74C3C',
        sortOrder: 5,
      },
      {
        id: generateUuidV7(),
        code: 'cafe',
        name: 'Quán Cafe',
        icon: 'coffee',
        mapColor: '#8B4513',
        sortOrder: 6,
      },
      {
        id: generateUuidV7(),
        code: 'guide_service',
        name: 'Hướng dẫn viên',
        icon: 'user',
        mapColor: '#2ECC71',
        sortOrder: 7,
      },
      {
        id: generateUuidV7(),
        code: 'camping_site',
        name: 'Điểm cắm trại',
        icon: 'campground',
        mapColor: '#16A085',
        sortOrder: 8,
      },
      {
        id: generateUuidV7(),
        code: 'ev_charging',
        name: 'Trạm sạc xe điện',
        icon: 'battery-charging',
        mapColor: '#27AE60',
        sortOrder: 9,
      },
    ];
    for (const bType of bTypes) {
      await db.insert(businessTypes).values(bType).onConflictDoNothing();
    }

    // ─── 2. SEED ATTRACTION CATEGORIES ────────────────────────────────────────────
    console.info('Seeding attraction categories...');
    const attCategories = [
      {
        id: generateUuidV7(),
        code: 'natural',
        name: 'Danh lam thắng cảnh tự nhiên',
        mapIcon: 'landscape',
        mapColor: '#2ECC71',
        isUtility: false,
      },
      {
        id: generateUuidV7(),
        code: 'utility',
        name: 'Tiện ích hành trình (ATM/Xăng/WC)',
        mapIcon: 'info',
        mapColor: '#3498DB',
        isUtility: true,
      },
      {
        id: generateUuidV7(),
        code: 'cultural',
        name: 'Văn hóa & Lễ hội',
        mapIcon: 'flag',
        mapColor: '#F1C40F',
        isUtility: false,
      },
      {
        id: generateUuidV7(),
        code: 'historical',
        name: 'Di tích lịch sử',
        mapIcon: 'museum',
        mapColor: '#E67E22',
        isUtility: false,
      },
    ];
    for (const cat of attCategories) {
      await db.insert(attractionCategories).values(cat).onConflictDoNothing();
    }

    // ─── 3. SEED AMENITIES ────────────────────────────────────────────────────────
    console.info('Seeding amenities...');
    const ams = [
      {
        id: generateUuidV7(),
        code: 'wifi',
        name: 'Wifi miễn phí',
        icon: 'wifi',
        category: 'connectivity',
      },
      {
        id: generateUuidV7(),
        code: 'parking_car',
        name: 'Chỗ đỗ xe ô tô',
        icon: 'car',
        category: 'transport',
      },
      {
        id: generateUuidV7(),
        code: 'parking_motorbike',
        name: 'Chỗ đỗ xe máy',
        icon: 'bike',
        category: 'transport',
      },
      {
        id: generateUuidV7(),
        code: 'hot_water',
        name: 'Nước nóng tắm',
        icon: 'thermometer',
        category: 'comfort',
      },
      {
        id: generateUuidV7(),
        code: 'air_conditioner',
        name: 'Điều hòa nhiệt độ',
        icon: 'wind',
        category: 'comfort',
      },
      {
        id: generateUuidV7(),
        code: 'mountain_view',
        name: 'View núi',
        icon: 'image',
        category: 'comfort',
      },
      {
        id: generateUuidV7(),
        code: 'breakfast',
        name: 'Ăn sáng miễn phí',
        icon: 'utensils',
        category: 'food',
      },
    ];
    for (const am of ams) {
      await db.insert(amenities).values(am).onConflictDoNothing();
    }

    // ─── 4. SEED REGIONS ──────────────────────────────────────────────────────────
    console.info('Seeding regions (Hà Giang & Hoàng Su Phì)...');

    // Tỉnh Hà Giang (Province)
    const provinceId = generateUuidV7();
    const provinceData = {
      id: provinceId,
      parentId: null,
      name: 'Hà Giang',
      slug: 'ha-giang',
      level: 1, // Province
      path: 'ha_giang',
      description: 'Tỉnh Hà Giang biên giới cực Bắc Việt Nam',
      latitude: '22.823300',
      longitude: '104.983300',
      geom: { lng: 104.9833, lat: 22.8233 },
    };
    await db.insert(regions).values(provinceData).onConflictDoNothing();

    // Huyện Hoàng Su Phì (District)
    const districtId = generateUuidV7();
    const districtData = {
      id: districtId,
      parentId: provinceId,
      name: 'Hoàng Su Phì',
      slug: 'hoang-su-phi',
      level: 2, // District
      path: 'ha_giang.hoang_su_phi',
      description: 'Huyện Hoàng Su Phì nổi tiếng với ruộng bậc thang kỳ vĩ',
      latitude: '22.758300',
      longitude: '104.708300',
      geom: { lng: 104.7083, lat: 22.7583 },
    };
    await db.insert(regions).values(districtData).onConflictDoNothing();

    // Xã Bản Phùng (Commune)
    const communePhungId = generateUuidV7();
    const communePhungData = {
      id: communePhungId,
      parentId: districtId,
      name: 'Bản Phùng',
      slug: 'ban-phung',
      level: 3, // Commune
      path: 'ha_giang.hoang_su_phi.ban_phung',
      description: 'Xã Bản Phùng có những ruộng bậc thang đẹp nhất Hoàng Su Phì',
      latitude: '22.784400',
      longitude: '104.664400',
      geom: { lng: 104.6644, lat: 22.7844 },
    };
    await db.insert(regions).values(communePhungData).onConflictDoNothing();

    // Xã Thông Nguyên (Commune)
    const communeNguyenId = generateUuidV7();
    const communeNguyenData = {
      id: communeNguyenId,
      parentId: districtId,
      name: 'Thông Nguyên',
      slug: 'thong-nguyen',
      level: 3, // Commune
      path: 'ha_giang.hoang_su_phi.thong_nguyen',
      description: 'Xã Thông Nguyên - trung tâm homestay và chè Shan Tuyết cổ thụ',
      latitude: '22.683300',
      longitude: '104.750000',
      geom: { lng: 104.75, lat: 22.6833 },
    };
    await db.insert(regions).values(communeNguyenData).onConflictDoNothing();

    // ─── 5. SEED ADMIN USER ───────────────────────────────────────────────────────
    console.info('Seeding mock admin user...');
    const adminEmail = 'admin@hoangsuphi.vn';
    const adminId = generateUuidV7();

    // Hash password "Admin@123456" using Bun native password hashing with cost 12
    const passwordHash = await Bun.password.hash('Admin@123456', {
      algorithm: 'bcrypt',
      cost: 12,
    });

    const adminUser = {
      id: adminId,
      email: adminEmail,
      passwordHash: passwordHash,
      role: 'admin' as const,
      status: 'active' as const,
      failedLoginAttempts: 0,
      permissionsVersion: 1,
    };
    await db.insert(users).values(adminUser).onConflictDoNothing();

    const adminProfile = {
      id: generateUuidV7(),
      userId: adminId,
      firstName: 'Quản trị viên',
      lastName: 'Hệ thống',
      bio: 'Tài khoản quản trị viên tối cao của hệ thống cổng thông tin du lịch Hoàng Su Phì',
    };
    await db.insert(userProfiles).values(adminProfile).onConflictDoNothing();

    // ─── 6. SEED ROLES & PERMISSIONS & USER ROLES ─────────────────────────────────
    console.info('Seeding roles, permissions, and assigning role to admin user...');
    
    const { roles, permissions, rolePermissions, userRoles } = require('./schema');

    const allPermissionsList = [
      // Regions & Places
      { code: 'system:write', name: 'System Write', description: 'Modify system regions and configurations' },
      { code: 'place:write', name: 'Place Write', description: 'Create and modify tourist places' },
      // Attractions & Businesses
      { code: 'attraction:write', name: 'Attraction Write', description: 'Create and modify attractions' },
      { code: 'business:write', name: 'Business Write', description: 'Create and modify businesses' },
      // Articles
      { code: 'article:write', name: 'Article Write', description: 'Create and modify articles' },
      { code: 'article:publish', name: 'Article Publish', description: 'Publish or reject articles' },
      // Reviews & Favorites
      { code: 'review:create', name: 'Review Create', description: 'Write reviews' },
      { code: 'review:read', name: 'Review Read', description: 'View reviews list' },
      { code: 'review:update', name: 'Review Update', description: 'Edit own reviews' },
      { code: 'review:delete', name: 'Review Delete', description: 'Delete reviews' },
      { code: 'review:approve', name: 'Review Approve', description: 'Approve reviews' },
      { code: 'review:reject', name: 'Review Reject', description: 'Reject reviews' },
      { code: 'favorite:create', name: 'Favorite Create', description: 'Add to favorites' },
      { code: 'favorite:delete', name: 'Favorite Delete', description: 'Remove from favorites' },
      { code: 'favorite:read', name: 'Favorite Read', description: 'View favorites list' },
      // Media
      { code: 'media:upload', name: 'Media Upload', description: 'Upload media files' },
      { code: 'media:read', name: 'Media Read', description: 'View media details' },
      { code: 'media:delete', name: 'Media Delete', description: 'Delete media' },
      // Itineraries
      { code: 'itinerary:create', name: 'Itinerary Create', description: 'Create itineraries' },
      { code: 'itinerary:read', name: 'Itinerary Read', description: 'View itineraries' },
      { code: 'itinerary:update', name: 'Itinerary Update', description: 'Modify itineraries' },
      { code: 'itinerary:delete', name: 'Itinerary Delete', description: 'Delete itineraries' },
      // FAQs
      { code: 'faq:create', name: 'FAQ Create', description: 'Create FAQs' },
      { code: 'faq:update', name: 'FAQ Update', description: 'Modify FAQs' },
      { code: 'faq:delete', name: 'FAQ Delete', description: 'Delete FAQs' },
      // TopLists
      { code: 'toplist:create', name: 'TopList Create', description: 'Create TopLists' },
      { code: 'toplist:update', name: 'TopList Update', description: 'Modify TopLists' },
      { code: 'toplist:delete', name: 'TopList Delete', description: 'Delete TopLists' },
      // Notifications
      { code: 'notification:create', name: 'Notification Create', description: 'Create notifications' },
      { code: 'notification:read', name: 'Notification Read', description: 'Read notifications' },
      { code: 'notification:update', name: 'Notification Update', description: 'Modify notifications' },
      { code: 'notification:dismiss', name: 'Notification Dismiss', description: 'Dismiss notifications' },
      { code: 'notification:delete', name: 'Notification Delete', description: 'Delete notifications' },
    ];

    const permissionMap = new Map<string, string>();
    for (const p of allPermissionsList) {
      const pId = generateUuidV7();
      await db.insert(permissions).values({
        id: pId,
        code: p.code,
        name: p.name,
        description: p.description,
      }).onConflictDoNothing();

      const existing = await db.select({ id: permissions.id }).from(permissions).where(sql`${permissions.code} = ${p.code}`);
      permissionMap.set(p.code, existing[0]?.id || pId);
    }

    // Insert Roles
    const rolesList = [
      { code: 'admin', name: 'Admin', description: 'Super Administrator with all permissions' },
      { code: 'editor', name: 'Editor', description: 'Content Editor with write permissions' },
      { code: 'viewer', name: 'Viewer', description: 'Registered User with basic write/read permissions' },
    ];

    const roleMap = new Map<string, string>();
    for (const r of rolesList) {
      const rId = generateUuidV7();
      await db.insert(roles).values({
        id: rId,
        code: r.code,
        name: r.name,
        description: r.description,
      }).onConflictDoNothing();

      const existing = await db.select({ id: roles.id }).from(roles).where(sql`${roles.code} = ${r.code}`);
      roleMap.set(r.code, existing[0]?.id || rId);
    }

    // Link Role Permissions
    // Admin gets all
    const adminRoleId = roleMap.get('admin')!;
    for (const [_, pId] of permissionMap.entries()) {
      await db.insert(rolePermissions).values({
        roleId: adminRoleId,
        permissionId: pId,
      }).onConflictDoNothing();
    }

    // Editor permissions
    const editorRoleId = roleMap.get('editor')!;
    const editorPermissionCodes = [
      'place:write', 'attraction:write', 'business:write', 'article:write', 'article:publish',
      'review:create', 'review:read', 'review:update', 'review:delete', 'review:approve', 'review:reject',
      'favorite:create', 'favorite:delete', 'favorite:read', 'media:upload', 'media:read', 'media:delete',
      'itinerary:create', 'itinerary:read', 'itinerary:update', 'itinerary:delete',
      'faq:create', 'faq:update', 'faq:delete', 'toplist:create', 'toplist:update', 'toplist:delete',
      'notification:create', 'notification:read', 'notification:update', 'notification:dismiss', 'notification:delete'
    ];
    for (const code of editorPermissionCodes) {
      const pId = permissionMap.get(code);
      if (pId) {
        await db.insert(rolePermissions).values({
          roleId: editorRoleId,
          permissionId: pId,
        }).onConflictDoNothing();
      }
    }

    // Viewer permissions
    const viewerRoleId = roleMap.get('viewer')!;
    const viewerPermissionCodes = [
      'review:create', 'review:read', 'review:update', 'review:delete',
      'favorite:create', 'favorite:delete', 'favorite:read', 'media:upload', 'media:read',
      'itinerary:create', 'itinerary:read', 'itinerary:update', 'itinerary:delete',
      'notification:read', 'notification:dismiss'
    ];
    for (const code of viewerPermissionCodes) {
      const pId = permissionMap.get(code);
      if (pId) {
        await db.insert(rolePermissions).values({
          roleId: viewerRoleId,
          permissionId: pId,
        }).onConflictDoNothing();
      }
    }

    // Link Admin User to Admin Role
    await db.insert(userRoles).values({
      userId: adminId,
      roleId: adminRoleId,
    }).onConflictDoNothing();

    console.info('✅ Database seeding completed successfully.');
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    process.exit(1);
  }
}

main().then(() => process.exit(0));
