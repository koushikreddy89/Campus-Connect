const jwt = require('jsonwebtoken');
const secret = 'campus-connect-super-secret';
const payload = {
  email: 'test@sru.edu.in',
  role: 'student',
  userId: 'user-alice'
};
const token = jwt.sign(payload, secret, { expiresIn: '7d' });

const authStoreState = {
  state: {
    token: token,
    email: 'test@sru.edu.in',
    uid: 'user-alice',
    isNewUser: false,
    isAuthenticated: true,
    isProfileComplete: true,
    isLoading: false,
    error: null,
    resetSuccess: false,
    role: 'student',
    college: 'SR University'
  },
  version: 0
};

console.log('JWT_TOKEN:', token);
console.log('AUTH_STORE_STATE:', JSON.stringify(authStoreState));
