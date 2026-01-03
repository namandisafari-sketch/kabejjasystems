-- Create a trigger function to auto-create parents record when a parent signs up
CREATE OR REPLACE FUNCTION public.handle_new_parent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only create parent record if role is 'parent' and tenant_id is provided
  IF NEW.raw_user_meta_data ->> 'role' = 'parent' 
     AND NEW.raw_user_meta_data ->> 'tenant_id' IS NOT NULL THEN
    INSERT INTO public.parents (
      user_id,
      tenant_id,
      full_name,
      email,
      phone
    ) VALUES (
      NEW.id,
      (NEW.raw_user_meta_data ->> 'tenant_id')::uuid,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
      NEW.email,
      NEW.raw_user_meta_data ->> 'phone'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger on auth.users table
CREATE TRIGGER on_parent_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_parent();