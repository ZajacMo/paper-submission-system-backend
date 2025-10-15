-- 数据库扩展组件：视图、索引、触发器

-- ========================== 视图设计 ==========================

-- 1. 作者信息视图（包含作者基本信息和所属单位）
CREATE VIEW `author_with_institutions` AS
SELECT 
  a.`author_id`,
  a.`name`,
  a.`age`,
  a.`email`,
  a.`degree`,
  a.`title`,
  a.`hometown`,
  a.`research_areas`,
  a.`bio`,
  a.`phone`,
  GROUP_CONCAT(DISTINCT i.`name` SEPARATOR ', ') AS `institution_names`,
  GROUP_CONCAT(DISTINCT i.`city` SEPARATOR ', ') AS `cities`
FROM 
  `authors` a
LEFT JOIN 
  `author_institutions` ai ON a.`author_id` = ai.`author_id`
LEFT JOIN 
  `institutions` i ON ai.`institution_id` = i.`institution_id`
GROUP BY 
  a.`author_id`;

-- 2. 论文详细信息视图（包含作者、关键词、基金等信息）
CREATE VIEW `paper_details` AS
SELECT 
  p.`paper_id`,
  p.`title_zh`,
  p.`title_en`,
  p.`abstract_zh`,
  p.`abstract_en`,
  p.`attachment_path`,
  p.`submission_date`,
  p.`progress`,
  p.`integrity`,
  GROUP_CONCAT(DISTINCT CONCAT(a.`name`, IF(pai.`is_corresponding`, ' (通讯作者)', '')) SEPARATOR ', ') AS `author_names`,
  GROUP_CONCAT(DISTINCT k.`keyword_name` SEPARATOR ', ') AS `keywords`,
  GROUP_CONCAT(DISTINCT f.`project_name` SEPARATOR ', ') AS `funds`
FROM 
  `papers` p
LEFT JOIN 
  `paper_authors_institutions` pai ON p.`paper_id` = pai.`paper_id`
LEFT JOIN 
  `authors` a ON pai.`author_id` = a.`author_id`
LEFT JOIN 
  `paper_keywords` pk ON p.`paper_id` = pk.`paper_id`
LEFT JOIN 
  `keywords` k ON pk.`keyword_id` = k.`keyword_id`
LEFT JOIN 
  `paper_funds` pf ON p.`paper_id` = pf.`paper_id`
LEFT JOIN 
  `funds` f ON pf.`fund_id` = f.`fund_id`
GROUP BY 
  p.`paper_id`;

-- 3. 作者论文视图（获取特定作者的所有论文及是否通讯作者信息）
CREATE VIEW `author_papers_full` AS
SELECT 
  p.*,
  pai.`is_corresponding`
FROM 
  `papers` p
INNER JOIN 
  `paper_authors_institutions` pai ON p.`paper_id` = pai.`paper_id`;

-- 4. 论文完整详情视图（包含作者、关键词、基金、审稿意见和状态等完整信息）
CREATE VIEW `paper_full_details` AS
SELECT 
  p.paper_id,
  p.title_zh,
  p.title_en,
  p.abstract_zh,
  p.abstract_en,
  p.attachment_path,
  p.submission_date,
  p.update_date,
  p.progress,
  p.integrity,
  p.check_time,
  COUNT(DISTINCT ra.assignment_id) AS `review_times`,
  GROUP_CONCAT(DISTINCT CONCAT(a.`author_id`, ':', a.`name`, ':', i.`name`, ':', IF(pai.`is_corresponding`, '1', '0')) ORDER BY a.`author_id` ASC SEPARATOR '|') AS `authors_info`,
  -- GROUP_CONCAT(DISTINCT CONCAT(k.`keyword_id`, ':', k.`keyword_name`, ':', k.`keyword_type`) SEPARATOR '|') AS `keywords_info`,
  GROUP_CONCAT(DISTINCT CASE WHEN k.`keyword_type` = 'zh' THEN CONCAT(k.`keyword_id`, ':', k.`keyword_name`) END ORDER BY k.`keyword_id` ASC SEPARATOR '|') AS `keywords_zh`,
  GROUP_CONCAT(DISTINCT CASE WHEN k.`keyword_type` = 'en' THEN CONCAT(k.`keyword_id`, ':', k.`keyword_name`) END ORDER BY k.`keyword_id` ASC SEPARATOR '|') AS `keywords_en`,
  GROUP_CONCAT(DISTINCT CONCAT(f.`fund_id`, ':', f.`project_name`, ':', f.`project_number`) SEPARATOR '|') AS `funds_info`
