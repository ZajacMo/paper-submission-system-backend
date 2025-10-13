const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../auth');

// 解析视图中的连接字符串数据的辅助函数
function parseConcatenatedData(data, separator = '|', fieldSeparator = ':') {
  if (!data) return [];
  return data.split(separator).map(item => {
    const fields = item.split(fieldSeparator);
    return fields;
  });
}

// 解析关键词信息
function parseKeywordsInfo(keywordsInfo) {
  if (!keywordsInfo) return { zh: [], en: [] };
  const zhKeywords = [];
  const enKeywords = [];
  
  parseConcatenatedData(keywordsInfo).forEach(fields => {
    const keyword = {
      keyword_id: fields[0],
      keyword_name: fields[1],
      keyword_type: fields[2]
    };
    
    if (keyword.keyword_type === 'zh') {
      zhKeywords.push(keyword);
    } else {
      enKeywords.push(keyword);
    }
  });
  
  return { zh: zhKeywords, en: enKeywords };
}

/**
 * 获取所有关键词列表
 * 作者和专家可以查看所有关键词，用于论文提交
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    // 查询所有关键词
    const [keywords] = await pool.execute(
      'SELECT keyword_id, keyword_name, keyword_type FROM keywords ORDER BY keyword_type, keyword_name'
    );
    
    // 按类型分组
    const zhKeywords = [];
    const enKeywords = [];
    
    keywords.forEach(keyword => {
      if (keyword.keyword_type === 'zh') {
        zhKeywords.push(keyword);
      } else {
        enKeywords.push(keyword);
      }
    });
    
    res.json({
      zh: zhKeywords,
      en: enKeywords
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * 添加新关键词
 * 只有编辑角色可以添加关键词
 */
