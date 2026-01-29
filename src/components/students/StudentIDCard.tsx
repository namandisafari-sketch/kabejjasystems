import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";

interface Student {
  id: string;
  full_name: string;
  admission_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  photo_url?: string | null;
  student_index?: number; // Sequential index for formatting
}

interface StudentIDCardProps {
  student: Student;
  schoolName: string;
  schoolLogo?: string | null;
  schoolPhone?: string | null;
  className: string;
  forPrint?: boolean;
  termYear?: string;
  idPrefix?: string;
  idDigits?: number;
}

// Standard CR80 ID card size: 85.6mm × 53.98mm (3.375" × 2.125")
// At 100 DPI this equals approximately 340px × 215px
const CARD_WIDTH = 340;
const CARD_HEIGHT = 215;

export default function StudentIDCard({ 
  student, 
  schoolName, 
  schoolLogo,
  schoolPhone,
  className,
  forPrint = false,
  termYear = "2024-2025",
  idPrefix = "STU",
  idDigits = 4
}: StudentIDCardProps) {
  const cardId = student.admission_number || student.id.slice(0, 12).toUpperCase();
  
  // Generate formatted student ID using prefix and digits from settings
  const studentIndex = student.student_index || 1;
  const formattedStudentId = `${idPrefix}-${String(studentIndex).padStart(idDigits, '0')}`;
  const barcodeValue = formattedStudentId;
  
  // QR code contains the admission number for easy gate scanning
  const qrValue = cardId;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Ink-saving white background design for both print and export
  const cardFrontStyle: React.CSSProperties = {
    width: `${CARD_WIDTH}px`,
    height: `${CARD_HEIGHT}px`,
    background: '#ffffff',
    borderRadius: '12px',
    padding: '14px',
    color: '#1e293b',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: forPrint ? '10px' : undefined,
    border: '2px solid #1e3a5f',
  };

  const cardBackStyle: React.CSSProperties = {
    width: `${CARD_WIDTH}px`,
    height: `${CARD_HEIGHT}px`,
    background: '#ffffff',
    borderRadius: '12px',
    padding: '14px',
    color: '#1e293b',
    position: 'relative',
    overflow: 'hidden',
    border: '2px solid #1e3a5f',
  };

  const CardFront = () => (
    <div style={cardFrontStyle} data-card-front>
      {/* Header stripe for branding */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '6px',
        background: '#1e3a5f',
        borderRadius: '10px 10px 0 0',
      }}></div>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px', marginBottom: '8px' }}>
        {schoolLogo ? (
          <img src={schoolLogo} alt="Logo" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #1e3a5f' }} />
        ) : (
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', color: 'white' }}>
            {schoolName.charAt(0)}
          </div>
        )}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e3a5f' }}>{schoolName}</div>
          <div style={{ fontSize: '8px', color: '#64748b', letterSpacing: '1.5px', fontWeight: '600' }}>STUDENT ID CARD</div>
        </div>
      </div>
      
      {/* Content - Photo, Details, and QR */}
      <div style={{ display: 'flex', gap: '10px' }}>
        {/* Photo placeholder */}
        <div style={{
          width: '60px',
          height: '75px',
          background: student.photo_url ? 'transparent' : '#f1f5f9',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #cbd5e1',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          {student.photo_url ? (
            <img src={student.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '8px', color: '#94a3b8', textAlign: 'center' }}>PHOTO</span>
          )}
        </div>
        
        {/* Details */}
        <div style={{ flex: 1, fontSize: '9px', minWidth: 0 }}>
          <div style={{ marginBottom: '4px' }}>
            <div style={{ color: '#64748b', fontSize: '7px', marginBottom: '1px', fontWeight: '600' }}>FULL NAME</div>
            <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.full_name}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px', rowGap: '4px' }}>
            <div>
              <div style={{ color: '#64748b', fontSize: '7px', fontWeight: '600' }}>ADM. NO</div>
              <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '9px' }}>{cardId}</div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '7px', fontWeight: '600' }}>CLASS</div>
              <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '9px' }}>{className}</div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '7px', fontWeight: '600' }}>DOB</div>
              <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '9px' }}>{formatDate(student.date_of_birth)}</div>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '7px', fontWeight: '600' }}>GENDER</div>
              <div style={{ fontWeight: '600', color: '#1e293b', textTransform: 'capitalize', fontSize: '9px' }}>{student.gender || 'N/A'}</div>
            </div>
          </div>
        </div>
        
        {/* QR Code for gate scanning */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{
            background: 'white',
            padding: '4px',
            borderRadius: '4px',
            border: '1px solid #e2e8f0',
          }}>
            <QRCodeSVG value={qrValue} size={55} level="M" />
          </div>
          <div style={{ fontSize: '6px', color: '#64748b', marginTop: '2px', textAlign: 'center' }}>SCAN FOR<br/>CHECK-IN</div>
        </div>
      </div>
      
      {/* Valid badge */}
      <div style={{
        position: 'absolute',
        bottom: '6px',
        right: '8px',
        background: '#dcfce7',
        color: '#166534',
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '7px',
        fontWeight: 'bold',
        letterSpacing: '0.5px',
        border: '1px solid #bbf7d0',
      }}>
        VALID {termYear}
      </div>
    </div>
  );

  const CardBack = () => (
    <div style={cardBackStyle} data-card-back>
      {/* Header stripe */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '6px',
        background: '#1e3a5f',
        borderRadius: '10px 10px 0 0',
      }}></div>
      
      <div style={{ marginTop: '6px', textAlign: 'center' }}>
        <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#1e3a5f', letterSpacing: '1.5px', marginBottom: '4px' }}>
          FEE PAYMENT BARCODE
        </div>
        <div style={{ fontSize: '7px', color: '#64748b', marginBottom: '8px' }}>
          Scan this barcode at the bursar's office to process fee payments
        </div>
        
        {/* Barcode with proper sizing to fit card */}
        <div style={{ 
          background: 'white', 
          padding: '6px 10px', 
          borderRadius: '6px', 
          display: 'inline-block', 
          border: '1px solid #e2e8f0',
          maxWidth: '290px',
          overflow: 'hidden',
        }}>
          <Barcode 
            value={barcodeValue}
            width={1.2}
            height={40}
            fontSize={8}
            margin={2}
            displayValue={true}
          />
        </div>
        
        {/* Instructions */}
        <div style={{ marginTop: '8px', fontSize: '7px', color: '#64748b', lineHeight: 1.4 }}>
          <div style={{ fontWeight: 'bold', marginBottom: '2px', color: '#1e3a5f' }}>IMPORTANT NOTICE:</div>
          <div>This card is property of {schoolName}.</div>
          <div>If found, please return to the school office.</div>
          {schoolPhone && <div style={{ marginTop: '2px' }}>Contact: {schoolPhone}</div>}
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

  // Preview version (for display in the UI)
  return (
    <div className="space-y-3">
      <CardFront />
      <CardBack />
    </div>
  );
}
