import React, { useState } from 'react';
import { cn } from '../lib/utils';
import Toast from '../components/ui/toast';
import { DevelopersView } from './Gateway/DevelopersView';
import ApigeeMainPage from './Apigee/ApigeePage';

const TABS = [
  { label: 'App',        value: 'app'        },
  { label: 'Product',    value: 'product'    },
  { label: 'Developer',  value: 'developer'  },
  { label: 'Environment Config', value: 'env-config' },
];

export default function FsGatewayConfig() {
  const [activeTab, setActiveTab] = useState('app');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showMessage = (text, type = 'success') => setToast({ message: text, type });

  return (
    <div className="flex flex-col h-full">
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'success' })}
        />
      )}

      <div className="px-6 pt-6 pb-0">
        <h1 className="text-2xl font-bold text-white mb-1">Config</h1>
        <p className="text-sm text-gray-400 mb-4">
          Manage apps, products, developers and environment configuration.
        </p>

        {/* Tab bar — same style as ApigeeMainPage */}
        <div className="flex gap-6 border-b border-dark-700 pb-2">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'pb-2 text-sm font-medium capitalize',
                activeTab === tab.value
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-400 hover:text-white',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'app' && (
          <ApigeeMainPage showHeader={false} forceTab="App" overrideIsGatewayPage={false} />
        )}
        {activeTab === 'product' && (
          <ApigeeMainPage showHeader={false} forceTab="Product" overrideIsGatewayPage={false} />
        )}
        {activeTab === 'developer' && (
          <DevelopersView showMessage={showMessage} />
        )}
        {activeTab === 'env-config' && (
          <ApigeeMainPage showHeader={false} />
        )}
      </div>
    </div>
  );
}
