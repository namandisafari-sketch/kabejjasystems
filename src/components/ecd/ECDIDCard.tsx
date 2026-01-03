import { QRCodeSVG } from "qrcode.react";
import { Baby } from "lucide-react";

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

const CARD_WIDTH = 340;
const CARD_HEIGHT = 215;

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
  // QR contains student ID for scanning
  const qrValue = `STU:${student.id}`;
  const levelLabel = student.ecd_level ? ECD_LEVELS[student.ecd_level] || student.ecd_level : className;
  const authorizedPickups = student.authorized_pickups || [];

  const cardFrontStyle: React.CSSProperties = {
    width: `${CARD_WIDTH}px`,
    height: `${CARD_HEIGHT}px`,
    background: 'linear-gradient(135deg, #FFE4EC 0%, #E0F7FA 100%)',
    borderRadius: '16px',
    padding: '16px',
    color: '#1e293b',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: forPrint ? '10px' : undefined,
    border: '3px solid #FF6B9D',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  };

  const cardBackStyle: React.CSSProperties = {
    width: `${CARD_WIDTH}px`,
    height: `${CARD_HEIGHT}px`,
    background: 'linear-gradient(135deg, #E0F7FA 0%, #FFE4EC 100%)',
    borderRadius: '16px',
    padding: '14px',
    color: '#1e293b',
    position: 'relative',
    overflow: 'hidden',
    border: '3px solid #4ECDC4',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  };

  const CardFront = () => (
    <div style={cardFrontStyle} data-card-front>
      {/* Decorative elements */}
      <div style={{ position: 'absolute', top: -20, right: -20, fontSize: '80px', opacity: 0.1 }}>🌟</div>
      <div style={{ position: 'absolute', bottom: -10, left: -10, fontSize: '60px', opacity: 0.1 }}>🎈</div>
      
      {/* Header - School name + logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        {schoolLogo ? (
          <img src={schoolLogo} alt="Logo" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FF6B9D' }} />
        ) : (
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FF6B9D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: 'white' }}>
            🏫
          </div>
        )}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#FF6B9D' }}>{schoolName}</div>
          <div style={{ fontSize: '8px', color: '#666', letterSpacing: '1px' }}>LEARNER ID CARD</div>
        </div>
      </div>
      
      {/* Content - Photo, Details, QR */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {/* Child Photo */}
        <div style={{
          width: '65px',
          height: '80px',
          background: student.photo_url ? 'transparent' : '#fff',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #4ECDC4',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          {student.photo_url ? (
            <img src={student.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '28px' }}>👶</span>
          )}
        </div>
        
        {/* Name, Learner ID, Class Level */}
        <div style={{ flex: 1, fontSize: '9px' }}>
          <div style={{ marginBottom: '4px' }}>
            <div style={{ color: '#666', fontSize: '7px', fontWeight: '600' }}>NAME</div>
            <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#1e293b' }}>{student.full_name}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            <div>
              <div style={{ color: '#666', fontSize: '7px', fontWeight: '600' }}>LEARNER ID</div>
              <div style={{ fontWeight: '600', color: '#1e293b' }}>{cardId}</div>
            </div>
            <div>
              <div style={{ color: '#666', fontSize: '7px', fontWeight: '600' }}>CLASS LEVEL</div>
              <div style={{ fontWeight: '600', color: '#1e293b' }}>{levelLabel}</div>
            </div>
          </div>
          {/* Role Badge */}
          {student.ecd_role_badge && (
            <div style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#FFD700', padding: '2px 8px', borderRadius: '10px', fontSize: '8px', fontWeight: 'bold' }}>
              🏅 {student.ecd_role_badge}
            </div>
          )}
        </div>
        
        {/* QR Code */}
        <div style={{ 
          width: '55px', 
          height: '55px', 
          background: 'white', 
          padding: '4px', 
          borderRadius: '8px',
          border: '1px solid #ddd',
          flexShrink: 0,
        }}>
          <QRCodeSVG value={qrValue} size={47} />
        </div>
      </div>
      
      {/* Valid stamp (term/year) */}
      <div style={{
        position: 'absolute',
        bottom: '8px',
        right: '10px',
        background: '#4ECDC4',
        color: 'white',
        padding: '2px 10px',
        borderRadius: '10px',
        fontSize: '7px',
        fontWeight: 'bold',
      }}>
        VALID {termYear}
      </div>
    </div>
  );

  const CardBack = () => (
    <div style={cardBackStyle} data-card-back>
      <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#4ECDC4', marginBottom: '6px', textAlign: 'center' }}>
        📋 GUARDIAN & PICKUP INFORMATION
      </div>
      
      {/* Guardian & Emergency contacts */}
      <div style={{ fontSize: '8px', marginBottom: '6px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <div style={{ background: 'white', padding: '6px', borderRadius: '6px' }}>
            <div style={{ color: '#666', fontSize: '7px', fontWeight: '600' }}>GUARDIAN</div>
            <div style={{ fontWeight: '600' }}>{student.guardian_name || 'N/A'}</div>
            <div style={{ color: '#666' }}>📞 {student.guardian_phone || 'N/A'}</div>
          </div>
          <div style={{ background: 'white', padding: '6px', borderRadius: '6px' }}>
            <div style={{ color: '#666', fontSize: '7px', fontWeight: '600' }}>EMERGENCY</div>
            <div style={{ fontWeight: '600' }}>{student.emergency_contact_name || 'N/A'}</div>
            <div style={{ color: '#666' }}>📞 {student.emergency_contact_phone || 'N/A'}</div>
          </div>
        </div>
      </div>
      
      {/* Authorized Pickup List */}
      <div style={{ marginBottom: '6px', background: 'white', padding: '6px', borderRadius: '6px' }}>
        <div style={{ color: '#666', fontSize: '7px', fontWeight: '600', marginBottom: '3px' }}>AUTHORIZED PICKUP LIST:</div>
        <div style={{ fontSize: '7px', color: '#333' }}>
          {authorizedPickups.length > 0 ? (
            authorizedPickups.slice(0, 3).map((p, i) => (
              <div key={i} style={{ marginBottom: '2px' }}>
                ✓ {p.name} ({p.relationship}) - {p.phone}
              </div>
            ))
          ) : (
            <div style={{ fontStyle: 'italic', color: '#999' }}>Only registered guardian may pick up</div>
          )}
        </div>
      </div>
      
      {/* School contacts & scan note */}
      <div style={{ textAlign: 'center', fontSize: '7px', color: '#666', background: 'white', padding: '6px', borderRadius: '6px' }}>
        <div style={{ fontWeight: 'bold', color: '#FF6B9D', marginBottom: '2px' }}>{schoolName}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {schoolPhone && <span>📞 {schoolPhone}</span>}
          {schoolEmail && <span>✉️ {schoolEmail}</span>}
        </div>
        {schoolAddress && <div style={{ marginTop: '2px' }}>📍 {schoolAddress}</div>}
        <div style={{ marginTop: '4px', fontStyle: 'italic', fontWeight: 'bold', color: '#4ECDC4' }}>
          Scan QR or ID for attendance and parent pickup verification
        </div>
      </div>
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