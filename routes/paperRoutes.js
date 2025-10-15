const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken, authorizeRole } = require('../auth');
const { parseKeywordsInfo } = require('./keywordRoutes');
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



// 解析基金信息
function parseFundsInfo(fundsInfo) {
  if (!fundsInfo) return [];
  return parseConcatenatedData(fundsInfo).map(fields => ({
    fund_id: fields[0],
    project_name: fields[1],
    project_number: fields[2]
  }));
}


// 获取当前用户所有论文的审稿进度（作者视角）
router.get('/progress', authenticateToken, authorizeRole(['author']), async (req, res) => {
  try {
    const authorId = req.user.id;
    
    // 查询当前作者所有论文的审稿进度
    const [progressList] = await pool.execute(
      `SELECT prp.* FROM paper_review_progress prp
       JOIN paper_authors_institutions pai ON prp.paper_id = pai.paper_id
       WHERE pai.author_id = ?
       ORDER BY prp.submission_time DESC`,
      [authorId]
    );
    
    res.json(progressList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 获取所有论文（作者只能看自己的，编辑和专家可以看所有）
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query, params = [];
    const { progress, search, id, sortBy = 'submission_date', sortOrder = 'DESC' } = req.query;
    
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
    
    if (id) {
      query += ' AND paper_id = ?';
      params.push(id);
    }
    
    if (search && !id) { // 如果指定了ID搜索，则不执行模糊搜索
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
    // const { zh: keywords_zh, en: keywords_en } = parseKeywordsInfo(paper.keywords_info);
    const keywords_zh = parseConcatenatedData(paper.keywords_zh, '|', ':');
    const keywords_en = parseConcatenatedData(paper.keywords_en, '|', ':');

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
      keywords_zh,
      keywords_en,
      submission_date: paper.submission_date,
      progress: paper.progress,
      integrity: paper.integrity,
      check_time: paper.check_time,
      authors,
      funds,
      reviewComments,
      totalAuthors: authors.length,
      totalKeywords: keywords_zh.length + keywords_en.length,
      totalFunds: funds.length,
      hasReviewComments: reviewComments.length > 0,
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
    const { title_zh, title_en, abstract_zh, abstract_en, keywords_zh, keywords_en, keywords_new, attachment_path, authors, institutions, is_corresponding,  funds, funds_new } = req.body;
    // console.log(req.body);
    // 验证附件路径格式（如果提供了）
    if (attachment_path) {
      // 检查附件路径是否以'uploads/'开头
      if (!attachment_path.startsWith('uploads')) {
        return res.status(400).json({ message: '附件路径格式不正确，必须以uploads开头' });
      }
      
      // 检查附件文件是否存在
      const filePath = path.join(__dirname, '..', attachment_path);
      if (!fs.existsSync(filePath)) {
        return res.status(400).json({ message: '附件文件不存在，请先上传正确的附件' });
      }
    }
    
    // 开始事务
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // 插入论文基本信息 - 确保undefined参数转换为null
      const [paperResult] = await connection.execute(
        `INSERT INTO papers (title_zh, title_en, abstract_zh, abstract_en, attachment_path)
         VALUES (?, ?, ?, ?, ?)`,
        [title_zh ?? null, title_en ?? null, abstract_zh ?? null, abstract_en ?? null, attachment_path ?? null]
      );
      
      const paperId = paperResult.insertId;
      
      // 处理作者-论文-单位关系
      for (let i = 0; i < authors.length; i++) {
        await connection.execute(
          `INSERT INTO paper_authors_institutions (paper_id, author_id, institution_id, is_corresponding)
           VALUES (?, ?, ?, ?)`,
          [paperId, authors[i] ?? null, institutions[i] ?? null, is_corresponding[i] ?? null]
        );
      }
      
      // 处理关键词
      // 处理新关键词
      if (keywords_new && keywords_new.length > 0) {
        for (const keyword of keywords_new) {
          await connection.execute(
            `INSERT INTO keywords (keyword_name, keyword_type) VALUES (?, ?)`,
            [keyword.name ?? null, keyword.type ?? null]
          );
        }
      }

      // 中文关键词
      if (keywords_zh && keywords_zh.length > 0) {
        for (const keyword of keywords_zh) {
          await connection.execute(
            `INSERT INTO paper_keywords (paper_id, keyword_id) VALUES (?, (SELECT keyword_id FROM keywords WHERE keyword_name = ? AND keyword_type = 'zh'))`,
            [paperId, keyword ?? null]
          );
        }
      }
      
      // 英文关键词
      if (keywords_en && keywords_en.length > 0) {
        for (const keyword of keywords_en) {
          await connection.execute(
            `INSERT INTO paper_keywords (paper_id, keyword_id) VALUES (?, (SELECT keyword_id FROM keywords WHERE keyword_name = ? AND keyword_type = 'en'))`,
            [paperId, keyword ?? null]
          );
        }
      }
      
      // 处理基金
      // 新建基金
      if (funds_new && funds_new.length > 0) {
        for (const fund of funds_new) {
          await connection.execute(
            `INSERT INTO funds (project_name, project_number) VALUES (?, ?)`,
            [fund.name ?? null, fund.number ?? null]
          );
        }
      }
      
      //创建关联
      if (funds && funds.length > 0) {
        for (const fund of funds) {
          await connection.execute(
            `INSERT INTO paper_funds (paper_id, fund_id) VALUES (?, (SELECT fund_id FROM funds WHERE project_name = ?))`,
            [paperId, fund ?? null]
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
    throw error;
  }
});

// 更新论文信息
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const paperId = req.params.id;
    const { title_zh, title_en, abstract_zh, abstract_en, keywords_zh, keywords_en, keywords_new, attachment_path, authors, institutions, is_corresponding, funds, funds_new, progress } = req.body;
    
    // 验证附件路径格式（如果提供了）
    if (attachment_path) {
      // 检查附件路径是否以'uploads/'开头
      if (!attachment_path.startsWith('uploads')) {
        return res.status(400).json({ message: '附件路径格式不正确，必须以uploads/开头' });
      }
      
      // 检查附件文件是否存在
      const filePath = path.join(__dirname, '..', attachment_path);
      if (!fs.existsSync(filePath)) {
        return res.status(400).json({ message: '附件文件不存在，请先上传正确的附件' });
      }
    }
    
    // 获取旧的附件路径（如果有）
    let oldAttachmentPath = null;
    const [oldPaperData] = await pool.execute(
      'SELECT attachment_path FROM papers WHERE paper_id = ?',
      [paperId]
    );
    
    if (oldPaperData.length > 0 && oldPaperData[0].attachment_path) {
      oldAttachmentPath = oldPaperData[0].attachment_path;
    }
    
    // 检查用户是否有权限更新该论文
    const [authorCheck] = await pool.execute(
      `SELECT COUNT(*) AS count 
        FROM paper_authors_institutions 
        WHERE paper_id = ? AND author_id = ?`,
      [paperId, req.user.id]
    );
    
    if (authorCheck[0].count === 0) {
      return res.status(403).json({ message: '无权更新该论文' });
    }

    // 获取数据库连接并开始事务
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // 作者只能更新特定字段
      const [result] = await connection.execute(
        `UPDATE papers SET title_zh = ?, title_en = ?, abstract_zh = ?, abstract_en = ?, attachment_path = ?
          WHERE paper_id = ?`,
        [title_zh, title_en, abstract_zh, abstract_en, attachment_path, paperId]
      );
      
      // 先删除该论文的所有现有作者关联
      await connection.execute(
        `DELETE FROM paper_authors_institutions WHERE paper_id = ?`,
        [paperId]
      );

      // 然后重新添加所有作者关联
      if (authors && authors.length > 0) {
        for (let i = 0; i < authors.length; i++) {
          await connection.execute(
            `INSERT INTO paper_authors_institutions (paper_id, author_id, institution_id, is_corresponding)
             VALUES (?, ?, ?, ?)`,
            [paperId, authors[i], institutions && institutions[i] ? institutions[i] : null, is_corresponding && is_corresponding[i] ? is_corresponding[i] : false]
          );
        }
      };

      // 处理关键词
      // 先删除该论文的所有现有关键词关联
      await connection.execute(
        `DELETE FROM paper_keywords WHERE paper_id = ?`,
        [paperId]
      );

      // 处理新关键词
      if (keywords_new && keywords_new.length > 0) {
        for (const keyword of keywords_new) {
          await connection.execute(
            `INSERT INTO keywords (keyword_name, keyword_type) VALUES (?, ?)`,
            [keyword.name, keyword.type]
          );
        }
      }

      // 中文关键词
      if (keywords_zh && keywords_zh.length > 0) {
        for (const keyword of keywords_zh) {
          await connection.execute(
            `INSERT INTO paper_keywords (paper_id, keyword_name, keyword_type) VALUES (?, ?, ?)`,
            [paperId, keyword, 'zh']
          );
        }
      }
      
      // 英文关键词
      if (keywords_en && keywords_en.length > 0) {
        for (const keyword of keywords_en) {
          await connection.execute(
            `INSERT INTO paper_keywords (paper_id, keyword_name, keyword_type) VALUES (?, ?, ?)`,
            [paperId, keyword, 'en']
          );
        }
      }

      // 处理基金
      // 先删除该论文的所有现有基金关联
      await connection.execute(
        `DELETE FROM paper_funds WHERE paper_id = ?`,
        [paperId]
      );

      // 处理新基金
      if (funds_new && funds_new.length > 0) {
        for (const fund of funds_new) {
          await connection.execute(
            `INSERT INTO funds (fund_name, fund_number) VALUES (?, ?)`,
            [fund.name, fund.number]
          );
        }
      }
      
      // 创建基金关联
      if (funds && funds.length > 0) {
        for (const fund of funds) {
          await connection.execute(
            `INSERT INTO paper_funds (paper_id, fund_name) VALUES (?, ?)`,
            [paperId, fund]
          );
        }
      }

      // 提交事务
      await connection.commit();
      connection.release();

      // 如果提供了新的附件路径并且与旧的不同，则删除旧附件
      if (oldAttachmentPath && attachment_path && oldAttachmentPath !== attachment_path) {
        const oldFilePath = path.join(__dirname, '..', oldAttachmentPath);
        try {
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
            console.log(`旧附件已删除: ${oldFilePath}`);
          }
        } catch (deleteError) {
          console.error('删除旧附件失败:', deleteError);
          // 即使删除失败，也不影响论文更新的成功状态
        }
      }
      
      res.json({ message: '论文更新成功' });
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

// 获取指定论文的审稿进度
router.get('/:id/progress', authenticateToken, authorizeRole(['author', 'expert', 'editor']), async (req, res) => {
  try {
    const paperId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // 检查用户是否有权限访问此论文的进度
    if (userRole === 'author') {
      // 作者只能查看自己参与的论文进度
      const [authorPapers] = await pool.execute(
        `SELECT p.paper_id FROM papers p 
         JOIN paper_authors_institutions pai ON p.paper_id = pai.paper_id 
         WHERE p.paper_id = ? AND pai.author_id = ?`,
        [paperId, userId]
      );
      
      if (authorPapers.length === 0) {
        return res.status(403).json({ message: '无权访问该论文的审稿进度' });
      }
    }
    
    // 查询论文审稿进度
    const [progress] = await pool.execute(
      `SELECT * FROM paper_review_progress WHERE paper_id = ?`,
      [paperId]
    );
    
    if (progress.length === 0) {
      return res.status(404).json({ message: '未找到该论文的审稿进度' });
    }
    
    res.json(progress[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;