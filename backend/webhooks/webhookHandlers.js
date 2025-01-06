// webhookHandlers.js

const Order = require('../model/order');
const crypto = require('crypto'); 

const mtnWebhookHandler = async (req, res) => {
  try {
    // Verify webhook signature if provided by MTN
    // const signature = req.headers['x-signature'];
    
    const { 
      referenceId,
      status,
      externalId, // Your transaction ID
      amount,
      currency
    } = req.body;

    if (status === 'SUCCESSFUL') {
      // Update order status
      await Order.findOneAndUpdate(
        { 'paymentInfo.id': externalId },
        {
          $set: {
            'paymentInfo.status': 'succeeded',
            'orderStatus': 'Processing'
          }
        }
      );

      // You might want to emit an event or trigger other business logic here
    } else if (status === 'FAILED') {
      await Order.findOneAndUpdate(
        { 'paymentInfo.id': externalId },
        {
          $set: {
            'paymentInfo.status': 'failed',
            'orderStatus': 'Failed'
          }
        }
      );
    }

    res.json({ status: 'success' });
  } catch (error) {
    console.error('MTN Webhook Error:', error);
    res.status(500).json({ error: error.message });
  }
};

const airtelWebhookHandler = async (req, res) => {
  try {
    // Verify webhook signature if provided by Airtel
    // const signature = req.headers['x-signature'];
    
    const {
      transaction: {
        id: transactionId,
        status
      },
      payment: {
        reference
      }
    } = req.body;

    if (status === 'SUCCESS') {
      await Order.findOneAndUpdate(
        { 'paymentInfo.id': reference },
        {
          $set: {
            'paymentInfo.status': 'succeeded',
            'orderStatus': 'Processing'
          }
        }
      );
    } else if (status === 'FAILED') {
      await Order.findOneAndUpdate(
        { 'paymentInfo.id': reference },
        {
          $set: {
            'paymentInfo.status': 'failed',
            'orderStatus': 'Failed'
          }
        }
      );
    }

    res.json({ status: 'success' });
  } catch (error) {
    console.error('Airtel Webhook Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  mtnWebhookHandler,
  airtelWebhookHandler
};