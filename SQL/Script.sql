UPDATE papers p
JOIN paper_review_progress prp ON p.paper_id = prp.paper_id
SET p.update_date = p.submission_date
WHERE prp.review_stage = 'processing';


INSERT INTO paper_keywords (paper_id, keyword_id)
SELECT paper_id, keyword_id + 61
FROM paper_keywords;


-- 此脚本用于将funds表中project_name有重复的数据后面加数字以区分
WITH DuplicateProjects AS (
    SELECT
        fund_id,
        project_name,
        ROW_NUMBER() OVER (PARTITION BY project_name ORDER BY fund_id) AS rn
    FROM
        funds
)
UPDATE funds f
JOIN DuplicateProjects dp ON f.fund_id = dp.fund_id
SET f.project_name = CONCAT(f.project_name, dp.rn)
WHERE dp.rn > 1;