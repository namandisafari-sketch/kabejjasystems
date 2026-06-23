import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
  const [districtSearch, setDistrictSearch] = useState("");
  const [constituencySearch, setConstituencySearch] = useState("");
  const [subcountySearch, setSubcountySearch] = useState("");
  const [villageSearch, setVillageSearch] = useState("");

  const { data: districts = [], isLoading: districtsLoading } = useUgandaDistricts();

  // Filter districts by search
  const filteredDistricts = districts.filter(d =>
    d.district_name.toLowerCase().includes(districtSearch.toLowerCase())
  );

  const selectedDistrict = districts.find(d => d.district_name === districtValue);
  const districtCode = selectedDistrict?.district_code;

  const { data: constituencies = [], isLoading: constituenciesLoading } = useUgandaConstituencies(districtCode);

  // Filter constituencies by search
  const filteredConstituencies = constituencies.filter(c =>
    c.constituency_name.toLowerCase().includes(constituencySearch.toLowerCase())
  );

  const selectedConstituency = constituencies.find(c => c.constituency_name === constituencyValue);
  const constituencyCode = selectedConstituency?.constituency_code;

  const { data: subcounties = [], isLoading: subcountiesLoading } = useUgandaSubcounties(constituencyCode);

  // Filter subcounties by search
  const filteredSubcounties = subcounties.filter(s =>
    s.subcounty_name.toLowerCase().includes(subcountySearch.toLowerCase())
  );

  const selectedSubcounty = subcounties.find(s => s.subcounty_name === subcountyValue);
  const subcountyId = selectedSubcounty?.id;

  const { data: villages = [], isLoading: villagesLoading } = useUgandaVillages(showVillage ? subcountyId : null);

  // Filter villages by search
  const filteredVillages = villages.filter(v =>
    v.village_name.toLowerCase().includes(villageSearch.toLowerCase())
  );

  const handleDistrictChange = (value: string) => {
    onDistrictChange(value);
    onConstituencyChange("");
    onSubcountyChange("");
    onVillageChange?.("");
    setDistrictSearch("");
  };

  const handleConstituencyChange = (value: string) => {
    onConstituencyChange(value);
    onSubcountyChange("");
    onVillageChange?.("");
    setConstituencySearch("");
  };

  const handleSubcountyChange = (value: string) => {
    onSubcountyChange(value);
    onVillageChange?.("");
    setSubcountySearch("");
  };

  const handleVillageChange = (value: string) => {
    onVillageChange?.(value);
    setVillageSearch("");
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>{districtLabel}</Label>
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="Search districts..."
            value={districtSearch}
            onChange={(e) => setDistrictSearch(e.target.value)}
            className="h-10"
          />
          <Select value={districtValue} onValueChange={handleDistrictChange} disabled={districtsLoading}>
            <SelectTrigger>
              <SelectValue placeholder={districtsLoading ? "Loading districts..." : "Select district"} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {filteredDistricts.length > 0 ? (
                filteredDistricts.map(d => (
                  <SelectItem key={d.district_code} value={d.district_name}>
                    {d.district_name}
                  </SelectItem>
                ))
              ) : (
                <div className="py-2 px-3 text-sm text-muted-foreground">
                  {districtSearch ? 'No districts found' : 'No districts available'}
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>{constituencyLabel}</Label>
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="Search counties..."
            value={constituencySearch}
            onChange={(e) => setConstituencySearch(e.target.value)}
            disabled={!districtCode}
            className="h-10"
          />
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
              {filteredConstituencies.length > 0 ? (
                filteredConstituencies.map(c => (
                  <SelectItem key={c.constituency_code} value={c.constituency_name}>
                    {c.constituency_name}
                  </SelectItem>
                ))
              ) : (
                <div className="py-2 px-3 text-sm text-muted-foreground">
                  {constituencySearch ? 'No counties found' : 'No counties available'}
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showSubcounty && (
        <div>
          <Label>{subcountyLabel}</Label>
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Search subcounties..."
              value={subcountySearch}
              onChange={(e) => setSubcountySearch(e.target.value)}
              disabled={!constituencyCode}
              className="h-10"
            />
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
                {filteredSubcounties.length > 0 ? (
                  filteredSubcounties.map(s => (
                    <SelectItem key={s.id} value={s.subcounty_name}>
                      {s.subcounty_name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="py-2 px-3 text-sm text-muted-foreground">
                    {subcountySearch ? 'No subcounties found' : 'No subcounties available'}
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {showVillage && (
        <div>
          <Label>{villageLabel}</Label>
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Search villages..."
              value={villageSearch}
              onChange={(e) => setVillageSearch(e.target.value)}
              disabled={!subcountyId}
              className="h-10"
            />
            <Select
              value={villageValue}
              onValueChange={handleVillageChange}
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
                {filteredVillages.length > 0 ? (
                  filteredVillages.map(v => (
                    <SelectItem key={v.id} value={v.village_name}>
                      {v.village_name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="py-2 px-3 text-sm text-muted-foreground">
                    {villageSearch ? 'No villages found' : 'No villages available'}
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
