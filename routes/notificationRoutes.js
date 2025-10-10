const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../auth');

// 作者拉取自己的通知
router.get('/author', authenticateToken, authorizeRole(['author']), async (req, res) => {
  try {
    const authorId = req.user.id;
    
    // 获取当前作者参与的所有论文ID
    const [paperIdsResult] = await pool.execute(
      `SELECT DISTINCT paper_id FROM paper_authors_institutions WHERE author_id = ?`,
      [authorId]
    );
    
    if (paperIdsResult.length === 0) {
      return res.json([]);
    }
    
    // 构建论文ID列表
    const paperIds = paperIdsResult.map(row => row.paper_id);
    
    // 获取这些论文的所有通知
    const [notifications] = await pool.execute(
      `SELECT * FROM notifications 
       WHERE paper_id IN (?) 
       ORDER BY sent_at DESC`,
      [paperIds]
    );
    
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 编辑发送通知给作者
router.post('/author', authenticateToken, authorizeRole(['editor']), async (req, res) => {
  try {
    const { paper_id, notification_type, deadline } = req.body;
    
    // 验证通知类型
    const validNotificationTypes = ['Acceptance Notification', 'Rejection Notification', 'Revision Notification', 'Review Assignment', 'Payment Confirmation'];
    if (!notification_type || !validNotificationTypes.includes(notification_type)) {
      return res.status(400).json({ 
        message: '无效的通知类型，有效类型为：Acceptance Notification, Rejection Notification, Revision Notification, Review Assignment, Payment Confirmation'
      });
    }
    
    // 检查论文是否存在
    const [papers] = await pool.execute('SELECT * FROM papers WHERE paper_id = ?', [paper_id]);
    if (papers.length === 0) {
      return res.status(404).json({ message: '论文不存在' });
    }
    
    // 对于Revision Notification，必须提供截止时间
    if (notification_type === 'Revision Notification' && !deadline) {
      return res.status(400).json({ message: '修稿通知必须提供截止时间' });
    }
    
    const [result] = await pool.execute(
      `INSERT INTO notifications (paper_id, notification_type, sent_at, deadline)
       VALUES (?, ?, CURRENT_TIMESTAMP, ?)`,
      [paper_id, notification_type, deadline]
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
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // 检查通知是否存在
    const [notifications] = await pool.execute('SELECT * FROM notifications WHERE notification_id = ?', [notificationId]);
    if (notifications.length === 0) {
      return res.status(404).json({ message: '通知不存在' });
    }
    
    const notification = notifications[0];
    
    // 权限检查：编辑可以标记所有通知，作者只能标记自己相关论文的通知
    if (userRole === 'author') {
      // 检查作者是否参与了该通知关联的论文
      const [paperAuthors] = await pool.execute(
        'SELECT * FROM paper_authors_institutions WHERE paper_id = ? AND author_id = ?',
        [notification.paper_id, userId]
      );
      
      if (paperAuthors.length === 0) {
        return res.status(403).json({ message: '您无权操作此通知' });
      }
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
    const authorId = req.user.id;
    
    // 获取当前作者参与的所有论文ID
    const [paperIdsResult] = await pool.execute(
      `SELECT DISTINCT paper_id FROM paper_authors_institutions WHERE author_id = ?`,
      [authorId]
    );
    
    if (paperIdsResult.length === 0) {
      return res.json({ unread_count: 0 });
    }
    
    // 构建论文ID列表
    const paperIds = paperIdsResult.map(row => row.paper_id);
    
    // 获取这些论文的未读通知数量
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) AS unread_count FROM notifications WHERE paper_id IN (?) AND is_read = FALSE`,
      [paperIds]
    );
    
    res.json({ unread_count: countResult[0].unread_count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;