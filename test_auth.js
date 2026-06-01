// test_auth.js
import axios from 'axios';

(async () => {
  console.log('Sending test requests to local auth backend...');
  const baseURL = 'http://localhost:3001';
  
  try {
    // 1. Try developer bypass
    console.log('\n--- 1. Testing /auth/developer-bypass ---');
    const devRes = await axios.post(`${baseURL}/auth/developer-bypass`, {
      userId: 'c1',
      role: 'customer'
    });
    console.log('Developer Bypass Success:', devRes.data);
    const { token } = devRes.data;

    // 2. Try verify
    console.log('\n--- 2. Testing /auth/verify ---');
    const verifyRes = await axios.post(`${baseURL}/auth/verify`, { token });
    console.log('Verify Token Success:', verifyRes.data);

    // 3. Try normal login
    console.log('\n--- 3. Testing /auth/login ---');
    const loginRes = await axios.post(`${baseURL}/auth/login`, {
      role: 'customer',
      email: 'denis@example.com',
      password: '123456'
    });
    console.log('Login Success:', loginRes.data);

  } catch (err) {
    console.error('Request failed with error:', err.response?.data || err.message);
  }
})();
