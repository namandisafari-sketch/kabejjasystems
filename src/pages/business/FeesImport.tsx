import { GeneralImportPage } from "./GeneralImportPage";
import { useLanguage } from "@/i18n";

export default function FeesImport() {
  const { t } = useLanguage();
  return (
    <GeneralImportPage
      module="fees"
      title={t.fees.title}
      description="Import student fee information including fee types, amounts, and due dates"
    />
  );
}
