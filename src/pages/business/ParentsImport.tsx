import { GeneralImportPage } from "./GeneralImportPage";

/**
 * Parents Import Page
 * Allows schools to import parent/guardian information from Excel
 */
export default function ParentsImport() {
  return (
    <GeneralImportPage
      module="parents"
      title="Import Parents/Guardians"
      description="Import parent and guardian contact information linked to students"
    />
  );
}
