import * as React from 'react';

interface UnbanNotificationTemplateProps {
  username: string;
  email: string;
  unbanDate: string;
  supportEmail?: string;
}

export function UnbanNotificationTemplate({ 
  username, 
  email, 
  unbanDate,
  supportEmail = "support@resend.dev" 
}: UnbanNotificationTemplateProps) {
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
            Account Status Update
          </p>
        </div>

        {/* Main Content */}
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{
            color: '#059669',
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            Account Reactivated
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
            We&apos;re pleased to inform you that your InstaScrapper account ({email}) has been reactivated as of {unbanDate}.
          </p>

          <p style={{
            color: '#374151',
            fontSize: '16px',
            lineHeight: '1.6',
            marginBottom: '15px'
          }}>
            You now have full access to your account and can resume using all InstaScrapper services.
          </p>

          <div style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h3 style={{
              color: '#059669',
              fontSize: '18px',
              fontWeight: 'bold',
              margin: '0 0 10px 0'
            }}>
              You can now:
            </h3>
            <ul style={{
              color: '#065f46',
              fontSize: '14px',
              lineHeight: '1.5',
              margin: '0',
              paddingLeft: '20px'
            }}>
              <li>Access your dashboard and account settings</li>
              <li>Perform data extractions and use all features</li>
              <li>View your extraction history and manage your data</li>
              <li>Purchase additional credits if needed</li>
            </ul>
          </div>

          <div style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fed7aa',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <h3 style={{
              color: '#d97706',
              fontSize: '16px',
              fontWeight: 'bold',
              margin: '0 0 8px 0'
            }}>
              Important Reminder
            </h3>
            <p style={{
              color: '#92400e',
              fontSize: '14px',
              lineHeight: '1.5',
              margin: '0'
            }}>
              Please ensure you follow our Terms of Service and Community Guidelines to maintain your account in good standing.
            </p>
          </div>

          <p style={{
            color: '#374151',
            fontSize: '16px',
            lineHeight: '1.6',
            marginBottom: '20px'
          }}>
            Thank you for your patience during the suspension period. We&apos;re glad to have you back!
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
            If you have any questions or need assistance getting started again, please contact our support team:
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
