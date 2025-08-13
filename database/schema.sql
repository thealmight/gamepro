-- Econ Empire Database Schema
-- PostgreSQL Database Schema for the multiplayer economic game

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS tariff_rates CASCADE;
DROP TABLE IF EXISTS demand CASCADE;
DROP TABLE IF EXISTS production CASCADE;
DROP TABLE IF EXISTS game_rounds CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS supply_pool CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table for authentication and role management
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(20) NOT NULL CHECK (role IN ('operator', 'player')),
    country VARCHAR(50),
    round INTEGER DEFAULT 0,
    socket_id VARCHAR(100),
    is_online BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games table to track game sessions
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_rounds INTEGER NOT NULL DEFAULT 5,
    current_round INTEGER DEFAULT 0,
    round_duration INTEGER DEFAULT 900, -- 15 minutes in seconds
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'paused', 'ended')),
    operator_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    ended_at TIMESTAMP
);

-- Game rounds table to track round-specific data
CREATE TABLE game_rounds (
    id SERIAL PRIMARY KEY,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    time_remaining INTEGER DEFAULT 900,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
    UNIQUE(game_id, round_number)
);

-- Products table (static list)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- Production table - defines what each country produces
CREATE TABLE production (
    id SERIAL PRIMARY KEY,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    country VARCHAR(50) NOT NULL,
    product VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 0 AND quantity <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, country, product)
);

-- Demand table - defines what each country demands
CREATE TABLE demand (
    id SERIAL PRIMARY KEY,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    country VARCHAR(50) NOT NULL,
    product VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 0 AND quantity <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, country, product)
);

-- Tariff rates table - stores tariff values between countries for products
CREATE TABLE tariff_rates (
    id SERIAL PRIMARY KEY,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    product VARCHAR(50) NOT NULL,
    from_country VARCHAR(50) NOT NULL, -- exporting/producing country
    to_country VARCHAR(50) NOT NULL,   -- importing/demanding country
    rate DECIMAL(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100), -- percentage 0-100
    submitted_by INTEGER REFERENCES users(id),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(game_id, round_number, product, from_country, to_country)
);

-- Chat messages table for group and private chat
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id),
    sender_country VARCHAR(50) NOT NULL,
    message_type VARCHAR(20) DEFAULT 'group' CHECK (message_type IN ('group', 'private')),
    recipient_country VARCHAR(50), -- NULL for group messages
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Submissions table (for recording generic submissions with tariffs JSON)
CREATE TABLE submissions (
    id SERIAL PRIMARY KEY,
    round INTEGER NOT NULL,
    player VARCHAR(100) NOT NULL,
    country VARCHAR(50) NOT NULL,
    tariffs JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Supply pool table (optional)
CREATE TABLE supply_pool (
    id SERIAL PRIMARY KEY,
    round INTEGER NOT NULL,
    product VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 0)
);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_production_game_country ON production(game_id, country);
CREATE INDEX idx_demand_game_country ON demand(game_id, country);
CREATE INDEX idx_tariff_rates_game_round ON tariff_rates(game_id, round_number);
CREATE INDEX idx_tariff_rates_countries ON tariff_rates(from_country, to_country);
CREATE INDEX idx_chat_messages_game ON chat_messages(game_id);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);

-- Insert default countries and products
INSERT INTO users (username, role, country) VALUES 
('pavan', 'operator', NULL);

-- Predefined countries (will be assigned to players on login)
-- Countries: USA, China, Germany, Japan, India
-- Products: Steel, Grain, Oil, Electronics, Textiles

-- Function to automatically assign countries to players
CREATE OR REPLACE FUNCTION assign_country_to_player()
RETURNS TRIGGER AS $$
DECLARE
    available_countries TEXT[] := ARRAY['USA', 'China', 'Germany', 'Japan', 'India'];
    assigned_countries TEXT[];
    new_country TEXT;
BEGIN
    -- Only assign country to players, not operators
    IF NEW.role = 'player' AND NEW.country IS NULL THEN
        -- Get already assigned countries
        SELECT ARRAY_AGG(country) INTO assigned_countries 
        FROM users 
        WHERE role = 'player' AND country IS NOT NULL;
        
        -- If no countries assigned yet, start with first one
        IF assigned_countries IS NULL THEN
            NEW.country := available_countries[1];
        ELSE
            -- Find first unassigned country
            FOR i IN 1..array_length(available_countries, 1) LOOP
                IF NOT (available_countries[i] = ANY(assigned_countries)) THEN
                    NEW.country := available_countries[i];
                    EXIT;
                END IF;
            END LOOP;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign countries
