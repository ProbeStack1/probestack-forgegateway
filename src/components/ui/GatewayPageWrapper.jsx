import React, { useState } from 'react';
import Toast from './toast';

export default function GatewayPageWrapper({ component: Component, ...props }) {
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const showMessage = (text, type = 'success') => setToast({ message: text, type });

  return (
    <>
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'success' })}
        />
      )}
      <Component showMessage={showMessage} {...props} />
    </>
  );
}
