-- Add package_type column to distinguish installation from subscription packages
ALTER TABLE packages 
ADD COLUMN package_type text NOT NULL DEFAULT 'subscription';

-- Add includes_hardware column to track what hardware is included
ALTER TABLE packages 
ADD COLUMN includes_hardware jsonb DEFAULT NULL;

-- Add training_days column for training duration
ALTER TABLE packages 
ADD COLUMN training_days integer DEFAULT NULL;

-- Add is_one_time column for one-time payments
ALTER TABLE packages 
ADD COLUMN is_one_time boolean NOT NULL DEFAULT false;

-- Add display_order for sorting
ALTER TABLE packages 
ADD COLUMN display_order integer DEFAULT 0;