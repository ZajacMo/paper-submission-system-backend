const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../auth');

// 获取所有论文（作者只能看自己的，编辑和专家可以看所有）
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query, params = [];
    const { progress, status, search, sortBy = 'submission_date', sortOrder = 'DESC' } = req.query;
    
    if (req.user.role === 'author') {
      query = `SELECT p.*, pai.is_corresponding 
               FROM papers p 
               INNER JOIN paper_authors_institutions pai ON p.paper_id = pai.paper_id 
               WHERE pai.author_id = ?`;
      params = [req.user.id];
    } else {
      query = 'SELECT * FROM papers';
    }
    
    // 添加过滤条件
    if (progress) {
      query += ' AND progress = ?';
      params.push(progress);
    }
    
    if (search) {
      query += ` AND (title_zh LIKE ? OR title_en LIKE ? OR abstract_zh LIKE ? OR abstract_en LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }
    
    // 添加排序
    const validSortColumns = ['submission_date', 'title_zh', 'title_en', 'progress'];
    const validSortOrders = ['ASC', 'DESC'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'submission_date';
    const order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    
    query += ` ORDER BY ${sortColumn} ${order}`;
    
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
    
    // 获取论文基本信息
    const [papers] = await pool.execute('SELECT * FROM papers WHERE paper_id = ?', [paperId]);
    
    if (papers.length === 0) {
      return res.status(404).json({ message: '论文不存在' });
    }
    
    const paper = papers[0];
    
    // 获取论文的所有作者信息
    const [authors] = await pool.execute(
      `SELECT a.author_id, a.name, a.email, i.name AS institution_name, pai.is_corresponding 
       FROM authors a 
       JOIN paper_authors_institutions pai ON a.author_id = pai.author_id 
       JOIN institutions i ON pai.institution_id = i.institution_id 
       WHERE pai.paper_id = ?`,
      [paperId]
    );
    
    // 获取论文的关键词
    const [keywords] = await pool.execute(
      `SELECT k.keyword_id, k.keyword_name 
       FROM keywords k 
       JOIN paper_keywords pk ON k.keyword_id = pk.keyword_id 
       WHERE pk.paper_id = ?`,
      [paperId]
    );
    
    // 获取论文的基金信息
    const [funds] = await pool.execute(
      `SELECT f.fund_id, f.project_name, f.project_number 
       FROM funds f 
       JOIN paper_funds pf ON f.fund_id = pf.fund_id 
       WHERE pf.paper_id = ?`,
      [paperId]
    );
    
    // 如果是作者或编辑，获取审稿意见
    let reviewComments = [];
    if (req.user.role === 'author' || req.user.role === 'editor') {
      const [comments] = await pool.execute(
        `SELECT ra.conclusion, ra.positive_comments, ra.negative_comments, ra.modification_advice, 
                e.name AS expert_name, ra.submission_date, ra.status
         FROM review_assignments ra 
         JOIN experts e ON ra.expert_id = e.expert_id 
         WHERE ra.paper_id = ? AND ra.status = 'Completed'`,
        [paperId]
      );
      reviewComments = comments;
    }
    
    const [status] = await pool.execute(
      `SELECT status, review_times FROM paper_status WHERE paper_id = ?`,
      [paperId]
    );

    // 整合所有信息
    const detailedPaper = {
      ...paper,
      authors,
      keywords,
      funds,
      reviewComments,
      totalAuthors: authors.length,
      totalKeywords: keywords.length,
      totalFunds: funds.length,
      hasReviewComments: reviewComments.length > 0,
      status: status[0].status,
      reviewTimes: status[0].review_times,
    };
    
    res.json(detailedPaper);
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
        `UPDATE papers SET title_zh = ?, title_en = ?, abstract_zh = ?, abstract_en = ?, attachment_path = ?, progress = ?
         WHERE paper_id = ?`,
        [title_zh, title_en, abstract_zh, abstract_en, attachment_path, progress, paperId]
      );
    }
    
    res.json({ message: '论文更新成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 编辑进行论文完整性检查
router.put('/:id/integrity', authenticateToken, authorizeRole(['editor']), async (req, res) => {
  try {
    const paperId = req.params.id;
    const { integrity } = req.body;
    
    // 验证完整性状态
    const validIntegrityStatuses = ['True', 'False', 'Waiting'];
    if (!integrity || !validIntegrityStatuses.includes(integrity)) {
      return res.status(400).json({ 
        message: '无效的完整性状态，有效状态为：True, False, Waiting'
      });
    }
    
    // 检查论文是否存在
    const [papers] = await pool.execute('SELECT * FROM papers WHERE paper_id = ?', [paperId]);
    if (papers.length === 0) {
      return res.status(404).json({ message: '论文不存在' });
    }
    
    // 更新论文完整性状态和检查时间
    const [result] = await pool.execute(
      `UPDATE papers SET integrity = ?, check_time = CURRENT_TIMESTAMP WHERE paper_id = ?`,
      [integrity, paperId]
    );
    
    res.json({ message: '论文完整性检查完成' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;