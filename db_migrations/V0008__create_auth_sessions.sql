CREATE TABLE IF NOT EXISTS t_p21156567_oil_change_tracker.auth_sessions (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    token VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '10 minutes')
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_phone ON t_p21156567_oil_change_tracker.auth_sessions(phone);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON t_p21156567_oil_change_tracker.auth_sessions(token);
