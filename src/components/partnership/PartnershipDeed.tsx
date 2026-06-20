import { forwardRef } from "react";

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
        className="bg-white text-black p-10 max-w-4xl mx-auto"
        style={{
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: "12pt",
          lineHeight: "1.6",
        }}
      >
        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-black pb-4">
          {logoUrl && (
            <img
              src={logoUrl}
              alt="TennaHub Logo"
              className="h-16 mx-auto mb-2 object-contain"
              crossOrigin="anonymous"
            />
          )}
          <h1 className="text-2xl font-bold uppercase tracking-wide">
            Partnership Deed & Service Agreement
          </h1>
          <p className="text-sm mt-1">Made and entered into on {date}</p>
        </div>

        {/* Parties */}
        <section className="mb-6">
          <h2 className="text-lg font-bold mb-2">1. Parties</h2>
          <p className="mb-1">
            <strong>TennaHub Technologies Limited</strong> (hereinafter referred to as the
            "Service Provider"), a company duly incorporated under the laws of the Republic
            of Uganda, with its principal place of business at Kampala, Uganda.
          </p>
          <p className="mb-1">AND</p>
          <p>
            <strong>{schoolName}</strong> (hereinafter referred to as the "Client"), a
            {schoolAddress ? ` ${schoolAddress},` : ""} educational institution duly
            established and operating in Uganda.
          </p>
          <p className="mt-2 text-sm italic">
            (Collectively referred to as the "Parties")
          </p>
        </section>

        {/* Recitals */}
        <section className="mb-6">
          <h2 className="text-lg font-bold mb-2">2. Recitals</h2>
          <p className="mb-2">
            <strong>WHEREAS</strong> the Service Provider is in the business of developing,
            hosting, and maintaining information management systems for educational and
            business institutions;
          </p>
          <p className="mb-2">
            <strong>WHEREAS</strong> the Client desires to engage the Service Provider to
            serve as its Information Technology oversight and service provider for the
            management of its school operations through the BizTrack platform;
          </p>
          <p className="mb-2">
            <strong>WHEREAS</strong> the Parties wish to formalize their relationship through
            this Partnership Deed and Service Agreement;
          </p>
          <p>
            <strong>NOW THEREFORE</strong>, in consideration of the mutual covenants
            contained herein, the Parties agree as follows:
          </p>
        </section>

        {/* Appointment */}
        <section className="mb-6">
          <h2 className="text-lg font-bold mb-2">3. Appointment and Grant of Access</h2>
          <p className="mb-2">
            <strong>3.1</strong> The Client hereby appoints TennaHub Technologies Limited as
            its exclusive IT oversight and service provider for the BizTrack school management
            platform, and TennaHub hereby accepts such appointment.
          </p>
          <p className="mb-2">
            <strong>3.2</strong> The Client grants TennaHub Technologies Limited full and
            unrestricted access to the institution's data, systems, records, and information
            as may be necessary for the provision of services under this Agreement. This
            includes but is not limited to:
          </p>
          <ul className="list-disc pl-8 mb-2 space-y-1">
            <li>Student records and academic data</li>
            <li>Staff and employee information</li>
            <li>Financial and fee records</li>
            <li>Examination results and report cards</li>
            <li>School timetable and curriculum data</li>
            <li>Communication and correspondence records</li>
            <li>Any other data required for system operation and maintenance</li>
          </ul>
          <p>
            <strong>3.3</strong> The Client acknowledges that TennaHub Technologies Limited
            shall act as the IT oversight authority for the institution's digital
            infrastructure, including system administration, data management, security
            oversight, and technical support.
          </p>
        </section>

        {/* Scope of Services */}
        <section className="mb-6">
          <h2 className="text-lg font-bold mb-2">4. Scope of Services</h2>
          <p className="mb-2">TennaHub Technologies Limited shall provide the following services:</p>
          <ol className="list-decimal pl-8 mb-2 space-y-1">
            <li>
              <strong>System Hosting & Maintenance:</strong> Hosting the BizTrack platform
              on secure servers with 99.5% uptime guarantee, including regular backups,
              updates, and security patches.
            </li>
            <li>
              <strong>Data Management:</strong> Secure storage, backup, and management of
              all institutional data entered into the system.
            </li>
            <li>
              <strong>Technical Support:</strong> Provision of technical support to the
              Client's authorized users during standard business hours.
            </li>
            <li>
              <strong>System Administration:</strong> User account management, role
              assignments, and system configuration.
            </li>
            <li>
              <strong>Security Oversight:</strong> Implementation and maintenance of
              security measures to protect the Client's data from unauthorized access,
              loss, or corruption.
            </li>
            <li>
              <strong>Training & Onboarding:</strong> Initial training for staff members
              designated as system administrators and ongoing capacity building.
            </li>
            <li>
              <strong>Feature Development:</strong> Continuous improvement of the platform
              with new features and modules as required by the Client.
            </li>
          </ol>
        </section>

        {/* Client Obligations */}
        <section className="mb-6">
          <h2 className="text-lg font-bold mb-2">5. Client Obligations</h2>
          <p className="mb-2">The Client shall:</p>
          <ol className="list-decimal pl-8 mb-2 space-y-1">
            <li>
              Provide accurate and complete data for digitization and system operation.
            </li>
            <li>
              Appoint at least two (2) staff members to serve as system administrators
              and points of contact.
            </li>
            <li>
              Ensure that all users comply with the system's terms of use and applicable
              data protection laws.
            </li>
            <li>
              Maintain adequate internet connectivity and ICT infrastructure to access
              and use the system.
            </li>
            <li>
              Pay all applicable service fees promptly and regularly as agreed.
            </li>
          </ol>
        </section>

        {/* Fees */}
        <section className="mb-6">
          <h2 className="text-lg font-bold mb-2">6. Service Fees</h2>
          <p className="mb-2">
            <strong>6.1</strong> The Client shall pay subscription fees as agreed in the
            Service Level Agreement between the Parties.
          </p>
          <p className="mb-2">
            <strong>6.2</strong> Fees are due monthly or annually as elected by the Client
            at the time of subscription.
          </p>
          <p className="mb-2">
            <strong>6.3</strong> Non-payment of fees may result in suspension of services
            after a fourteen (14) day grace period, during which the Client shall retain
            access to their data.
          </p>
        </section>

        {/* Data Protection */}
        <section className="mb-6">
          <h2 className="text-lg font-bold mb-2">7. Data Protection and Privacy</h2>
          <p className="mb-2">
            <strong>7.1</strong> The Service Provider shall implement appropriate technical
            and organizational measures to protect the Client's data in accordance with
            the Data Protection and Privacy Act of Uganda.
          </p>
          <p className="mb-2">
            <strong>7.2</strong> All data shall be encrypted in transit (TLS) and at rest.
            Regular backups shall be maintained and stored securely.
          </p>
          <p className="mb-2">
            <strong>7.3</strong> The Service Provider shall not share, sell, or otherwise
            disclose the Client's data to third parties without the Client's express
            written consent, except as required by law.
          </p>
          <p className="mb-2">
            <strong>7.4</strong> The Client retains full ownership and control over their
            data. Upon termination of this Agreement, the Client's data shall be exported
            and delivered in a commonly used format within thirty (30) days.
          </p>
        </section>

        {/* Term */}
        <section className="mb-6">
          <h2 className="text-lg font-bold mb-2">8. Term and Termination</h2>
          <p className="mb-2">
            <strong>8.1</strong> This Agreement shall commence on the date first written
            above and continue for an initial term of twelve (12) months, automatically
            renewing for successive periods unless terminated by either Party.
          </p>
          <p className="mb-2">
            <strong>8.2</strong> Either Party may terminate this Agreement by giving thirty
            (30) days' written notice to the other Party.
          </p>
          <p className="mb-2">
            <strong>8.3</strong> The Service Provider may terminate this Agreement
            immediately if the Client fails to pay fees when due and does not remedy such
            breach within fourteen (14) days of written notice.
          </p>
          <p className="mb-2">
            <strong>8.4</strong> Upon termination, the Service Provider shall provide the
            Client with a full export of their data in a standard format within thirty (30)
            days.
          </p>
        </section>

        {/* Liability */}
        <section className="mb-6">
          <h2 className="text-lg font-bold mb-2">9. Limitation of Liability</h2>
          <p className="mb-2">
            <strong>9.1</strong> The Service Provider's liability under this Agreement shall
            be limited to the total fees paid by the Client in the twelve (12) months
            preceding the claim.
          </p>
          <p className="mb-2">
            <strong>9.2</strong> The Service Provider shall not be liable for any indirect,
            incidental, special, or consequential damages arising from the use or inability
            to use the Services.
          </p>
          <p className="mb-2">
            <strong>9.3</strong> The Service Provider shall not be liable for service
            interruptions caused by factors beyond its reasonable control, including but
            not limited to acts of God, internet outages, power failures, or third-party
            service disruptions.
          </p>
        </section>

        {/* Confidentiality */}
        <section className="mb-6">
          <h2 className="text-lg font-bold mb-2">10. Confidentiality</h2>
          <p className="mb-2">
            Both Parties undertake to keep confidential all information obtained from the
            other Party in connection with this Agreement and shall not disclose such
            information to any third party without prior written consent, except where
            required by law.
          </p>
        </section>

        {/* Governing Law */}
        <section className="mb-6">
          <h2 className="text-lg font-bold mb-2">11. Governing Law</h2>
          <p>
            This Agreement shall be governed by and construed in accordance with the laws
            of the Republic of Uganda. Any disputes arising under this Agreement shall be
            subject to the exclusive jurisdiction of the courts of Uganda.
          </p>
        </section>

        {/* Signatures */}
        <section className="mt-10 pt-6 border-t-2 border-black">
          <h2 className="text-lg font-bold mb-6 text-center">12. Signatures</h2>
          <p className="text-sm italic mb-6 text-center">
            IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date
            first written above.
          </p>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold mb-4">For TennaHub Technologies Limited</h3>
              <div className="space-y-6">
                <div>
                  <p className="font-medium">Signature: ___________________________</p>
                </div>
                <div>
                  <p className="font-medium">Name: _______________________________</p>
                </div>
                <div>
                  <p className="font-medium">Title: _______________________________</p>
                </div>
                <div>
                  <p className="font-medium">Date: _______________________________</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-4">For {schoolName}</h3>
              <div className="space-y-6">
                <div>
                  <p className="font-medium">Signature: ___________________________</p>
                </div>
                <div>
                  <p className="font-medium">Name: _______________________________</p>
                </div>
                <div>
                  <p className="font-medium">Title: _______________________________</p>
                </div>
                <div>
                  <p className="font-medium">Date: _______________________________</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
          <p>
            BizTrack Platform | Business Code: {businessCode} | {schoolName}
          </p>
          <p>Generated on {date} via TennaHub Technologies Limited</p>
        </div>
      </div>
    );
  }
);

PartnershipDeed.displayName = "PartnershipDeed";
