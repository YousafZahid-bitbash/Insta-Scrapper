import * as React from 'react';

interface BanUnbanEmailTemplateProps {
  username: string;
  isBanned: boolean;
  actionDate: string;
  supportEmail: string;
}

export function BanUnbanEmailTemplate({ username, isBanned, actionDate, supportEmail }: BanUnbanEmailTemplateProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#222' }}>
      <h1 style={{ color: isBanned ? '#d32f2f' : '#388e3c' }}>
        {isBanned ? 'Account Suspended' : 'Account Reactivated'}
      </h1>
      <p>Hi <b>{username}</b>,</p>
      {isBanned ? (
        <>
          <p>Your Scrapper Glass account has been <b>suspended</b> as of <b>{actionDate}</b>.</p>
          <p>If you believe this was a mistake or need more information, please contact our support team.</p>
        </>
      ) : (
        <>
          <p>Your Scrapper Glass account has been <b>re-activated</b> as of <b>{actionDate}</b>.</p>
          <p>You can now log in and continue using our services.</p>
        </>
      )}
      <p style={{ marginTop: 24 }}>If you have any questions, reach out to <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
      <p style={{ fontSize: 12, color: '#888', marginTop: 32 }}>Thank you,<br/>The Scrapper Glass Team</p>
    </div>
  );
}
