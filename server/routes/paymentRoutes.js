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
      `SELECT * FROM payments WHERE paper_id = ?`,
      [paperId]
    );
    
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 作者支付审稿费
router.post('/author/pay', authenticateToken, authorizeRole(['author']), async (req, res) => {
  try {
    const {paper_id} = req.body;
    
    // 验证参数
    if (!paper_id) {
      return res.status(400).json({ message: '论文ID是必需的' });
    }
    
    // 检查用户是否为该论文的作者
    const [authorCheck] = await pool.execute(
      `SELECT COUNT(*) AS count 
       FROM paper_authors_institutions 
       WHERE paper_id = ? AND author_id = ?`,
      [paper_id, req.user.id]
    );
    
    if (authorCheck[0].count === 0) {
      return res.status(403).json({ message: '您不是该论文的作者，无权支付' });
    }
    
    // 检查论文是否存在
    const [papers] = await pool.execute('SELECT * FROM papers WHERE paper_id = ?', [paper_id]);
    if (papers.length === 0) {
      return res.status(404).json({ message: '论文不存在' });
    }
    
    // 检查是否已经有支付记录
    const [existingPayments] = await pool.execute('SELECT * FROM payments WHERE paper_id = ?', [paper_id]);
    if (existingPayments.length > 0) {
      updatePayment = await pool.execute(
        `UPDATE payments SET status = 'Paid' WHERE paper_id = ? `,
        [paper_id]
      );
      if (updatePayment[0].affectedRows === 0) {
        return res.status(500).json({ message: '更新支付记录失败' });
      }
    }
    else
      return res.status(400).json({ message: '该论文未创建支付记录' });
    
    
    res.status(201).json({ message: '支付申请提交成功', paper_id, payment_id: updatePayment[0].insertId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 创建支付记录（编辑）
router.post('/', authenticateToken, authorizeRole(['editor']), async (req, res) => {
  try {
    const { paper_id, amount } = req.body;
    
    // 检查论文是否存在
    const [papers] = await pool.execute('SELECT * FROM papers WHERE paper_id = ?', [paper_id]);
    if (papers.length === 0) {
      return res.status(404).json({ message: '论文不存在' });
    }
    
    // 检查是否已经有支付记录
    const [existingPayments] = await pool.execute('SELECT * FROM payments WHERE paper_id = ?', [paper_id]);
    if (existingPayments.length > 0) {
      return res.status(400).json({ message: '该论文已有支付记录' });
    }
    
    const [result] = await pool.execute(
      `INSERT INTO payments (paper_id, amount)
       VALUES (?, ?)`,
      [paper_id, amount]
    );
    
    res.status(201).json({ message: '支付记录创建成功', paper_id });
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
    const { assignment_id } = req.body;
    
    // 验证assignment_id
    if (!assignment_id) {
      return res.status(400).json({ message: 'assignment_id是必需的' });
    }
    
    // 检查该审稿任务是否属于当前专家
    const [assignments] = await pool.execute(
      `SELECT * FROM review_assignments WHERE assignment_id = ? AND expert_id = ? AND conclusion <> 'Not Reviewed'`,
      [assignment_id, req.user.id]
    );
    
    if (assignments.length === 0) {
      return res.status(404).json({ message: '该审稿任务不存在或未完成' });
    }
    
    // 检查是否已经提交过提现申请
    const [existingWithdrawals] = await pool.execute(
      `SELECT * FROM withdrawals WHERE assignment_id = ? AND status = 1`,
      [assignment_id]
    );
    
    if (existingWithdrawals.length > 0) {
      return res.status(400).json({ message: '该任务的提现申请已提交' });
    }
    
    // 获取专家的银行账户信息
    const [experts] = await pool.execute('SELECT bank_account, bank_name, account_holder FROM experts WHERE expert_id = ?', [req.user.id]);
    if (experts.length === 0) {
      return res.status(404).json({ message: '专家信息不存在' });
    }
    
    const expert = experts[0];
    
    // 检查专家是否已设置银行账户信息
    if (!expert.bank_account || !expert.bank_name || !expert.account_holder) {
      return res.status(400).json({ message: '请先完善银行账户信息' });
    }
    
    // 查找对应记录并更新状态和提现日期
    const [result] = await pool.execute(
      `UPDATE withdrawals 
       SET status = 1, withdrawal_date = CURRENT_TIMESTAMP 
       WHERE assignment_id = ? AND status = 0`,
      [assignment_id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '未找到可提现的记录' });
    }
    
    res.status(200).json({ message: '提现申请提交成功', assignment_id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 专家获取提现记录
router.get('/withdrawals', authenticateToken, authorizeRole(['expert']), async (req, res) => {
  try {
    const [withdrawals] = await pool.execute(
      `SELECT w.*, ra.paper_id, p.title_zh as paper_title_zh, p.title_en as paper_title_en, e.review_fee as amount 
       FROM withdrawals w 
       JOIN experts e ON w.expert_id = e.expert_id 
       JOIN review_assignments ra ON w.assignment_id = ra.assignment_id
       JOIN papers p ON ra.paper_id = p.paper_id
       WHERE w.expert_id = ?
       ORDER BY w.withdrawal_date DESC`,
      [req.user.id]
    );
    
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 编辑处理提现申请
router.put('/withdrawals/:assignment_id/status', authenticateToken, authorizeRole(['editor']), async (req, res) => {
  try {
    const assignment_id = req.params.assignment_id;
    const { status } = req.body;
    
    // 验证状态值
    if (typeof status !== 'boolean') {
      return res.status(400).json({ message: '状态必须是布尔值' });
    }
    
    // 更新提现状态
    const [result] = await pool.execute(
      `UPDATE withdrawals SET status = ? WHERE assignment_id = ?`,
      [status, assignment_id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '提现记录不存在' });
    }
    
    res.json({ message: '提现状态更新成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 编辑获取所有提现记录（分页）
router.get('/admin/withdrawals', authenticateToken, authorizeRole(['editor']), async (req, res) => {
  try {
    // 获取分页参数，默认第1页，每页10条记录
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 查询当前页的数据
    const [withdrawals] = await pool.execute(
      `SELECT w.*, e.name as expert_name, e.bank_account, e.bank_name, e.account_holder, 
              ra.paper_id, p.title_zh as paper_title_zh, p.title_en as paper_title_en, e.review_fee as amount 
       FROM withdrawals w 
       JOIN experts e ON w.expert_id = e.expert_id 
       JOIN review_assignments ra ON w.assignment_id = ra.assignment_id
       JOIN papers p ON ra.paper_id = p.paper_id
       ORDER BY w.withdrawal_date DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // 查询总记录数
    const [totalResult] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM withdrawals w 
       JOIN experts e ON w.expert_id = e.expert_id 
       JOIN review_assignments ra ON w.assignment_id = ra.assignment_id
       JOIN papers p ON ra.paper_id = p.paper_id`
    );

    const total = totalResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // 返回包含分页信息的结果
    res.json({
      data: withdrawals,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems: total,
        totalPages: totalPages
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;