import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { UsersService } from '../users/users.service';
import { User, UserRole, UserStatus } from '../../database/entities/user.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import { hashPassword, comparePassword } from '../../common/utils/password.util';
import { OtpService } from '../../common/services/otp.service';
import { SocialLoginService } from './services/social-login.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../database/entities/notification.entity';
import { v4 as uuidv4 } from 'uuid';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { LoginResponseDto, SignupResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private otpService: OtpService,
    private socialLoginService: SocialLoginService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  async validateUser(identifier: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByIdentifier(identifier);
    if (!user || !user.passwordHash) {
      return null;
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<LoginResponseDto> {
    const user = await this.validateUser(loginDto.identifier, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // Check 2FA
    if (user.twoFactorEnabled && !loginDto.twoFactorCode) {
      return {
        requiresTwoFactor: true,
        message: 'Two-factor authentication required',
        tokens: null as any,
        user: null as any,
      };
    }

    if (user.twoFactorEnabled && loginDto.twoFactorCode) {
      // TODO: Implement 2FA verification
    }

    const tokens = await this.generateTokens(user, ipAddress, userAgent);
    const userResponse = await this.usersService.toResponseDto(user);

    // Send login alert notification (async, non-blocking)
    this.notificationsService.createNotification({
      userId: user.id,
      title: 'New Login Detected',
      message: `You logged in from ${ipAddress || 'unknown location'}. If this wasn't you, please secure your account.`,
      type: NotificationType.LOGIN_ALERT,
      metadata: {
        ipAddress,
        userAgent,
        link: '/profile',
      },
    }).catch((err) => {
      // Silently fail - login alerts are not critical
      console.error(`Failed to create login alert notification: ${err.message}`);
    });

    return {
      tokens,
      user: userResponse,
    };
  }

  async signup(signupDto: SignupDto): Promise<SignupResponseDto> {
    if (!signupDto.email && !signupDto.phoneNumber) {
      throw new BadRequestException('Either email or phone number is required');
    }

    if (!signupDto.termsAccepted) {
      throw new BadRequestException('Terms must be accepted');
    }

    // Check if user exists
    if (signupDto.email) {
      const existingUser = await this.usersService.findByEmail(signupDto.email);
      if (existingUser) {
        throw new BadRequestException('Email already registered');
      }
    }

    if (signupDto.phoneNumber) {
      const existingUser = await this.usersService.findByPhone(signupDto.phoneNumber);
      if (existingUser) {
        throw new BadRequestException('Phone number already registered');
      }
    }

    const passwordHash = await hashPassword(signupDto.password);
    const roles = signupDto.roles || [UserRole.ATTENDEE];

    const user = await this.usersService.create({
      email: signupDto.email?.toLowerCase(),
      phoneNumber: signupDto.phoneNumber,
      passwordHash,
      firstName: signupDto.firstName,
      lastName: signupDto.lastName,
      roles: roles.join(','),
      activeRole: roles[0],
      status: UserStatus.PENDING,
    });

    const tokens = await this.generateTokens(user);

    return {
      tokens,
      user: await this.usersService.toResponseDto(user),
      phoneVerification: signupDto.phoneNumber
        ? {
            phoneNumber: signupDto.phoneNumber,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          }
        : undefined,
    };
  }

  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshTokenExpiresIn: number;
  }> {
    const token = await this.refreshTokenRepository.findOne({
      where: {
        token: refreshToken,
        revokedAt: IsNull(),
      },
      relations: ['user'],
    });

    if (!token || !token.user || token.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old token
    token.revokedAt = new Date();
    await this.refreshTokenRepository.save(token);

    // Generate new tokens
    return await this.generateTokens(token.user);
  }

  async sendOtp(phoneNumber: string): Promise<{ sent: boolean; expiresIn: number }> {
    return this.otpService.sendOtp(phoneNumber);
  }

  async verifyPhone(phoneNumber: string, otp: string): Promise<{ verified: boolean }> {
    const isValid = await this.otpService.verifyOtp(phoneNumber, otp);
    
    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const user = await this.usersService.findByPhone(phoneNumber);
    if (!user) {
      throw new BadRequestException('Phone number not found');
    }

    // Mark phone as verified
    await this.usersService.update(user.id, { isPhoneVerified: true });

    return { verified: true };
  }

  async socialLogin(socialLoginDto: {
    provider: string;
    accessToken: string;
    idToken?: string;
  }): Promise<LoginResponseDto> {
    const user = await this.socialLoginService.processSocialLogin(
      socialLoginDto.provider,
      socialLoginDto.accessToken,
      socialLoginDto.idToken,
    );

    const tokens = await this.generateTokens(user);
    const userResponse = await this.usersService.toResponseDto(user);

    return {
      tokens,
      user: userResponse,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const token = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
    });

    if (token) {
      token.revokedAt = new Date();
      await this.refreshTokenRepository.save(token);
    }
  }

  private async generateTokens(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshTokenExpiresIn: number;
  }> {
    const payload = {
      sub: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      activeRole: user.activeRole,
      roles: user.roles ? user.roles.split(',').map((r) => r.trim()) : [],
    };

    const accessTokenTtl = this.configService.get<number>('jwt.accessTokenTtl') || 3600;
    const refreshTokenTtl = this.configService.get<number>('jwt.refreshTokenTtl') || 2592000;

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTokenTtl,
    });

    const refreshTokenValue = uuidv4();
    const refreshToken = await this.refreshTokenRepository.save({
      tokenId: uuidv4(),
      userId: user.id,
      token: refreshTokenValue,
      expiresAt: new Date(Date.now() + refreshTokenTtl * 1000),
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      refreshToken: refreshToken.token,
      expiresIn: accessTokenTtl,
      refreshTokenExpiresIn: refreshTokenTtl,
    };
  }
}

