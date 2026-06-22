import { GeneralImportPage } from "./GeneralImportPage";
import { useLanguage } from "@/i18n";

export default function InventoryImport() {
  const { t } = useLanguage();
  return (
    <GeneralImportPage
      module="inventory"
      title={t.nav.inventory}
      description={t.common.description}
    />
  );
}
