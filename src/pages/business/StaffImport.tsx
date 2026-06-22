import { GeneralImportPage } from "./GeneralImportPage";
import { useLanguage } from "@/i18n";

export default function StaffImport() {
  const { t } = useLanguage();
  return (
    <GeneralImportPage
      module="staff"
      title={t.staff.title}
      description={t.common.description}
    />
  );
}
