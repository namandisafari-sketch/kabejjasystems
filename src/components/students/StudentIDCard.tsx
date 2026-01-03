import Barcode from "react-barcode";

interface Student {
  id: string;
  full_name: string;
  admission_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
}

interface StudentIDCardProps {
  student: Student;
  schoolName: string;
  schoolLogo?: string | null;
  schoolPhone?: string | null;
  className: string;
  forPrint?: boolean;
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
  forPrint = false 
}: StudentIDCardProps) {
  const cardId = student.admission_number || student.id.slice(0, 12).toUpperCase();
  const barcodeValue = `STU-${student.id.replace(/-/g, '').slice(0, 16)}`;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Ink-saving white background design for both print and export
  const cardFrontStyle = {
    width: `${CARD_WIDTH}px`,
    height: `${CARD_HEIGHT}px`,
    background: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    color: '#1e293b',
    position: 'relative' as const,
    overflow: 'hidden' as const,
    marginBottom: forPrint ? '10px' : undefined,
    border: '2px solid #1e3a5f',
  };

  const cardBackStyle = {
    width: `${CARD_WIDTH}px`,
    height: `${CARD_HEIGHT}px`,
    background: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    color: '#1e293b',
    position: 'relative' as const,
    overflow: 'hidden' as const,
    border: '2px solid #1e3a5f',
  };

  if (forPrint) {
    return (
      <div className="card-wrapper" style={{ display: 'inline-block', margin: '10px' }}>
        {/* Front of Card - White background for ink saving */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', marginBottom: '12px' }}>
            {schoolLogo ? (
              <img src={schoolLogo} alt="Logo" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #1e3a5f' }} />
            ) : (
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold', color: 'white' }}>
                {schoolName.charAt(0)}
              </div>
            )}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e3a5f' }}>{schoolName}</div>
              <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '2px', fontWeight: '600' }}>STUDENT ID CARD</div>
            </div>
          </div>
          
          {/* Content */}
          <div style={{ display: 'flex', gap: '14px' }}>
            {/* Photo placeholder */}
            <div style={{
              width: '70px',
              height: '85px',
              background: '#f1f5f9',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #cbd5e1',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '9px', color: '#94a3b8', textAlign: 'center' }}>PHOTO</span>
            </div>
            
            {/* Details */}
            <div style={{ flex: 1, fontSize: '10px' }}>
              <div style={{ marginBottom: '6px' }}>
                <div style={{ color: '#64748b', fontSize: '8px', marginBottom: '1px', fontWeight: '600' }}>FULL NAME</div>
                <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#0f172a' }}>{student.full_name}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '8px', fontWeight: '600' }}>ADM. NO</div>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{cardId}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '8px', fontWeight: '600' }}>CLASS</div>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{className}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '8px', fontWeight: '600' }}>DOB</div>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{formatDate(student.date_of_birth)}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '8px', fontWeight: '600' }}>GENDER</div>
                  <div style={{ fontWeight: '600', color: '#1e293b', textTransform: 'capitalize' }}>{student.gender || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Valid badge */}
          <div style={{
            position: 'absolute',
            bottom: '8px',
            right: '10px',
            background: '#dcfce7',
            color: '#166534',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '8px',
            fontWeight: 'bold',
            letterSpacing: '0.5px',
            border: '1px solid #bbf7d0',
          }}>
            VALID 2024-2025
          </div>
        </div>
        
        {/* Back of Card - White background for ink saving */}
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
          
          <div style={{ marginTop: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#1e3a5f', letterSpacing: '2px', marginBottom: '6px' }}>
              FEE PAYMENT BARCODE
            </div>
            <div style={{ fontSize: '8px', color: '#64748b', marginBottom: '10px' }}>
              Scan this barcode at the bursar's office to process fee payments
            </div>
            
            {/* Barcode */}
            <div style={{ background: 'white', padding: '8px', borderRadius: '6px', display: 'inline-block', border: '1px solid #e2e8f0' }}>
              <Barcode 
                value={barcodeValue}
                width={1.5}
                height={45}
                fontSize={9}
                margin={0}
                displayValue={true}
              />
            </div>
            
            {/* Instructions */}
            <div style={{ marginTop: '10px', fontSize: '7px', color: '#64748b', lineHeight: 1.4 }}>
              <div style={{ fontWeight: 'bold', marginBottom: '3px', color: '#1e3a5f' }}>IMPORTANT NOTICE:</div>
              <div>This card is property of {schoolName}.</div>
              <div>If found, please return to the school office.</div>
              {schoolPhone && <div style={{ marginTop: '3px' }}>Contact: {schoolPhone}</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Preview version (for display in the UI) - also with white background
  return (
    <div className="space-y-3">
      {/* Front of Card - Preview with white background */}
      <div 
        className="w-full max-w-[340px] h-[215px] bg-white rounded-xl p-4 text-slate-800 relative overflow-hidden border-2 border-[#1e3a5f]"
        data-card-front
      >
        {/* Header stripe */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#1e3a5f] rounded-t-lg"></div>
        
        {/* Header */}
        <div className="flex items-center gap-3 mt-1 mb-3 relative z-10">
          {schoolLogo ? (
            <img src={schoolLogo} alt="Logo" className="w-10 h-10 rounded-full object-cover border-2 border-[#1e3a5f]" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#1e3a5f] flex items-center justify-center text-base font-bold text-white">
              {schoolName.charAt(0)}
            </div>
          )}
          <div>
            <div className="text-[13px] font-bold text-[#1e3a5f]">{schoolName}</div>
            <div className="text-[9px] text-slate-500 tracking-[2px] font-semibold">STUDENT ID CARD</div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex gap-3.5 relative z-10">
          {/* Photo placeholder */}
          <div className="w-[70px] h-[85px] bg-slate-100 rounded-md flex items-center justify-center border border-slate-300 flex-shrink-0">
            <span className="text-[9px] text-slate-400">PHOTO</span>
          </div>
          
          {/* Details */}
          <div className="flex-1 text-[10px]">
            <div className="mb-1.5">
              <div className="text-slate-500 text-[8px] mb-0.5 font-semibold">FULL NAME</div>
              <div className="font-bold text-[12px] text-slate-900">{student.full_name}</div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <div className="text-slate-500 text-[8px] font-semibold">ADM. NO</div>
                <div className="font-semibold text-slate-700">{cardId}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[8px] font-semibold">CLASS</div>
                <div className="font-semibold text-slate-700">{className}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[8px] font-semibold">DOB</div>
                <div className="font-semibold text-slate-700">{formatDate(student.date_of_birth)}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[8px] font-semibold">GENDER</div>
                <div className="font-semibold capitalize text-slate-700">{student.gender || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Valid badge */}
        <div className="absolute bottom-2 right-2.5 bg-green-100 text-green-800 px-2 py-0.5 rounded-lg text-[8px] font-bold tracking-wide border border-green-200">
          VALID 2024-2025
        </div>
      </div>
      
      {/* Back of Card - Preview with white background */}
      <div 
        className="w-full max-w-[340px] h-[215px] bg-white rounded-xl p-4 text-slate-800 relative overflow-hidden border-2 border-[#1e3a5f]"
        data-card-back
      >
        {/* Header stripe */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#1e3a5f] rounded-t-lg"></div>
        
        <div className="mt-2 text-center">
          <div className="text-[9px] font-bold text-[#1e3a5f] tracking-[2px] mb-1.5">
            FEE PAYMENT BARCODE
          </div>
          <div className="text-[8px] text-slate-500 mb-2.5">
            Scan this barcode at the bursar's office to process fee payments
          </div>
          
          {/* Barcode */}
          <div className="bg-white p-2 rounded-md inline-block border border-slate-200">
            <Barcode 
              value={barcodeValue}
              width={1.5}
              height={45}
              fontSize={9}
              margin={0}
              displayValue={true}
            />
          </div>
          
          {/* Instructions */}
          <div className="mt-2.5 text-[7px] text-slate-500 leading-relaxed">
            <div className="font-bold mb-0.5 text-[#1e3a5f]">IMPORTANT NOTICE:</div>
            <div>This card is property of {schoolName}.</div>
            <div>If found, please return to the school office.</div>
            {schoolPhone && <div className="mt-0.5">Contact: {schoolPhone}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
