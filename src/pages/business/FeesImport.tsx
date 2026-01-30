import { GeneralImportPage } from "./GeneralImportPage";

/**
 * Fees Import Page
 * Allows schools to import fee records from Excel
 */
export default function FeesImport() {
  return (
    <GeneralImportPage
      module="fees"
      title="Import Fee Records"
      description="Import student fee information including fee types, amounts, and due dates"
    />
  );
}
