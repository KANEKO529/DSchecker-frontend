import axios from 'axios';
import applyCaseMiddleware from 'axios-case-converter';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

const client = applyCaseMiddleware(
  axios.create({
    baseURL: API_BASE_URL,
    headers: { 
      'Content-Type': 'application/json', 
      'Accept': 'application/json' }
  })
);

export default client;