FROM 
  `papers` p

LEFT JOIN `review_assignments` ra ON p.`paper_id` = ra.`paper_id` AND ra.`submission_date` IS NOT NULL
LEFT JOIN 
  `paper_authors_institutions` pai ON p.`paper_id` = pai.`paper_id`
LEFT JOIN 
  `authors` a ON pai.`author_id` = a.`author_id`
LEFT JOIN 
  `institutions` i ON pai.`institution_id` = i.`institution_id`
LEFT JOIN 
  `paper_keywords` pk ON p.`paper_id` = pk.`paper_id`
LEFT JOIN 
  `keywords` k ON pk.`keyword_id` = k.`keyword_id`
LEFT JOIN 
  `paper_funds` pf ON p.`paper_id` = pf.`paper_id`
LEFT JOIN 
  `funds` f ON pf.`fund_id` = f.`fund_id`
GROUP BY 
  p.`paper_id`,
  p.title_zh,
  p.title_en,
  p.abstract_zh,
  p.abstract_en,
  p.attachment_path,
  p.submission_date,
  p.update_date,
  p.progress,
  p.integrity,
  p.check_time;

-- 5. 论文审稿进度视图（向作者展示论文的各阶段审稿进度）
CREATE VIEW `paper_review_progress` AS
SELECT 
  p.`paper_id`,
  p.`title_zh`,
  p.`title_en`,
  
  -- 收稿阶段
  CASE WHEN p.`attachment_path` IS NOT NULL THEN 'finished' ELSE 'processing' END AS `submission_stage`,
  CASE WHEN p.`attachment_path` IS NOT NULL THEN p.`submission_date` ELSE NULL END AS `submission_time`,
  
  -- 初审阶段
  CASE WHEN p.`check_time` IS NOT NULL THEN 'finished' ELSE 'processing' END AS `initial_review_stage`,
  p.`check_time` AS `initial_review_time`,
  
  -- 评审阶段
  CASE 
    WHEN (SELECT COUNT(*) FROM `review_assignments` ra WHERE ra.`paper_id` = p.`paper_id` AND ra.`submission_date` IS NOT NULL) >= 3 THEN 'finished'
    ELSE 'processing'
  END AS `review_stage`,
  CASE
    WHEN (SELECT COUNT(*) FROM `review_assignments` ra WHERE ra.`paper_id` = p.`paper_id` AND ra.`submission_date` IS NOT NULL) >= 3
    THEN (SELECT MIN(top3_dates.`submission_date`) FROM (
      SELECT `submission_date` FROM `review_assignments` ra WHERE ra.`paper_id` = p.`paper_id` AND ra.`submission_date` IS NOT NULL ORDER BY `submission_date` ASC LIMIT 3
    ) AS top3_dates ORDER BY top3_dates.`submission_date` DESC LIMIT 1)
    ELSE NULL
  END AS `review_time`,
  
  -- 修改阶段
  CASE 
    WHEN p.`update_date` > (SELECT MIN(n.`sent_at`) FROM `notifications` n WHERE n.`paper_id` = p.`paper_id` AND n.`notification_type` IN ('Review Assignment')) THEN 'finished'
    ELSE 'processing'
  END AS `revision_stage`,
  CASE 
    WHEN p.`update_date` > (SELECT MIN(n.`sent_at`) FROM `notifications` n WHERE n.`paper_id` = p.`paper_id` AND n.`notification_type` IN ('Review Assignment')) THEN p.`update_date`
    ELSE NULL
  END AS `revision_time`,
  
  -- 复审阶段
  CASE 
    WHEN (SELECT COUNT(*) FROM `review_assignments` ra WHERE ra.`paper_id` = p.`paper_id` AND ra.`submission_date` IS NOT NULL) >= 6 THEN 'finished'
    ELSE 'processing'
  END AS `re_review_stage1`,
  CASE
    WHEN (SELECT COUNT(*) FROM `review_assignments` ra WHERE ra.`paper_id` = p.`paper_id` AND ra.`submission_date` IS NOT NULL) >= 6
    THEN (SELECT ra.`submission_date` FROM `review_assignments` ra WHERE ra.`paper_id` = p.`paper_id` ORDER BY ra.`submission_date` DESC LIMIT 5, 1)
    ELSE NULL
  END AS `re_review_time1`,
  
  
  CASE 
    WHEN (SELECT COUNT(*) FROM `review_assignments` ra WHERE ra.`paper_id` = p.`paper_id` AND ra.`submission_date` IS NOT NULL) = 9 THEN 'finished'
    ELSE 'processing'
  END AS `re_review_stage2`,
  CASE
    WHEN (SELECT COUNT(*) FROM `review_assignments` ra WHERE ra.`paper_id` = p.`paper_id` AND ra.`submission_date` IS NOT NULL) = 9
    THEN (SELECT MAX(ra.`submission_date`) FROM `review_assignments` ra WHERE ra.`paper_id` = p.`paper_id`)
    ELSE NULL
  END AS `re_review_time2`,
  
  -- 录用阶段
  CASE 
    WHEN EXISTS (SELECT 1 FROM `notifications` n WHERE n.`paper_id` = p.`paper_id` AND n.`notification_type` = 'Acceptance Notification') THEN 'finished'
    ELSE 'processing'
  END AS `acceptance_stage`,
  (SELECT n.`sent_at` FROM `notifications` n WHERE n.`paper_id` = p.`paper_id` AND n.`notification_type` = 'Acceptance Notification' LIMIT 1) AS `acceptance_time`,
  
  -- 支付版面费阶段
  CASE 
    WHEN (SELECT pa.`payment_date` FROM `payments` pa WHERE pa.`paper_id` = p.`paper_id`) IS NOT NULL THEN 'finished'
    ELSE 'processing'
  END AS `payment_stage`,
  (SELECT pa.`payment_date` FROM `payments` pa WHERE pa.`paper_id` = p.`paper_id`) AS `payment_time`,
  
  -- 排期阶段
  CASE 
    WHEN EXISTS (SELECT 1 FROM `schedules` s WHERE s.`paper_id` = p.`paper_id`) THEN 'finished'
    ELSE 'processing'
  END AS `schedule_stage`,
