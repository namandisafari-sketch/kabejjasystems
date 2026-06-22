import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUgandaDistricts, useUgandaConstituencies, useUgandaSubcounties, useUgandaVillages } from "@/hooks/use-uganda-locations";

interface UgandaAddressSelectProps {
  districtValue: string;
  onDistrictChange: (value: string) => void;
  constituencyValue: string;
  onConstituencyChange: (value: string) => void;
  subcountyValue: string;
  onSubcountyChange: (value: string) => void;
  villageValue?: string;
  onVillageChange?: (value: string) => void;
  districtLabel?: string;
  constituencyLabel?: string;
  subcountyLabel?: string;
  villageLabel?: string;
  showSubcounty?: boolean;
  showVillage?: boolean;
}

export function UgandaAddressSelect({
  districtValue,
  onDistrictChange,
  constituencyValue,
  onConstituencyChange,
  subcountyValue,
  onSubcountyChange,
  villageValue = "",
  onVillageChange,
  districtLabel = "District",
  constituencyLabel = "County / Constituency",
  subcountyLabel = "Subcounty / Division",
  villageLabel = "Parish / Village",
  showSubcounty = true,
  showVillage = false,
}: UgandaAddressSelectProps) {
  const { data: districts = [], isLoading: districtsLoading } = useUgandaDistricts();

  const selectedDistrict = districts.find(d => d.district_name === districtValue);
  const districtCode = selectedDistrict?.district_code;

  const { data: constituencies = [], isLoading: constituenciesLoading } = useUgandaConstituencies(districtCode);

  const selectedConstituency = constituencies.find(c => c.constituency_name === constituencyValue);
  const constituencyCode = selectedConstituency?.constituency_code;

  const { data: subcounties = [], isLoading: subcountiesLoading } = useUgandaSubcounties(constituencyCode);

  const selectedSubcounty = subcounties.find(s => s.subcounty_name === subcountyValue);
  const subcountyId = selectedSubcounty?.id;

  const { data: villages = [], isLoading: villagesLoading } = useUgandaVillages(showVillage ? subcountyId : null);

  const handleDistrictChange = (value: string) => {
    onDistrictChange(value);
    onConstituencyChange("");
    onSubcountyChange("");
    onVillageChange?.("");
  };

  const handleConstituencyChange = (value: string) => {
    onConstituencyChange(value);
    onSubcountyChange("");
    onVillageChange?.("");
  };

  const handleSubcountyChange = (value: string) => {
    onSubcountyChange(value);
    onVillageChange?.("");
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>{districtLabel}</Label>
        <Select value={districtValue} onValueChange={handleDistrictChange} disabled={districtsLoading}>
          <SelectTrigger>
            <SelectValue placeholder={districtsLoading ? "Loading districts..." : "Select district"} />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {districts.map(d => (
              <SelectItem key={d.district_code} value={d.district_name}>
                {d.district_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>{constituencyLabel}</Label>
        <Select
          value={constituencyValue}
          onValueChange={handleConstituencyChange}
          disabled={!districtCode || constituenciesLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder={
              !districtCode ? "Select a district first" :
              constituenciesLoading ? "Loading..." :
              "Select county / constituency"
            } />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {constituencies.map(c => (
              <SelectItem key={c.constituency_code} value={c.constituency_name}>
                {c.constituency_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showSubcounty && (
        <div>
          <Label>{subcountyLabel}</Label>
          <Select
            value={subcountyValue}
            onValueChange={handleSubcountyChange}
            disabled={!constituencyCode || subcountiesLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                !constituencyCode ? "Select a county first" :
                subcountiesLoading ? "Loading..." :
                "Select subcounty / division"
              } />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {subcounties.map(s => (
                <SelectItem key={s.id} value={s.subcounty_name}>
                  {s.subcounty_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showVillage && (
        <div>
          <Label>{villageLabel}</Label>
          <Select
            value={villageValue}
            onValueChange={onVillageChange || (() => {})}
            disabled={!subcountyId || villagesLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                !subcountyId ? "Select a subcounty first" :
                villagesLoading ? "Loading..." :
                "Select parish / village"
              } />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {villages.map(v => (
                <SelectItem key={v.id} value={v.village_name}>
                  {v.village_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
