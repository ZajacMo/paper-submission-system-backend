const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../auth');

// 获取分配给专家的审稿任务
router.get('/assignments', authenticateToken, authorizeRole(['expert']), async (req, res) => {
  try {
    const [assignments] = await pool.execute(
      `SELECT ra.*, p.title_zh, p.title_en 
       FROM review_assignments ra 
       JOIN papers p ON ra.paper_id = p.paper_id 
       WHERE ra.expert_id = ?
       ORDER BY ra.assigned_date DESC`,
      [req.user.id]
    );
    
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 编辑分配审稿任务并发送评审任务书
router.post('/assignments', authenticateToken, authorizeRole(['editor']), async (req, res) => {
  try {
    const { paper_id, expert_id, assigned_due_date } = req.body;
    
    // 验证必填字段
    if (!paper_id || !expert_id || !assigned_due_date) {
      return res.status(400).json({ message: '缺少必要的任务分配信息' });
    }
    
    // 检查论文是否存在
    const [papers] = await pool.execute('SELECT * FROM papers WHERE paper_id = ?', [paper_id]);
    if (papers.length === 0) {
      return res.status(404).json({ message: '论文不存在' });
    }
    
    // 检查专家是否存在
    const [experts] = await pool.execute('SELECT * FROM experts WHERE expert_id = ?', [expert_id]);
    if (experts.length === 0) {
      return res.status(404).json({ message: '专家不存在' });
    }
    
    // 获取编辑信息
    const [editors] = await pool.execute('SELECT * FROM editors WHERE editor_id = ?', [req.user.id]);
    if (editors.length === 0) {
      return res.status(404).json({ message: '编辑信息不存在' });
    }
    
    const paper = papers[0];
    const expert = experts[0];
    const editor = editors[0];
    
    // 生成评审任务书内容（使用内置固定模板）
    const assignmentContent = `评审任务书\n\n尊敬的${expert.name}专家：\n\n感谢您接受我们的邀请，担任学术期刊的审稿专家。\n\n现将论文《${paper.title_zh}》（英文标题：${paper.title_en}）提交给您评审，请您在${new Date(assigned_due_date).toLocaleString('zh-CN')}前完成评审工作。\n\n论文提交日期：${new Date(paper.submission_date).toLocaleString('zh-CN')}\n审稿费：￥${expert.review_fee}\n\n请您对论文的学术质量、创新性、方法论正确性等方面进行评价，并提出具体的修改建议。\n\n如有任何问题，请随时与我联系。\n\n${editor.name}\n学术期刊编辑部\n${new Date().toLocaleString('zh-CN')}`;
    
    // 创建审稿分配记录
    const [result] = await pool.execute(
      `INSERT INTO review_assignments (paper_id, expert_id, editor_id, assigned_due_date)
       VALUES (?, ?, ?, ?)`,
      [paper_id, expert_id, req.user.id, assigned_due_date]
    );
    
    res.status(201).json({
      message: '审稿任务分配成功', 
      assignment_id: result.insertId,
      assignment_content: assignmentContent
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 专家提交审稿意见
router.put('/assignments/:id', authenticateToken, authorizeRole(['expert']), async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const { conclusion, positive_comments, negative_comments, modification_advice } = req.body;
    
    // 检查该任务是否分配给当前专家
    const [check] = await pool.execute(
      `SELECT COUNT(*) AS count FROM review_assignments WHERE assignment_id = ? AND expert_id = ?`,
      [assignmentId, req.user.id]
    );
    
    if (check[0].count === 0) {
      return res.status(403).json({ message: '无权处理该审稿任务' });
    }
    
    const [result] = await pool.execute(
      `UPDATE review_assignments 
       SET status = 'Completed', conclusion = ?, positive_comments = ?, negative_comments = ?, modification_advice = ?, submission_date = CURRENT_TIMESTAMP
       WHERE assignment_id = ?`,
      [conclusion, positive_comments, negative_comments, modification_advice, assignmentId]
    );
    
    res.json({ message: '审稿意见提交成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 获取论文的所有审稿意见（编辑和作者）
router.get('/papers/:paperId/comments', authenticateToken, async (req, res) => {
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
        return res.status(403).json({ message: '无权查看该论文的审稿意见' });
      }
    }
    
    const [comments] = await pool.execute(
      `SELECT ra.*, e.name AS expert_name 
       FROM review_assignments ra 
       JOIN experts e ON ra.expert_id = e.expert_id 
       WHERE ra.paper_id = ? AND ra.status = 'Completed'`,
      [paperId]
    );
    
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;