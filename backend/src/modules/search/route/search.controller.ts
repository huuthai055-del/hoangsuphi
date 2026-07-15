import type { Context } from 'hono';
import type { SearchQueryDto, SearchResponseDto } from '../dto/search.dto';

export interface SearchApplicationService {
  search(query: SearchQueryDto): Promise<SearchResponseDto>;
}

export class SearchController {
  constructor(private readonly service: SearchApplicationService) {}

  public search = async (c: Context): Promise<Response> => {
    const query = c.get('validQuery') as SearchQueryDto;
    const response = await this.service.search(query);
    return c.json(response, 200);
  };
}
