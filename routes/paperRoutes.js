const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保uploads目录存在
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// 创建multer上传实例
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // 仅允许特定的文件类型
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|ppt|pptx|xls|xlsx|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('仅支持图片、文档、PDF和压缩文件！'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB限制
  }
});

// 解析视图中的连接字符串数据的辅助函数
function parseConcatenatedData(data, separator = '|', fieldSeparator = ':') {
  if (!data) return [];
  return data.split(separator).map(item => {
    const fields = item.split(fieldSeparator);
    return fields;
  });
}

// 解析作者信息
function parseAuthorsInfo(authorsInfo) {
  if (!authorsInfo) return [];
  return parseConcatenatedData(authorsInfo).map(fields => ({
    author_id: fields[0],
    name: fields[1],
    institution_name: fields[2],
    is_corresponding: fields[3] === '1'
  }));
}

// 解析关键词信息
function parseKeywordsInfo(keywordsInfo) {
  if (!keywordsInfo) return [];
  return parseConcatenatedData(keywordsInfo).map(fields => ({
    keyword_id: fields[0],
    keyword_name: fields[1]
  }));
}

// 解析基金信息
function parseFundsInfo(fundsInfo) {
  if (!fundsInfo) return [];
  return parseConcatenatedData(fundsInfo).map(fields => ({
    fund_id: fields[0],
    project_name: fields[1],
    project_number: fields[2]
  }));
}

// 获取所有论文（作者只能看自己的，编辑和专家可以看所有）
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query, params = [];
    const { progress, search, sortBy = 'submission_date', sortOrder = 'DESC' } = req.query;
    
    if (req.user.role === 'author') {
      // 使用作者可访问论文视图
      query = `SELECT DISTINCT p.* 
               FROM author_accessible_papers p 
               WHERE p.author_id = ?`;
      params = [req.user.id];
    } else {
      // 编辑和专家查看所有论文
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
    
    // 使用论文完整详情视图获取所有基本信息
    const [papers] = await pool.execute('SELECT * FROM paper_full_details WHERE paper_id = ?', [paperId]);
    
    if (papers.length === 0) {
      return res.status(404).json({ message: '论文不存在' });
    }
    
    const paper = papers[0];
    
    // 解析作者、关键词和基金信息
    const authors = parseAuthorsInfo(paper.authors_info);
    const keywords = parseKeywordsInfo(paper.keywords_info);
    const funds = parseFundsInfo(paper.funds_info);
    
    // 如果是作者或编辑，获取审稿意见
    let reviewComments = [];
    if (req.user.role === 'author' || req.user.role === 'editor') {
      const [comments] = await pool.execute(
        `SELECT * FROM paper_review_details WHERE paper_id = ? AND review_status = 'Completed'`,
        [paperId]
      );
      reviewComments = comments;
    }

    // 整合所有信息
    const detailedPaper = {
      paper_id: paper.paper_id,
      title_zh: paper.title_zh,
      title_en: paper.title_en,
      abstract_zh: paper.abstract_zh,
      abstract_en: paper.abstract_en,
      attachment_path: paper.attachment_path,
      submission_date: paper.submission_date,
      progress: paper.progress,
      integrity: paper.integrity,
      check_time: paper.check_time,
      authors,
      keywords,
      funds,
      reviewComments,
      totalAuthors: authors.length,
      totalKeywords: keywords.length,
      totalFunds: funds.length,
      hasReviewComments: reviewComments.length > 0,
      status: paper.paper_status,
      reviewTimes: paper.review_times,
    };
    
    res.json(detailedPaper);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 下载论文附件
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const paperId = req.params.id;
    
    // 检查用户是否有权限下载该论文
    if (req.user.role === 'author') {
      const [authorCheck] = await pool.execute(
        `SELECT COUNT(*) AS count 
         FROM paper_authors_institutions 
         WHERE paper_id = ? AND author_id = ?`,
        [paperId, req.user.id]
      );
      
      if (authorCheck[0].count === 0) {
        return res.status(403).json({ message: '无权下载该论文' });
      }
    }
    
    // 获取论文信息，包括附件路径
    const [papers] = await pool.execute(
      'SELECT p.attachment_path, p.title_zh, p.title_en FROM papers p WHERE p.paper_id = ?',
      [paperId]
    );
    
    if (papers.length === 0) {
      return res.status(404).json({ message: '论文不存在' });
    }
    
    const paper = papers[0];
    
    // 检查是否有附件
    if (!paper.attachment_path) {
      return res.status(404).json({ message: '该论文没有附件' });
    }
    
    // 构建文件的完整路径
    const filePath = path.join(__dirname, '..', paper.attachment_path);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: '附件文件不存在' });
    }
    
    // 确定文件的MIME类型
    const mimeType = require('mime-types').lookup(filePath) || 'application/octet-stream';
    
    // 设置响应头，提供文件下载
    res.setHeader('Content-Type', mimeType);
    
    // 创建一个友好的下载文件名
    const originalFilename = path.basename(filePath);
    const extension = path.extname(filePath);
    // 使用论文标题作为下载文件名，去除特殊字符
    let downloadFilename = paper.title_zh || paper.title_en || '论文';
    downloadFilename = downloadFilename.replace(/[\\/:*?"<>|]/g, '').trim();
    downloadFilename += extension;
    
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadFilename)}"`);
    
    // 流式传输文件
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('下载文件错误:', error);
    res.status(500).json({ message: error.message });
  }
});

// 上传论文附件
router.post('/upload-attachment', authenticateToken, authorizeRole(['author']), upload.single('attachment'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '未上传文件' });
    }

    // 获取文件的相对路径（相对于项目根目录）
    const relativePath = path.join('uploads', req.file.filename);
    
    res.status(200).json({
      message: '文件上传成功',
      file: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: relativePath
      }
    });
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
    const { title_zh, title_en, abstract_zh, abstract_en, attachment_path, progress } = req.body;
    
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