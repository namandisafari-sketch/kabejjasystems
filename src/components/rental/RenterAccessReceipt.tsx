import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";

interface RenterAccessReceiptProps {
  renterName: string;
  propertyCode: string;
  unitNumber: string;
  accessPin: string;
  propertyName?: string;
  propertyAddress?: string;
  monthlyRent?: number;
  leaseEndDate?: string;
}

export const RenterAccessReceipt = forwardRef<HTMLDivElement, RenterAccessReceiptProps>(
  ({ renterName, propertyCode, unitNumber, accessPin, propertyName, propertyAddress, monthlyRent, leaseEndDate }, ref) => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("en-UG", {
        style: "currency",
        currency: "UGX",
        maximumFractionDigits: 0,
      }).format(amount);
    };

    const accessUrl = `${window.location.origin}/renter`;

    return (
      <div
        ref={ref}
        style={{
          width: "80mm",
          fontFamily: "monospace",
          fontSize: "12px",
          padding: "10px",
          backgroundColor: "#fff",
          color: "#000",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "15px" }}>
          <div style={{ fontSize: "16px", fontWeight: "bold" }}>KaRental Ko</div>
          <div style={{ fontSize: "10px", color: "#666" }}>Renter Access Receipt</div>
          <div style={{ borderBottom: "1px dashed #000", margin: "10px 0" }} />
        </div>

        {/* Property Info */}
        {propertyName && (
          <div style={{ marginBottom: "10px" }}>
            <div style={{ fontWeight: "bold", fontSize: "14px" }}>{propertyName}</div>
            {propertyAddress && <div style={{ fontSize: "10px", color: "#666" }}>{propertyAddress}</div>}
          </div>
        )}

        {/* Renter Details */}
        <div style={{ marginBottom: "15px" }}>
          <div style={{ fontWeight: "bold", marginBottom: "5px" }}>Tenant Details</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Name:</span>
            <span style={{ fontWeight: "bold" }}>{renterName}</span>
          </div>
          {monthlyRent && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Monthly Rent:</span>
              <span style={{ fontWeight: "bold" }}>{formatCurrency(monthlyRent)}</span>
            </div>
          )}
          {leaseEndDate && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Lease Ends:</span>
              <span>{format(new Date(leaseEndDate), "MMM dd, yyyy")}</span>
            </div>
          )}
        </div>

        <div style={{ borderBottom: "1px dashed #000", margin: "10px 0" }} />

        {/* Access Credentials Box */}
        <div
          style={{
            border: "2px solid #000",
            padding: "10px",
            marginBottom: "15px",
            backgroundColor: "#f0f0f0",
          }}
        >
          <div style={{ textAlign: "center", fontWeight: "bold", marginBottom: "10px", fontSize: "14px" }}>
            PORTAL ACCESS CREDENTIALS
          </div>
          <div style={{ marginBottom: "8px" }}>
            <div style={{ fontSize: "10px", color: "#666" }}>Property Code:</div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                letterSpacing: "3px",
                textAlign: "center",
                backgroundColor: "#fff",
                padding: "5px",
                border: "1px solid #ccc",
              }}
            >
              {propertyCode}
            </div>
          </div>
          <div style={{ marginBottom: "8px" }}>
            <div style={{ fontSize: "10px", color: "#666" }}>Unit Number:</div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                textAlign: "center",
                backgroundColor: "#fff",
                padding: "5px",
                border: "1px solid #ccc",
              }}
            >
              {unitNumber}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "10px", color: "#666" }}>Access PIN:</div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                letterSpacing: "8px",
                textAlign: "center",
                backgroundColor: "#fff",
                padding: "5px",
                border: "1px solid #ccc",
              }}
            >
              {accessPin}
            </div>
          </div>
        </div>

        {/* QR Code */}
        <div style={{ textAlign: "center", marginBottom: "15px" }}>
          <div style={{ fontSize: "10px", marginBottom: "5px" }}>Scan to access portal:</div>
          <QRCodeSVG value={accessUrl} size={100} style={{ margin: "0 auto" }} />
          <div style={{ fontSize: "9px", color: "#666", marginTop: "5px" }}>{accessUrl}</div>
        </div>

        <div style={{ borderBottom: "1px dashed #000", margin: "10px 0" }} />

        {/* Instructions */}
        <div style={{ fontSize: "10px", color: "#666", marginBottom: "10px" }}>
          <div style={{ fontWeight: "bold", marginBottom: "3px" }}>How to access:</div>
          <ol style={{ margin: "0", paddingLeft: "15px" }}>
            <li>Visit the portal URL above</li>
            <li>Enter Property Code</li>
            <li>Enter Unit Number</li>
            <li>Enter your 4-digit PIN</li>
          </ol>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: "10px", color: "#666" }}>
          <div style={{ borderBottom: "1px dashed #000", margin: "10px 0" }} />
          <div>Keep this receipt safe</div>
          <div>Do not share your PIN</div>
          <div style={{ marginTop: "5px" }}>{format(new Date(), "PPpp")}</div>
          <div style={{ marginTop: "10px" }}>Powered by Kabejja Systems</div>
        </div>
      </div>
    );
  }
);

RenterAccessReceipt.displayName = "RenterAccessReceipt";

export const printRenterAccessReceipt = (element: HTMLElement) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow pop-ups to print the receipt");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Renter Access Receipt</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          body { margin: 0; padding: 0; font-family: monospace; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};
