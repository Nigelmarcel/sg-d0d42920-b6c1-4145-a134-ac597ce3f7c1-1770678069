-- Add photo support to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'photo', 'system'));

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Update comment
COMMENT ON COLUMN messages.message_type IS 'Type of message: text (regular message), photo (image attachment), system (automated notification)';
COMMENT ON COLUMN messages.photo_url IS 'URL to photo in Supabase Storage (for message_type = photo)';

-- Add index for faster photo queries
CREATE INDEX IF NOT EXISTS idx_messages_photos ON messages(booking_id, message_type) WHERE message_type = 'photo';