FROM 
  `papers` p;

-- 5. 论文审稿意见视图（包含专家审稿意见）
CREATE VIEW `paper_review_details` AS
SELECT 
  ra.`paper_id`,
  ra.`conclusion`,
  ra.`positive_comments`,
  ra.`negative_comments`,
  ra.`modification_advice`,
  e.`name` AS `expert_name`,
  ra.`submission_date` AS `review_submission_date`,
  ra.`status` AS `review_status`
FROM 
  `review_assignments` ra
JOIN 
  `experts` e ON ra.`expert_id` = e.`expert_id`;

-- 6. 作者可查看的论文视图（包含权限过滤）
CREATE VIEW `author_accessible_papers` AS
SELECT DISTINCT
  p.*,
  pai.`author_id`
FROM 
  `papers` p
INNER JOIN 
  `paper_authors_institutions` pai ON p.`paper_id` = pai.`paper_id`;

-- 3. 审稿专家信息视图
CREATE VIEW `expert_with_institutions` AS
SELECT 
  e.`expert_id`,
  e.`name`,
  e.`title`,
  e.`email`,
  e.`phone`,
  e.`research_areas`,
  e.`review_fee`,
  GROUP_CONCAT(DISTINCT i.`name` SEPARATOR ', ') AS `institution_names`
FROM 
  `experts` e
LEFT JOIN 
  `expert_institutions` ei ON e.`expert_id` = ei.`expert_id`
LEFT JOIN 
  `institutions` i ON ei.`institution_id` = i.`institution_id`
GROUP BY 
  e.`expert_id`;

