import { GeneralImportPage } from "./GeneralImportPage";

/**
 * Attendance Import Page
 * Allows schools to import attendance records from Excel
 */
export default function AttendanceImport() {
  return (
    <GeneralImportPage
      module="attendance"
      title="Import Attendance Records"
      description="Import student attendance records for specific dates or periods"
    />
  );
}
