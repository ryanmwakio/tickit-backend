import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private redisService: RedisService,
    private configService: ConfigService,
  ) {}

  /**
   * Generate a random OTP code
   */
  private generateOtp(length: number = 6): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

  /**
   * Send OTP to phone number
   */
  async sendOtp(phoneNumber: string): Promise<{ sent: boolean; expiresIn: number }> {
    const otp = this.generateOtp(6);
    const expiresIn = 600; // 10 minutes
    const otpKey = `otp:${phoneNumber}`;

    try {
      // Store OTP in Redis with expiration
      await this.redisService.set(otpKey, otp, expiresIn);

      // TODO: Integrate with SMS provider (Twilio, Africa's Talking, etc.)
      // For now, log the OTP (in development only)
      if (this.configService.get('NODE_ENV') === 'development') {
        this.logger.log(`OTP for ${phoneNumber}: ${otp} (expires in ${expiresIn}s)`);
      }

      // In production, send via SMS provider
      // await this.sendSms(phoneNumber, `Your TixHub verification code is: ${otp}. Valid for 10 minutes.`);

      return {
        sent: true,
        expiresIn,
      };
    } catch (error) {
      this.logger.error(`Error sending OTP to ${phoneNumber}:`, error);
      throw error;
    }
  }

  /**
   * Verify OTP
   */
  async verifyOtp(phoneNumber: string, otp: string): Promise<boolean> {
    const otpKey = `otp:${phoneNumber}`;

    try {
      const storedOtp = await this.redisService.get(otpKey);

      if (!storedOtp) {
        return false; // OTP expired or doesn't exist
      }

      if (storedOtp !== otp) {
        return false; // Invalid OTP
      }

      // OTP is valid, delete it to prevent reuse
      await this.redisService.del(otpKey);

      return true;
    } catch (error) {
      this.logger.error(`Error verifying OTP for ${phoneNumber}:`, error);
      return false;
    }
  }

  /**
   * Send SMS via provider (stub - implement with actual SMS provider)
   */
  private async sendSms(phoneNumber: string, message: string): Promise<void> {
    // TODO: Implement with Twilio, Africa's Talking, or other SMS provider
    // Example with Twilio:
    /*
    const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get('TWILIO_AUTH_TOKEN');
    const fromNumber = this.configService.get('TWILIO_PHONE_NUMBER');
    
    const client = require('twilio')(accountSid, authToken);
    
    await client.messages.create({
      body: message,
      from: fromNumber,
      to: phoneNumber,
    });
    */
    
    this.logger.log(`SMS to ${phoneNumber}: ${message}`);
  }
}

