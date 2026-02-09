-- Step 3: Create transporter_applications table
CREATE TABLE transporter_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status application_status DEFAULT 'pending',
  driver_license_url TEXT NOT NULL,
  van_make TEXT NOT NULL,
  van_model TEXT NOT NULL,
  van_year INTEGER NOT NULL,
  van_license_plate TEXT NOT NULL,
  insurance_url TEXT NOT NULL,
  bank_account_iban TEXT NOT NULL,
  admin_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE transporter_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transporter_applications
CREATE POLICY "Users can view their own application" ON transporter_applications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own application" ON transporter_applications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all applications" ON transporter_applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update applications" ON transporter_applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );