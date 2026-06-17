import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  CARD_WIDTH, CARD_HEIGHT,
  GuillochePattern, CardHeaderBand, HologramSeal,
  SecurityBorder, GhostStamp, MicroTextLine,
  MagneticStripe, SignaturePanel,
} from "@/components/id-cards/CardPatterns";

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

const DARK = '#0f172a';
const TEAL = '#14b8a6';
const CARD_RADIUS = 10;

const RentalIDCard = forwardRef<HTMLDivElement, RentalIDCardProps>(
  ({ cardNumber, unitNumber, propertyName, holderName, propertyCode, businessName, businessPhone, businessAddress, logoUrl, issuedDate, forPrint = false, side = 'both' }, ref) => {
    const qrValue = JSON.stringify({
      type: 'rental_id',
      card: cardNumber,
      property: propertyCode,
      unit: unitNumber,
      t: Date.now(),
    });

    const cardStyle: React.CSSProperties = forPrint ? {
      width: '85.6mm',
      height: '54mm',
      display: 'inline-block',
      margin: '0',
      pageBreakInside: 'avoid',
    } : {};

    const FrontCard = () => (
      <div
        ref={forPrint ? undefined : ref}
        style={{
          ...cardStyle,
          width: forPrint ? '85.6mm' : `${CARD_WIDTH}px`,
          height: forPrint ? '54mm' : `${CARD_HEIGHT}px`,
          background: `linear-gradient(145deg, ${DARK}, #1a2332)`,
          borderRadius: `${CARD_RADIUS}px`,
          position: 'relative',
          overflow: 'hidden',
          color: 'white',
          border: `1px solid ${TEAL}44`,
          boxShadow: `0 2px 8px rgba(0,0,0,0.2)`,
        }}
        data-card-front
      >
        <GuillochePattern opacity={0.05} />
        <CardHeaderBand color={TEAL} height={4} />
        <SecurityBorder color={TEAL} />
        <GhostStamp text="PROPERTY ID" color={TEAL} />

        <div style={{ padding: '12px 14px 10px', position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', marginTop: '2px' }}>
            {logoUrl ? (
              <img src={logoUrl} alt={businessName} style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'contain', background: 'rgba(255,255,255,0.1)', padding: '2px' }} />
            ) : (
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: `linear-gradient(135deg, ${TEAL}, ${TEAL}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: 'white' }}>
                {businessName.charAt(0)}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', lineHeight: 1.2, color: 'white' }}>{businessName}</div>
              <div style={{ fontSize: '6px', color: TEAL, letterSpacing: '2px', fontWeight: 700, textTransform: 'uppercase' }}>Property ID Card</div>
            </div>
            <HologramSeal size={24} />
          </div>

          {/* Main content */}
          <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div>
                <div style={{ fontSize: '6px', color: `${TEAL}99`, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '1px' }}>Card Number</div>
                <div style={{ fontWeight: 700, fontSize: '9px', fontFamily: 'monospace', letterSpacing: '1px', color: 'white' }}>{cardNumber}</div>
              </div>
              <div>
                <div style={{ fontSize: '6px', color: `${TEAL}99`, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '1px' }}>Property</div>
                <div style={{ fontWeight: 600, fontSize: '8px', color: 'white' }}>{propertyName}</div>
              </div>
              <div>
                <div style={{ fontSize: '6px', color: `${TEAL}99`, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '1px' }}>Unit</div>
                <div style={{ fontWeight: 800, fontSize: '13px', color: TEAL }}>{unitNumber}</div>
              </div>
              {holderName && (
                <div>
                  <div style={{ fontSize: '6px', color: `${TEAL}99`, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '1px' }}>Holder</div>
                  <div style={{ fontWeight: 600, fontSize: '8px', color: 'white' }}>{holderName}</div>
                </div>
              )}
            </div>
            <div style={{
              background: 'white',
              padding: '3px',
              borderRadius: '4px',
              border: `1px solid ${TEAL}66`,
              flexShrink: 0,
            }}>
              <QRCodeSVG value={qrValue} size={48} level="M" />
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: '5px', color: '#64748b',
            borderTop: `1px solid ${TEAL}22`,
            paddingTop: '3px', marginTop: '2px',
            fontFamily: 'monospace',
          }}>
            <span>CODE: {propertyCode}</span>
            {issuedDate && <span>ISSUED: {issuedDate}</span>}
          </div>
        </div>

        <MicroTextLine text={`${businessName.toUpperCase()} • PROPERTY ID • ${businessName.toUpperCase()} • `} color={TEAL} />
      </div>
    );

    const BackCard = () => (
      <div
        ref={forPrint ? undefined : ref}
        style={{
          ...cardStyle,
          width: forPrint ? '85.6mm' : `${CARD_WIDTH}px`,
          height: forPrint ? '54mm' : `${CARD_HEIGHT}px`,
          background: '#ffffff',
          borderRadius: `${CARD_RADIUS}px`,
          position: 'relative',
          overflow: 'hidden',
          border: `1px solid ${DARK}22`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
        data-card-back
      >
        <GuillochePattern opacity={0.025} />
        <CardHeaderBand color={TEAL} height={4} />
        <SecurityBorder color={DARK} />

        <div style={{ padding: '12px 14px 10px', position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <MagneticStripe />

          {/* Title */}
          <div style={{ fontSize: '7px', fontWeight: 700, color: DARK, letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'center', marginBottom: '4px', opacity: 0.7 }}>
            Tenant Identification Card
          </div>

          {/* Payment Instructions */}
          <div style={{
            background: `${TEAL}06`,
            border: `1px solid ${TEAL}22`,
            borderRadius: '4px',
            padding: '5px 8px',
            marginBottom: '4px',
            flex: 1,
          }}>
            <div style={{ fontSize: '6px', fontWeight: 700, color: DARK, marginBottom: '2px', letterSpacing: '0.5px' }}>Payment Instructions</div>
            <div style={{ fontSize: '6px', color: '#475569', lineHeight: 1.6 }}>
              1. Pay via MTN MoMo / Airtel Money / Bank Transfer
            </div>
            <div style={{ fontSize: '6px', color: '#475569', lineHeight: 1.6 }}>
              2. Use card no: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: DARK }}>{cardNumber}</span>
            </div>
            <div style={{ fontSize: '6px', color: '#475569', lineHeight: 1.6 }}>
              3. Submit proof in renter portal
            </div>
            <div style={{ fontSize: '5.5px', color: '#94a3b8', marginTop: '2px', fontStyle: 'italic' }}>
              Pay to merchant codes to avoid transaction fees
            </div>
          </div>

          {/* Signature */}
          <div style={{ marginBottom: '4px' }}>
            <SignaturePanel name={holderName || businessName} color={DARK} />
          </div>

          {/* Notice */}
          <div style={{
            fontSize: '5px',
            color: '#64748b',
            lineHeight: 1.4,
            padding: '3px 6px',
            background: `${DARK}04`,
            borderRadius: '4px',
            border: `1px solid ${DARK}11`,
          }}>
            This card is property of <span style={{ fontWeight: 700, color: DARK }}>{businessName}</span>. Return when vacating the unit or upon request.
            {businessPhone && <span style={{ display: 'block' }}>Contact: {businessPhone}</span>}
            {businessAddress && <span style={{ display: 'block' }}>{businessAddress}</span>}
          </div>

          <div style={{
            fontSize: '4px',
            color: '#94a3b8',
            textAlign: 'center',
            marginTop: '2px',
            fontFamily: 'monospace',
            letterSpacing: '1px',
          }}>
            RNT{cardNumber.replace(/[^A-Z0-9]/g, '').slice(0, 8)} • ENC:{btoa(cardNumber.slice(0, 6)).slice(0, 8)}
          </div>
        </div>

        <MicroTextLine text={`${businessName.toUpperCase()} • TENANT ID • ${businessName.toUpperCase()} • `} color={DARK} />
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
