const express = require('express');
const router = express.Router();
const { login } = require('../auth');

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    if (!email || !password || !role) {
      return res.status(400).json({ message: '缺少必要的登录信息' });
    }
    
    const result = await login(email, password, role);
    res.json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

// 检查令牌有效性
router.get('/check-auth', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

module.exports = router;