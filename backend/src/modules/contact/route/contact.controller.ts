import type { Context } from 'hono';
import type { ContactDto } from '../dto/contact.dto';
import type { ContactService } from '../service/contact.service';

export class ContactController {
  constructor(
    private readonly contactService: ContactService
  ) {}

  public submit = async (c: Context): Promise<Response> => {
    const dto = c.get('validBody') as ContactDto;
    await this.contactService.submitContact(
      dto,
      c.req.header('Idempotency-Key'),
      c.res.headers.get('x-request-id') ?? undefined
    );

    return c.json({
      data: {
        message: 'Liên hệ đã được gửi thành công.',
      },
    });
  };
}
