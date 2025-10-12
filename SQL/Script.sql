UPDATE papers p
JOIN paper_review_progress prp ON p.paper_id = prp.paper_id
SET p.update_date = p.submission_date
WHERE prp.review_stage = 'processing';