const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../auth');

// 获取所有论文（作者只能看自己的，编辑和专家可以看所有）
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query, params;
    
    if (req.user.role === 'author') {
      query = 'SELECT * FROM author_papers WHERE author_id = ?';
      params = [req.user.id];
    } else {
      query = 'SELECT * FROM papers';
      params = [];
    }
    
    const [papers] = await pool.execute(query, params);
    res.json(papers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 获取单篇论文详情
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const paperId = req.params.id;
    
    // 检查用户是否有权限查看该论文
    if (req.user.role === 'author') {
      const [authorCheck] = await pool.execute(
        `SELECT COUNT(*) AS count 
         FROM paper_authors_institutions 
         WHERE paper_id = ? AND author_id = ?`,
        [paperId, req.user.id]
      );
      
      if (authorCheck[0].count === 0) {
        return res.status(403).json({ message: '无权查看该论文' });
      }
    }
    
    const [papers] = await pool.execute('SELECT * FROM papers WHERE paper_id = ?', [paperId]);
    
    if (papers.length === 0) {
      return res.status(404).json({ message: '论文不存在' });
    }
    
    res.json(papers[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 提交新论文
router.post('/', authenticateToken, authorizeRole(['author']), async (req, res) => {
  try {
    const { title_zh, title_en, abstract_zh, abstract_en, attachment_path, authors, institutions, is_corresponding, keywords, funds } = req.body;
    
    // 开始事务
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // 插入论文基本信息
      const [paperResult] = await connection.execute(
        `INSERT INTO papers (title_zh, title_en, abstract_zh, abstract_en, attachment_path)
         VALUES (?, ?, ?, ?, ?)`,
        [title_zh, title_en, abstract_zh, abstract_en, attachment_path]
      );
      
      const paperId = paperResult.insertId;
      
      // 处理作者-论文-单位关系
      for (let i = 0; i < authors.length; i++) {
        await connection.execute(
          `INSERT INTO paper_authors_institutions (paper_id, author_id, institution_id, is_corresponding)
           VALUES (?, ?, ?, ?)`,
          [paperId, authors[i], institutions[i], is_corresponding[i]]
        );
      }
      
      // 处理关键词
      if (keywords && keywords.length > 0) {
        for (const keywordId of keywords) {
          await connection.execute(
            `INSERT INTO paper_keywords (paper_id, keyword_id) VALUES (?, ?)`,
            [paperId, keywordId]
          );
        }
      }
      
      // 处理基金
      if (funds && funds.length > 0) {
        for (const fundId of funds) {
          await connection.execute(
            `INSERT INTO paper_funds (paper_id, fund_id) VALUES (?, ?)`,
            [paperId, fundId]
          );
        }
      }
      
      // 提交事务
      await connection.commit();
      connection.release();
      
      res.status(201).json({ message: '论文提交成功', paperId });
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 更新论文信息
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const paperId = req.params.id;
    const { title_zh, title_en, abstract_zh, abstract_en, attachment_path, status, progress } = req.body;
    
    // 检查用户是否有权限更新该论文
    if (req.user.role === 'author') {
      const [authorCheck] = await pool.execute(
        `SELECT COUNT(*) AS count 
         FROM paper_authors_institutions 
         WHERE paper_id = ? AND author_id = ?`,
        [paperId, req.user.id]
      );
      
      if (authorCheck[0].count === 0) {
        return res.status(403).json({ message: '无权更新该论文' });
      }
      
      // 作者只能更新特定字段
      const [result] = await pool.execute(
        `UPDATE papers SET title_zh = ?, title_en = ?, abstract_zh = ?, abstract_en = ?, attachment_path = ?
         WHERE paper_id = ?`,
        [title_zh, title_en, abstract_zh, abstract_en, attachment_path, paperId]
      );
    } else {
      // 编辑和专家可以更新更多字段
      const [result] = await pool.execute(
        `UPDATE papers SET title_zh = ?, title_en = ?, abstract_zh = ?, abstract_en = ?, attachment_path = ?, status = ?, progress = ?
         WHERE paper_id = ?`,
        [title_zh, title_en, abstract_zh, abstract_en, attachment_path, status, progress, paperId]
      );
    }
    
    res.json({ message: '论文更新成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;