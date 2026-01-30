import { GeneralImportPage } from "./GeneralImportPage";

/**
 * Inventory Import Page
 * Allows schools to import inventory items from Excel
 */
export default function InventoryImport() {
  return (
    <GeneralImportPage
      module="inventory"
      title="Import Inventory Items"
      description="Import inventory items including item codes, quantities, prices, and supplier information"
    />
  );
}
