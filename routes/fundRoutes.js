const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../auth');

/**
 * 新建基金
 * 作者用户可以创建新的基金项目
 */
router.post('/', authenticateToken, authorizeRole(['author']), async (req, res) => {
  try {
    const { project_name, project_number } = req.body;
    const user_id = req.user.id;

    // 验证参数
    if (!project_name || !project_number) {
      return res.status(400).json({ message: '项目名称和项目编号不能为空' });
    }

    // 检查基金是否已存在
    const [existingFunds] = await pool.execute(
      'SELECT * FROM funds WHERE project_number = ?',
      [project_number]
    );

    if (existingFunds.length > 0) {
      return res.status(409).json({ message: '该基金项目编号已存在' });
    }

    // 创建新基金
    const [result] = await pool.execute(
      'INSERT INTO funds (project_name, project_number) VALUES (?, ?)',
      [project_name, project_number]
    );

    res.status(201).json({
      message: '基金创建成功',
      fund_id: result.insertId,
      project_name,
      project_number
    });
  } catch (error) {
    console.error('创建基金失败:', error);
    res.status(500).json({ message: '服务器错误，创建基金失败' });
  }
});

/**
 * 查询作者的所有基金
 * 作者用户可以查询自己创建或关联的所有基金
 */
router.get('/', authenticateToken, authorizeRole(['author']), async (req, res) => {
  try {
    const user_id = req.user.id;

    // 查询作者关联的所有基金（通过论文关联和作者直接创建）
    const [funds] = await pool.execute(
      `SELECT DISTINCT f.fund_id, f.project_name, f.project_number 
       FROM funds f 
       LEFT JOIN paper_funds pf ON f.fund_id = pf.fund_id 
       LEFT JOIN papers p ON pf.paper_id = p.paper_id 
       WHERE p.author_id = ? 
       ORDER BY f.project_name`,
      [user_id]
    );

    res.status(200).json(funds);
  } catch (error) {
    console.error('查询基金失败:', error);
    res.status(500).json({ message: '服务器错误，查询基金失败' });
  }
});


/**
 * 搜索基金
 * 作者用户可以根据项目名称或编号搜索基金
 */
router.get('/search', authenticateToken, authorizeRole(['author']), async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: '搜索关键词不能为空' });
    }

    // 搜索与作者关联的基金
    const [funds] = await pool.execute(
      `SELECT DISTINCT f.fund_id, f.project_name, f.project_number 
       FROM funds f 
       LEFT JOIN paper_funds pf ON f.fund_id = pf.fund_id 
       LEFT JOIN papers p ON pf.paper_id = p.paper_id 
       WHERE f.project_name LIKE ? OR f.project_number LIKE ? 
       ORDER BY f.project_name`,
      [`%${query}%`, `%${query}%`]
    );

    res.status(200).json(funds);
  } catch (error) {
    console.error('搜索基金失败:', error);
    res.status(500).json({ message: '服务器错误，搜索基金失败' });
  }
});

/**
 * 根据ID查询基金详情
 * 作者用户可以查询特定基金的详细信息
 */
router.get('/:fundId', authenticateToken, authorizeRole(['author']), async (req, res) => {
  try {
    const { fundId } = req.params;
    const user_id = req.user.id;

    // 查询基金详情并验证用户是否有权限
    const [funds] = await pool.execute(
      `SELECT f.fund_id, f.project_name, f.project_number 
       FROM funds f 
       LEFT JOIN paper_funds pf ON f.fund_id = pf.fund_id 
       LEFT JOIN papers p ON pf.paper_id = p.paper_id 
       WHERE f.fund_id = ? AND p.author_id = ?`,
      [fundId, user_id]
    );

    if (funds.length === 0) {
      return res.status(404).json({ message: '基金不存在或您无权访问' });
    }

    res.status(200).json(funds[0]);
  } catch (error) {
    console.error('查询基金详情失败:', error);
    res.status(500).json({ message: '服务器错误，查询基金详情失败' });
  }
});

module.exports = router;