import { forwardRef } from "react";
import { format } from "date-fns";

interface PaymentData {
  receipt_number: string;
  payment_date: string;
  amount: number;
  payment_type: string;
  payment_method: string;
  months_covered?: number;
  period_start?: string;
  period_end?: string;
  reference_number?: string;
  notes?: string;
  tenant_name: string;
  unit_number: string;
  property_name: string;
}

interface BusinessInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
}

interface RentalPaymentReceiptProps {
  payment: PaymentData;
  business: BusinessInfo;
}

const RentalPaymentReceipt = forwardRef<HTMLDivElement, RentalPaymentReceiptProps>(
  ({ payment, business }, ref) => {
    const getPaymentTypeLabel = (type: string) => {
      switch (type) {
        case 'rent': return 'Rent Payment';
        case 'deposit': return 'Security Deposit';
        case 'late_fee': return 'Late Fee';
        case 'utility': return 'Utility Payment';
        default: return type.charAt(0).toUpperCase() + type.slice(1);
      }
    };

    const getPaymentMethodLabel = (method: string) => {
      switch (method) {
        case 'cash': return 'Cash';
        case 'bank_transfer': return 'Bank Transfer';
        case 'mobile_money': return 'Mobile Money';
        case 'cheque': return 'Cheque';
        default: return method?.replace('_', ' ');
      }
    };

    return (
      <div 
        ref={ref} 
        className="bg-white text-black p-4"
        style={{ 
          fontFamily: "Arial, sans-serif",
          width: '72mm',
          fontSize: '11px',
          lineHeight: '1.4'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '8px', marginBottom: '8px' }}>
          {business.logo_url && (
            <img 
              src={business.logo_url} 
              alt={business.name} 
              style={{ width: '48px', height: '48px', margin: '0 auto 6px', objectFit: 'contain' }}
            />
          )}
          <div style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {business.name}
          </div>
          {business.address && (
            <div style={{ fontSize: '10px', marginTop: '4px' }}>{business.address}</div>
          )}
          <div style={{ fontSize: '10px', marginTop: '2px' }}>
            {business.phone && <span>Tel: {business.phone}</span>}
            {business.phone && business.email && <span> | </span>}
            {business.email && <span>{business.email}</span>}
          </div>
        </div>

        {/* Receipt Title */}
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Official Receipt
          </div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '2px' }}>
            {getPaymentTypeLabel(payment.payment_type)}
          </div>
          <div style={{ fontSize: '10px', marginTop: '2px' }}>
            Receipt #: {payment.receipt_number}
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px dashed black', margin: '8px 0' }} />

        {/* Details */}
        <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '3px 0', fontWeight: 'bold' }}>Date:</td>
              <td style={{ padding: '3px 0', textAlign: 'right' }}>
                {format(new Date(payment.payment_date), 'MMMM d, yyyy')}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '3px 0', fontWeight: 'bold' }}>Tenant:</td>
              <td style={{ padding: '3px 0', textAlign: 'right' }}>{payment.tenant_name}</td>
            </tr>
            <tr>
              <td style={{ padding: '3px 0', fontWeight: 'bold' }}>Property:</td>
              <td style={{ padding: '3px 0', textAlign: 'right' }}>{payment.property_name}</td>
            </tr>
            <tr>
              <td style={{ padding: '3px 0', fontWeight: 'bold' }}>Unit:</td>
              <td style={{ padding: '3px 0', textAlign: 'right' }}>{payment.unit_number}</td>
            </tr>
          </tbody>
        </table>

        {/* Divider */}
        <div style={{ borderTop: '1px dashed black', margin: '8px 0' }} />

        {/* Payment Details */}
        <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
          <tbody>
            {payment.payment_type === 'rent' && payment.months_covered && (
              <tr>
                <td style={{ padding: '3px 0', fontWeight: 'bold' }}>Period Covered:</td>
                <td style={{ padding: '3px 0', textAlign: 'right' }}>
                  {payment.months_covered} Month{payment.months_covered > 1 ? 's' : ''}
                </td>
              </tr>
            )}
            {payment.period_start && payment.period_end && (
              <tr>
                <td style={{ padding: '3px 0', fontWeight: 'bold' }}>From - To:</td>
                <td style={{ padding: '3px 0', textAlign: 'right', fontSize: '10px' }}>
                  {format(new Date(payment.period_start), 'dd/MM/yyyy')} - {format(new Date(payment.period_end), 'dd/MM/yyyy')}
                </td>
              </tr>
            )}
            <tr>
              <td style={{ padding: '3px 0', fontWeight: 'bold' }}>Payment Method:</td>
              <td style={{ padding: '3px 0', textAlign: 'right' }}>{getPaymentMethodLabel(payment.payment_method)}</td>
            </tr>
            {payment.reference_number && (
              <tr>
                <td style={{ padding: '3px 0', fontWeight: 'bold' }}>Reference:</td>
                <td style={{ padding: '3px 0', textAlign: 'right' }}>{payment.reference_number}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Amount Box */}
        <div style={{ 
          border: '2px solid black', 
          margin: '12px 0', 
          padding: '10px', 
          textAlign: 'center' 
        }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}>
            Amount Paid
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '4px' }}>
            UGX {payment.amount.toLocaleString()}
          </div>
        </div>

        {/* Confirmation */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold' }}>✓ Payment Confirmed</span>
        </div>

        {/* Notes */}
        {payment.notes && (
          <div style={{ fontSize: '10px', padding: '6px', border: '1px solid #ccc', marginBottom: '8px' }}>
            <strong>Notes:</strong> {payment.notes}
          </div>
        )}

        {/* Divider */}
        <div style={{ borderTop: '1px dashed black', margin: '8px 0' }} />

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '10px' }}>
          <div style={{ fontWeight: 'bold' }}>Thank you for your payment!</div>
          <div style={{ marginTop: '4px', color: '#666' }}>
            This is an official receipt. Please keep for your records.
          </div>
          <div style={{ marginTop: '8px', fontSize: '9px', color: '#999' }}>
            Generated: {format(new Date(), 'dd/MM/yyyy HH:mm')}
          </div>
        </div>
      </div>
    );
  }
);

RentalPaymentReceipt.displayName = "RentalPaymentReceipt";

export default RentalPaymentReceipt;