-- 4. 审稿任务视图（包含论文和专家信息）
CREATE VIEW `review_assignments_details` AS
SELECT 
  ra.`assignment_id`,
  p.`title_zh`,
  p.`title_en`,
  e.`name` AS `expert_name`,
  ed.`name` AS `editor_name`,
  ra.`conclusion`,
  ra.`submission_date`
FROM 
  `review_assignments` ra
LEFT JOIN 
  `papers` p ON ra.`paper_id` = p.`paper_id`
LEFT JOIN 
  `experts` e ON ra.`expert_id` = e.`expert_id`
LEFT JOIN 
  `editors` ed ON ra.`editor_id` = ed.`editor_id`;

-- 7. 专家审稿任务视图（专家、编辑）
CREATE VIEW `expert_review_assignments` AS
SELECT 
  ra.*,
  p.title_zh,
  p.title_en 
FROM review_assignments ra
JOIN papers p ON ra.paper_id = p.paper_id;

-- 8. 论文审稿意见视图（编辑）
CREATE VIEW `paper_review_comments` AS
SELECT 
  ra.conclusion,
  ra.positive_comments,
  ra.negative_comments,
  ra.modification_advice,
  e.name AS expert_name,
  ra.submission_date,
  ra.paper_id
FROM review_assignments ra
JOIN experts e ON ra.expert_id = e.expert_id;

-- 提现信息记录视图（专家）
CREATE VIEW `withdrawals` AS
SELECT 
  w.`assignment_id`,
  w.`status`,
  w.`withdrawal_date`,
  ra.`expert_id`,
  p.`title_zh`,
  p.`title_en`
FROM `withdrawals` w
JOIN `review_assignments` ra ON w.`assignment_id` = ra.`assignment_id`
JOIN `papers` p ON ra.`paper_id` = p.`paper_id`;

-- ========================== 索引设计 ==========================

-- 1. 为常用查询字段添加索引
CREATE INDEX `idx_papers_progress` ON `papers` (`progress`);
CREATE INDEX `idx_papers_submission_date` ON `papers` (`submission_date`);
CREATE INDEX `idx_payments_status` ON `payments` (`status`);

-- 2. 为外键字段添加索引（部分已有）
CREATE INDEX `idx_paper_authors_institutions_is_corresponding` ON `paper_authors_institutions` (`is_corresponding`);
CREATE INDEX `idx_keywords_keyword_name` ON `keywords` (`keyword_name`);

-- 3. 全文索引用于搜索
ALTER TABLE `papers` ADD FULLTEXT INDEX `idx_papers_search` (`title_zh`, `title_en`, `abstract_zh`, `abstract_en`);
ALTER TABLE `authors` ADD FULLTEXT INDEX `idx_authors_search` (`name`, `research_areas`);
ALTER TABLE `experts` ADD FULLTEXT INDEX `idx_experts_search` (`name`, `research_areas`);

-- ========================== 触发器设计 ==========================

-- 1. 当审稿任务完成时，更新论文状态
DELIMITER $$
CREATE TRIGGER `trg_review_assignment_completed`
AFTER UPDATE ON `review_assignments`
FOR EACH ROW
BEGIN
  UPDATE `papers`
  SET `progress` = 'Finished'
  WHERE `paper_id` = NEW.`paper_id`;
END$$
DELIMITER ;

-- 2. 当支付状态更新为'Paid'时，记录支付日期
DELIMITER $$
CREATE TRIGGER `trg_payment_status_paid`
AFTER UPDATE ON `payments`
FOR EACH ROW
BEGIN
  IF NEW.`status` = 'Paid' AND OLD.`status` != 'Paid' THEN
    UPDATE `payments`
    SET `payment_date` = CURRENT_TIMESTAMP
    WHERE `paper_id` = NEW.`paper_id`;
  END IF;
END$$
DELIMITER ;

-- 3. 当创建提现记录时，记录提现日期
DELIMITER $$
CREATE TRIGGER `trg_withdrawal_before_insert`
BEFORE INSERT ON `withdrawals`
FOR EACH ROW
BEGIN
  SET NEW.`withdrawal_date` = CURRENT_TIMESTAMP;
END$$
DELIMITER ;