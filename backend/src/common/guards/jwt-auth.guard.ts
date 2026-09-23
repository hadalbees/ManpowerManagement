import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const handler = context.getHandler();
    const controller = context.getClass();

    const isPublic =
      Reflect.getMetadata(IS_PUBLIC_KEY, handler) ??
      Reflect.getMetadata(IS_PUBLIC_KEY, controller);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException({
          code: 'AUTH_UNAUTHORIZED',
          message: 'Authentication token is missing or invalid',
        })
      );
    }

    return user;
  }
}