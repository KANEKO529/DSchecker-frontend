import { client_dschecker } from './client';

export const getMySubscription = async (token: string) => {
  if (!token) {
    throw new Error('token is required');
  }

  const res = await client_dschecker.get('/api/v1/me/subscription', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};