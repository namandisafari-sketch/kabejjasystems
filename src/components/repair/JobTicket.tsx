import { forwardRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";

interface JobTicketProps {
  job: {
    job_ref: string;
    device_type: string;
    device_model?: string;
    device_imei?: string;
    device_serial_number?: string;
    fault_description: string;
    created_at: string;
    due_date?: string;
    total_amount?: number;
    customers?: { name: string; phone: string } | null;
  };
  businessName: string;
  businessPhone?: string;
}

const JobTicket = forwardRef<HTMLDivElement, JobTicketProps>(({ job, businessName, businessPhone }, ref) => {
  const statusUrl = `${window.location.origin}/job-status?ref=${job.job_ref}`;

  return (
    <div ref={ref} className="bg-white text-black p-6 w-[300px] text-sm font-mono">
      {/* Header */}
      <div className="text-center border-b-2 border-dashed border-black pb-3 mb-3">
        <h1 className="text-lg font-bold uppercase">{businessName}</h1>
        {businessPhone && <p className="text-xs">{businessPhone}</p>}
        <p className="text-xs mt-1">REPAIR JOB TICKET</p>
      </div>

      {/* Job Reference */}
      <div className="text-center mb-3">
        <p className="text-xs text-gray-600">Job Reference</p>
        <p className="text-2xl font-bold tracking-wider">{job.job_ref}</p>
        <p className="text-xs mt-1">{format(new Date(job.created_at), "dd MMM yyyy, HH:mm")}</p>
      </div>

      {/* Customer Info */}
      {job.customers && (
        <div className="border-t border-dashed border-gray-400 pt-2 mb-2">
          <p className="font-bold">{job.customers.name}</p>
          <p className="text-xs">{job.customers.phone}</p>
        </div>
      )}

      {/* Device Info */}
      <div className="border-t border-dashed border-gray-400 pt-2 mb-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Device:</span>
          <span className="font-bold">{job.device_type}</span>
        </div>
        {job.device_model && (
          <div className="flex justify-between">
            <span className="text-gray-600">Model:</span>
            <span>{job.device_model}</span>
          </div>
        )}
        {job.device_imei && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">IMEI:</span>
            <span>{job.device_imei}</span>
          </div>
        )}
        {job.device_serial_number && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">S/N:</span>
            <span>{job.device_serial_number}</span>
          </div>
        )}
      </div>

      {/* Fault */}
      <div className="border-t border-dashed border-gray-400 pt-2 mb-2">
        <p className="text-gray-600 text-xs">Fault Description:</p>
        <p className="text-xs">{job.fault_description}</p>
      </div>

      {/* Pricing */}
      {(job.total_amount ?? 0) > 0 && (
        <div className="border-t border-dashed border-gray-400 pt-2 mb-2">
          <div className="flex justify-between font-bold">
            <span>Estimated Cost:</span>
            <span>{job.total_amount?.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Due Date */}
      {job.due_date && (
        <div className="border-t border-dashed border-gray-400 pt-2 mb-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Expected Ready:</span>
            <span className="font-bold">{format(new Date(job.due_date), "dd MMM yyyy")}</span>
          </div>
        </div>
      )}

      {/* QR Code */}
      <div className="border-t-2 border-dashed border-black pt-3 flex flex-col items-center">
        <QRCodeSVG value={statusUrl} size={80} level="M" />
        <p className="text-xs text-center mt-2 text-gray-600">
          Scan to check status
        </p>
      </div>

      {/* Footer */}
      <div className="border-t border-dashed border-gray-400 mt-3 pt-2 text-center text-xs text-gray-600">
        <p>Keep this ticket safe.</p>
        <p>Required for pickup.</p>
      </div>
    </div>
  );
});

JobTicket.displayName = "JobTicket";

export default JobTicket;
