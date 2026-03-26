import { client_dschecker } from './client';

export const createCheckoutSession = async (token) => {
  const response = await client_dschecker.post(
    '/api/v1/billing/checkout-session',
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export const getMyPaymentMethod = async (token) => {
  const response = await client_dschecker.get(
    '/api/v1/billing/payment-method',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};