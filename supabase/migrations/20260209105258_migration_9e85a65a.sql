-- Now update the trigger to ALSO fire on email confirmation (UPDATE)
-- This ensures profiles are created even if email is confirmed later
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

-- Trigger on INSERT (new signups)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Trigger on UPDATE when email gets confirmed
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();