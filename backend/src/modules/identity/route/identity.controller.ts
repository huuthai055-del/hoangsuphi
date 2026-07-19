import { AuthenticationError } from '@/common/errors/http.errors';
import { extractClientIp } from '@/common/utils/ip';
import type { Context } from 'hono';
import type {
  ChangePasswordRequestDto,
  LoginRequestDto,
  LoginResponseDto,
  RefreshRequestDto,
  RegisterRequestDto,
} from '../dto/identity.dto';
import type { IAuthService } from '../service/auth.service';

export class IdentityController {
  constructor(private readonly authService: IAuthService) {}

  public register = async (c: Context) => {
    const body = c.get('validBody') as RegisterRequestDto;
    const user = await this.authService.register(body.email, body.password, body.displayName || '');

    return c.json(
      {
        id: user.id,
        email: user.email,
        permissionsVersion: user.permissionsVersion,
      },
      201
    );
  };

  public login = async (c: Context) => {
    const body = c.get('validBody') as LoginRequestDto;

    const ipAddress = extractClientIp(c);
    const userAgent = c.req.header('user-agent') || null;
    const deviceName = c.req.header('x-device-name') || null;

    const result = await this.authService.login(
      body.email,
      body.password,
      ipAddress,
      userAgent,
      deviceName
    );

    const response: LoginResponseDto = {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      session: {
        id: result.session.id,
        userId: result.session.userId,
        ipAddress: result.session.ipAddress,
        userAgent: result.session.userAgent,
        deviceName: result.session.deviceName,
        isRevoked: result.session.isRevoked,
        expiresAt: result.session.expiresAt.toISOString(),
        createdAt: result.session.createdAt.toISOString(),
        updatedAt: result.session.updatedAt.toISOString(),
      },
      user: result.user,
    };

    return c.json(response, 200);
  };

  public refresh = async (c: Context) => {
    const body = c.get('validBody') as RefreshRequestDto;
    const result = await this.authService.refreshToken(body.refreshToken);

    return c.json(result, 200);
  };

  public logout = async (c: Context) => {
    const user = c.get('user');
    if (!user || !user.sessionId) {
      throw new AuthenticationError('Authentication required');
    }

    await this.authService.logout(user.sessionId);
    return c.body(null, 204);
  };

  public logoutAll = async (c: Context) => {
    const user = c.get('user');
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    await this.authService.logoutAllDevices(user.id);
    return c.body(null, 204);
  };

  public changePassword = async (c: Context) => {
    const user = c.get('user');
    if (!user) {
      throw new AuthenticationError('Authentication required');
    }

    const body = c.get('validBody') as ChangePasswordRequestDto;
    await this.authService.changePassword(user.id, body.currentPassword, body.newPassword);

    return c.body(null, 204);
  };
}
