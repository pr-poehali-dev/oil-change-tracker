ALTER TABLE cars ADD COLUMN IF NOT EXISTS user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_cars_user_id ON cars(user_id);