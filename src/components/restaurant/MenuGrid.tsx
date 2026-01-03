import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Plus, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MenuItem {
  id: string;
  name: string;
  unit_price: number;
  category: string | null;
  category_id: string | null;
  stock_quantity: number | null;
  is_active: boolean;
  description: string | null;
}

interface MenuCategory {
  id: string;
  name: string;
  display_order: number;
}

interface MenuGridProps {
  items: MenuItem[];
  categories: MenuCategory[];
  onAddItem: (item: MenuItem) => void;
  isLoading: boolean;
}

export function MenuGrid({ items, categories, onAddItem, isLoading }: MenuGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    return item.is_active && matchesSearch && matchesCategory;
  });

  const sortedCategories = [...categories].sort((a, b) => a.display_order - b.display_order);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading menu...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search menu..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category tabs */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {sortedCategories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </ScrollArea>

      {/* Menu items grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {items.length === 0 ? "No menu items yet. Add items in Menu Management." : "No items match your search."}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
          {filteredItems.map((item) => {
            const lowStock = (item.stock_quantity ?? 0) <= 5 && (item.stock_quantity ?? 0) > 0;
            const outOfStock = (item.stock_quantity ?? 0) <= 0;

            return (
              <Card
                key={item.id}
                className={`cursor-pointer transition-all hover:shadow-md hover:border-primary ${
                  outOfStock ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={() => !outOfStock && onAddItem(item)}
              >
                <CardContent className="p-3">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-medium text-sm line-clamp-2 flex-1">{item.name}</h4>
                      {lowStock && <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-primary font-bold text-sm">{formatCurrency(item.unit_price)}</span>
                      {outOfStock ? (
                        <Badge variant="destructive" className="text-xs">Out</Badge>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
