CREATE TABLE IF NOT EXISTS t_p21156567_oil_change_tracker.custom_engines (
    id SERIAL PRIMARY KEY,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    generation TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL,
    volume TEXT NOT NULL DEFAULT '',
    power TEXT NOT NULL DEFAULT '',
    fuel TEXT NOT NULL DEFAULT 'бензин',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(brand, model, generation, volume, power)
);

CREATE INDEX IF NOT EXISTS idx_custom_engines_lookup
    ON t_p21156567_oil_change_tracker.custom_engines (LOWER(brand), LOWER(model));