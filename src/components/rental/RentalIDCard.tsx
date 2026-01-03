import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";

interface RentalIDCardProps {
  cardNumber: string;
  unitNumber: string;
  propertyName: string;
  holderName?: string;
  propertyCode: string;
  businessName: string;
  businessPhone?: string;
  businessAddress?: string;
  logoUrl?: string;
  issuedDate?: string;
  forPrint?: boolean;
  side?: 'front' | 'back' | 'both';
}

const RentalIDCard = forwardRef<HTMLDivElement, RentalIDCardProps>(
  ({ cardNumber, unitNumber, propertyName, holderName, propertyCode, businessName, businessPhone, businessAddress, logoUrl, issuedDate, forPrint = false, side = 'both' }, ref) => {
    const qrValue = JSON.stringify({
      type: 'rental_id',
      card: cardNumber,
      property: propertyCode,
      unit: unitNumber
    });

    // CR80 card: 85.6mm x 54mm, safe zone is 3mm from each edge
    const cardStyle = forPrint ? {
      width: '85.6mm',
      height: '54mm',
      display: 'inline-block',
      margin: '0',
      pageBreakInside: 'avoid' as const,
    } : {};

    // Safe zone padding: 3mm converted to approximate pixels (at screen resolution)
    const safeZonePadding = forPrint ? '3mm' : '12px';

    const FrontCard = () => (
      <div 
        style={cardStyle}
        className={`bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl overflow-hidden shadow-lg ${!forPrint ? 'w-[340px] aspect-[1.586/1]' : ''}`}
      >
        <div className="h-full flex flex-col" style={{ padding: safeZonePadding }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt={businessName} className="w-7 h-7 rounded object-contain bg-white/10" />
              ) : (
                <div className="w-7 h-7 rounded bg-white/20 flex items-center justify-center text-xs font-bold">
                  {businessName.charAt(0)}
                </div>
              )}
              <div>
                <div className="text-[9px] font-medium leading-tight">{businessName}</div>
                <div className="text-[7px] text-slate-400">Property ID Card</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[7px] text-slate-400">Card No.</div>
              <div className="font-mono text-[10px] font-bold tracking-wider">{cardNumber}</div>
            </div>
          </div>

          {/* Main Info */}
          <div className="flex-1 flex items-center justify-between">
            <div className="space-y-0.5">
              <div>
                <div className="text-[7px] text-slate-400 uppercase tracking-wider">Property</div>
                <div className="text-xs font-semibold leading-tight">{propertyName}</div>
              </div>
              <div>
                <div className="text-[7px] text-slate-400 uppercase tracking-wider">Unit</div>
                <div className="text-base font-bold text-cyan-400 leading-tight">{unitNumber}</div>
              </div>
              {holderName && (
                <div>
                  <div className="text-[7px] text-slate-400 uppercase tracking-wider">Holder</div>
                  <div className="text-[10px] font-medium leading-tight">{holderName}</div>
                </div>
              )}
            </div>
            <div className="bg-white p-1 rounded">
              <QRCodeSVG value={qrValue} size={52} level="M" />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-end text-[7px] text-slate-400 pt-1 border-t border-slate-700">
            <span>Code: {propertyCode}</span>
            {issuedDate && <span>Issued: {issuedDate}</span>}
          </div>
        </div>
      </div>
    );

    const BackCard = () => (
      <div 
        style={cardStyle}
        className={`bg-white text-slate-800 rounded-xl overflow-hidden shadow-lg border ${!forPrint ? 'w-[340px] aspect-[1.586/1]' : ''}`}
      >
        <div className="h-full flex flex-col" style={{ padding: safeZonePadding }}>
          {/* Header */}
          <div className="text-center mb-1 pb-1 border-b border-slate-200">
            <div className="font-bold text-xs">{businessName}</div>
            <div className="text-[8px] text-slate-500">Tenant Identification Card</div>
          </div>

          {/* Payment Instructions */}
          <div className="flex-1 space-y-1.5">
            <div className="bg-emerald-50 border border-emerald-200 rounded p-1.5">
              <div className="text-[8px] font-bold text-emerald-700 uppercase mb-0.5">Payment Instructions</div>
              <div className="text-[7px] space-y-0.5 text-slate-600">
                <p>1. Pay rent via MTN MoMo / Airtel Money / Bank</p>
                <p>2. Use card number: <span className="font-mono font-bold">{cardNumber}</span></p>
                <p>3. Submit proof at the renter portal</p>
              </div>
            </div>

            <div className="text-[7px] space-y-0.5 text-slate-600">
              <p><span className="font-semibold">Note:</span> Pay to merchant codes to avoid fees</p>
              <p>This card belongs to the property. Return when moving out.</p>
            </div>
          </div>

          {/* Contact Footer */}
          <div className="pt-1 border-t border-slate-200 text-center">
            {businessPhone && <div className="text-[8px]">Tel: {businessPhone}</div>}
            {businessAddress && <div className="text-[7px] text-slate-500 leading-tight">{businessAddress}</div>}
          </div>
        </div>
      </div>
    );

    return (
      <div ref={ref} className={forPrint ? '' : 'flex flex-col gap-4'}>
        {(side === 'front' || side === 'both') && <FrontCard />}
        {(side === 'back' || side === 'both') && <BackCard />}
      </div>
    );
  }
);

RentalIDCard.displayName = "RentalIDCard";

export default RentalIDCard;
