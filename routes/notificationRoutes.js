const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../auth');

// 作者拉取自己的通知
router.get('/author', authenticateToken, authorizeRole(['author']), async (req, res) => {
  try {
    const authorId = req.user.id;
    
    // 获取当前作者的所有通知
    const [notifications] = await pool.execute(
      `SELECT * FROM notifications 
       WHERE author_id = ? 
       ORDER BY sent_at DESC`,
      [authorId]
    );
    
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 编辑发送通知给作者
router.post('/author', authenticateToken, authorizeRole(['editor']), async (req, res) => {
  try {
    const { author_id, paper_id, notification_type, content } = req.body;
    
    const [result] = await pool.execute(
      `INSERT INTO notifications (author_id, paper_id, notification_type, content, sent_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [author_id, paper_id, notification_type, content]
    );
    
    res.status(201).json({
      message: '通知发送成功', 
      notification_id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 标记通知为已读
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    
    // 检查通知是否属于当前用户
    const [check] = await pool.execute(
      `SELECT COUNT(*) AS count FROM notifications WHERE notification_id = ? AND author_id = ?`,
      [notificationId, req.user.id]
    );
    
    if (check[0].count === 0) {
      return res.status(403).json({ message: '无权操作该通知' });
    }
    
    await pool.execute(
      `UPDATE notifications SET is_read = TRUE WHERE notification_id = ?`,
      [notificationId]
    );
    
    res.json({ message: '通知已标记为已读' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 获取未读通知数量
router.get('/unread-count', authenticateToken, authorizeRole(['author']), async (req, res) => {
  try {
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) AS unread_count FROM notifications WHERE author_id = ? AND is_read = FALSE`,
      [req.user.id]
    );
    
    res.json({ unread_count: countResult[0].unread_count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;