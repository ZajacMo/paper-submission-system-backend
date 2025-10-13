const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { pool, testConnection } = require('./db');

// 创建Express应用
const app = express();

// 中间件
app.use(cors());
app.use(express.json());
// 静态文件服务 - 允许访问上传的文件
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 测试数据库连接
testConnection();

// 路由
const authRoutes = require('./routes/authRoutes');
const paperRoutes = require('./routes/paperRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const institutionRoutes = require('./routes/institutionRoutes');
const keywordRoutes = require('./routes/keywordRoutes');

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/keywords', keywordRoutes);

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '服务器内部错误' });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});