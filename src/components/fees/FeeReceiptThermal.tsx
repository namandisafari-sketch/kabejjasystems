import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";

// Modern font stacks
const FONT_HEADING = "'DM Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const FONT_BODY = "'Inter', 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const FONT_MONO = "'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace";

interface ReceiptSettings {
  receipt_title?: string;
  show_logo?: boolean;
  logo_alignment?: string;
  show_phone?: boolean;
  show_email?: boolean;
  show_address?: boolean;
  show_stamp_area?: boolean;
  stamp_title?: string;
  show_verification_qr?: boolean;
  show_school_motto?: boolean;
  school_motto?: string;
  show_term_info?: boolean;
  show_class_info?: boolean;
  show_balance_info?: boolean;
  signature_title?: string;
  show_signature_line?: boolean;
  show_seasonal_remark?: boolean;
  seasonal_remark?: string;
  footer_message?: string;
  show_footer_message?: boolean;
  watermark_text?: string;
}

interface TenantInfo {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  logo_url?: string;
}

interface StudentInfo {
  full_name: string;
  admission_number: string;
  class_name?: string;
}

interface TermInfo {
  name: string;
  year: number;
}

interface FeeReceiptThermalProps {
  receipt_number: string;
  student: StudentInfo;
  amount: number;
  payment_method: string;
  reference_number?: string;
  date: Date;
  previous_balance: number;
  new_balance: number;
  tenant: TenantInfo;
  term?: TermInfo;
  settings?: ReceiptSettings;
  cashier_name?: string;
}

