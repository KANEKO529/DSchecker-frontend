import { client_dschecker } from './client';

export const getMe = async (token) => {
  const res = await client_dschecker.get('/api/v1/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};