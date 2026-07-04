CREATE TABLE IF NOT EXISTS t_p21156567_oil_change_tracker.push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_notified_date DATE,
    last_notified_remaining INTEGER
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON t_p21156567_oil_change_tracker.push_subscriptions(user_id);