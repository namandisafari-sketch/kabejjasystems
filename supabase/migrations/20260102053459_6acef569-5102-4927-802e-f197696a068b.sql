-- Create business_packages table for non-school, non-rental businesses
CREATE TABLE IF NOT EXISTS public.business_packages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    monthly_price NUMERIC NOT NULL DEFAULT 0,
    max_branches INTEGER NOT NULL DEFAULT 1,
    max_users INTEGER NOT NULL DEFAULT 3,
    max_products INTEGER,
    included_users INTEGER NOT NULL DEFAULT 1,
    price_per_additional_user NUMERIC NOT NULL DEFAULT 10000,
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_packages ENABLE ROW LEVEL SECURITY;

-- Create policies for business_packages (admin-only write access, public read)
CREATE POLICY "Anyone can view active business packages" 
ON public.business_packages 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage business packages" 
ON public.business_packages 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role IN ('admin'::app_role)
    )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_business_packages_updated_at
BEFORE UPDATE ON public.business_packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default business packages
INSERT INTO public.business_packages (name, description, monthly_price, max_branches, max_users, max_products, included_users, price_per_additional_user, display_order) VALUES
('Starter', 'Perfect for small businesses just getting started', 30000, 1, 2, 100, 1, 10000, 1),
('Basic', 'For growing businesses with moderate needs', 50000, 2, 5, 500, 2, 10000, 2),
('Professional', 'For established businesses with multiple staff', 100000, 3, 10, 2000, 3, 10000, 3),
('Enterprise', 'For large businesses with unlimited needs', 200000, 10, 50, NULL, 5, 10000, 4);