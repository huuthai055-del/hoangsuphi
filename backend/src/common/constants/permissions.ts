export const Permissions = {
  Harvest: {
    Write: 'harvest:write',
  },
  Itinerary: {
    Create: 'itinerary:create',
    Read: 'itinerary:read',
    Update: 'itinerary:update',
    Delete: 'itinerary:delete',
  },
  Faq: {
    Create: 'faq:create',
    Update: 'faq:update',
    Delete: 'faq:delete',
  },
  TopList: {
    Create: 'toplist:create',
    Update: 'toplist:update',
    Delete: 'toplist:delete',
  },
  Notification: {
    Create: 'notification:create',
    Read: 'notification:read',
    Update: 'notification:update',
    Dismiss: 'notification:dismiss',
    Delete: 'notification:delete',
  },
} as const;
