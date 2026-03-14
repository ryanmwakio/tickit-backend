import { Injectable, Logger, BadRequestException, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IntaSend from 'intasend-node';

export interface IntaSendCheckoutParams {
  first_name: string;
  last_name: string;
  email: string;
  amount: number;
  currency: string;
  api_ref: string;
  phone_number?: string;
  comment?: string;
  country?: string;
  address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  method?: 'M-PESA' | 'CARD-PAYMENT';
  card_tarrif?: 'BUSINESS-PAYS' | 'CUSTOMER-PAYS';
  mobile_tarrif?: 'BUSINESS-PAYS' | 'CUSTOMER-PAYS';
  redirect_url?: string;
  host?: string;
}

export interface IntaSendMpesaStkPushParams {
  first_name: string;
  last_name: string;
  email: string;
  amount: number;
  phone_number: string;
  api_ref: string;
  host?: string;
}

export interface IntaSendCheckoutResponse {
  invoice: {
    id: string;
    invoice_id: string;
    state: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    provider: string;
    charges: string | number;
    net_amount: number | string;
    currency: string;
    value: string | number;
    account: string;
    api_ref: string;
    host: string;
    mpesa_reference?: string | null;
    failed_reason: string | null;
    failed_code?: string | null;
    failed_code_link?: string | null;
    retry_count?: number;
    created_at: string;
    updated_at: string;
  };
  meta?: {
    id: string;
    customer: any;
    customer_comment: string;
    created_at: string;
    updated_at: string;
  };
}

export interface IntaSendStatusResponse {
  invoice: {
    id: string;
    invoice_id: string;
    state: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    provider: string;
    charges: string | number;
    net_amount: number | string;
    currency: string;
    value: string | number;
    account: string;
    api_ref: string;
    host: string;
    mpesa_reference?: string | null;
    failed_reason: string | null;
    failed_code?: string | null;
    failed_code_link?: string | null;
    retry_count?: number;
    created_at: string;
    updated_at: string;
  };
  meta?: {
    id: string;
    customer: any;
    customer_comment: string;
    created_at: string;
    updated_at: string;
  };
}

@Injectable()
export class IntaSendService {
  private readonly logger = new Logger(IntaSendService.name);
  private intasend: any = null;
  private config: {
    publishableKey: string;
    secretKey: string;
    testMode: boolean;
    apiBaseUrl: string;
  } | null = null;

  constructor(private configService: ConfigService) {
    const config = this.configService.get('intasend');

    if (!config?.publishableKey || !config?.secretKey) {
      this.logger.warn('IntaSend keys not configured. Payment processing will be limited.');
      return;
    }

    this.config = config;

    if (this.config) {
      try {
        this.intasend = new IntaSend(
          this.config.publishableKey,
          this.config.secretKey,
          this.config.testMode, // true for test, false for live
        );
      } catch (error: any) {
        this.logger.error(`Failed to initialize IntaSend: ${error.message}`);
      }
    }
  }

  /**
   * Create a checkout link for payment
   */
  async createCheckout(params: IntaSendCheckoutParams): Promise<IntaSendCheckoutResponse> {
    try {
      if (!this.intasend) {
        throw new BadRequestException('IntaSend service not configured');
      }

      const collection = this.intasend.collection();
      const response = await collection.charge({
        first_name: params.first_name,
        last_name: params.last_name,
        email: params.email,
        amount: params.amount,
        currency: params.currency,
        api_ref: params.api_ref,
        phone_number: params.phone_number,
        comment: params.comment,
        country: params.country,
        address: params.address,
        city: params.city,
        state: params.state,
        zipcode: params.zipcode,
        method: params.method,
        card_tarrif: params.card_tarrif || 'BUSINESS-PAYS',
        mobile_tarrif: params.mobile_tarrif || 'BUSINESS-PAYS',
        redirect_url: params.redirect_url,
        host: params.host,
      });

      this.logger.log(`IntaSend checkout created: ${JSON.stringify(response.invoice)}`);
      return response;
    } catch (error: any) {
      this.logger.error(`IntaSend checkout creation error: ${error.response?.data || error.message}`, error.stack);
      throw new HttpException(
        error.response?.data?.errors?.[0]?.detail || 'Payment initiation failed',
        error.response?.status || 400,
      );
    }
  }

  /**
   * Trigger M-Pesa STK Push directly
   */
  async mpesaStkPush(params: IntaSendMpesaStkPushParams): Promise<any> {
    try {
      if (!this.intasend) {
        throw new BadRequestException('IntaSend service not configured');
      }

      // Ensure phone number is in correct format (254XXXXXXXXX)
      let phoneNumber = params.phone_number.replace(/\D/g, ''); // Remove all non-digits
      
      // Convert to IntaSend format if needed
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '254' + phoneNumber.substring(1);
      } else if (!phoneNumber.startsWith('254')) {
        phoneNumber = '254' + phoneNumber;
      }

      // In test mode, log a warning about test number requirements
      if (this.config?.testMode) {
        this.logger.warn(`IntaSend Test Mode: Using phone number ${phoneNumber}. For testing, you can use 254708374149 or your own registered test number.`);
      }

      const collection = this.intasend.collection();
      const response = await collection.mpesaStkPush({
        first_name: params.first_name,
        last_name: params.last_name,
        email: params.email,
        amount: params.amount,
        phone_number: phoneNumber,
        api_ref: params.api_ref,
        host: params.host,
      });

      this.logger.log(`IntaSend M-Pesa STK Push initiated: ${JSON.stringify(response)}`);
      
      // Check if STK push was actually triggered
      if (response.invoice?.state === 'PENDING' && !response.invoice?.mpesa_reference) {
        this.logger.warn(`STK Push initiated but mpesa_reference is null. This may indicate:
          1. The phone number ${phoneNumber} is not registered in IntaSend sandbox
          2. In test mode, use the test number: 254708374149
          3. The STK push may take a few seconds to process
        `);
      }

      return response;
    } catch (error: any) {
      this.logger.error(`IntaSend M-Pesa STK Push error: ${JSON.stringify(error.response?.data || error.message)}`, error.stack);
      
      // Provide more helpful error messages
      if (error.response?.data?.errors) {
        const errorDetails = error.response.data.errors;
        this.logger.error(`IntaSend API Errors: ${JSON.stringify(errorDetails)}`);
      }
      
      throw new HttpException(
        error.response?.data?.errors?.[0]?.detail || 'M-Pesa STK Push failed',
        error.response?.status || 400,
      );
    }
  }

  /**
   * Check payment status by invoice ID
   */
  async checkStatus(invoiceId: string): Promise<IntaSendStatusResponse> {
    try {
      if (!this.intasend) {
        throw new BadRequestException('IntaSend service not configured');
      }

      const collection = this.intasend.collection();
      const response = await collection.status(invoiceId);

      this.logger.log(`IntaSend status check for invoice ${invoiceId}: ${JSON.stringify(response.invoice)}`);
      return response;
    } catch (error: any) {
      this.logger.error(`IntaSend status check error: ${error.response?.data || error.message}`, error.stack);
      throw new HttpException(
        error.response?.data?.errors?.[0]?.detail || 'Status check failed',
        error.response?.status || 400,
      );
    }
  }

  /**
   * Get checkout URL from checkout response
   */
  getCheckoutUrl(response: IntaSendCheckoutResponse): string {
    if (!response.invoice?.host) {
      throw new BadRequestException('Invalid checkout response - missing host');
    }
    return `${response.invoice.host}/payment/?invoice=${response.invoice.invoice_id}`;
  }
}

