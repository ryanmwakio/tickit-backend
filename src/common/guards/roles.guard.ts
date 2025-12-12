import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../database/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return false;
    }

    // Check roles string (comma-separated, deprecated but still supported)
    const userRoles: string[] = user.roles
      ? user.roles.split(',').map((r: string) => r.trim().toUpperCase())
      : [];

    // Also check activeRole (convert enum to string)
    if (user.activeRole) {
      const activeRoleStr = typeof user.activeRole === 'string' 
        ? user.activeRole.toUpperCase() 
        : String(user.activeRole).toUpperCase();
      if (!userRoles.includes(activeRoleStr)) {
        userRoles.push(activeRoleStr);
      }
    }

    // Check rolesList relation if loaded
    if (user.rolesList && Array.isArray(user.rolesList)) {
      user.rolesList.forEach((role) => {
        if (role.name) {
          const roleName = role.name.toUpperCase();
          if (!userRoles.includes(roleName)) {
            userRoles.push(roleName);
          }
        }
      });
    }

    // Convert required roles to uppercase strings for comparison
    const requiredRolesStr = requiredRoles.map((role) => 
      typeof role === 'string' ? role.toUpperCase() : String(role).toUpperCase()
    );

    return requiredRolesStr.some((role) => userRoles.includes(role));
  }
}

