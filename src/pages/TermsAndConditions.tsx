import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/business">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl text-center">Terms of Service</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[70vh] pr-4">
              <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
                <p className="text-muted-foreground">
                  Thank you for selecting the services offered by Kabejja BizTrack ("KABEJJA"). Review the terms of service thoroughly. This agreement is a legal agreement between your institution and Kabejja. By using our services you accept these terms. If you do not agree to these terms then you may not use the Services. This agreement works together with our Privacy Policy.
                </p>

                <section>
                  <h2 className="text-xl font-semibold mt-6 mb-3">1. General</h2>
                  <p>
                    This Agreement represents a Service Level Agreement ("SLA" or "Agreement") between KABEJJA and the Institution for the provision of IT services required to support and sustain the school/business information management platform ("BizTrack" or the System).
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mt-6 mb-3">2. Goals and Objectives</h2>
                  <p>
                    The purpose of this Agreement is to ensure that proper elements and commitments are in place to provide consistent System service support and delivery to the Institution by KABEJJA.
                  </p>
                  <p className="mt-2">
                    The goal of this Agreement is to obtain a mutual agreement for the Service provision between KABEJJA and the Institution.
                  </p>
                  <p className="mt-2">The objectives of this Agreement are to:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Provide clear reference to service ownership, accountability, roles and/or responsibilities.</li>
                    <li>Present a clear, concise and measurable description of service provision to the customer.</li>
                    <li>Match perceptions of expected service provision with actual service support & delivery.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mt-6 mb-3">3. Stakeholders</h2>
                  <p>The following Service Provider, Customer, and Regulator will be used as the basis of the Agreement:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Kabejja BizTrack ("Service Provider")</li>
                    <li>The Institution ("Client")</li>
                    <li>Ministry of Education & Sports ("Regulator") - for educational institutions</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mt-6 mb-3">4. Agreement Review</h2>
                  <p>We may revise these terms from time to time to better reflect:</p>
                  <ol className="list-decimal pl-6 mt-2 space-y-1">
                    <li>Change in the law</li>
                    <li>New regulatory requirements</li>
                    <li>Improvements or enhancements made to our Services</li>
                  </ol>
                  <p className="mt-3">
                    If an update affects your use of the Services or your legal rights as a user of our Services, we will notify you prior to the update's effective date via an in-product notification. These updated terms will be effective no less than 30 days from when we notify you.
                  </p>
                  <p className="mt-2">
                    If you don't agree to the updates we make, please notify us to suspend your account before they become effective. By continuing to use or access the Services after the updates come into effect, you agree to be bound by the revised Terms.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mt-6 mb-3">5. Intellectual Property</h2>
                  <p>
                    The BizTrack platform and its websites, including company websites in their entirety including the websites' content, are governed by Uganda and international laws regarding copyrights, patents, trademarks, trade secrets, and other intellectual property or proprietary rights.
                  </p>
                  <p className="mt-2">
                    You are permitted to use the platforms and the Services only for legitimate business purposes related to your role as a current or prospective customer of KABEJJA.
                  </p>
                  <p className="mt-2">
                    You shall not copy, modify, create derivative works of, publicly display or perform, republish, download or store, or transmit any company's content without KABEJJA's express prior written consent except as expressly provided in these Terms of Use.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mt-6 mb-3">6. Roles and Responsibilities</h2>
                  
                  <h3 className="text-lg font-medium mt-4 mb-2">The Institution shall:</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Ensure correct digitization and accurate storage of records</li>
                    <li>Ensure the information is kept private by managing user accounts subjected to rules and regulations of the institution and Kabejja's privacy policy</li>
                    <li>Ensure continuous internet access and uninterrupted usage of the system</li>
                    <li>Ensure that the ICT infrastructure needed to use the system is acquired and adequately maintained</li>
                  </ul>

                  <h3 className="text-lg font-medium mt-4 mb-2">KABEJJA shall:</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Ensure that the users have access to the Services all the time</li>
                    <li>Develop, maintain and upgrade the Services with new features as required by clients</li>
                    <li>Maintain the system data centres and ensure the Service security and client data are not compromised both in storage and Internet transit</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mt-6 mb-3">7. Service Management</h2>
                  <p>Adequate support of the Services is a result of maintaining consistent service levels.</p>
                  
                  <h3 className="text-lg font-medium mt-4 mb-2">Institution Requirements:</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Payment of all the Service costs at the agreed intervals</li>
                    <li>The institution shall avail at least two (2) staff members working as System administrators</li>
                    <li>Reasonable customer representative(s) availability when resolving a service-related incident or request</li>
                  </ul>

                  <h3 className="text-lg font-medium mt-4 mb-2">KABEJJA Requirements:</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Meeting response times associated with service-related incidents</li>
                    <li>Appropriate notification to the Institution for all scheduled maintenance</li>
                  </ul>

                  <h3 className="text-lg font-medium mt-4 mb-2">Service Availability:</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Availability of at least 95% in a year</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mt-6 mb-3">8. Service Fees</h2>
                  <p>Service fees categories:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li><strong>Subscription fee</strong> - this is a regular fee paid by an institution to use basic information management services on the BizTrack platform. It is paid monthly or annually.</li>
                    <li><strong>Premium fees</strong> - these are charges for premium services such as bulk SMS services, advanced reporting, and integrations.</li>
                    <li><strong>On-demand fees</strong> - these are paid for additional services or features requested by the institution.</li>
                  </ul>
                  <p className="mt-3">
                    The institution shall pay subscription fees promptly and regularly to avoid service interruptions.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mt-6 mb-3">9. Termination of Service</h2>
                  <p>
                    In circumstances where the Institution fails to pay subscription fees, KABEJJA shall suspend the Services. However, the institution shall continue accessing all the data and information already stored on the system for a grace period of 30 days.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mt-6 mb-3">10. Data Protection</h2>
                  <p>
                    KABEJJA is committed to protecting your data in accordance with applicable data protection laws. We implement appropriate technical and organizational measures to ensure data security.
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>All data is encrypted in transit and at rest</li>
                    <li>Regular backups are maintained</li>
                    <li>Access controls are strictly enforced</li>
                    <li>Data is never shared with third parties without consent</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mt-6 mb-3">11. Contact Information</h2>
                  <p>For any questions regarding these terms, please contact us:</p>
                  <ul className="list-none mt-2 space-y-1">
                    <li><strong>Email:</strong> support@kabejja.com</li>
                    <li><strong>Phone:</strong> +256 700 000 000</li>
                  </ul>
                </section>

                <div className="border-t pt-4 mt-8">
                  <p className="text-sm text-muted-foreground text-center">
                    Last updated: January 2026
                  </p>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
