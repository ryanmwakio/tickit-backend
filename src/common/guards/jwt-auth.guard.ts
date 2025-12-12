import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private context: ExecutionContext | null = null;

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    this.context = context;
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // For public routes, always try to authenticate if token is present
      // but don't fail the request if authentication fails
      const request = context.switchToHttp().getRequest();
      const token = this.extractTokenFromHeader(request);
      
      if (token) {
        // Try to authenticate - handleRequest will process the result
        // We need to ensure the promise chain completes so handleRequest is called
        try {
          const result = super.canActivate(context);
          // If it's a promise, we need to handle it properly
          if (result instanceof Promise) {
            return result.then(
              (value) => value,
              (error) => {
                // Error occurred - explicitly set user to undefined and allow request
                request.user = undefined;
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[JwtAuthGuard] Auth failed for public route: ${error?.message || 'unknown error'}`);
                }
                return true;
              }
            );
          }
          return result;
        } catch (error) {
          // Synchronous error - explicitly set user to undefined and allow request
          request.user = undefined;
          if (process.env.NODE_ENV === 'development') {
            console.log(`[JwtAuthGuard] Sync auth error for public route: ${error?.message || 'unknown error'}`);
          }
          return true;
        }
      }
      // No token, allow access - but ensure request.user is explicitly undefined
      request.user = undefined;
      return true;
    }

    return super.canActivate(context);
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  handleRequest(err: any, user: any, info: any) {
    if (!this.context) {
      // Fallback to default behavior if context not available
      if (err || !user) {
        throw err || new UnauthorizedException('Unauthorized');
      }
      return user;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      this.context.getHandler(),
      this.context.getClass(),
    ]);

    const request = this.context.switchToHttp().getRequest();

    // For public routes, return user if authenticated, or undefined if not
    // This allows the route to work for both authenticated and unauthenticated users
    if (isPublic) {
      // Always set request.user, even if undefined
      // This is critical for @CurrentUser() decorator to work
      request.user = user || undefined;
      
      // Log for debugging (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[JwtAuthGuard] Public route - user: ${user?.id || 'undefined'}, error: ${err?.message || 'none'}`);
      }
      
      if (err || !user) {
        return undefined;
      }
      return user;
    }

    // For protected routes, use default behavior (throw on error)
    if (err || !user) {
      throw err || new UnauthorizedException('Unauthorized');
    }
    return user;
  }
}

