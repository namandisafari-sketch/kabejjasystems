import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import {
  CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS,
  GuillochePattern, CardHeaderBand, HologramSeal,
  SecurityBorder, GhostStamp, MicroTextLine,
  MagneticStripe, SignaturePanel,
} from "@/components/id-cards/CardPatterns";

interface Student {
  id: string;
  full_name: string;
  admission_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  photo_url?: string | null;
}

interface StudentIDCardProps {
  student: Student;
  schoolName: string;
  schoolLogo?: string | null;
  schoolPhone?: string | null;
  schoolEmail?: string | null;
  schoolAddress?: string | null;
  className: string;
  forPrint?: boolean;
  termYear?: string;
}

const NAVY = '#0a1628';
const GOLD = '#C5A55A';
const LIGHT_GOLD = '#e8d48b';

export default function StudentIDCard({
  student,
  schoolName,
  schoolLogo,
  schoolPhone,
  schoolEmail,
  schoolAddress,
  className,
  forPrint = false,
  termYear = "2024-2025",
}: StudentIDCardProps) {
  const cardId = student.admission_number || student.id.slice(0, 12).toUpperCase();
  const verifyUrl = `${window.location.origin}/verify-student?sid=${student.id}`;
  const qrValue = JSON.stringify({
    type: 'student',
    id: cardId,
    sid: student.id,
    t: Date.now(),
    url: verifyUrl,
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const cardBase: React.CSSProperties = {
    width: `${CARD_WIDTH}px`,
    height: `${CARD_HEIGHT}px`,
    background: '#ffffff',
    borderRadius: `${CARD_RADIUS}px`,
    color: '#1e293b',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: forPrint ? '10px' : undefined,
    border: `2px solid ${NAVY}22`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  };

  const CardFront = () => (
    <div style={cardBase} data-card-front>
      <GuillochePattern />
      <CardHeaderBand color={NAVY} height={5} />
      <SecurityBorder color={NAVY} />
      <GhostStamp text="AUTHORIZED" color={NAVY} />

      <div style={{ padding: '12px 14px 10px', position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', marginTop: '4px' }}>
          {schoolLogo ? (
            <img src={schoolLogo} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover', border: `1px solid ${GOLD}44` }} />
          ) : (
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: `linear-gradient(135deg, ${NAVY}, ${NAVY}dd)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', color: GOLD }}>
              {schoolName.charAt(0)}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: NAVY, lineHeight: 1.2 }}>{schoolName}</div>
            <div style={{ fontSize: '7px', color: GOLD, letterSpacing: '2px', fontWeight: 700, textTransform: 'uppercase' }}>Student Identification Card</div>
          </div>
          <HologramSeal size={28} />
        </div>

        {/* Main content area */}
        <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
          {/* Photo */}
          <div style={{
            width: '62px',
            height: '78px',
            background: student.photo_url ? 'transparent' : '#f8fafc',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1.5px solid ${NAVY}44`,
            flexShrink: 0,
            overflow: 'hidden',
            position: 'relative',
          }}>
            {student.photo_url ? (
              <>
                <img src={student.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `linear-gradient(180deg, transparent 50%, ${NAVY}11 100%)`,
                  pointerEvents: 'none',
                }} />
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ margin: '0 auto 2px' }}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span style={{ fontSize: '5px', color: '#94a3b8', display: 'block' }}>PHOTO</span>
              </div>
            )}
          </div>

          {/* Details */}
          <div style={{ flex: 1, fontSize: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ marginBottom: '5px' }}>
              <div style={{ color: NAVY, fontSize: '6px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '1px', opacity: 0.6 }}>Full Name</div>
              <div style={{ fontWeight: 700, fontSize: '10px', color: NAVY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.full_name}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 6px' }}>
              <div>
                <div style={{ color: NAVY, fontSize: '6px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.6 }}>Admission No.</div>
                <div style={{ fontWeight: 600, fontSize: '8px', color: NAVY, fontFamily: 'monospace' }}>{cardId}</div>
              </div>
              <div>
                <div style={{ color: NAVY, fontSize: '6px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.6 }}>Class</div>
                <div style={{ fontWeight: 600, fontSize: '8px', color: NAVY }}>{className}</div>
              </div>
              <div>
                <div style={{ color: NAVY, fontSize: '6px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.6 }}>Date of Birth</div>
                <div style={{ fontWeight: 600, fontSize: '8px', color: NAVY }}>{formatDate(student.date_of_birth)}</div>
              </div>
              <div>
                <div style={{ color: NAVY, fontSize: '6px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.6 }}>Gender</div>
                <div style={{ fontWeight: 600, fontSize: '8px', color: NAVY, textTransform: 'capitalize' }}>{student.gender || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{
              background: 'white',
              padding: '3px',
              borderRadius: '4px',
              border: `1px solid ${GOLD}66`,
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '4px',
                background: `linear-gradient(135deg, ${GOLD}15, transparent 50%, ${GOLD}10)`,
                pointerEvents: 'none',
              }} />
              <QRCodeSVG value={qrValue} size={48} level="M" />
            </div>
            <div style={{ fontSize: '5px', color: '#94a3b8', marginTop: '2px', textAlign: 'center', fontWeight: 600, letterSpacing: '0.5px' }}>VERIFY QR</div>
          </div>
        </div>

        {/* Footer row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <div style={{ fontSize: '5px', color: '#94a3b8', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
            {cardId}
          </div>
          <div style={{
            background: `linear-gradient(135deg, ${NAVY}, ${NAVY}dd)`,
            color: GOLD,
            padding: '1px 10px',
            borderRadius: '8px',
            fontSize: '6px',
            fontWeight: 700,
            letterSpacing: '0.5px',
            border: `1px solid ${GOLD}44`,
          }}>
            VALID {termYear}
          </div>
          <div style={{ fontSize: '5px', color: '#94a3b8', fontStyle: 'italic' }}>
            Issued: {new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      <MicroTextLine text={`${schoolName.toUpperCase()} • STUDENT ID • ${schoolName.toUpperCase()} • `} color={NAVY} />
    </div>
  );

  const CardBack = () => (
    <div style={cardBase} data-card-back>
      <GuillochePattern opacity={0.025} />
      <CardHeaderBand color={NAVY} height={5} />
      <SecurityBorder color={NAVY} />

      <div style={{ padding: '12px 14px 10px', position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Magnetic Stripe */}
        <MagneticStripe />

        {/* Barcode section */}
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <div style={{ fontSize: '6px', fontWeight: 700, color: NAVY, letterSpacing: '1.5px', textTransform: 'uppercase', opacity: 0.6, marginBottom: '3px' }}>
            Fee Payment Barcode
          </div>
          <div style={{
            background: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            display: 'inline-block',
            border: `1px solid ${NAVY}22`,
            maxWidth: '270px',
            overflow: 'hidden',
          }}>
            <Barcode
              value={cardId}
              width={1.1}
              height={30}
              fontSize={7}
              margin={1}
              displayValue={true}
            />
          </div>
        </div>

        {/* Info row */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', flex: 1 }}>
          {/* Signature */}
          <div style={{ flex: 1 }}>
            <SignaturePanel name={student.full_name} color={NAVY} />
          </div>

          {/* Security watermark */}
          <div style={{
            width: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: `conic-gradient(from 0deg, ${NAVY}22, ${NAVY}11, ${NAVY}22, ${NAVY}11)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{ fontSize: '7px', fontWeight: 700, color: `${NAVY}44`, letterSpacing: '1px' }}>
                {schoolName.charAt(0)}{schoolName.includes(' ') ? schoolName.split(' ')[1]?.charAt(0) || '' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Notice */}
        <div style={{
          fontSize: '5.5px',
          color: '#64748b',
          lineHeight: 1.5,
          padding: '4px 6px',
          background: `${NAVY}04`,
          borderRadius: '4px',
          border: `1px solid ${NAVY}11`,
        }}>
          <span style={{ fontWeight: 700, color: NAVY }}>NOTICE:</span> This card is the property of {schoolName}. It is non-transferable and must be surrendered upon request or withdrawal. If found, please return to the school administration office.
          {schoolPhone && <span style={{ display: 'block', marginTop: '1px' }}>📞 {schoolPhone}</span>}
          {schoolEmail && <span>✉️ {schoolEmail}</span>}
          {schoolAddress && <span style={{ display: 'block' }}>📍 {schoolAddress}</span>}
        </div>

        <div style={{
          fontSize: '4px',
          color: '#94a3b8',
          textAlign: 'center',
          marginTop: '3px',
          fontFamily: 'monospace',
          letterSpacing: '1px',
        }}>
          SYS{(student.id || '').slice(0, 8).toUpperCase()} • {termYear.replace(/\s/g, '')} • ENC:{btoa(cardId.slice(0, 6)).slice(0, 8)}
        </div>
      </div>

      <MicroTextLine text={`${schoolName.toUpperCase()} • VERIFIED • ${schoolName.toUpperCase()} • `} color={NAVY} />
    </div>
  );

  if (forPrint) {
    return (
      <div className="card-wrapper" style={{ display: 'inline-block', margin: '10px' }}>
        <CardFront />
        <CardBack />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <CardFront />
      <CardBack />
    </div>
  );
}
