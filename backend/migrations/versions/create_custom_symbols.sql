CREATE TABLE custom_symbols (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(24) UNIQUE NOT NULL
);