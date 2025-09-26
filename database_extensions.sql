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
  p.`review_completion_date`,
  p.`progress`,
  p.`status`,
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
  ra.`assigned_date`,
  ra.`due_date`,
  ra.`status`,
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

-- 5. 作者论文视图（获取特定作者的所有论文）
CREATE VIEW `author_papers` AS
SELECT 
  p.*,
  pai.`author_id`,
  pai.`is_corresponding`
FROM 
  `papers` p
INNER JOIN 
  `paper_authors_institutions` pai ON p.`paper_id` = pai.`paper_id`;

-- 6. 论文支付详情视图
CREATE VIEW `payment_details` AS
SELECT 
  p.*,
  a.name AS author_name 
FROM payments p 
JOIN authors a ON p.author_id = a.author_id;

-- 7. 专家审稿任务视图
CREATE VIEW `expert_review_assignments` AS
SELECT 
  ra.*,
  p.title_zh,
  p.title_en 
FROM review_assignments ra
JOIN papers p ON ra.paper_id = p.paper_id;

-- 8. 论文审稿意见视图
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

-- ========================== 索引设计 ==========================

-- 1. 为常用查询字段添加索引
CREATE INDEX `idx_papers_status` ON `papers` (`status`);
CREATE INDEX `idx_papers_progress` ON `papers` (`progress`);
CREATE INDEX `idx_papers_submission_date` ON `papers` (`submission_date`);
CREATE INDEX `idx_review_assignments_status` ON `review_assignments` (`status`);
CREATE INDEX `idx_review_assignments_due_date` ON `review_assignments` (`due_date`);
CREATE INDEX `idx_payments_status` ON `payments` (`status`);

-- 2. 为外键字段添加索引（部分已有）
CREATE INDEX `idx_paper_authors_institutions_is_corresponding` ON `paper_authors_institutions` (`is_corresponding`);
CREATE INDEX `idx_keywords_keyword_name` ON `keywords` (`keyword_name`);

-- 3. 全文索引用于搜索
ALTER TABLE `papers` ADD FULLTEXT INDEX `idx_papers_search` (`title_zh`, `title_en`, `abstract_zh`, `abstract_en`);
ALTER TABLE `authors` ADD FULLTEXT INDEX `idx_authors_search` (`name`, `research_areas`);
ALTER TABLE `experts` ADD FULLTEXT INDEX `idx_experts_search` (`name`, `research_areas`);

-- ========================== 触发器设计 ==========================

-- 1. 当论文状态更新为'Published'时，记录评审完成日期
DELIMITER $$
CREATE TRIGGER `trg_paper_status_published`
AFTER UPDATE ON `papers`
FOR EACH ROW
BEGIN
  IF NEW.`status` = 'Published' AND OLD.`status` != 'Published' THEN
    UPDATE `papers`
    SET `review_completion_date` = CURRENT_TIMESTAMP
    WHERE `paper_id` = NEW.`paper_id`;
  END IF;
END$$
DELIMITER ;

-- 2. 当审稿任务完成时，更新论文状态
DELIMITER $$
CREATE TRIGGER `trg_review_assignment_completed`
AFTER UPDATE ON `review_assignments`
FOR EACH ROW
BEGIN
  DECLARE total_assignments INT;
  DECLARE completed_assignments INT;
  
  IF NEW.`status` = 'Completed' AND OLD.`status` != 'Completed' THEN
    -- 获取该论文的总审稿任务数和已完成任务数
    SELECT COUNT(*), SUM(CASE WHEN `status` = 'Completed' THEN 1 ELSE 0 END)
    INTO total_assignments, completed_assignments
    FROM `review_assignments`
    WHERE `paper_id` = NEW.`paper_id`;
    
    -- 如果所有审稿任务都已完成，更新论文状态
    IF completed_assignments = total_assignments THEN
      UPDATE `papers`
      SET `progress` = 'Finished',
          `review_completion_date` = CURRENT_TIMESTAMP
      WHERE `paper_id` = NEW.`paper_id`;
    END IF;
  END IF;
END$$
DELIMITER ;

-- 3. 当支付状态更新为'Paid'时，记录支付日期
DELIMITER $$
CREATE TRIGGER `trg_payment_status_paid`
AFTER UPDATE ON `payments`
FOR EACH ROW
BEGIN
  IF NEW.`status` = 'Paid' AND OLD.`status` != 'Paid' THEN
    UPDATE `payments`
    SET `payment_date` = CURRENT_TIMESTAMP
    WHERE `payment_id` = NEW.`payment_id`;
  END IF;
END$$
DELIMITER ;

-- 4. 当创建提现记录时，记录提现日期
DELIMITER $$
CREATE TRIGGER `trg_withdrawal_before_insert`
BEFORE INSERT ON `withdrawals`
FOR EACH ROW
BEGIN
  SET NEW.`withdrawal_date` = CURRENT_TIMESTAMP;
END$$
DELIMITER ;