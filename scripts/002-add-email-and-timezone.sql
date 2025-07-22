-- Add email field to user_presence_status table
ALTER TABLE user_presence_status 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Add email field to user_status_messages table  
ALTER TABLE user_status_messages 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_user_presence_email ON user_presence_status(email);
CREATE INDEX IF NOT EXISTS idx_user_status_messages_email ON user_status_messages(email);

-- Update the presence status function to include email
CREATE OR REPLACE FUNCTION update_user_presence_status(
    p_user_id VARCHAR(255),
    p_presence_status VARCHAR(100),
    p_email VARCHAR(255) DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO user_presence_status (user_id, presence_status, email, updated_at)
    VALUES (p_user_id, p_presence_status, p_email, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        presence_status = EXCLUDED.presence_status,
        email = COALESCE(EXCLUDED.email, user_presence_status.email),
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Update the status message function to include email
CREATE OR REPLACE FUNCTION update_user_status_message(
    p_user_id VARCHAR(255),
    p_status_message TEXT,
    p_email VARCHAR(255) DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO user_status_messages (user_id, status_message, email, updated_at)
    VALUES (p_user_id, p_status_message, p_email, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        status_message = EXCLUDED.status_message,
        email = COALESCE(EXCLUDED.email, user_status_messages.email),
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;
