import { Button } from "@/components/ui/button";
import { UtensilsCrossed, ShoppingBag, Store } from "lucide-react";

export type OrderType = 'dine_in' | 'takeaway' | 'counter';

interface OrderTypeSelectorProps {
  selectedType: OrderType;
  onSelectType: (type: OrderType) => void;
}

const orderTypes = [
  { type: 'dine_in' as OrderType, label: 'Dine In', icon: UtensilsCrossed, description: 'Table service' },
  { type: 'takeaway' as OrderType, label: 'Takeaway', icon: ShoppingBag, description: 'Pack to go' },
  { type: 'counter' as OrderType, label: 'Counter', icon: Store, description: 'Quick pickup' },
];

export function OrderTypeSelector({ selectedType, onSelectType }: OrderTypeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {orderTypes.map(({ type, label, icon: Icon, description }) => (
        <Button
          key={type}
          variant={selectedType === type ? "default" : "outline"}
          className="h-auto py-3 flex flex-col items-center gap-1"
          onClick={() => onSelectType(type)}
        >
          <Icon className="h-5 w-5" />
          <span className="font-medium">{label}</span>
          <span className="text-xs opacity-70">{description}</span>
        </Button>
      ))}
    </div>
  );
}
