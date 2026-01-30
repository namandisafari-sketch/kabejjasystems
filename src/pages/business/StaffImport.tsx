import { GeneralImportPage } from "./GeneralImportPage";

/**
 * Staff Import Page
 * Allows schools to import staff records from Excel
 */
export default function StaffImport() {
  return (
    <GeneralImportPage
      module="staff"
      title="Import Staff Members"
      description="Import staff records including positions, departments, salaries, and contact information"
    />
  );
}
