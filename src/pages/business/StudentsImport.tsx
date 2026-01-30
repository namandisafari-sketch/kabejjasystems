import { GeneralImportPage } from "./GeneralImportPage";

/**
 * Students Import Page
 * Allows schools to import student records from Excel
 */
export default function StudentsImport() {
  return (
    <GeneralImportPage
      module="students"
      title="Import Students"
      description="Import student records including admission numbers, names, dates of birth, and contact information"
    />
  );
}
