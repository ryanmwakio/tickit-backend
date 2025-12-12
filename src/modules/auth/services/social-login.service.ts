import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { UsersService } from '../../users/users.service';
import { User, UserRole, UserStatus } from '../../../database/entities/user.entity';
import { Role } from '../../../database/entities/role.entity';
import { UsersModule } from '../../users/users.module';

@Injectable()
export class SocialLoginService {
  private readonly logger = new Logger(SocialLoginService.name);

  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  /**
   * Verify Google ID token
   */
  private async verifyGoogleToken(idToken: string): Promise<{
    sub: string;
    email: string;
    name: string;
    picture?: string;
  }> {
    try {
      // In production, verify token with Google's API
      // For now, decode JWT (in production, verify signature)
      const response = await axios.get(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
      );
      
      return {
        sub: response.data.sub,
        email: response.data.email,
        name: response.data.name,
        picture: response.data.picture,
      };
    } catch (error: any) {
      this.logger.error('Error verifying Google token:', error);
      throw new BadRequestException('Invalid Google token');
    }
  }

  /**
   * Verify Facebook access token
   */
  private async verifyFacebookToken(accessToken: string): Promise<{
    id: string;
    email: string;
    name: string;
    picture?: { data: { url: string } };
  }> {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/me?fields=id,email,name,picture&access_token=${accessToken}`,
      );
      
      return response.data;
    } catch (error: any) {
      this.logger.error('Error verifying Facebook token:', error);
      throw new BadRequestException('Invalid Facebook token');
    }
  }

  /**
   * Verify Apple ID token
   */
  private async verifyAppleToken(idToken: string): Promise<{
    sub: string;
    email: string;
    name?: string;
  }> {
    // TODO: Implement Apple ID token verification
    // Apple uses JWT with specific claims that need to be verified
    throw new BadRequestException('Apple login not yet implemented');
  }

  /**
   * Process social login
   */
  async processSocialLogin(
    provider: string,
    accessToken: string,
    idToken?: string,
  ): Promise<User> {
    let userInfo: {
      id: string;
      email: string;
      name: string;
      picture?: string;
    };

    switch (provider) {
      case 'google':
        if (!idToken) {
          throw new BadRequestException('ID token required for Google login');
        }
        const googleInfo = await this.verifyGoogleToken(idToken);
        userInfo = {
          id: googleInfo.sub,
          email: googleInfo.email,
          name: googleInfo.name,
          picture: googleInfo.picture,
        };
        break;

      case 'facebook':
        const facebookInfo = await this.verifyFacebookToken(accessToken);
        userInfo = {
          id: facebookInfo.id,
          email: facebookInfo.email,
          name: facebookInfo.name,
          picture: facebookInfo.picture?.data?.url,
        };
        break;

      case 'apple':
        if (!idToken) {
          throw new BadRequestException('ID token required for Apple login');
        }
        const appleInfo = await this.verifyAppleToken(idToken);
        userInfo = {
          id: appleInfo.sub,
          email: appleInfo.email,
          name: appleInfo.name || 'Apple User',
        };
        break;

      default:
        throw new BadRequestException(`Unsupported provider: ${provider}`);
    }

    // Find or create user
    let user = await this.usersService.findByEmail(userInfo.email);

    if (!user) {
      // Create new user
      const [firstName, ...lastNameParts] = userInfo.name.split(' ');
      const lastName = lastNameParts.join(' ') || '';

      user = await this.usersService.create({
        email: userInfo.email.toLowerCase(),
        firstName,
        lastName,
        avatarUrl: userInfo.picture,
        activeRole: UserRole.ATTENDEE,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        metadata: {
          socialProvider: provider,
          socialId: userInfo.id,
        },
      });

      // Assign ATTENDEE role
      const role = await this.roleRepository.findOne({
        where: { name: 'ATTENDEE' },
      });
      if (role) {
        // Get user repository from usersService
        const userRepo = this.usersService['userRepository'];
        const userWithRoles = await userRepo.findOne({
          where: { id: user.id },
          relations: ['rolesList'],
        });
        if (userWithRoles) {
          userWithRoles.rolesList = [role];
          await userRepo.save(userWithRoles);
        }
      }
    } else {
      // Update existing user if needed
      if (userInfo.picture && !user.avatarUrl) {
        user.avatarUrl = userInfo.picture;
        await this.usersService.update(user.id, { avatarUrl: userInfo.picture });
      }
    }

    return user;
  }
}

