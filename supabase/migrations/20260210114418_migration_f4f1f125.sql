-- Create saved_payment_methods table for storing tokenized payment methods
CREATE TABLE saved_payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT NOT NULL, -- Stripe's payment method token (pm_xxx)
  card_brand TEXT NOT NULL, -- visa, mastercard, amex, etc.
  card_last4 TEXT NOT NULL, -- Last 4 digits of card
  card_exp_month INTEGER NOT NULL, -- 1-12
  card_exp_year INTEGER NOT NULL, -- YYYY format
  cardholder_name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_saved_payment_methods_user ON saved_payment_methods(user_id);
CREATE INDEX idx_saved_payment_methods_default ON saved_payment_methods(user_id, is_default);
CREATE UNIQUE INDEX idx_saved_payment_methods_stripe ON saved_payment_methods(stripe_payment_method_id);

-- Enable RLS
ALTER TABLE saved_payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own payment methods"
  ON saved_payment_methods FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own payment methods"
  ON saved_payment_methods FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own payment methods"
  ON saved_payment_methods FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own payment methods"
  ON saved_payment_methods FOR DELETE
  USING (user_id = auth.uid());

-- Function to ensure only one default payment method per user
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a payment method as default
  IF NEW.is_default = true THEN
    -- Unset all other payment methods for this user
    UPDATE saved_payment_methods
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain single default payment method
CREATE TRIGGER trigger_ensure_single_default_payment_method
  BEFORE INSERT OR UPDATE ON saved_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_payment_method();

COMMENT ON TABLE saved_payment_methods IS 'Stores tokenized payment methods for quick checkout';
COMMENT ON COLUMN saved_payment_methods.stripe_payment_method_id IS 'Stripe payment method token (pm_xxx) - never stores actual card numbers';
COMMENT ON COLUMN saved_payment_methods.is_default IS 'Only one payment method can be default per user (enforced by trigger)';