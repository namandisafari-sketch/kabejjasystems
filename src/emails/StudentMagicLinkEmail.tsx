import React from 'react';

interface StudentMagicLinkEmailProps {
  studentName: string;
  schoolName: string;
  magicLinkUrl: string;
  expiresInMinutes?: number;
}

export const StudentMagicLinkEmail: React.FC<StudentMagicLinkEmailProps> = ({
  studentName,
  schoolName,
  magicLinkUrl,
  expiresInMinutes = 24 * 60,
}) => (
  <div style={{
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '600px',
    margin: '0 auto',
    padding: '0',
    backgroundColor: '#f9fafb',
  }}>
    {/* Header */}
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
      textAlign: 'center',
      color: 'white',
    }}>
      <h1 style={{
        margin: '0',
        fontSize: '28px',
        fontWeight: 'bold',
      }}>
        TennaHub Student Portal
      </h1>
      <p style={{
        margin: '8px 0 0 0',
        fontSize: '14px',
        opacity: 0.9,
      }}>
        {schoolName}
      </p>
    </div>

    {/* Content */}
    <div style={{
      padding: '40px 30px',
      backgroundColor: 'white',
      borderRadius: '0 0 12px 12px',
    }}>
      <p style={{
        margin: '0 0 20px 0',
        fontSize: '16px',
        color: '#1f2937',
      }}>
        Hi <strong>{studentName}</strong>,
      </p>

      <p style={{
        margin: '0 0 20px 0',
        fontSize: '14px',
        color: '#4b5563',
        lineHeight: '1.6',
      }}>
        Your secure login link is ready! Click the button below to access your student portal.
      </p>

      {/* CTA Button */}
      <div style={{ margin: '30px 0', textAlign: 'center' }}>
        <a
          href={magicLinkUrl}
          style={{
            display: 'inline-block',
            padding: '14px 32px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            transition: 'opacity 0.2s',
          }}
        >
          Secure Login
        </a>
      </div>

      <p style={{
        margin: '20px 0 0 0',
        fontSize: '12px',
        color: '#9ca3af',
        textAlign: 'center',
      }}>
        Or copy and paste this link in your browser:
      </p>

      <div style={{
        margin: '12px 0 20px 0',
        padding: '12px',
        backgroundColor: '#f3f4f6',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#6b7280',
        wordBreak: 'break-all',
        fontFamily: 'monospace',
      }}>
        {magicLinkUrl}
      </div>

      {/* Security Notice */}
      <div style={{
        margin: '24px 0 0 0',
        padding: '16px',
        backgroundColor: '#fef3c7',
        borderRadius: '6px',
        borderLeft: '4px solid #f59e0b',
      }}>
        <p style={{
          margin: '0',
          fontSize: '12px',
          color: '#92400e',
        }}>
          <strong>Security Note:</strong> This link expires in {expiresInMinutes} minutes. 
          Never share this link with anyone. TennaHub will never ask for your password via email.
        </p>
      </div>

      {/* Footer */}
      <div style={{
        margin: '32px 0 0 0',
        paddingTop: '20px',
        borderTop: '1px solid #e5e7eb',
        fontSize: '12px',
        color: '#9ca3af',
        textAlign: 'center',
      }}>
        <p style={{ margin: '0 0 8px 0' }}>
          Questions? Contact your school administrator
        </p>
        <p style={{ margin: '0' }}>
          © 2026 TennaHub. All rights reserved.
        </p>
      </div>
    </div>
  </div>
);

export default StudentMagicLinkEmail;
