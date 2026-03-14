# IntaSend M-Pesa STK Push Troubleshooting Guide

## Current Status

The STK push is being **initiated successfully** by IntaSend, but M-Pesa is rejecting it with error code `1037`.

### Error Details
- **Error Code**: `1037`
- **Error Message**: "Failed to initiate transaction. Ensure your phone is on and sim card updated. Dial *234*1*6# from your Safaricom sim card to update it and try again."
- **State**: `FAILED`
- **Invoice ID**: Example: `RKP7VXY`

## Root Cause

This is a **real M-Pesa error**, not a code issue. The STK push is being sent to M-Pesa, but M-Pesa is rejecting it because:

1. **Test Mode Limitations**: In IntaSend sandbox/test mode, you're using real M-Pesa infrastructure
2. **SIM Card Issues**: The phone number may need SIM card updates
3. **Phone Number Registration**: The number might not be properly registered with M-Pesa

## Solutions

### 1. Use a Real Active M-Pesa Number
- The test number `254708374149` may not be active
- Use your own active M-Pesa number
- Ensure the SIM card is active and updated

### 2. Update SIM Card
- Dial `*234*1*6#` from the Safaricom SIM card
- This updates the SIM card registration with M-Pesa

### 3. Check IntaSend Dashboard
- Log into https://sandbox.intasend.com/
- Check if your account is properly configured
- Verify test transactions in the dashboard

### 4. Test with Different Amounts
- Try with different amounts (e.g., 1 KES, 10 KES)
- Some test environments have minimum amount requirements

### 5. Wait for Webhook
- IntaSend sends webhooks when payment status changes
- The webhook endpoint is: `/api/v1/payments/webhooks/intasend`
- Ensure it's accessible from IntaSend's servers

## Code Improvements Made

1. ✅ **Status Polling**: Added automatic status check after 2 seconds in test mode
2. ✅ **Error Handling**: Better error messages with failed_reason and failed_code
3. ✅ **Phone Number Formatting**: Improved phone number normalization
4. ✅ **Logging**: Enhanced logging for debugging
5. ✅ **Notifications**: Payment failure notifications sent to users

## Testing

To test the payment flow:

1. **Initiate Payment**: Use the checkout flow
2. **Check Logs**: Monitor `logs/combined.log` for STK push status
3. **Check Status**: Use `/api/v1/payments/intasend/status?invoiceId=INVOICE_ID`
4. **Monitor Webhooks**: Check if IntaSend sends webhook notifications

## Next Steps

1. Try with a real active M-Pesa number
2. Ensure the SIM card is updated (dial *234*1*6#)
3. Check IntaSend dashboard for transaction status
4. Monitor webhooks for payment updates
5. For production, switch to live mode with production keys

