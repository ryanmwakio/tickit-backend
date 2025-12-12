import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';

/**
 * Interceptor to extract and set user from JWT token for public routes
 * This ensures @CurrentUser() works even when the guard doesn't set request.user
 */
@Injectable()
export class OptionalAuthInterceptor implements NestInterceptor {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // Only set user if not already set by guard
    if (!request.user) {
      const authHeader = request.headers?.authorization;
      if (authHeader) {
        const token = authHeader.split(' ')[1]; // Extract token from "Bearer <token>"
        if (token) {
          try {
            const secret = this.configService.get<string>('jwt.secret');
            if (secret) {
              const payload = this.jwtService.verify(token, { secret });
              if (payload?.sub) {
                const user = await this.userRepository.findOne({ where: { id: payload.sub } });
                if (user) {
                  request.user = user;
                  if (process.env.NODE_ENV === 'development') {
                    console.log(`[OptionalAuthInterceptor] Set user from token: ${user.id}`);
                  }
                }
              }
            }
          } catch (error) {
            // Token invalid or expired - that's okay for public routes
            // Just leave request.user as undefined
            if (process.env.NODE_ENV === 'development') {
              console.log(`[OptionalAuthInterceptor] Token verification failed: ${error?.message || 'unknown error'}`);
            }
          }
        }
      }
    }

    return next.handle();
  }
}

