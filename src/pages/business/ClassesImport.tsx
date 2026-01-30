import { GeneralImportPage } from "./GeneralImportPage";

/**
 * Classes Import Page
 * Allows schools to import class/form information from Excel
 */
export default function ClassesImport() {
  return (
    <GeneralImportPage
      module="classes"
      title="Import Classes/Forms"
      description="Import class and form information including names, teachers, and capacity"
    />
  );
}
