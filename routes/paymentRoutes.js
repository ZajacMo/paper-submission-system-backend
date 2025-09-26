const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../auth');

// 获取论文的支付信息
router.get('/papers/:paperId', authenticateToken, async (req, res) => {
  try {
    const paperId = req.params.paperId;
    
    // 检查用户是否有权限查看
    if (req.user.role === 'author') {
      const [authorCheck] = await pool.execute(
        `SELECT COUNT(*) AS count 
         FROM paper_authors_institutions 
         WHERE paper_id = ? AND author_id = ?`,
        [paperId, req.user.id]
      );
      
      if (authorCheck[0].count === 0) {
        return res.status(403).json({ message: '无权查看该论文的支付信息' });
      }
    }
    
    const [payments] = await pool.execute(
      `SELECT * FROM payment_details WHERE paper_id = ?`,
      [paperId]
    );
    
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 创建支付记录（编辑）
router.post('/', authenticateToken, authorizeRole(['editor']), async (req, res) => {
  try {
    const { paper_id, author_id, amount, bank_account } = req.body;
    
    const [result] = await pool.execute(
      `INSERT INTO payments (paper_id, author_id, amount, bank_account)
       VALUES (?, ?, ?, ?)`,
      [paper_id, author_id, amount, bank_account]
    );
    
    res.status(201).json({ message: '支付记录创建成功', payment_id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 更新支付状态（编辑）
router.put('/:id/status', authenticateToken, authorizeRole(['editor']), async (req, res) => {
  try {
    const paymentId = req.params.id;
    const { status } = req.body;
    
    const [result] = await pool.execute(
      `UPDATE payments SET status = ?, payment_date = CURRENT_TIMESTAMP WHERE payment_id = ?`,
      [status, paymentId]
    );
    
    res.json({ message: '支付状态更新成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 专家创建提现申请
router.post('/withdrawals', authenticateToken, authorizeRole(['expert']), async (req, res) => {
  try {
    const { amount, bank_account_id } = req.body;
    
    const [result] = await pool.execute(
      `INSERT INTO withdrawals (expert_id, bank_account_id, amount)
       VALUES (?, ?, ?)`,
      [req.user.id, bank_account_id, amount]
    );
    
    res.status(201).json({ message: '提现申请提交成功', withdrawal_id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 专家获取提现记录
router.get('/withdrawals', authenticateToken, authorizeRole(['expert']), async (req, res) => {
  try {
    const [withdrawals] = await pool.execute(
      `SELECT w.*, ba.bank_name, ba.account_holder 
       FROM withdrawals w 
       JOIN bank_accounts ba ON w.bank_account_id = ba.bank_account_id 
       WHERE w.expert_id = ?`,
      [req.user.id]
    );
    
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;