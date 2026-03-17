import axios from 'axios';
import applyCaseMiddleware from 'axios-case-converter';

// const API_BASE_URL_DSCHECKER = process.env.NEXT_PUBLIC_API_BASE_URL_DSCHECKER || '';
const API_BASE_URL_KOTODB = process.env.NEXT_PUBLIC_API_BASE_URL_KOTODB || '';

// export const client_dschecker = applyCaseMiddleware(
//   axios.create({
//     baseURL: API_BASE_URL_DSCHECKER,
//     headers: { 
//       'Content-Type': 'application/json', 
//       'Accept': 'application/json' }
//   })
// );


export const client_kotodb = applyCaseMiddleware(
    axios.create({
      baseURL: API_BASE_URL_KOTODB,
      headers: { 
        'Content-Type': 'application/json', 
        'Accept': 'application/json' }
    })
);
  