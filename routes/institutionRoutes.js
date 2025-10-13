const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../auth');

// 搜索机构API
// 根据传入的机构名称参数，搜索并返回名称中包含该查询参数的机构信息
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { name } = req.query;
    
    // 如果没有提供查询参数，返回错误
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: '请提供机构名称查询参数' });
    }
    
    // 执行模糊搜索
    const [institutions] = await pool.execute(
      'SELECT * FROM institutions WHERE name LIKE ?',
      [`%${name}%`]
    );
    
    res.json(institutions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 新增机构信息API
// 接收并处理提交的机构信息，在institutions表中创建新记录
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, city, zip_code } = req.body;
    
    // 验证必填字段
    if (!name || !city) {
      return res.status(400).json({ message: '机构名称和城市为必填字段' });
    }
    
    // 检查机构是否已存在
    const [existingInstitutions] = await pool.execute(
      'SELECT * FROM institutions WHERE name = ? AND city = ?',
      [name, city]
    );
    
    if (existingInstitutions.length > 0) {
      return res.status(400).json({ message: '该城市中已存在同名机构' });
    }
    
    // 插入新机构记录
    const [result] = await pool.execute(
      'INSERT INTO institutions (name, city, zip_code) VALUES (?, ?, ?)',
      [name, city, zip_code || null]
    );
    
    // 返回新创建的机构信息
    const [newInstitution] = await pool.execute(
      'SELECT * FROM institutions WHERE institution_id = ?',
      [result.insertId]
    );
    
    res.status(201).json(newInstitution[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 作者关联机构API
// 根据作者ID和机构ID，在author_institutions表中创建关联记录
router.post('/author/link', authenticateToken, authorizeRole(['author']), async (req, res) => {
  try {
    const { institution_id } = req.body;
    const author_id = req.user.id;
    
    // 验证必填字段
    if (!institution_id) {
      return res.status(400).json({ message: '请提供机构ID' });
    }
    
    // 检查机构是否存在
    const [institutions] = await pool.execute(
      'SELECT * FROM institutions WHERE institution_id = ?',
      [institution_id]
    );
    
    if (institutions.length === 0) {
      return res.status(404).json({ message: '机构不存在' });
    }
    
    // 检查关联是否已存在
    const [existingLinks] = await pool.execute(
      'SELECT * FROM author_institutions WHERE author_id = ? AND institution_id = ?',
      [author_id, institution_id]
    );
    
    if (existingLinks.length > 0) {
      return res.status(400).json({ message: '您已关联该机构' });
    }
    
    // 创建关联记录
    await pool.execute(
      'INSERT INTO author_institutions (author_id, institution_id) VALUES (?, ?)',
      [author_id, institution_id]
    );
    
    res.json({ message: '机构关联成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 作者解除机构关联API
// 根据作者ID和机构ID，删除author_institutions表中的关联记录
router.delete('/author/unlink/:institution_id', authenticateToken, authorizeRole(['author']), async (req, res) => {
  try {
    const { institution_id } = req.params;
    const author_id = req.user.id;
    
    // 检查关联是否存在
    const [existingLinks] = await pool.execute(
      'SELECT * FROM author_institutions WHERE author_id = ? AND institution_id = ?',
      [author_id, institution_id]
    );
    
    if (existingLinks.length === 0) {
      return res.status(404).json({ message: '您未关联该机构' });
    }
    
    // 删除关联记录
    await pool.execute(
      'DELETE FROM author_institutions WHERE author_id = ? AND institution_id = ?',
      [author_id, institution_id]
    );
    
    res.json({ message: '机构关联已解除' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 专家关联机构API
// 根据专家ID和机构ID，在expert_institutions表中创建关联记录
router.post('/expert/link', authenticateToken, authorizeRole(['expert']), async (req, res) => {
  try {
    const { institution_id } = req.body;
    const expert_id = req.user.id;
    
    // 验证必填字段
    if (!institution_id) {
      return res.status(400).json({ message: '请提供机构ID' });
    }
    
    // 检查机构是否存在
    const [institutions] = await pool.execute(
      'SELECT * FROM institutions WHERE institution_id = ?',
      [institution_id]
    );
    
    if (institutions.length === 0) {
      return res.status(404).json({ message: '机构不存在' });
    }
    
    // 检查关联是否已存在
    const [existingLinks] = await pool.execute(
      'SELECT * FROM expert_institutions WHERE expert_id = ? AND institution_id = ?',
      [expert_id, institution_id]
    );
    
    if (existingLinks.length > 0) {
      return res.status(400).json({ message: '您已关联该机构' });
    }
    
    // 创建关联记录
    await pool.execute(
      'INSERT INTO expert_institutions (expert_id, institution_id) VALUES (?, ?)',
      [expert_id, institution_id]
    );
    
    res.json({ message: '机构关联成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 专家解除机构关联API
// 根据专家ID和机构ID，删除expert_institutions表中的关联记录
router.delete('/expert/unlink/:institution_id', authenticateToken, authorizeRole(['expert']), async (req, res) => {
  try {
    const { institution_id } = req.params;
    const expert_id = req.user.id;
    
    // 检查关联是否存在
    const [existingLinks] = await pool.execute(
      'SELECT * FROM expert_institutions WHERE expert_id = ? AND institution_id = ?',
      [expert_id, institution_id]
    );
    
    if (existingLinks.length === 0) {
      return res.status(404).json({ message: '您未关联该机构' });
    }
    
    // 删除关联记录
    await pool.execute(
      'DELETE FROM expert_institutions WHERE expert_id = ? AND institution_id = ?',
      [expert_id, institution_id]
    );
    
    res.json({ message: '机构关联已解除' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 获取用户关联的机构列表
// 支持查询当前登录用户或指定作者的机构信息
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const { id, role } = req.user;
    const { author_id } = req.query; // 获取查询参数中的author_id
    let query, params;
    
    // 如果提供了author_id参数
    if (author_id) {
      
      // 查询指定作者的机构信息
      query = `
        SELECT i.* FROM institutions i
        JOIN author_institutions ai ON i.institution_id = ai.institution_id
        WHERE ai.author_id = ?
      `;
      params = [author_id];
    } else {
      // 否则查询当前登录用户的机构信息
      switch (role) {
        case 'author':
          query = `
            SELECT i.* FROM institutions i
            JOIN author_institutions ai ON i.institution_id = ai.institution_id
            WHERE ai.author_id = ?
          `;
          break;
          
        case 'expert':
          query = `
            SELECT i.* FROM institutions i
            JOIN expert_institutions ei ON i.institution_id = ei.institution_id
            WHERE ei.expert_id = ?
          `;
          break;
          
        case 'editor':
          // 编辑没有机构关联
          return res.json([]);
          
        default:
          return res.status(400).json({ message: '无效的用户角色' });
      }
      
      params = [id];
    }
    
    const [institutions] = await pool.execute(query, params);
    
    res.json(institutions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;