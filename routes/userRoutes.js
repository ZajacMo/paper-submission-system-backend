const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../auth');

// 获取当前用户信息
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    let query, params;
    
    switch (req.user.role) {
      case 'author':
        // 作者信息包含所属单位
        query = `SELECT a.*, GROUP_CONCAT(DISTINCT i.name SEPARATOR ', ') AS institution_names,
                 GROUP_CONCAT(DISTINCT i.city SEPARATOR ', ') AS cities
                 FROM authors a
                 LEFT JOIN author_institutions ai ON a.author_id = ai.author_id
                 LEFT JOIN institutions i ON ai.institution_id = i.institution_id
                 WHERE a.author_id = ?
                 GROUP BY a.author_id`;
        break;
      case 'expert':
        query = 'SELECT * FROM experts WHERE expert_id = ?';
        break;
      case 'editor':
        query = 'SELECT * FROM editors WHERE editor_id = ?';
        break;
      default:
        return res.status(400).json({ message: '无效的用户角色' });
    }
    
    params = [req.user.id];
    const [users] = await pool.execute(query, params);
    
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 移除敏感信息
    const user = users[0];
    if (user.password) {
      delete user.password;
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 更新当前用户信息
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, ...otherFields } = req.body;
    let query, params;
    
    switch (req.user.role) {
      case 'author':
        query = 'UPDATE authors SET name = ?, email = ?, phone = ?';
        params = [name, email, phone];
        
        if (otherFields.age) { query += ', age = ?'; params.push(otherFields.age); }
        if (otherFields.degree) { query += ', degree = ?'; params.push(otherFields.degree); }
        if (otherFields.title) { query += ', title = ?'; params.push(otherFields.title); }
        if (otherFields.hometown) { query += ', hometown = ?'; params.push(otherFields.hometown); }
        if (otherFields.research_areas) { query += ', research_areas = ?'; params.push(otherFields.research_areas); }
        if (otherFields.bio) { query += ', bio = ?'; params.push(otherFields.bio); }
        
        query += ' WHERE author_id = ?';
        params.push(req.user.id);
        break;
        
      case 'expert':
        query = 'UPDATE experts SET name = ?, email = ?, phone = ?';
        params = [name, email, phone];
        
        if (otherFields.title) { query += ', title = ?'; params.push(otherFields.title); }
        if (otherFields.research_areas) { query += ', research_areas = ?'; params.push(otherFields.research_areas); }
        if (otherFields.bank_account) { query += ', bank_account = ?'; params.push(otherFields.bank_account); }
        if (otherFields.bank_name) { query += ', bank_name = ?'; params.push(otherFields.bank_name); }
        if (otherFields.account_holder) { query += ', account_holder = ?'; params.push(otherFields.account_holder); }
        
        query += ' WHERE expert_id = ?';
        params.push(req.user.id);
        break;
        
      case 'editor':
        query = 'UPDATE editors SET name = ?, email = ? WHERE editor_id = ?';
        params = [name, email, req.user.id];
        break;
        
      default:
        return res.status(400).json({ message: '无效的用户角色' });
    }
    
    await pool.execute(query, params);
    res.json({ message: '用户信息更新成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 编辑获取所有作者列表
router.get('/authors', authenticateToken, authorizeRole(['editor']), async (req, res) => {
  try {
    const [authors] = await pool.execute('SELECT * FROM authors');
    res.json(authors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 编辑获取所有专家列表
router.get('/experts', authenticateToken, authorizeRole(['editor']), async (req, res) => {
  try {
    const [experts] = await pool.execute('SELECT * FROM experts');
    res.json(experts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;