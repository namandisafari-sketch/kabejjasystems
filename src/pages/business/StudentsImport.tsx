import { GeneralImportPage } from "./GeneralImportPage";
import { useLanguage } from "@/i18n";

export default function StudentsImport() {
  const { t } = useLanguage();
  return (
    <GeneralImportPage
      module="students"
      title={t.students.title}
      description={t.common.description}
    />
  );
}
