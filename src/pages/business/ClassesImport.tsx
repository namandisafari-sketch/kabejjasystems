import { GeneralImportPage } from "./GeneralImportPage";
import { useLanguage } from "@/i18n";

export default function ClassesImport() {
  const { t } = useLanguage();
  return (
    <GeneralImportPage
      module="classes"
      title={t.classes.title}
      description="Import class and form information including names, teachers, and capacity"
    />
  );
}
