import { GeneralImportPage } from "./GeneralImportPage";
import { useLanguage } from "@/i18n";

export default function SubjectsImport() {
  const { t } = useLanguage();
  return (
    <GeneralImportPage
      module="subjects"
      title={t.nav.subjects}
      description={t.common.description}
    />
  );
}