export const FeeReceiptThermal = forwardRef<HTMLDivElement, FeeReceiptThermalProps>(
  ({ 
    receipt_number, 
    student, 
    amount, 
    payment_method, 
    reference_number, 
    date, 
    previous_balance, 
    new_balance, 
    tenant,
    term,
    settings = {},
    cashier_name
  }, ref) => {
    const formatCurrency = (value: number) => {
      return `UGX ${value.toLocaleString()}`;
    };

    const verificationCode = `${receipt_number}-${student.admission_number}`;
    
    return (
      <div 
        ref={ref}
        className="receipt-container"
        style={{ 
          width: "80mm", 
          minHeight: "auto",
          position: "relative",
          backgroundColor: "#fff",
          color: "#1a1a1a",
          padding: "14px",
          fontFamily: FONT_BODY,
          fontSize: "11px",
          lineHeight: "1.5",
          letterSpacing: "0.01em"
        }}
      >
        {/* Header */}
        <div className="header" style={{ 
          textAlign: "center", 
          paddingBottom: "12px", 
          borderBottom: "2px dashed #000",
          marginBottom: "12px"
        }}>
          {/* Logo */}
          {settings.show_logo !== false && tenant.logo_url && (
            <div style={{ 
              marginBottom: "8px",
              textAlign: settings.logo_alignment === 'left' ? 'left' : settings.logo_alignment === 'right' ? 'right' : 'center'
            }}>
              <img 
                src={tenant.logo_url} 
                alt={tenant.name} 
                style={{ height: "48px", display: "inline-block" }}
              />
            </div>
          )}
          
          {/* School Name */}
          <h1 style={{ 
            fontSize: "18px", 
            fontWeight: "700", 
            fontFamily: FONT_HEADING,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            margin: "0 0 8px 0"
          }}>
            {tenant.name}
          </h1>
          
          {/* Contact Info */}
          <div style={{ fontSize: "9px", marginTop: "6px", color: "#444", fontWeight: "500" }}>
            {settings.show_address !== false && tenant.address && (
              <p style={{ margin: "3px 0" }}>{tenant.address}</p>
            )}
            {settings.show_phone !== false && tenant.phone && (
              <p style={{ margin: "3px 0" }}>Tel: {tenant.phone}</p>
            )}
            {settings.show_email !== false && tenant.email && (
              <p style={{ margin: "3px 0" }}>Email: {tenant.email}</p>
            )}
          </div>

          {/* School Motto */}
          {settings.show_school_motto !== false && settings.school_motto && (
            <p style={{ fontSize: "9px", fontStyle: "italic", marginTop: "10px", color: "#555", fontWeight: "500" }}>
              "{settings.school_motto}"
            </p>
          )}
        </div>

        {/* Receipt Title */}
        <div className="receipt-title" style={{ textAlign: "center", margin: "14px 0" }}>
          <h2 style={{ 
            fontSize: "11px", 
            fontWeight: "700",
            fontFamily: FONT_HEADING,
            textTransform: "uppercase",
            background: "linear-gradient(to bottom, #1a1a1a, #333)",
            color: "#fff",
            display: "inline-block",
            padding: "8px 16px",
            letterSpacing: "0.1em",
            borderRadius: "2px"
          }}>
            {settings.receipt_title || "OFFICIAL FEE PAYMENT RECEIPT"}
          </h2>
        </div>

        {/* Receipt Details */}
        <div className="section" style={{ 
          border: "1px solid #ddd", 
          padding: "10px 12px", 
          marginBottom: "12px",
          backgroundColor: "#f8f9fa",
          borderRadius: "4px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginBottom: "6px" }}>
            <span style={{ color: "#666", fontWeight: "500" }}>Receipt No:</span>
            <span style={{ fontWeight: "700", fontFamily: FONT_MONO, letterSpacing: "0.02em" }}>{receipt_number}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
            <span style={{ color: "#666", fontWeight: "500" }}>Date & Time:</span>
            <span style={{ fontWeight: "600", fontFamily: FONT_MONO }}>{format(date, "dd/MM/yyyy HH:mm")}</span>
          </div>
        </div>

        {/* Term Info */}
        {settings.show_term_info !== false && term && (
          <div style={{ textAlign: "center", marginBottom: "12px", fontSize: "10px", fontWeight: "600", fontFamily: FONT_HEADING, color: "#333", letterSpacing: "0.03em" }}>
            {term.name} • {term.year}
          </div>
        )}

        {/* Student Details */}
        <div className="section" style={{ marginBottom: "12px" }}>
          <div className="section-header" style={{ 
            backgroundColor: "#1a1a1a", 
            color: "#fff",
            padding: "7px 10px", 
            fontWeight: "600", 
            fontFamily: FONT_HEADING,
            fontSize: "9px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            borderRadius: "3px 3px 0 0"
          }}>
            Student Details
          </div>
          <div className="section-content" style={{ 
            border: "1px solid #ddd", 
            borderTop: "none", 
            padding: "10px",
            borderRadius: "0 0 3px 3px"
          }}>
            <div className="row" style={{ display: "flex", justifyContent: "space-between", margin: "5px 0", fontSize: "10px" }}>
              <span style={{ color: "#666", fontWeight: "500" }}>Name:</span>
              <span style={{ fontWeight: "600" }}>{student.full_name}</span>
            </div>
            <div className="row" style={{ display: "flex", justifyContent: "space-between", margin: "5px 0", fontSize: "10px" }}>
              <span style={{ color: "#666", fontWeight: "500" }}>Admission No:</span>
              <span style={{ fontWeight: "700", fontFamily: FONT_MONO }}>{student.admission_number}</span>
            </div>
            {settings.show_class_info !== false && student.class_name && (
              <div className="row" style={{ display: "flex", justifyContent: "space-between", margin: "5px 0", fontSize: "10px" }}>
                <span style={{ color: "#666", fontWeight: "500" }}>Class:</span>
                <span style={{ fontWeight: "600" }}>{student.class_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Details */}
        <div className="section" style={{ marginBottom: "12px" }}>
          <div className="section-header" style={{ 
            backgroundColor: "#1a1a1a", 
            color: "#fff",
            padding: "7px 10px", 
            fontWeight: "600", 
            fontFamily: FONT_HEADING,
            fontSize: "9px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            borderRadius: "3px 3px 0 0"
          }}>
            Payment Details
          </div>
          <div className="section-content" style={{ 
            border: "1px solid #ddd", 
            borderTop: "none", 
            padding: "10px",
            borderRadius: "0 0 3px 3px"
          }}>
            <div className="row" style={{ display: "flex", justifyContent: "space-between", margin: "5px 0", fontSize: "10px" }}>
              <span style={{ color: "#666", fontWeight: "500" }}>Payment Method:</span>
              <span style={{ fontWeight: "600", textTransform: "capitalize" }}>{payment_method.replace("_", " ")}</span>
            </div>
            {reference_number && (
              <div className="row" style={{ display: "flex", justifyContent: "space-between", margin: "5px 0", fontSize: "10px" }}>
                <span style={{ color: "#666", fontWeight: "500" }}>Reference:</span>
                <span style={{ fontWeight: "600", fontFamily: FONT_MONO }}>{reference_number}</span>
              </div>
            )}
            
            <div style={{ borderTop: "1px solid #eee", margin: "10px 0" }}></div>
            
            {settings.show_balance_info !== false && (
              <div className="row" style={{ display: "flex", justifyContent: "space-between", margin: "5px 0", fontSize: "10px", color: "#666" }}>
                <span style={{ fontWeight: "500" }}>Previous Balance:</span>
                <span style={{ fontFamily: FONT_MONO }}>{formatCurrency(previous_balance)}</span>
              </div>
            )}
            
            <div className="amount-row" style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              margin: "10px 0",
              fontSize: "14px",
              fontWeight: "700",
              fontFamily: FONT_HEADING,
              background: "linear-gradient(135deg, #16a34a, #22c55e)",
              color: "#fff",
              padding: "10px 12px",
              borderRadius: "4px"
            }}>
              <span style={{ letterSpacing: "0.03em" }}>AMOUNT PAID</span>
              <span style={{ fontFamily: FONT_MONO }}>{formatCurrency(amount)}</span>
            </div>
            
            {settings.show_balance_info !== false && (
              <div className="row" style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                margin: "6px 0", 
                fontSize: "11px",
                fontWeight: "700"
              }}>
                <span>New Balance:</span>
                <span style={{ fontFamily: FONT_MONO, color: new_balance <= 0 ? "#16a34a" : "#1a1a1a" }}>
                  {formatCurrency(new_balance)}
                  {new_balance <= 0 && " ✓"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Seasonal Remark */}
        {settings.show_seasonal_remark && settings.seasonal_remark && (
          <div style={{ 
            textAlign: "center", 
            fontSize: "9px", 
            fontStyle: "italic",
            fontWeight: "500",
            margin: "12px 0",
            padding: "10px 12px",
            backgroundColor: "#fffbeb",
            border: "1px solid #fcd34d",
            borderRadius: "4px",
            color: "#92400e"
          }}>
            ✦ {settings.seasonal_remark} ✦
          </div>
        )}

        {/* QR Code & Stamp Area */}
        <div className="qr-stamp-area" style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "flex-start",
          margin: "16px 0"
        }}>
          {/* QR Code */}
          {settings.show_verification_qr !== false && (
            <div className="qr-code" style={{ textAlign: "center" }}>
              <QRCodeSVG 
                value={verificationCode} 
                size={60}
                level="M"
                style={{ border: "2px solid #1a1a1a", padding: "4px", borderRadius: "4px" }}
              />
              <p style={{ fontSize: "8px", marginTop: "5px", fontWeight: "500", color: "#666" }}>Scan to verify</p>
            </div>
          )}

          {/* Stamp Area */}
          {settings.show_stamp_area !== false && (
            <div className="stamp-area" style={{ 
              width: "70px", 
              height: "70px",
              border: "2px dashed #999",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center"
            }}>
              <p style={{ fontSize: "7px", color: "#888", fontWeight: "600", fontFamily: FONT_HEADING, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                {settings.stamp_title || "Official Stamp"}
              </p>
            </div>
          )}
        </div>

        {/* Signature Line */}
        {settings.show_signature_line !== false && (
          <div className="signature-line" style={{ marginTop: "30px" }}>
            <div style={{ 
              borderTop: "1px solid #333", 
              paddingTop: "6px", 
              textAlign: "center", 
              fontSize: "9px",
              fontWeight: "500",
              color: "#666"
            }}>
              {settings.signature_title || "Authorized Signature"}
            </div>
            {cashier_name && (
              <div style={{ textAlign: "center", fontSize: "9px", marginTop: "5px", fontWeight: "600", color: "#333" }}>
                Received by: {cashier_name}
              </div>
            )}
          </div>
        )}

        {/* Footer Message */}
        {settings.show_footer_message !== false && settings.footer_message && (
          <div className="footer" style={{ 
            textAlign: "center", 
            fontSize: "9px",
            fontWeight: "500",
            color: "#666",
            marginTop: "16px",
            paddingTop: "12px",
            borderTop: "1px solid #ddd"
          }}>
            {settings.footer_message}
          </div>
        )}

        {/* Cut Line */}
        <div className="cut-line" style={{ 
          textAlign: "center",
          marginTop: "16px",
          paddingTop: "8px",
          borderTop: "1px dashed #ccc",
          fontSize: "8px",
          color: "#999"
        }}>
          ✂ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
        </div>

        {/* Receipt Copy Indicator */}
        <div className="copy-indicator" style={{ 
          textAlign: "center", 
          fontSize: "8px", 
          marginTop: "8px",
          fontWeight: "600",
          fontFamily: FONT_HEADING,
          letterSpacing: "0.1em",
          color: "#888"
        }}>
          ORIGINAL COPY • {format(date, "dd MMM yyyy")}
        </div>
      </div>
    );
  }
);

FeeReceiptThermal.displayName = "FeeReceiptThermal";
