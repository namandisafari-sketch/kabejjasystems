import { GeneralImportPage } from "./GeneralImportPage";

/**
 * Subjects Import Page
 * Allows schools to import subject information from Excel
 */
export default function SubjectsImport() {
  return (
    <GeneralImportPage
      module="subjects"
      title="Import Subjects"
      description="Import subject information including codes, names, and course details"
    />
  );
}
