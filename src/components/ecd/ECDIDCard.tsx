import { QRCodeSVG } from "qrcode.react";
import {
  CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS,
  GuillochePattern, CardHeaderBand, HologramSeal,
  SecurityBorder, GhostStamp, MicroTextLine,
  MagneticStripe, SignaturePanel,
} from "@/components/id-cards/CardPatterns";

interface AuthorizedPickup {
  name: string;
  phone: string;
  relationship: string;
}

interface ECDStudent {
  id: string;
  full_name: string;
  admission_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  photo_url?: string | null;
  ecd_level?: string | null;
  ecd_role_badge?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  authorized_pickups?: AuthorizedPickup[];
}

interface ECDIDCardProps {
  student: ECDStudent;
  schoolName: string;
  schoolLogo?: string | null;
  schoolPhone?: string | null;
  schoolAddress?: string | null;
  schoolEmail?: string | null;
  className: string;
  termYear?: string;
  forPrint?: boolean;
}

const ECD_LEVELS: Record<string, string> = {
  'ecd1': 'Baby Class',
  'ecd2': 'Middle Class',
  'ecd3': 'Top Class',
};

const PRIMARY = '#6B3FA0';
const ACCENT = '#f0a8c4';

export default function ECDIDCard({
  student,
  schoolName,
  schoolLogo,
  schoolPhone,
  schoolAddress,
  schoolEmail,
  className,
  termYear = "2024-2025",
  forPrint = false
}: ECDIDCardProps) {
  const cardId = student.admission_number || student.id.slice(0, 12).toUpperCase();
  const qrValue = JSON.stringify({
    type: 'ecd_learner',
    id: student.id,
    t: Date.now(),
  });
  const levelLabel = student.ecd_level ? ECD_LEVELS[student.ecd_level] || student.ecd_level : className;
  const authorizedPickups = student.authorized_pickups || [];

  const cardBase: React.CSSProperties = {
    width: `${CARD_WIDTH}px`,
    height: `${CARD_HEIGHT}px`,
    background: '#ffffff',
    borderRadius: `${CARD_RADIUS}px`,
    color: '#1e293b',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: forPrint ? '10px' : undefined,
    border: `2px solid ${PRIMARY}22`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  };

  const CardFront = () => (
    <div style={cardBase} data-card-front>
      <GuillochePattern opacity={0.03} />
      <CardHeaderBand color={PRIMARY} height={5} />
      <SecurityBorder color={PRIMARY} />
      <GhostStamp text="LEARNER" color={PRIMARY} />

      <div style={{ padding: '12px 14px 10px', position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', marginTop: '4px' }}>
          {schoolLogo ? (
            <img src={schoolLogo} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover', border: `1px solid ${PRIMARY}44` }} />
          ) : (
            <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY}dd)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', color: 'white' }}>
              {schoolName.charAt(0)}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: PRIMARY, lineHeight: 1.2 }}>{schoolName}</div>
            <div style={{ fontSize: '7px', color: ACCENT, letterSpacing: '2px', fontWeight: 700, textTransform: 'uppercase' }}>Learner Identification Card</div>
          </div>
          <HologramSeal size={28} />
        </div>

        {/* Main content */}
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
            border: `1.5px solid ${PRIMARY}44`,
            flexShrink: 0,
            overflow: 'hidden',
          }}>
            {student.photo_url ? (
              <img src={student.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
              <div style={{ color: PRIMARY, fontSize: '6px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '1px', opacity: 0.6 }}>Full Name</div>
              <div style={{ fontWeight: 700, fontSize: '10px', color: PRIMARY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.full_name}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 6px' }}>
              <div>
                <div style={{ color: PRIMARY, fontSize: '6px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.6 }}>Learner ID</div>
                <div style={{ fontWeight: 600, fontSize: '8px', color: PRIMARY, fontFamily: 'monospace' }}>{cardId}</div>
              </div>
              <div>
                <div style={{ color: PRIMARY, fontSize: '6px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.6 }}>Class Level</div>
                <div style={{ fontWeight: 600, fontSize: '8px', color: PRIMARY }}>{levelLabel}</div>
              </div>
              <div>
                <div style={{ color: PRIMARY, fontSize: '6px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.6 }}>Date of Birth</div>
                <div style={{ fontWeight: 600, fontSize: '8px', color: PRIMARY }}>
                  {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ color: PRIMARY, fontSize: '6px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.6 }}>Gender</div>
                <div style={{ fontWeight: 600, fontSize: '8px', color: PRIMARY, textTransform: 'capitalize' }}>{student.gender || 'N/A'}</div>
              </div>
            </div>
            {student.ecd_role_badge && (
              <div style={{ marginTop: '3px', display: 'inline-flex', alignItems: 'center', gap: '3px', background: `${ACCENT}33`, padding: '1px 8px', borderRadius: '8px', fontSize: '7px', fontWeight: 700, color: PRIMARY, alignSelf: 'flex-start', border: `1px solid ${ACCENT}55` }}>
                {student.ecd_role_badge}
              </div>
            )}
          </div>

          {/* QR Code */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{
              background: 'white',
              padding: '3px',
              borderRadius: '4px',
              border: `1px solid ${ACCENT}66`,
            }}>
              <QRCodeSVG value={qrValue} size={48} level="M" />
            </div>
            <div style={{ fontSize: '5px', color: '#94a3b8', marginTop: '2px', textAlign: 'center', fontWeight: 600, letterSpacing: '0.5px' }}>SECURE QR</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <div style={{ fontSize: '5px', color: '#94a3b8', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
            LRN: {cardId.slice(0, 10)}
          </div>
          <div style={{
            background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY}dd)`,
            color: 'white',
            padding: '1px 10px',
            borderRadius: '8px',
            fontSize: '6px',
            fontWeight: 700,
            letterSpacing: '0.5px',
          }}>
            VALID {termYear}
          </div>
          <div style={{ fontSize: '5px', color: '#94a3b8', fontStyle: 'italic' }}>
            Issued: {new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      <MicroTextLine text={`${schoolName.toUpperCase()} • LEARNER ID • ${schoolName.toUpperCase()} • `} color={PRIMARY} />
    </div>
  );

  const CardBack = () => (
    <div style={cardBase} data-card-back>
      <GuillochePattern opacity={0.025} />
      <CardHeaderBand color={PRIMARY} height={5} />
      <SecurityBorder color={PRIMARY} />

      <div style={{ padding: '12px 14px 10px', position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <MagneticStripe />

        {/* Guardian & Emergency */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '5px' }}>
          <div style={{ background: `${PRIMARY}04`, padding: '5px 6px', borderRadius: '4px', border: `1px solid ${PRIMARY}15` }}>
            <div style={{ fontSize: '6px', fontWeight: 700, color: PRIMARY, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px', opacity: 0.7 }}>Guardian</div>
            <div style={{ fontSize: '7px', fontWeight: 600, color: '#1e293b' }}>{student.guardian_name || 'N/A'}</div>
            <div style={{ fontSize: '6px', color: '#64748b' }}>{student.guardian_phone || ''}</div>
          </div>
          <div style={{ background: `${PRIMARY}04`, padding: '5px 6px', borderRadius: '4px', border: `1px solid ${PRIMARY}15` }}>
            <div style={{ fontSize: '6px', fontWeight: 700, color: PRIMARY, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px', opacity: 0.7 }}>Emergency</div>
            <div style={{ fontSize: '7px', fontWeight: 600, color: '#1e293b' }}>{student.emergency_contact_name || 'N/A'}</div>
            <div style={{ fontSize: '6px', color: '#64748b' }}>{student.emergency_contact_phone || ''}</div>
          </div>
        </div>

        {/* Authorized Pickups */}
        <div style={{
          background: `${PRIMARY}04`,
          padding: '5px 6px',
          borderRadius: '4px',
          border: `1px solid ${PRIMARY}15`,
          marginBottom: '5px',
          flex: 1,
        }}>
          <div style={{ fontSize: '6px', fontWeight: 700, color: PRIMARY, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px', opacity: 0.7 }}>Authorized Pickup List</div>
          {authorizedPickups.length > 0 ? (
            authorizedPickups.slice(0, 3).map((p, i) => (
              <div key={i} style={{ fontSize: '6.5px', color: '#475569', lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: PRIMARY }}>●</span>
                <span style={{ fontWeight: 600 }}>{p.name}</span>
                <span style={{ color: '#94a3b8' }}>({p.relationship})</span>
                <span style={{ color: '#94a3b8' }}>{p.phone}</span>
              </div>
            ))
          ) : (
            <div style={{ fontSize: '6.5px', color: '#94a3b8', fontStyle: 'italic' }}>
              Only registered guardian may pick up the learner
            </div>
          )}
        </div>

        {/* School contact */}
        <div style={{
          fontSize: '5.5px',
          color: '#64748b',
          textAlign: 'center',
          padding: '3px 6px',
          background: `${PRIMARY}04`,
          borderRadius: '4px',
          border: `1px solid ${PRIMARY}11`,
          lineHeight: 1.4,
        }}>
          <span style={{ fontWeight: 700, color: PRIMARY }}>{schoolName}</span>
          {schoolPhone && <span> | {schoolPhone}</span>}
          {schoolEmail && <span> | {schoolEmail}</span>}
          {schoolAddress && <div>{schoolAddress}</div>}
          <div style={{ marginTop: '1px', fontStyle: 'italic', fontWeight: 600, color: PRIMARY, fontSize: '5px', letterSpacing: '0.5px' }}>
            Scan QR for secure pickup verification
          </div>
        </div>

        <div style={{
          fontSize: '4px',
          color: '#94a3b8',
          textAlign: 'center',
          marginTop: '2px',
          fontFamily: 'monospace',
          letterSpacing: '1px',
        }}>
          ECD{(student.id || '').slice(0, 8).toUpperCase()} • {termYear.replace(/\s/g, '')} • ENC:{btoa(cardId.slice(0, 6)).slice(0, 8)}
        </div>
      </div>

      <MicroTextLine text={`${schoolName.toUpperCase()} • LEARNER • ${schoolName.toUpperCase()} • `} color={PRIMARY} />
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
