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

  console.log("response:", response)

  return response.data;
};