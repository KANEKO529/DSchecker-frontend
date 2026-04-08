import { client_dschecker } from './client';

export const getMe = async (token) => {
  const res = await client_dschecker.get('/api/v1/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

export const updateMyProfile = async (token, username) => {
  const response = await client_dschecker.patch(
    '/api/v1/me/profile',
    { username },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return response.data
}

export const deleteMyAccount = async (token) => {
  const response = await client_dschecker.delete('/api/v1/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return response.data
}