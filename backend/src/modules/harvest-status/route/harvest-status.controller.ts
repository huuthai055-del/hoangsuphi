import type { AppEnv } from '@/common/types/app-env';
import type { Context } from 'hono';
import type { CreateHarvestUpdateType, PatchHarvestUpdateType } from '../dto/harvest-status.dto';
import type { HarvestStatusService } from '../service/harvest-status.service';

export class HarvestStatusController {
  constructor(private readonly harvestService: HarvestStatusService) {}

  public create = async (c: Context<AppEnv>): Promise<Response> => {
    const data = c.get('validBody') as CreateHarvestUpdateType;
    const result = await this.harvestService.create(data, c.get('user').id);
    return c.json({ data: result, meta: null, error: null }, 201);
  };

  public patch = async (c: Context<AppEnv>): Promise<Response> => {
    const { id } = c.get('validParams') as { id: string };
    const data = c.get('validBody') as PatchHarvestUpdateType;
    await this.harvestService.patch(id, data, c.get('user').id);
    return c.json({ data: { success: true }, meta: null, error: null });
  };

  public publish = async (c: Context<AppEnv>): Promise<Response> => {
    const { id } = c.get('validParams') as { id: string };
    await this.harvestService.publish(id, c.get('user').id);
    return c.json({ data: { success: true }, meta: null, error: null });
  };

  public archive = async (c: Context<AppEnv>): Promise<Response> => {
    const { id } = c.get('validParams') as { id: string };
    await this.harvestService.archive(id, c.get('user').id);
    return c.json({ data: { success: true }, meta: null, error: null });
  };
}