router.post('/', authenticateToken, authorizeRole(['author']), async (req, res) => {
  try {
    const { keyword_name, keyword_type } = req.body;
    
    // 验证必填字段
    if (!keyword_name || !keyword_type) {
      return res.status(400).json({ message: '关键词名称和类型不能为空' });
    }
    
    // 验证关键词类型
    if (!['zh', 'en'].includes(keyword_type)) {
      return res.status(400).json({ message: '关键词类型必须是 zh 或 en' });
    }
    
    // 验证关键词长度
    if (keyword_name.length > 20) {
      return res.status(400).json({ message: '关键词名称不能超过20个字符' });
    }
    
    // 检查关键词是否已存在
    const [existingKeywords] = await pool.execute(
      'SELECT * FROM keywords WHERE keyword_name = ? AND keyword_type = ?',
      [keyword_name, keyword_type]
    );
    
    if (existingKeywords.length > 0) {
      return res.status(400).json({ message: '该关键词已存在' });
    }
    
    // 添加新关键词
    const [result] = await pool.execute(
      'INSERT INTO keywords (keyword_name, keyword_type) VALUES (?, ?)',
      [keyword_name, keyword_type]
    );
    
    res.status(201).json({
      message: '关键词添加成功',
      keyword_id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * 更新关键词
 * 只有编辑角色可以更新关键词
 */
router.put('/:id', authenticateToken, authorizeRole(['editor']), async (req, res) => {
  try {
    const keywordId = req.params.id;
    const { keyword_name, keyword_type } = req.body;
    
    // 验证必填字段
    if (!keyword_name || !keyword_type) {
      return res.status(400).json({ message: '关键词名称和类型不能为空' });
    }
    
    // 验证关键词类型
    if (!['zh', 'en'].includes(keyword_type)) {
      return res.status(400).json({ message: '关键词类型必须是 zh 或 en' });
    }
    
    // 验证关键词长度
    if (keyword_name.length > 20) {
      return res.status(400).json({ message: '关键词名称不能超过20个字符' });
    }
    
    // 检查关键词是否存在
    const [existingKeywords] = await pool.execute(
      'SELECT * FROM keywords WHERE keyword_id = ?',
      [keywordId]
    );
    
    if (existingKeywords.length === 0) {
      return res.status(404).json({ message: '关键词不存在' });
    }
    
    // 检查更新后的关键词是否已存在（排除当前关键词）
    const [duplicateKeywords] = await pool.execute(
      'SELECT * FROM keywords WHERE keyword_name = ? AND keyword_type = ? AND keyword_id != ?',
      [keyword_name, keyword_type, keywordId]
    );
    
    if (duplicateKeywords.length > 0) {
      return res.status(400).json({ message: '该关键词已存在' });
    }
    
    // 更新关键词
    await pool.execute(
      'UPDATE keywords SET keyword_name = ?, keyword_type = ? WHERE keyword_id = ?',
      [keyword_name, keyword_type, keywordId]
    );
    
    res.json({ message: '关键词更新成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * 删除关键词
 * 只有编辑角色可以删除关键词
 */
router.delete('/:id', authenticateToken, authorizeRole(['editor']), async (req, res) => {
  try {
    const keywordId = req.params.id;
    
    // 开始事务
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // 检查关键词是否存在
      const [existingKeywords] = await connection.execute(
        'SELECT * FROM keywords WHERE keyword_id = ?',
        [keywordId]
      );
      
      if (existingKeywords.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ message: '关键词不存在' });
      }
      
      // 删除与论文的关联
      await connection.execute(
        'DELETE FROM paper_keywords WHERE keyword_id = ?',
        [keywordId]
      );
      
      // 删除关键词
      await connection.execute(
        'DELETE FROM keywords WHERE keyword_id = ?',
        [keywordId]
      );
      
      // 提交事务
      await connection.commit();
      connection.release();
      
      res.json({ message: '关键词删除成功' });
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

/**
 * 搜索关键词
 */
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { query, type } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: '请输入搜索关键词' });
    }
    
    let searchQuery = 'SELECT keyword_id, keyword_name, keyword_type FROM keywords WHERE keyword_name LIKE ?';
    const params = [`%${query}%`];
    
    // 如果指定了类型，添加类型过滤
    if (type && ['zh', 'en'].includes(type)) {
      searchQuery += ' AND keyword_type = ?';
      params.push(type);
    }
    
    searchQuery += ' ORDER BY keyword_type, keyword_name';
    
    const [keywords] = await pool.execute(searchQuery, params);
    
    res.json(keywords);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * 搜索中文关键词
 */
router.get('/search/zh', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: '请输入搜索关键词' });
    }
    
    const searchQuery = 'SELECT keyword_id, keyword_name, keyword_type FROM keywords WHERE keyword_name LIKE ? AND keyword_type = ? ORDER BY keyword_name';
    const params = [`%${query}%`, 'zh'];
    
    const [keywords] = await pool.execute(searchQuery, params);
    
    res.json(keywords);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * 搜索英文关键词
 */
router.get('/search/en', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: '请输入搜索关键词' });
    }
    
    const searchQuery = 'SELECT keyword_id, keyword_name, keyword_type FROM keywords WHERE keyword_name LIKE ? AND keyword_type = ? ORDER BY keyword_name';
    const params = [`%${query}%`, 'en'];
    
    const [keywords] = await pool.execute(searchQuery, params);
    
    res.json(keywords);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * 作者关联论文与关键词
 */
router.post('/papers/:paperId/associate', authenticateToken, authorizeRole(['author']), async (req, res) => {
  try {
    const paperId = req.params.paperId;
    const { keywords_zh = [], keywords_en = [] } = req.body;
    
    // 检查论文是否存在且属于当前作者
    const [authorCheck] = await pool.execute(
      `SELECT COUNT(*) AS count 
       FROM paper_authors_institutions 
       WHERE paper_id = ? AND author_id = ?`,
      [paperId, req.user.id]
    );
    
    if (authorCheck[0].count === 0) {
      return res.status(403).json({ message: '无权操作该论文' });
    }
    
    // 检查论文是否存在
    const [paperCheck] = await pool.execute('SELECT paper_id FROM papers WHERE paper_id = ?', [paperId]);
    if (paperCheck.length === 0) {
      return res.status(404).json({ message: '论文不存在' });
    }
    
    // 验证关键词ID是否存在且类型正确
    const allKeywordIds = [...keywords_zh, ...keywords_en];
    if (allKeywordIds.length > 0) {
      const [validKeywords] = await pool.execute(
        `SELECT keyword_id, keyword_type FROM keywords WHERE keyword_id IN (${allKeywordIds.map(() => '?').join(',')})`,
        allKeywordIds
      );
      
      // 构建关键词ID到类型的映射
      const keywordTypeMap = {};
      validKeywords.forEach(keyword => {
        keywordTypeMap[keyword.keyword_id] = keyword.keyword_type;
      });
      
      // 验证中文关键词
      for (const keywordId of keywords_zh) {
        if (!keywordTypeMap[keywordId] || keywordTypeMap[keywordId] !== 'zh') {
          return res.status(400).json({ message: `关键词ID ${keywordId} 不是中文关键词` });
        }
      }
      
      // 验证英文关键词
      for (const keywordId of keywords_en) {
        if (!keywordTypeMap[keywordId] || keywordTypeMap[keywordId] !== 'en') {
          return res.status(400).json({ message: `关键词ID ${keywordId} 不是英文关键词` });
        }
      }
    }
    
    // 开始事务
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // 先删除该论文的所有关键词关联
      await connection.execute(
        'DELETE FROM paper_keywords WHERE paper_id = ?',
        [paperId]
      );
      
      // 添加新的关键词关联
      const allKeywords = [...keywords_zh, ...keywords_en];
      if (allKeywords.length > 0) {
        const insertPromises = allKeywords.map(keywordId => 
          connection.execute(
            'INSERT INTO paper_keywords (paper_id, keyword_id) VALUES (?, ?)',
            [paperId, keywordId]
          )
        );
        
        await Promise.all(insertPromises);
      }
      
      // 提交事务
      await connection.commit();
      connection.release();
      
      res.json({
        message: '论文关键词关联成功',
        paper_id: paperId,
        keywords_zh_count: keywords_zh.length,
        keywords_en_count: keywords_en.length
      });
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

module.exports = router;
module.exports.parseKeywordsInfo = parseKeywordsInfo;