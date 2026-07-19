import { z } from 'zod';
import { HARVEST_MEDIA_MAX_IMAGES } from '../harvest-status.constants';

export const stageEnum = z.enum([
  'PREPARING',
  'TRANSPLANTING',
  'GREEN',
  'RIPENING',
  'GOLDEN',
  'HARVESTING',
  'OFF_SEASON',
]);

export const CreateHarvestUpdateDto = z
  .object({
    regionId: z.string().uuid(),
    stage: stageEnum,
    observedAt: z.string().datetime({ offset: true }),
    title: z.string().trim().min(5).max(150),
    summary: z.string().trim().min(20).max(2000),
    advisory: z
      .string()
      .trim()
      .max(1500)
      .optional()
      .nullable()
      .transform((val) => (val === '' ? null : val || null)),
    mediaIds: z.array(z.string().uuid()).max(HARVEST_MEDIA_MAX_IMAGES).optional().default([]),
  })
  .strict();

export const PatchHarvestUpdateDto = z
  .object({
    regionId: z.string().uuid().optional(),
    stage: stageEnum.optional(),
    observedAt: z.string().datetime({ offset: true }).optional(),
    title: z.string().trim().min(5).max(150).optional(),
    summary: z.string().trim().min(20).max(2000).optional(),
    advisory: z
      .string()
      .trim()
      .max(1500)
      .optional()
      .nullable()
      .transform((val) => {
        if (val === undefined) return undefined;
        return val === '' ? null : val || null;
      }),
    // Phase 4.8 supports append-only ownership. Replacing or detaching media
    // would require a Media lifecycle operation that is intentionally out of scope.
    attachMediaIds: z.array(z.string().uuid()).min(1).max(HARVEST_MEDIA_MAX_IMAGES).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Patch body cannot be empty',
  });

export type CreateHarvestUpdateType = z.infer<typeof CreateHarvestUpdateDto>;
export type PatchHarvestUpdateType = z.infer<typeof PatchHarvestUpdateDto>;
