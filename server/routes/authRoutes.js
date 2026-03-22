/*
 * Copyright 2025 Zajac Mo
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
  // 从请求头中获取 Authorization 字段，该字段通常用于携带认证令牌
  // console.log('Check-auth request headers:', req.headers);
  const authHeader = req.headers['authorization'];
  // 若 Authorization 字段存在，则从该字段中提取令牌。
  // console.log('Authorization header:', authHeader);
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

module.exports = router;