const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../auth');

// 获取当前用户信息
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    let query, params;
    let user, institutions = [];
    
    switch (req.user.role) {
      case 'author':
        // 先获取作者基本信息
        query = 'SELECT * FROM authors WHERE author_id = ?';
        params = [req.user.id];
        const [authors] = await pool.execute(query, params);
        
        if (authors.length === 0) {
          return res.status(404).json({ message: '用户不存在' });
        }
        
        user = authors[0];
        
        // 获取作者所属的所有机构信息
        const [authorInstitutions] = await pool.execute(
          `SELECT i.* FROM institutions i
           JOIN author_institutions ai ON i.institution_id = ai.institution_id
           WHERE ai.author_id = ?`,
          [req.user.id]
        );
        
        institutions = authorInstitutions;
        break;
        
      case 'expert':
        // 先获取专家基本信息
        query = 'SELECT * FROM experts WHERE expert_id = ?';
        params = [req.user.id];
        const [experts] = await pool.execute(query, params);
        
        if (experts.length === 0) {
          return res.status(404).json({ message: '用户不存在' });
        }
        
        user = experts[0];
        
        // 获取专家所属的所有机构信息
        const [expertInstitutions] = await pool.execute(
          `SELECT i.* FROM institutions i
           JOIN expert_institutions ei ON i.institution_id = ei.institution_id
           WHERE ei.expert_id = ?`,
          [req.user.id]
        );
        
        institutions = expertInstitutions;
        break;
        
      case 'editor':
        // 编辑没有机构信息
        query = 'SELECT * FROM editors WHERE editor_id = ?';
        params = [req.user.id];
        const [editors] = await pool.execute(query, params);
        
        if (editors.length === 0) {
          return res.status(404).json({ message: '用户不存在' });
        }
        
        user = editors[0];
        break;
        
      default:
        return res.status(400).json({ message: '无效的用户角色' });
    }
    
    // 移除敏感信息
    if (user.password) {
      delete user.password;
    }
    
    // 添加机构信息数组
    user.institutions = institutions;
    
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
          
          // 支持专家更新所有相关字段
          if (otherFields.title) { query += ', title = ?'; params.push(otherFields.title); }
          if (otherFields.research_areas) { query += ', research_areas = ?'; params.push(otherFields.research_areas); }
          if (otherFields.review_fee) { query += ', review_fee = ?'; params.push(otherFields.review_fee); }
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
      
    const [result] = await pool.execute(query, params);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }
      
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

//根据输入的作者ID或姓名查询作者
router.get('/search', authenticateToken, authorizeRole(['author']), async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: '请输入作者ID或姓名' });
    }
    
    let author_list;
    if (!isNaN(query)) {
      // 假设ID是整数
      const [authors] = await pool.execute('SELECT author_id, name FROM authors WHERE CAST(author_id AS CHAR) LIKE ?', [`%${query}%`]);
      author_list = authors;
    } else {
      // 假设姓名是字符串
      const [authors] = await pool.execute('SELECT author_id, name FROM authors WHERE name LIKE ?', [`%${query}%`]);
      author_list = authors;
    }
    
    if (!author_list) {
      return res.status(404).json({ message: '作者不存在' });
    }
    
    res.json(author_list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
