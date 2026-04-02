CREATE TABLE IF NOT EXISTS t_p21156567_oil_change_tracker.service_resets (
    id SERIAL PRIMARY KEY,
    car_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    interval_id TEXT NOT NULL,
    last_km INTEGER,
    last_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (car_id, user_id, interval_id)
);

CREATE INDEX IF NOT EXISTS idx_service_resets_car_user ON t_p21156567_oil_change_tracker.service_resets(car_id, user_id);
