import { GeneralImportPage } from "./GeneralImportPage";
import { useLanguage } from "@/i18n";

export default function AttendanceImport() {
  const { t } = useLanguage();
  return (
    <GeneralImportPage
      module="attendance"
      title={t.attendance.title}
      description="Import student attendance records for specific dates or periods"
    />
  );
}
