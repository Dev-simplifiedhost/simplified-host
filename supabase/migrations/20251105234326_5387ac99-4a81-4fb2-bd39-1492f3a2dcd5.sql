-- Standardize existing category values to lowercase
UPDATE event_items
SET category = CASE
  WHEN LOWER(category) = 'food' THEN 'main'
  WHEN LOWER(category) = 'drinks' THEN 'drink'
  WHEN LOWER(category) = 'dessert' THEN 'dessert'
  WHEN LOWER(category) = 'supplies' THEN 'supplies'
  ELSE LOWER(category)
END
WHERE category IS NOT NULL;

-- Add check constraint to ensure only valid lowercase categories
ALTER TABLE event_items
ADD CONSTRAINT valid_category_check
CHECK (
  category IS NULL OR
  category IN (
    'appetizer',
    'main',
    'side',
    'dessert',
    'drink',
    'supplies',
    'decor',
    'other'
  )
);