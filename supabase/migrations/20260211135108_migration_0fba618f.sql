-- Add van register number field to transporter_applications table
ALTER TABLE transporter_applications 
ADD COLUMN IF NOT EXISTS van_register_number TEXT;

COMMENT ON COLUMN transporter_applications.van_register_number IS 'Official vehicle registration number (rekisterinumero) - required for vehicle identification';