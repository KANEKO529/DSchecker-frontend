// src/api/v1/ocr.js

// import {client_kotodb} from './client';
import { client_dschecker } from './client';


export const searchByModelNumber = async (token, modelNumber) => {

  //   console.log(client_kotodb.defaults.baseURL)
  try {
    const response = await client_dschecker.post(
      '/api/v1/price-searches',
      {
        model_number: modelNumber,
      },
      {
        withCredentials: true,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );

    console.log('型番検索に成功しました', response);
    return response.data;
  } catch (error) {
    console.error('型番検索に失敗しました', error);

    if (error.response) {
      console.error('エラーステータス:', error.response.status);
      console.error('エラーメッセージ:', error.response.data);
    } else if (error.request) {
      console.error('リクエストは送信されたがレスポンスがありません:', error.request);
    } else {
      console.error('エラーの詳細:', error.message);
    }

    throw error;
  }
};