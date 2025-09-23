const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('./db');

// 生成JWT令牌
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN
    }
  );
}

// JWT验证中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({ message: '未提供令牌' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: '令牌无效' });
    req.user = user;
    next();
  });
}

// 角色验证中间件
function authorizeRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: '权限不足' });
    }
    next();
  };
}

// 用户登录
async function login(email, password, role) {
  try {
    let query, params;
    
    switch (role) {
      case 'author':
        query = 'SELECT author_id AS id, email, name FROM authors WHERE email = ?';
        break;
      case 'expert':
        query = 'SELECT expert_id AS id, email, name FROM experts WHERE email = ?';
        break;
      case 'editor':
        query = 'SELECT editor_id AS id, email, name FROM editors WHERE email = ?';
        break;
      default:
        throw new Error('无效的用户角色');
    }
    
    params = [email];
    const [users] = await pool.execute(query, params);
    
    if (users.length === 0) {
      throw new Error('用户不存在');
    }
    
    const user = users[0];
    
    // 注意：在实际系统中，应该使用bcrypt验证密码
    // 这里为了简化，假设密码存储在数据库中（实际应该存储哈希值）
    // 由于现有数据库表中没有密码字段，这里简化处理
    const userWithRole = {
      ...user,
      role
    };
    
    const token = generateToken(userWithRole);
    return { token, user: userWithRole };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  generateToken,
  authenticateToken,
  authorizeRole,
  login
};