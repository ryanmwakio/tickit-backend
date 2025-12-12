import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class MpesaService {
  private readonly logger = new Logger(MpesaService.name);
  private axiosInstance: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(private configService: ConfigService) {
    const baseURL = this.configService.get('MPESA_BASE_URL') || 
                   'https://sandbox.safaricom.co.ke'; // Use sandbox for development
    
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 30000,
    });
  }

  /**
   * Get OAuth access token from MPesa API
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    const consumerKey = this.configService.get('MPESA_CONSUMER_KEY');
    const consumerSecret = this.configService.get('MPESA_CONSUMER_SECRET');

    if (!consumerKey || !consumerSecret) {
      throw new BadRequestException('MPesa credentials not configured');
    }

    try {
      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      
      const response = await this.axiosInstance.post(
        '/oauth/v1/generate?grant_type=client_credentials',
        {},
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        },
      );

      const accessToken = response.data.access_token;
      if (!accessToken) {
        throw new BadRequestException('Failed to get access token from MPesa API');
      }
      
      this.accessToken = accessToken;
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + (expiresIn - 60) * 1000); // Expire 1 minute early

      return accessToken;
    } catch (error: any) {
      this.logger.error('Error getting MPesa access token:', error.response?.data || error.message);
      throw new BadRequestException('Failed to authenticate with MPesa API');
    }
  }

  /**
   * Generate security password for Lipa Na M-Pesa Online
   */
  private generatePassword(shortcode: string, passkey: string): string {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
    return password;
  }

  /**
   * Initiate STK Push (Lipa Na M-Pesa Online)
   */
  async initiateStkPush(
    phoneNumber: string,
    amount: number,
    accountReference: string,
    transactionDesc: string,
  ): Promise<{
    checkoutRequestID: string;
    customerMessage: string;
    responseCode: string;
    merchantRequestID: string;
  }> {
    const accessToken = await this.getAccessToken();
    const shortcode = this.configService.get('MPESA_SHORTCODE');
    const passkey = this.configService.get('MPESA_PASSKEY');
    const callbackURL = this.configService.get('MPESA_CALLBACK_URL') || 
                       'https://your-domain.com/api/v1/payments/mpesa/confirm';

    if (!shortcode || !passkey) {
      throw new BadRequestException('MPesa shortcode and passkey not configured');
    }

    // Format phone number (remove + and ensure it starts with 254)
    const formattedPhone = phoneNumber.replace(/^\+/, '').replace(/^0/, '254');

    const password = this.generatePassword(shortcode, passkey);
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);

    try {
      const response = await this.axiosInstance.post(
        '/mpesa/stkpush/v1/processrequest',
        {
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: amount,
          PartyA: formattedPhone,
          PartyB: shortcode,
          PhoneNumber: formattedPhone,
          CallBackURL: callbackURL,
          AccountReference: accountReference,
          TransactionDesc: transactionDesc,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        checkoutRequestID: response.data.CheckoutRequestID,
        customerMessage: response.data.CustomerMessage,
        responseCode: response.data.ResponseCode,
        merchantRequestID: response.data.MerchantRequestID,
      };
    } catch (error: any) {
      this.logger.error('Error initiating STK Push:', error.response?.data || error.message);
      throw new BadRequestException(
        error.response?.data?.errorMessage || 'Failed to initiate MPesa payment',
      );
    }
  }

  /**
   * Verify MPesa callback signature
   */
  verifyCallbackSignature(body: any, signature: string): boolean {
    // TODO: Implement signature verification based on MPesa documentation
    // MPesa provides a signature in the callback that should be verified
    return true; // Stub - implement actual verification
  }

  /**
   * Process MPesa callback
   */
  async processCallback(callbackData: any): Promise<{
    resultCode: string;
    resultDesc: string;
    merchantRequestID?: string;
    checkoutRequestID?: string;
    mpesaReceiptNumber?: string;
    transactionDate?: string;
    phoneNumber?: string;
    amount?: number;
  }> {
    // Parse MPesa callback
    const body = callbackData.Body?.stkCallback || callbackData;

    return {
      resultCode: body.ResultCode?.toString() || '0',
      resultDesc: body.ResultDesc || 'Success',
      merchantRequestID: body.MerchantRequestID,
      checkoutRequestID: body.CheckoutRequestID,
      mpesaReceiptNumber: body.CallbackMetadata?.Item?.find(
        (item: any) => item.Name === 'MpesaReceiptNumber',
      )?.Value,
      transactionDate: body.CallbackMetadata?.Item?.find(
        (item: any) => item.Name === 'TransactionDate',
      )?.Value,
      phoneNumber: body.CallbackMetadata?.Item?.find(
        (item: any) => item.Name === 'PhoneNumber',
      )?.Value,
      amount: body.CallbackMetadata?.Item?.find(
        (item: any) => item.Name === 'Amount',
      )?.Value,
    };
  }
}

