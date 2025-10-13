-- 创建作者表 (authors)
CREATE TABLE `authors` (
  `author_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `age` TINYINT UNSIGNED NULL,
  `email` VARCHAR(100) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `degree` VARCHAR(50) NULL,
  `title` VARCHAR(50) NULL,
  `hometown` VARCHAR(100) NULL,
  `research_areas` TEXT NULL,
  `bio` TEXT NULL,
  `phone` VARCHAR(20) NULL,
  PRIMARY KEY (`author_id`),
  UNIQUE INDEX `email_UNIQUE` (`email` ASC)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 创建单位表 (institutions)
CREATE TABLE `institutions` (
  `institution_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `zip_code` VARCHAR(20) NULL,
  PRIMARY KEY (`institution_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 创建作者-单位关联表 (author_institutions)
CREATE TABLE `author_institutions` (
  `author_id` INT NOT NULL,
  `institution_id` INT NOT NULL,
  PRIMARY KEY (`author_id`, `institution_id`),
  INDEX `fk_author_institutions_institutions_idx` (`institution_id` ASC),
  CONSTRAINT `fk_author_institutions_authors`
    FOREIGN KEY (`author_id`)
    REFERENCES `authors` (`author_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_author_institutions_institutions`
    FOREIGN KEY (`institution_id`)
    REFERENCES `institutions` (`institution_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 创建专家表 (experts)
CREATE TABLE `experts` (
  `expert_id` INT NOT NULL AUTO_INCREMENT,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `title` VARCHAR(50) NULL,
  `email` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NULL,
  `research_areas` TEXT NULL,
  `bank_account` VARCHAR(50) NULL,
  `bank_name` VARCHAR(100) NULL,
  `account_holder` VARCHAR(100) NULL,
  `review_fee` DECIMAL(10, 2) NOT NULL,
  PRIMARY KEY (`expert_id`),
  UNIQUE INDEX `email_UNIQUE` (`email` ASC),
  INDEX `fk_experts_institutions_idx` (`institution_id` ASC),
  CONSTRAINT `fk_experts_institutions`
    FOREIGN KEY (`institution_id`)
    REFERENCES `institutions` (`institution_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 创建专家就职表 (expert_institutions)
CREATE TABLE `expert_institutions` (
  `expert_id` INT NOT NULL,
  `institution_id` INT NOT NULL,
  PRIMARY KEY (`expert_id`, `institution_id`),
  INDEX `fk_expert_institutions_institutions_idx` (`institution_id` ASC),
  CONSTRAINT `fk_expert_institutions_experts`
    FOREIGN KEY (`expert_id`)
    REFERENCES `experts` (`expert_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_expert_institutions_institutions`
    FOREIGN KEY (`institution_id`)
    REFERENCES `institutions` (`institution_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 创建编辑表 (editors)
CREATE TABLE `editors` (
  `editor_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`editor_id`),
  UNIQUE INDEX `email_UNIQUE` (`email` ASC)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;


-- 创建论文表 (papers)
CREATE TABLE `papers` (
  `paper_id` INT NOT NULL AUTO_INCREMENT,
  `title_zh` VARCHAR(500) NOT NULL,
  `title_en` VARCHAR(500) NOT NULL,
  `abstract_zh` TEXT NOT NULL,
  `abstract_en` TEXT NOT NULL,
  `attachment_path` VARCHAR(500) NOT NULL,
  `submission_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `progress` ENUM('Processing','Finished') NOT NULL DEFAULT 'Processing',
  `integrity` ENUM('True', 'False', 'Waiting') NOT NULL DEFAULT 'Waiting',
  `check_time` DATETIME NULL,
  PRIMARY KEY (`paper_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 创建关键词表 (keywords)
CREATE TABLE `keywords` (
  `keyword_id` INT NOT NULL AUTO_INCREMENT,
  `keyword_name` VARCHAR(20) NOT NULL,
  `keyword_type` ENUM('zh', 'en') NOT NULL,
  PRIMARY KEY (`keyword_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- ========================

-- 创建论文-关键词关联表 (paper_keywords)=======
CREATE TABLE `paper_keywords` (
  `paper_id` INT NOT NULL,
  `keyword_id` INT NOT NULL,
  PRIMARY KEY (`paper_id`, `keyword_id`),
  INDEX `fk_paper_keywords_keywords_idx` (`keyword_id` ASC),
  CONSTRAINT `fk_paper_keywords_papers`
    FOREIGN KEY (`paper_id`)
    REFERENCES `papers` (`paper_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_paper_keywords_keywords`
    FOREIGN KEY (`keyword_id`)
    REFERENCES `keywords` (`keyword_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 创建论文-作者-单位关联表 (paper_authors_institutions)========
CREATE TABLE `paper_authors_institutions` (
  `paper_id` INT NOT NULL,
  `author_id` INT NOT NULL,
  `institution_id` INT NOT NULL,
  `is_corresponding` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`paper_id`, `author_id`, `institution_id`),
  INDEX `fk_paper_authors_institutions_authors_idx` (`author_id` ASC),
  INDEX `fk_paper_authors_institutions_institutions_idx` (`institution_id` ASC),
  CONSTRAINT `fk_paper_authors_institutions_papers`
    FOREIGN KEY (`paper_id`)
    REFERENCES `papers` (`paper_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_paper_authors_institutions_authors`
    FOREIGN KEY (`author_id`)
    REFERENCES `authors` (`author_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_paper_authors_institutions_institutions`
    FOREIGN KEY (`institution_id`)
    REFERENCES `institutions` (`institution_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 创建基金表 (funds)
CREATE TABLE `funds` (
  `fund_id` INT NOT NULL AUTO_INCREMENT,
  `project_name` VARCHAR(200) NOT NULL,
  `project_number` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`fund_id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 创建论文-基金关联表 (paper_funds)
CREATE TABLE `paper_funds` (
  `paper_id` INT NOT NULL,
  `fund_id` INT NOT NULL,
  PRIMARY KEY (`paper_id`, `fund_id`),
  INDEX `fk_paper_funds_funds_idx` (`fund_id` ASC),
  CONSTRAINT `fk_paper_funds_papers`
    FOREIGN KEY (`paper_id`)
    REFERENCES `papers` (`paper_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_paper_funds_funds`
    FOREIGN KEY (`fund_id`)
    REFERENCES `funds` (`fund_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 创建审稿分配表 (review_assignments)
CREATE TABLE `review_assignments` (
  `assignment_id` INT NOT NULL AUTO_INCREMENT,
  `paper_id` INT NOT NULL,
  `expert_id` INT NOT NULL,
  `editor_id` INT NOT NULL,
  `conclusion` ENUM('Accept', 'Minor Revision', 'Major Revision', 'Not Reviewed', 'Reject') NOT NULL,
  `positive_comments` TEXT NULL,
  `negative_comments` TEXT NULL,
  `modification_advice` TEXT NULL,
  `status` ENUM('Assigned', 'Completed', 'Overdue') NOT NULL DEFAULT 'Assigned',
  `assigned_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `assigned_due_date` DATETIME NOT NULL,
  `submission_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`assignment_id`),
  INDEX `fk_review_assignments_experts_idx` (`expert_id` ASC),
  INDEX `fk_review_assignments_editors_idx` (`editor_id` ASC),
  CONSTRAINT `fk_review_assignments_papers`
    FOREIGN KEY (`paper_id`)
    REFERENCES `papers` (`paper_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_review_assignments_experts`
    FOREIGN KEY (`expert_id`)
    REFERENCES `experts` (`expert_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_review_assignments_editors`
    FOREIGN KEY (`editor_id`)
    REFERENCES `editors` (`editor_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 创建支付表 (payments)
CREATE TABLE `payments` (
  `paper_id` INT NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `status` ENUM('Pending', 'Paid') NOT NULL DEFAULT 'Pending',
  `payment_date` DATETIME NULL,
  UNIQUE INDEX `paper_id_UNIQUE` (`paper_id` ASC),
  CONSTRAINT `fk_payments_papers`
    FOREIGN KEY (`paper_id`)
    REFERENCES `papers` (`paper_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 创建专家提现表 (withdrawals)
CREATE TABLE `withdrawals` (
  `assignment_id` INT NOT NULL,
  `status` BOOLEAN NOT NULL DEFAULT FALSE,
  `expert_id` INT NOT NULL,
  `withdrawal_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_withdrawals_experts`
    FOREIGN KEY (`expert_id`)
    REFERENCES `experts` (`expert_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_withdrawals_assignments`
    FOREIGN KEY (`assignment_id`)
    REFERENCES `review_assignments` (`assignment_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 创建排期表 (schedules)
CREATE TABLE `schedules` (
  `schedule_id` INT NOT NULL AUTO_INCREMENT,
  `paper_id` INT NOT NULL,
  `issue_number` VARCHAR(20) NOT NULL,
  `volume_number` VARCHAR(20) NOT NULL,
  `page_number` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`schedule_id`),
  UNIQUE INDEX `paper_id_UNIQUE` (`paper_id` ASC),
  CONSTRAINT `fk_schedules_papers`
    FOREIGN KEY (`paper_id`)
    REFERENCES `papers` (`paper_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- 创建通知表 (notifications)
CREATE TABLE `notifications` (
  `notification_id` INT NOT NULL AUTO_INCREMENT,
  `paper_id` INT NOT NULL,
  `notification_type` ENUM('Review Assignment', 'Payment Confirmation', 'Acceptance Notification', 'Rejection Notification') NOT NULL,
  `sent_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deadline` DATETIME,
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (`notification_id`),
  CONSTRAINT `fk_notifications_papers`
    FOREIGN KEY (`paper_id`)
    REFERENCES `papers` (`paper_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

