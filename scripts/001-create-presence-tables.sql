-- Create table for user presence status
CREATE TABLE IF NOT EXISTS user_presence_status (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    presence_status VARCHAR(100) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence_status(user_id);

-- Create table for user status messages (personal notes)
CREATE TABLE IF NOT EXISTS user_status_messages (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    status_message TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_status_messages_user_id ON user_status_messages(user_id);

-- Create function to update presence status
CREATE OR REPLACE FUNCTION update_user_presence_status(
    p_user_id VARCHAR(255),
    p_presence_status VARCHAR(100)
) RETURNS VOID AS $$
BEGIN
    INSERT INTO user_presence_status (user_id, presence_status, updated_at)
    VALUES (p_user_id, p_presence_status, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        presence_status = EXCLUDED.presence_status,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create function to update status message
CREATE OR REPLACE FUNCTION update_user_status_message(
    p_user_id VARCHAR(255),
    p_status_message TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO user_status_messages (user_id, status_message, updated_at)
    VALUES (p_user_id, p_status_message, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        status_message = EXCLUDED.status_message,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;
