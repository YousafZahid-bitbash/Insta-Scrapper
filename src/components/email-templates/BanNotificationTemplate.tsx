import * as React from 'react';

interface BanNotificationTemplateProps {
  username: string;
  email: string;
  banDate: string;
  supportEmail?: string;
}

export function BanNotificationTemplate({ 
  username, 
  email, 
  banDate,
  supportEmail = "yousaf.zahid@bitbash.dev" 
}: BanNotificationTemplateProps) {
  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      maxWidth: '600px', 
      margin: '0 auto', 
      padding: '20px',
      backgroundColor: '#f9f9f9'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '30px',
          paddingBottom: '20px',
          borderBottom: '2px solid #f0f0f0'
        }}>
          <h1 style={{
            color: '#1f2937',
            fontSize: '28px',
            fontWeight: 'bold',
            margin: '0 0 10px 0'
          }}>
            InstaScrapper
          </h1>
          <p style={{
            color: '#6b7280',
            fontSize: '16px',
            margin: '0'
          }}>
            Account Status Notification
          </p>
        </div>

        {/* Main Content */}
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{
            color: '#dc2626',
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            Account Suspended
          </h2>

          <p style={{
            color: '#374151',
            fontSize: '16px',
            lineHeight: '1.6',
            marginBottom: '15px'
          }}>
            Dear {username},
          </p>

          <p style={{
            color: '#374151',
            fontSize: '16px',
            lineHeight: '1.6',
            marginBottom: '15px'
          }}>
            We are writing to inform you that your InstaScrapper account ({email}) has been suspended effective {banDate}.
          </p>

          <p style={{
            color: '#374151',
            fontSize: '16px',
            lineHeight: '1.6',
            marginBottom: '15px'
          }}>
            This action was taken due to a violation of our Terms of Service or Community Guidelines. During this suspension period, you will not be able to access your account or use our services.
          </p>

          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h3 style={{
              color: '#dc2626',
              fontSize: '18px',
              fontWeight: 'bold',
              margin: '0 0 10px 0'
            }}>
              What this means:
            </h3>
            <ul style={{
              color: '#7f1d1d',
              fontSize: '14px',
              lineHeight: '1.5',
              margin: '0',
              paddingLeft: '20px'
            }}>
              <li>Your account access has been temporarily suspended</li>
              <li>You cannot perform any data extractions</li>
              <li>All ongoing processes have been halted</li>
              <li>Your data remains secure and will not be deleted</li>
            </ul>
          </div>

          <p style={{
            color: '#374151',
            fontSize: '16px',
            lineHeight: '1.6',
            marginBottom: '20px'
          }}>
            If you believe this suspension was made in error or would like to appeal this decision, please contact our support team with details about your account and the circumstances surrounding this action.
          </p>
        </div>

        {/* Support Section */}
        <div style={{
          backgroundColor: '#f3f4f6',
          padding: '20px',
          borderRadius: '6px',
          marginBottom: '20px'
        }}>
          <h3 style={{
            color: '#1f2937',
            fontSize: '18px',
            fontWeight: 'bold',
            margin: '0 0 10px 0'
          }}>
            Need Help?
          </h3>
          <p style={{
            color: '#4b5563',
            fontSize: '14px',
            lineHeight: '1.5',
            margin: '0 0 10px 0'
          }}>
            If you have questions about this suspension or need assistance, please reach out to our support team:
          </p>
          <p style={{
            color: '#1f2937',
            fontSize: '14px',
            fontWeight: 'bold',
            margin: '0'
          }}>
            📧 {supportEmail}
          </p>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          paddingTop: '20px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <p style={{
            color: '#6b7280',
            fontSize: '12px',
            lineHeight: '1.4',
            margin: '0'
          }}>
            This is an automated message from InstaScrapper. Please do not reply directly to this email.
            <br />
            © 2025 InstaScrapper. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
