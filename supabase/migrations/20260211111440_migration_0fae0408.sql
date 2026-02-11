-- Add comprehensive transporter information fields to transporter_applications table
ALTER TABLE transporter_applications 
  ADD COLUMN IF NOT EXISTS social_security_number TEXT,
  ADD COLUMN IF NOT EXISTS address_street TEXT,
  ADD COLUMN IF NOT EXISTS address_city TEXT,
  ADD COLUMN IF NOT EXISTS address_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS driver_license_number TEXT,
  ADD COLUMN IF NOT EXISTS driver_license_expiry DATE,
  ADD COLUMN IF NOT EXISTS driver_license_validated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS vehicle_registration_url TEXT,
  ADD COLUMN IF NOT EXISTS insurance_company TEXT,
  ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT,
  ADD COLUMN IF NOT EXISTS insurance_expiry DATE,
  ADD COLUMN IF NOT EXISTS insurance_validated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS background_check_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS background_check_date DATE,
  ADD COLUMN IF NOT EXISTS documents_verified_date DATE,
  ADD COLUMN IF NOT EXISTS compliance_status TEXT DEFAULT 'pending';

-- Add check constraint for background check status
ALTER TABLE transporter_applications 
  DROP CONSTRAINT IF EXISTS transporter_applications_background_check_status_check;

ALTER TABLE transporter_applications 
  ADD CONSTRAINT transporter_applications_background_check_status_check 
  CHECK (background_check_status IN ('pending', 'approved', 'rejected', 'expired'));

-- Add check constraint for compliance status  
ALTER TABLE transporter_applications 
  DROP CONSTRAINT IF EXISTS transporter_applications_compliance_status_check;

ALTER TABLE transporter_applications 
  ADD CONSTRAINT transporter_applications_compliance_status_check 
  CHECK (compliance_status IN ('pending', 'compliant', 'non_compliant', 'review_needed'));

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transporter_apps_license_expiry ON transporter_applications(driver_license_expiry);
CREATE INDEX IF NOT EXISTS idx_transporter_apps_insurance_expiry ON transporter_applications(insurance_expiry);
CREATE INDEX IF NOT EXISTS idx_transporter_apps_status ON transporter_applications(status, compliance_status);

-- Comment on sensitive fields
COMMENT ON COLUMN transporter_applications.social_security_number IS 'Encrypted social security number - handle with care, GDPR compliant storage required';
COMMENT ON COLUMN transporter_applications.driver_license_number IS 'Driver license number for verification purposes';
COMMENT ON COLUMN transporter_applications.insurance_policy_number IS 'Insurance policy number for claims and verification';