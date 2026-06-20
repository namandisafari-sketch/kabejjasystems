import { forwardRef } from "react";

const BRAND = "#005bc4";
const DARK = "#003d8a";

interface PartnershipDeedProps {
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  businessCode: string;
  date: string;
  logoUrl?: string;
}

export const PartnershipDeed = forwardRef<HTMLDivElement, PartnershipDeedProps>(
  ({ schoolName, schoolAddress, schoolPhone, schoolEmail, businessCode, date, logoUrl }, ref) => {
    return (
      <div
        ref={ref}
        className="bg-white"
        style={{
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: "11pt",
          lineHeight: "1.5",
          color: "#1a1a1a",
          padding: 0,
          margin: 0,
        }}
      >
        {/* Branded Header Band */}
        <div
          style={{
            background: `linear-gradient(135deg, ${BRAND} 0%, ${DARK} 100%)`,
            padding: "28px 40px 20px",
            color: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="TennaHub Logo"
                  style={{ height: 48, objectFit: "contain", marginBottom: 8 }}
                  crossOrigin="anonymous"
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 24,
                      fontFamily: "Montserrat,Inter,Arial,sans-serif",
                    }}
                  >
                    T
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: 1 }}>
                      TENNAHUB
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.8, letterSpacing: 2 }}>
                      TECHNOLOGIES LIMITED
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div style={{ textAlign: "right", fontSize: 10, opacity: 0.9 }}>
              <div>Reg. No: 80034890122168</div>
              <div style={{ marginTop: 2 }}>Kampala, Uganda</div>
            </div>
          </div>
          <div
            style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: "1px solid rgba(255,255,255,0.25)",
              textAlign: "center",
            }}
          >
            <h1
              style={{
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: "uppercase",
                margin: 0,
                color: "#ffffff",
              }}
            >
              Partnership Deed & Service Agreement
            </h1>
            <p style={{ fontSize: 11, margin: "4px 0 0", opacity: 0.85 }}>
              Made and entered into on {date}
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "36px 40px 40px" }}>
          {/* Parties */}
          <section style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px", color: BRAND }}>
              1. Parties
            </h2>
            <p style={{ margin: "0 0 4px" }}>
              <strong>TennaHub Technologies Limited</strong> (hereinafter referred to as the
              "Service Provider"), a company duly incorporated under the laws of the Republic
              of Uganda, with registration number <strong>80034890122168</strong> and its
              principal place of business at Kampala, Uganda.
            </p>
            <p style={{ margin: "0 0 4px" }}>AND</p>
            <p style={{ margin: 0 }}>
              <strong>{schoolName}</strong> (hereinafter referred to as the "Client"), an
              educational institution{schoolAddress ? ` located at ${schoolAddress}` : ""},
              duly established and operating in Uganda.
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 10, fontStyle: "italic", color: "#666" }}>
              (Collectively referred to as the "Parties")
            </p>
          </section>

          {/* Recitals */}
          <section style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px", color: BRAND }}>
              2. Recitals
            </h2>
            <p style={{ margin: "0 0 4px" }}>
              <strong>WHEREAS</strong> the Service Provider is in the business of developing,
              hosting, and maintaining information management systems for educational and
              business institutions;
            </p>
            <p style={{ margin: "0 0 4px" }}>
              <strong>WHEREAS</strong> the Client desires to engage the Service Provider to
              serve as its Information Technology oversight and service provider for the
              management of its school operations through the BizTrack platform;
            </p>
            <p style={{ margin: "0 0 4px" }}>
              <strong>WHEREAS</strong> the Parties wish to formalize their relationship through
              this Partnership Deed and Service Agreement;
            </p>
            <p style={{ margin: 0 }}>
              <strong>NOW THEREFORE</strong>, in consideration of the mutual covenants
              contained herein, the Parties agree as follows:
            </p>
          </section>

          {/* Appointment */}
          <section style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px", color: BRAND }}>
              3. Appointment and Grant of Access
            </h2>
            <p style={{ margin: "0 0 4px" }}>
              <strong>3.1</strong> The Client hereby appoints TennaHub Technologies Limited
              as its exclusive IT oversight and service provider for the BizTrack school
              management platform, and TennaHub hereby accepts such appointment.
            </p>
            <p style={{ margin: "0 0 4px" }}>
              <strong>3.2</strong> The Client grants TennaHub Technologies Limited full and
              unrestricted access to the institution's data, systems, records, and information
              as may be necessary for the provision of services under this Agreement. This
              includes but is not limited to:
            </p>
            <ul style={{ margin: "0 0 4px", paddingLeft: 24 }}>
              <li>Student records and academic data</li>
              <li>Staff and employee information</li>
              <li>Financial and fee records</li>
              <li>Examination results and report cards</li>
              <li>School timetable and curriculum data</li>
              <li>Communication and correspondence records</li>
              <li>Any other data required for system operation and maintenance</li>
            </ul>
            <p style={{ margin: 0 }}>
              <strong>3.3</strong> The Client acknowledges that TennaHub Technologies Limited
              shall act as the IT oversight authority for the institution's digital
              infrastructure, including system administration, data management, security
              oversight, and technical support.
            </p>
          </section>

          {/* Scope of Services */}
          <section style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px", color: BRAND }}>
              4. Scope of Services
            </h2>
            <p style={{ margin: "0 0 4px" }}>
              TennaHub Technologies Limited shall provide the following services:
            </p>
            <ol style={{ margin: 0, paddingLeft: 24 }}>
              <li style={{ marginBottom: 2 }}>
                <strong>System Hosting & Maintenance:</strong> Hosting the BizTrack platform
                on secure servers with 99.5% uptime guarantee, including regular backups,
                updates, and security patches.
              </li>
              <li style={{ marginBottom: 2 }}>
                <strong>Data Management:</strong> Secure storage, backup, and management of
                all institutional data entered into the system.
              </li>
              <li style={{ marginBottom: 2 }}>
                <strong>Technical Support:</strong> Provision of technical support to the
                Client's authorized users during standard business hours.
              </li>
              <li style={{ marginBottom: 2 }}>
                <strong>System Administration:</strong> User account management, role
                assignments, and system configuration.
              </li>
              <li style={{ marginBottom: 2 }}>
                <strong>Security Oversight:</strong> Implementation and maintenance of
                security measures to protect the Client's data from unauthorized access,
                loss, or corruption.
              </li>
              <li style={{ marginBottom: 2 }}>
                <strong>Training & Onboarding:</strong> Initial training for staff members
                designated as system administrators and ongoing capacity building.
              </li>
              <li style={{ margin: 0 }}>
                <strong>Feature Development:</strong> Continuous improvement of the platform
                with new features and modules as required by the Client.
              </li>
            </ol>
          </section>

          {/* Client Obligations */}
          <section style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px", color: BRAND }}>
              5. Client Obligations
            </h2>
            <p style={{ margin: "0 0 4px" }}>The Client shall:</p>
            <ol style={{ margin: 0, paddingLeft: 24 }}>
              <li style={{ marginBottom: 2 }}>
                Provide accurate and complete data for digitization and system operation.
              </li>
              <li style={{ marginBottom: 2 }}>
                Appoint at least two (2) staff members to serve as system administrators
                and points of contact.
              </li>
              <li style={{ marginBottom: 2 }}>
                Ensure that all users comply with the system's terms of use and applicable
                data protection laws.
              </li>
              <li style={{ marginBottom: 2 }}>
                Maintain adequate internet connectivity and ICT infrastructure to access
                and use the system.
              </li>
              <li style={{ margin: 0 }}>
                Pay all applicable service fees promptly and regularly as agreed.
              </li>
            </ol>
          </section>

          {/* Fees */}
          <section style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px", color: BRAND }}>
              6. Service Fees
            </h2>
            <p style={{ margin: "0 0 4px" }}>
              <strong>6.1</strong> The Client shall pay subscription fees as agreed in the
              Service Level Agreement between the Parties.
            </p>
            <p style={{ margin: "0 0 4px" }}>
              <strong>6.2</strong> Fees are due monthly or annually as elected by the Client
              at the time of subscription.
            </p>
            <p style={{ margin: 0 }}>
              <strong>6.3</strong> Non-payment of fees may result in suspension of services
              after a fourteen (14) day grace period, during which the Client shall retain
              access to their data.
            </p>
          </section>

          {/* Data Protection */}
          <section style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px", color: BRAND }}>
              7. Data Protection and Privacy
            </h2>
            <p style={{ margin: "0 0 4px" }}>
              <strong>7.1</strong> The Service Provider shall implement appropriate technical
              and organizational measures to protect the Client's data in accordance with
              the Data Protection and Privacy Act of Uganda.
            </p>
            <p style={{ margin: "0 0 4px" }}>
              <strong>7.2</strong> All data shall be encrypted in transit (TLS) and at rest.
              Regular backups shall be maintained and stored securely.
            </p>
            <p style={{ margin: "0 0 4px" }}>
              <strong>7.3</strong> The Service Provider shall not share, sell, or otherwise
              disclose the Client's data to third parties without the Client's express
              written consent, except as required by law.
            </p>
            <p style={{ margin: 0 }}>
              <strong>7.4</strong> The Client retains full ownership and control over their
              data. Upon termination of this Agreement, the Client's data shall be exported
              and delivered in a commonly used format within thirty (30) days.
            </p>
          </section>

          {/* Term */}
          <section style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px", color: BRAND }}>
              8. Term and Termination
            </h2>
            <p style={{ margin: "0 0 4px" }}>
              <strong>8.1</strong> This Agreement shall commence on the date first written
              above and continue for an initial term of twelve (12) months, automatically
              renewing for successive periods unless terminated by either Party.
            </p>
            <p style={{ margin: "0 0 4px" }}>
              <strong>8.2</strong> Either Party may terminate this Agreement by giving thirty
              (30) days' written notice to the other Party.
            </p>
            <p style={{ margin: "0 0 4px" }}>
              <strong>8.3</strong> The Service Provider may terminate this Agreement
              immediately if the Client fails to pay fees when due and does not remedy such
              breach within fourteen (14) days of written notice.
            </p>
            <p style={{ margin: 0 }}>
              <strong>8.4</strong> Upon termination, the Service Provider shall provide the
              Client with a full export of their data in a standard format within thirty (30)
              days.
            </p>
          </section>

          {/* Liability */}
          <section style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px", color: BRAND }}>
              9. Limitation of Liability
            </h2>
            <p style={{ margin: "0 0 4px" }}>
              <strong>9.1</strong> The Service Provider's liability under this Agreement
              shall be limited to the total fees paid by the Client in the twelve (12)
              months preceding the claim.
            </p>
            <p style={{ margin: "0 0 4px" }}>
              <strong>9.2</strong> The Service Provider shall not be liable for any indirect,
              incidental, special, or consequential damages arising from the use or inability
              to use the Services.
            </p>
            <p style={{ margin: 0 }}>
              <strong>9.3</strong> The Service Provider shall not be liable for service
              interruptions caused by factors beyond its reasonable control, including but
              not limited to acts of God, internet outages, power failures, or third-party
              service disruptions.
            </p>
          </section>

          {/* Confidentiality */}
          <section style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px", color: BRAND }}>
              10. Confidentiality
            </h2>
            <p style={{ margin: 0 }}>
              Both Parties undertake to keep confidential all information obtained from the
              other Party in connection with this Agreement and shall not disclose such
              information to any third party without prior written consent, except where
              required by law.
            </p>
          </section>

          {/* Governing Law */}
          <section style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px", color: BRAND }}>
              11. Governing Law
            </h2>
            <p style={{ margin: 0 }}>
              This Agreement shall be governed by and construed in accordance with the laws
              of the Republic of Uganda. Any disputes arising under this Agreement shall be
              subject to the exclusive jurisdiction of the courts of Uganda.
            </p>
          </section>

          {/* Signatures */}
          <section style={{ marginTop: 28, paddingTop: 20, borderTop: `2px solid ${BRAND}` }}>
            <h2
              style={{
                fontSize: 13,
                fontWeight: 700,
                margin: "0 0 4px",
                textAlign: "center",
                color: BRAND,
              }}
            >
              12. Signatures
            </h2>
            <p
              style={{
                fontSize: 10,
                fontStyle: "italic",
                margin: "0 0 20px",
                textAlign: "center",
                color: "#666",
              }}
            >
              IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date
              first written above.
            </p>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ width: "50%", verticalAlign: "top", paddingRight: 16 }}>
                    <h3
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        margin: "0 0 12px",
                        color: DARK,
                      }}
                    >
                      For TennaHub Technologies Limited
                    </h3>
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ margin: "0 0 4px", fontSize: 11 }}>
                        Signature: ___________________________
                      </p>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ margin: "0 0 4px", fontSize: 11 }}>
                        Name: _______________________________
                      </p>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ margin: "0 0 4px", fontSize: 11 }}>
                        Title: _______________________________
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: 11 }}>
                        Date: _______________________________
                      </p>
                    </div>
                  </td>
                  <td style={{ width: "50%", verticalAlign: "top", paddingLeft: 16 }}>
                    <h3
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        margin: "0 0 12px",
                        color: DARK,
                      }}
                    >
                      For {schoolName}
                    </h3>
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ margin: "0 0 4px", fontSize: 11 }}>
                        Signature: ___________________________
                      </p>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ margin: "0 0 4px", fontSize: 11 }}>
                        Name: _______________________________
                      </p>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ margin: "0 0 4px", fontSize: 11 }}>
                        Title: _______________________________
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: 11 }}>
                        Date: _______________________________
                      </p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>

        {/* Branded Footer Band */}
        <div
          style={{
            background: BRAND,
            padding: "12px 40px",
            textAlign: "center",
            color: "#ffffff",
            fontSize: 9,
          }}
        >
          <p style={{ margin: "0 0 2px", letterSpacing: 1 }}>
            TENNAHUB TECHNOLOGIES LIMITED &mdash; Reg. No: 80034890122168
          </p>
          <p style={{ margin: 0, opacity: 0.8 }}>
            BizTrack Platform &bull; Business Code: {businessCode} &bull; {schoolName}
          </p>
          <p style={{ margin: "2px 0 0", opacity: 0.7 }}>
            Generated on {date} &bull; Kampala, Uganda
          </p>
        </div>
      </div>
    );
  }
);

PartnershipDeed.displayName = "PartnershipDeed";
