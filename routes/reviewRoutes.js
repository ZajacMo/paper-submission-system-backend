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
       WHERE ra.expert_id = ?`,
      [req.user.id]
    );
    
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 编辑分配审稿任务
router.post('/assignments', authenticateToken, authorizeRole(['editor']), async (req, res) => {
  try {
    const { paper_id, expert_id, due_date, assignment_path } = req.body;
    
    const [result] = await pool.execute(
      `INSERT INTO review_assignments (paper_id, expert_id, editor_id, due_date, assignment_path)
       VALUES (?, ?, ?, ?, ?)`,
      [paper_id, expert_id, req.user.id, due_date, assignment_path]
    );
    
    res.status(201).json({ message: '审稿任务分配成功', assignment_id: result.insertId });
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
      `SELECT ra.conclusion, ra.positive_comments, ra.negative_comments, ra.modification_advice, e.name AS expert_name, ra.submission_date
       FROM review_assignments ra
       JOIN experts e ON ra.expert_id = e.expert_id
       WHERE ra.paper_id = ?`,
      [paperId]
    );
    
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;