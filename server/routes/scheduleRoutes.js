const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../auth');

// 编辑执行论文排期操作
router.post('/', authenticateToken, authorizeRole(['editor']), async (req, res) => {
  try {
    const { paper_id, issue_number, volume_number, page_number } = req.body;
    
    // 验证必填字段
    if (!paper_id || !issue_number || !volume_number || !page_number) {
      return res.status(400).json({ message: '缺少必要的排期信息' });
    }
    
    // 检查论文是否存在
    const [papers] = await pool.execute('SELECT * FROM papers WHERE paper_id = ?', [paper_id]);
    if (papers.length === 0) {
      return res.status(404).json({ message: '论文不存在' });
    }
    
    // 检查是否已经有排期记录
    const [existingSchedules] = await pool.execute('SELECT * FROM schedules WHERE paper_id = ?', [paper_id]);
    if (existingSchedules.length > 0) {
      return res.status(400).json({ message: '该论文已有排期记录' });
    }
    
    // 创建排期记录
    const [result] = await pool.execute(
      `INSERT INTO schedules (paper_id, issue_number, volume_number, page_number)
       VALUES (?, ?, ?, ?)`,
      [paper_id, issue_number, volume_number, page_number]
    );
    
    res.status(201).json({
      message: '论文排期成功',
      schedule_id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 编辑获取所有排期记录
router.get('/', authenticateToken, authorizeRole(['editor']), async (req, res) => {
  try {
    const [schedules] = await pool.execute(
      `SELECT s.*, p.title_zh, p.title_en 
       FROM schedules s 
       JOIN papers p ON s.paper_id = p.paper_id
       ORDER BY s.schedule_id DESC`
    );
    
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 编辑获取单篇论文的排期记录
router.get('/papers/:id', authenticateToken, authorizeRole(['editor']), async (req, res) => {
  try {
    const paperId = req.params.id;
    
    const [schedules] = await pool.execute(
      `SELECT s.*, p.title_zh, p.title_en 
       FROM schedules s 
       JOIN papers p ON s.paper_id = p.paper_id
       WHERE s.paper_id = ?`,
      [paperId]
    );
    
    if (schedules.length === 0) {
      return res.status(404).json({ message: '未找到该论文的排期记录' });
    }
    
    res.json(schedules[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 作者获取自己论文的排期记录
router.get('/author/papers/:id', authenticateToken, authorizeRole(['author']), async (req, res) => {
  try {
    const paperId = req.params.id;
    
    // 检查用户是否为该论文的作者
    const [authorCheck] = await pool.execute(
      `SELECT COUNT(*) AS count 
       FROM paper_authors_institutions 
       WHERE paper_id = ? AND author_id = ?`,
      [paperId, req.user.id]
    );
    
    if (authorCheck[0].count === 0) {
      return res.status(403).json({ message: '您不是该论文的作者，无权查看排期信息' });
    }
    
    // 查询排期记录
    const [schedules] = await pool.execute(
      `SELECT s.*, p.title_zh, p.title_en 
       FROM schedules s 
       JOIN papers p ON s.paper_id = p.paper_id
       WHERE s.paper_id = ?`,
      [paperId]
    );
    
    if (schedules.length === 0) {
      return res.status(404).json({ message: '未找到该论文的排期记录' });
    }
    
    res.json(schedules[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 编辑更新排期记录
router.put('/:id', authenticateToken, authorizeRole(['editor']), async (req, res) => {
  try {
    const scheduleId = req.params.id;
    const { issue_number, volume_number, page_number } = req.body;
    
    // 验证至少有一个字段需要更新
    if (!issue_number && !volume_number && !page_number) {
      return res.status(400).json({ message: '至少需要更新一个排期字段' });
    }
    
    // 构建更新语句
    let query = 'UPDATE schedules SET';
    const params = [];
    let hasFields = false;
    
    if (issue_number) { 
      query += hasFields ? ', issue_number = ?' : ' issue_number = ?'; 
      params.push(issue_number); 
      hasFields = true; 
    }
    if (volume_number) { 
      query += hasFields ? ', volume_number = ?' : ' volume_number = ?'; 
      params.push(volume_number); 
      hasFields = true; 
    }
    if (page_number) { 
      query += hasFields ? ', page_number = ?' : ' page_number = ?'; 
      params.push(page_number); 
      hasFields = true; 
    }
    
    query += ' WHERE schedule_id = ?';
    params.push(scheduleId);
    
    const [result] = await pool.execute(query, params);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '排期记录不存在' });
    }
    
    res.json({ message: '排期记录更新成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;