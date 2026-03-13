// src/api/v1/ocr.js

import {client_kotodb} from './client';

export const searchByModelNumber = async (modelNumber) => {
  try {
    const response = await client_kotodb.post('/api/v1/items/search_by_model_number', {
      model_number: modelNumber,
    });

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