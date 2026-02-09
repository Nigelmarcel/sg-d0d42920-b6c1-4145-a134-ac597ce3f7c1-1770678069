-- Step 1: Add item_description column for optional details
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS item_description TEXT;

-- Step 2: Make item_type nullable (backward compatible migration)
ALTER TABLE bookings ALTER COLUMN item_type DROP NOT NULL;

-- Step 3: Add comment explaining the new system
COMMENT ON COLUMN bookings.item_description IS 'Optional description of the item(s) being moved. Used with size-based booking system (S/M/L)';
COMMENT ON COLUMN bookings.item_type IS 'DEPRECATED: Use item_size (S/M/L) + item_description instead. Will be removed in future migration.';