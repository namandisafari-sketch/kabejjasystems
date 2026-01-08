import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface RestaurantTable {
  id: string;
  table_number: string;
  capacity: number;
  status: string;
  location: string | null;
}

interface TableSelectorProps {
  tables: RestaurantTable[];
  selectedTableId: string | null;
  onSelectTable: (tableId: string | null) => void;
  isLoading: boolean;
}

const statusColors: Record<string, string> = {
  available: "bg-green-500",
  occupied: "bg-red-500",
  reserved: "bg-yellow-500",
  cleaning: "bg-blue-500",
};

export function TableSelector({ tables, selectedTableId, onSelectTable, isLoading }: TableSelectorProps) {
  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground">Loading tables...</div>;
  }

  if (tables.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No tables configured. Add tables in Table Management.
      </div>
    );
  }

  const groupedTables = tables.reduce((acc, table) => {
    const location = table.location || 'Main';
    if (!acc[location]) acc[location] = [];
    acc[location].push(table);
    return acc;
  }, {} as Record<string, RestaurantTable[]>);

  return (
    <div className="space-y-4">
      {Object.entries(groupedTables).map(([location, locationTables]) => (
        <div key={location}>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">{location}</h4>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {locationTables.map((table) => (
              <Button
                key={table.id}
                variant={selectedTableId === table.id ? "default" : "outline"}
                className={`h-16 flex flex-col items-center justify-center relative ${
                  table.status !== 'available' && selectedTableId !== table.id ? 'opacity-50' : ''
                }`}
                onClick={() => onSelectTable(selectedTableId === table.id ? null : table.id)}
                disabled={table.status === 'occupied' && selectedTableId !== table.id}
              >
                <span className="font-bold">{table.table_number}</span>
                <span className="text-xs flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {table.capacity}
                </span>
                <span
                  className={`absolute top-1 right-1 w-2 h-2 rounded-full ${statusColors[table.status]}`}
                />
              </Button>
            ))}
          </div>
        </div>
      ))}
      
      {selectedTableId && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onSelectTable(null)}
          className="w-full"
        >
          Clear table selection
        </Button>
      )}
    </div>
  );
}
