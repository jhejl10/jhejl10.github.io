-- Add email column to user_presence_status table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_presence_status' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE user_presence_status ADD COLUMN email VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_user_presence_email ON user_presence_status(email);
    END IF;
END $$;

-- Add email column to user_status_messages table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_status_messages' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE user_status_messages ADD COLUMN email VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_user_status_messages_email ON user_status_messages(email);
    END IF;
END $$;
