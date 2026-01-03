import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/hooks/use-database";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UtensilsCrossed } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  unit_price: number;
  category_id: string | null;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
}

const PublicMenu = () => {
  const { tenantId, tableId } = useParams();

  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ['public-tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, business_type')
        .eq('id', tenantId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: categories } = useQuery({
    queryKey: ['public-categories', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!tenantId,
  });

  const { data: menuItems, isLoading: menuLoading } = useQuery({
    queryKey: ['public-menu', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as MenuItem[];
    },
    enabled: !!tenantId,
  });

  const { data: table } = useQuery({
    queryKey: ['public-table', tableId],
    queryFn: async () => {
      if (!tableId) return null;
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('table_number, location')
        .eq('id', tableId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tableId,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getItemsByCategory = (categoryId: string) => {
    return menuItems?.filter(item => item.category_id === categoryId) || [];
  };

  const uncategorizedItems = menuItems?.filter(item => !item.category_id) || [];

  if (tenantLoading || menuLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Menu Not Found</h2>
            <p className="text-muted-foreground">
              This menu is not available. Please scan a valid QR code.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{tenant.name}</h1>
              {table && (
                <p className="text-sm text-muted-foreground">
                  Table {table.table_number} • {table.location}
                </p>
              )}
            </div>
            <Badge variant="outline" className="text-xs">
              Digital Menu
            </Badge>
          </div>
        </div>
      </div>

      {/* Menu Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-6 pb-8">
        {categories && categories.length > 0 ? (
          <>
            {categories.map((category) => {
              const items = getItemsByCategory(category.id);
              if (items.length === 0) return null;

              return (
                <div key={category.id}>
                  <div className="sticky top-[73px] bg-background/95 backdrop-blur py-2 z-5">
                    <h2 className="text-lg font-semibold">{category.name}</h2>
                    {category.description && (
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    )}
                  </div>
                  <div className="space-y-3 mt-3">
                    {items.map((item) => (
                      <Card key={item.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <h3 className="font-medium">{item.name}</h3>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-primary">
                                {formatCurrency(item.unit_price)}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Uncategorized items */}
            {uncategorizedItems.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold sticky top-[73px] bg-background/95 backdrop-blur py-2">
                  Other Items
                </h2>
                <div className="space-y-3 mt-3">
                  {uncategorizedItems.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h3 className="font-medium">{item.name}</h3>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-primary">
                              {formatCurrency(item.unit_price)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No menu items available</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t bg-muted/30 py-4">
        <p className="text-center text-xs text-muted-foreground">
          Powered by Kabit POS
        </p>
      </div>
    </div>
  );
};

export default PublicMenu;
