// mobileMoneyService.js
const crypto = require('crypto');
const axios = require('axios');

class MobileMoneyService {
  constructor() {
    this.mtnConfig = {
      baseUrl: process.env.MTN_API_BASE_URL,
      subscriptionKey: process.env.MTN_SUBSCRIPTION_KEY,
      userId: process.env.MTN_USER_ID,
      apiKey: process.env.MTN_API_KEY,
      callbackUrl: process.env.MTN_CALLBACK_URL
    };

    this.airtelConfig = {
      baseUrl: process.env.AIRTEL_API_BASE_URL,
      clientId: process.env.AIRTEL_CLIENT_ID,
      clientSecret: process.env.AIRTEL_CLIENT_SECRET,
      callbackUrl: process.env.AIRTEL_CALLBACK_URL
    };
  }

  // MTN Mobile Money Methods
  async getMTNAuthToken() {
    const auth = Buffer.from(`${this.mtnConfig.userId}:${this.mtnConfig.apiKey}`).toString('base64');
    
    try {
      const response = await axios.post(
        `${this.mtnConfig.baseUrl}/collection/token/`,
        {},
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Ocp-Apim-Subscription-Key': this.mtnConfig.subscriptionKey
          }
        }
      );

      return response.data.access_token;
    } catch (error) {
      throw new Error(`MTN Auth Error: ${error.message}`);
    }
  }

  async initiateMTNPayment(phoneNumber, amount) {
    try {
      const token = await this.getMTNAuthToken();
      const referenceId = crypto.randomUUID();

      const payload = {
        amount: amount.toString(),
        currency: "UGX",
        externalId: referenceId,
        payer: {
          partyIdType: "MSISDN",
          partyId: phoneNumber.replace(/^0/, '256') // Convert 07XX to 256XX
        },
        payerMessage: "Payment for order",
        payeeNote: "Payment request"
      };

      const response = await axios.post(
        `${this.mtnConfig.baseUrl}/collection/v1_0/requesttopay`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Reference-Id': referenceId,
            'X-Target-Environment': process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
            'Ocp-Apim-Subscription-Key': this.mtnConfig.subscriptionKey
          }
        }
      );

      return {
        transactionId: referenceId,
        provider: 'mtn'
      };
    } catch (error) {
      throw new Error(`MTN Payment Error: ${error.message}`);
    }
  }

  async checkMTNPaymentStatus(transactionId) {
    try {
      const token = await this.getMTNAuthToken();

      const response = await axios.get(
        `${this.mtnConfig.baseUrl}/collection/v1_0/requesttopay/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Target-Environment': process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
            'Ocp-Apim-Subscription-Key': this.mtnConfig.subscriptionKey
          }
        }
      );

      return {
        status: response.data.status.toLowerCase(),
        transactionId
      };
    } catch (error) {
      throw new Error(`MTN Status Check Error: ${error.message}`);
    }
  }

  // Airtel Money Methods
  async getAirtelAuthToken() {
    try {
      const response = await axios.post(
        `${this.airtelConfig.baseUrl}/auth/oauth2/token`,
        {
          client_id: this.airtelConfig.clientId,
          client_secret: this.airtelConfig.clientSecret,
          grant_type: 'client_credentials'
        }
      );

      return response.data.access_token;
    } catch (error) {
      throw new Error(`Airtel Auth Error: ${error.message}`);
    }
  }

  async initiateAirtelPayment(phoneNumber, amount) {
    try {
      const token = await this.getAirtelAuthToken();
      const referenceId = crypto.randomUUID();

      const payload = {
        reference: referenceId,
        subscriber: {
          country: "UGA",
          currency: "UGX",
          msisdn: phoneNumber.replace(/^0/, '256')
        },
        transaction: {
          amount: amount.toString(),
          country: "UGA",
          currency: "UGX",
          id: referenceId
        }
      };

      const response = await axios.post(
        `${this.airtelConfig.baseUrl}/merchant/v1/payments/`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        transactionId: referenceId,
        provider: 'airtel'
      };
    } catch (error) {
      throw new Error(`Airtel Payment Error: ${error.message}`);
    }
  }

  async checkAirtelPaymentStatus(transactionId) {
    try {
      const token = await this.getAirtelAuthToken();

      const response = await axios.get(
        `${this.airtelConfig.baseUrl}/merchant/v1/payments/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        status: response.data.status.toLowerCase(),
        transactionId
      };
    } catch (error) {
      throw new Error(`Airtel Status Check Error: ${error.message}`);
    }
  }
}

const mobileMoneyService = new MobileMoneyService();
module.exports = mobileMoneyService;
