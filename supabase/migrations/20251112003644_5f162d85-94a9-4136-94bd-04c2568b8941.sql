-- Add item_suggest_eligibility column to events table
ALTER TABLE events
ADD COLUMN item_suggest_eligibility text 
DEFAULT 'attending_and_maybe' 
CHECK (item_suggest_eligibility IN ('attending_only', 'attending_and_maybe', 'all_invitees'));

-- Add comment explaining the column
COMMENT ON COLUMN events.item_suggest_eligibility IS 
'Controls who can suggest items: attending_only, attending_and_maybe, or all_invitees';