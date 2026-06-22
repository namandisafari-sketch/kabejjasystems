import { GeneralImportPage } from "./GeneralImportPage";
import { useLanguage } from "@/i18n";

export default function ParentsImport() {
  const { t } = useLanguage();
  return (
    <GeneralImportPage
      module="parents"
      title={t.parents.title}
      description={t.common.description}
    />
  );
}
