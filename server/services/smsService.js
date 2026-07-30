import axios from 'axios';

/**
 * TEXTBEE SMS GATEWAY INTEGRATION SERVICE (smsService.js)
 * 
 * For Beginners:
 * This service handles sending SMS notifications (like verification OTPs)
 * via the TextBee SMS gateway API.
 * 
 * Flow:
 * 1. Checks if `process.env.TEXTBEE_API_KEY` and `process.env.TEXTBEE_DEVICE_ID` are configured.
 * 2. If configured: Submits a POST request to https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms.
 * 3. If missing: Falls back to logging mock SMS to the console so developers can work offline.
 */

export async function sendOtpSms(phoneNumber, otpCode) {
  const apiKey = process.env.TEXTBEE_API_KEY;
  const deviceId = process.env.TEXTBEE_DEVICE_ID;

  const isConfigured = apiKey && deviceId && 
                       apiKey !== 'your_textbee_api_key_here' && 
                       deviceId !== 'your_textbee_device_id_here';

  const message = `AlgoTrade code: ${otpCode}`;

  if (!isConfigured) {
    console.log('\n==================================================');
    console.log('[SMS GATEWAY] --- TextBee (Mock Mode) SMS Send ---');
    console.log(`[SMS GATEWAY] To: ${phoneNumber}`);
    console.log(`[SMS GATEWAY] Message: ${message}`);
    console.log('==================================================\n');
    return { success: true, mock: true };
  }

  try {
    const response = await axios.post(
      `https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`,
      {
        recipients: [phoneNumber],
        message: message
      },
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`[SMS GATEWAY] SMS successfully sent to ${phoneNumber} via TextBee API`);
    return { success: true, data: response.data };
  } catch (error) {
    const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error('[SMS GATEWAY] Failed to send SMS via TextBee:', errorMsg);
    throw new Error(errorMsg);
  }
}
