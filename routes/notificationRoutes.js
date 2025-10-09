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
    const { author_id, paper_id, notification_type, deadline, custom_content } = req.body;
    
    // 验证通知类型
    const validNotificationTypes = ['Acceptance Notification', 'Rejection Notification', 'Revision Notification'];
    if (!notification_type || !validNotificationTypes.includes(notification_type)) {
      return res.status(400).json({ 
        message: '无效的通知类型，有效类型为：Acceptance Notification, Rejection Notification, Revision Notification'
      });
    }
    
    // 检查论文是否存在
    const [papers] = await pool.execute('SELECT * FROM papers WHERE paper_id = ?', [paper_id]);
    if (papers.length === 0) {
      return res.status(404).json({ message: '论文不存在' });
    }
    
    // 获取作者信息
    const [authors] = await pool.execute('SELECT * FROM authors WHERE author_id = ?', [author_id]);
    if (authors.length === 0) {
      return res.status(404).json({ message: '作者不存在' });
    }
    
    const paper = papers[0];
    const author = authors[0];
    
    // 定义固定收款信息
    const paymentInfo = {
      bankAccount: '1234567890123456',
      bankName: '中国工商银行',
      accountHolder: '学术期刊出版社'
    };
    
    // 根据通知类型生成内容
    let content = custom_content || '';
    
    if (!custom_content) {
      switch (notification_type) {
        case 'Acceptance Notification':
          content = `尊敬的${author.name}作者：\n\n您的论文《${paper.title_zh}》（英文标题：${paper.title_en}）已通过评审，现正式录用。\n\n请在收到本通知后，按照要求支付发表费用。支付信息如下：\n银行卡号：${paymentInfo.bankAccount}\n开户银行：${paymentInfo.bankName}\n开户名：${paymentInfo.accountHolder}\n\n感谢您对本刊的支持！\n\n学术期刊编辑部`;
          break;
        case 'Rejection Notification':
          content = `尊敬的${author.name}作者：\n\n非常遗憾地通知您，您的论文《${paper.title_zh}》（英文标题：${paper.title_en}）经过评审，暂不适合在本刊发表。\n\n感谢您对本刊的支持，欢迎您再次投稿！\n\n学术期刊编辑部`;
          break;
        case 'Revision Notification':
          if (!deadline) {
            return res.status(400).json({ message: '修稿通知必须提供截止时间' });
          }
          content = `尊敬的${author.name}作者：\n\n您的论文《${paper.title_zh}》（英文标题：${paper.title_en}）需要进行修改。\n\n请按照审稿意见进行修改，并于${new Date(deadline).toLocaleString('zh-CN')}前提交修改后的版本。\n\n感谢您的配合！\n\n学术期刊编辑部`;
          break;
      }
    }
    
    const [result] = await pool.execute(
      `INSERT INTO notifications (author_id, paper_id, notification_type, content, sent_at, deadline)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
      [author_id, paper_id, notification_type, content, deadline]
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