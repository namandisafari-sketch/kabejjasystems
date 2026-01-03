import { useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { db } from "@/hooks/use-database";
import { useToast } from "@/hooks/use-toast";

export function AdminLayout() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const { data: { session } } = await db.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }

      // First check profiles table for role
      const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
      }

      // Check if user has admin role in profiles
      const isAdminInProfile = profile?.role === 'superadmin' || profile?.role === 'admin';

      // Also check user_roles table as backup
      const { data: roles, error: rolesError } = await db
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .in('role', ['admin', 'superadmin']);

      if (rolesError) {
        console.error('Roles fetch error:', rolesError);
      }

      const hasRoleEntry = roles && roles.length > 0;

      if (!isAdminInProfile && !hasRoleEntry) {
        toast({
          title: "Access Denied",
          description: "You don't have admin permissions",
          variant: "destructive",
        });
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      navigate('/login');
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border flex items-center px-4 bg-card">
            <SidebarTrigger />
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