CREATE TRIGGER assign_country_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION assign_country_to_player();

-- Function to initialize game data (production and demand)
CREATE OR REPLACE FUNCTION initialize_game_data(game_uuid UUID)
RETURNS VOID AS $$
DECLARE
    countries TEXT[] := ARRAY['USA', 'China', 'Germany', 'Japan', 'India'];
    products TEXT[] := ARRAY['Steel', 'Grain', 'Oil', 'Electronics', 'Textiles'];
    country TEXT;
    product TEXT;
    prod_countries TEXT[];
    demand_countries TEXT[];
    remaining_prod INTEGER;
    remaining_demand INTEGER;
    assigned_prod INTEGER;
    assigned_demand INTEGER;
BEGIN
    -- For each product, assign production and demand
    FOREACH product IN ARRAY products LOOP
        -- Randomly select 2-3 countries for production
        prod_countries := (
            SELECT ARRAY_AGG(country_name ORDER BY random()) 
            FROM (
                SELECT unnest(countries) AS country_name
                ORDER BY random()
                LIMIT 2 + (random() * 2)::int -- 2-3 countries
            ) sub
        );
        
        -- Remaining countries will have demand
        demand_countries := (
            SELECT ARRAY_AGG(country_name)
            FROM (
                SELECT unnest(countries) AS country_name
                WHERE country_name != ALL(prod_countries)
            ) sub
        );
        
        -- Assign production values (sum = 100)
        remaining_prod := 100;
        FOR i IN 1..array_length(prod_countries, 1) LOOP
            IF i = array_length(prod_countries, 1) THEN
                -- Last country gets remaining amount
                assigned_prod := remaining_prod;
            ELSE
                -- Random amount between 20-50
                assigned_prod := 20 + (random() * 30)::int;
                IF assigned_prod > remaining_prod - 20 THEN
                    assigned_prod := remaining_prod - 20;
                END IF;
            END IF;
            
            INSERT INTO production (game_id, country, product, quantity)
            VALUES (game_uuid, prod_countries[i], product, assigned_prod);
            
            remaining_prod := remaining_prod - assigned_prod;
        END LOOP;
        
        -- Assign demand values (sum = 100)
        remaining_demand := 100;
        FOR i IN 1..array_length(demand_countries, 1) LOOP
            IF i = array_length(demand_countries, 1) THEN
                -- Last country gets remaining amount
                assigned_demand := remaining_demand;
            ELSE
                -- Random amount between 15-40
                assigned_demand := 15 + (random() * 25)::int;
                IF assigned_demand > remaining_demand - 15 THEN
                    assigned_demand := remaining_demand - 15;
                END IF;
            END IF;
            
            INSERT INTO demand (game_id, country, product, quantity)
            VALUES (game_uuid, demand_countries[i], product, assigned_demand);
            
            remaining_demand := remaining_demand - assigned_demand;
        END LOOP;
        
        -- Initialize tariff rates (0 for same country, random 0-100 for others)
        FOR i IN 1..array_length(prod_countries, 1) LOOP
            FOR j IN 1..array_length(demand_countries, 1) LOOP
                INSERT INTO tariff_rates (game_id, round_number, product, from_country, to_country, rate)
                VALUES (
                    game_uuid, 
                    0, -- Initial round
                    product, 
                    prod_countries[i], 
                    demand_countries[j], 
                    (random() * 100)::int
                );
            END LOOP;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to validate tariff constraints
CREATE OR REPLACE FUNCTION validate_tariff_update()
RETURNS TRIGGER AS $$
DECLARE
    is_producer BOOLEAN := FALSE;
BEGIN
    -- Check if the from_country actually produces this product
    SELECT EXISTS(
        SELECT 1 FROM production 
        WHERE game_id = NEW.game_id 
        AND country = NEW.from_country 
        AND product = NEW.product
    ) INTO is_producer;
    
    IF NOT is_producer THEN
        RAISE EXCEPTION 'Country % does not produce product %', NEW.from_country, NEW.product;
    END IF;
    
    -- Ensure tariff from country to itself is 0
    IF NEW.from_country = NEW.to_country THEN
        NEW.rate := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tariff validation
CREATE TRIGGER validate_tariff_trigger
    BEFORE INSERT OR UPDATE ON tariff_rates
    FOR EACH ROW
    EXECUTE FUNCTION validate_tariff_update();

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
