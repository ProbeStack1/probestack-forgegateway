import React from 'react';
import { Card, CardTitle } from '../../../components/ui/card';
import EnterpriseOptionCard from './EnterpriseOptionCard';
import {
  API_DEVELOPMENT_PERSISTENCE_OPTIONS,
  API_DEVELOPMENT_RESILIENCY_OPTIONS,
} from '../apiDevelopmentOptions';

const cardStyle = { backgroundColor: 'rgb(22 27 48 / var(--tw-bg-opacity, 1))' };

export default function ApiDevelopmentGenerationOptions({
  apiDevPersistenceTarget,
  setApiDevPersistenceTarget,
  sections = ['persistence', 'resiliency'],
}) {
  const showPersistence = sections.includes('persistence');
  const showResiliency = sections.includes('resiliency');

  return (
    <>
      {showPersistence && (
      <Card className="p-4" style={cardStyle}>
        <CardTitle className="mb-2">Persistence</CardTitle>
        <p className="mb-3 text-xs text-gray-400">Generate data access layer, repository implementation, and schema assets.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {API_DEVELOPMENT_PERSISTENCE_OPTIONS.map((option) => (
            <EnterpriseOptionCard
              key={option.value}
              name="apiDevelopmentPersistence"
              checked={apiDevPersistenceTarget === option.value}
              disabled={option.disabled}
              label={option.label}
              description={option.description}
              badge={option.badge}
              onChange={() => !option.disabled && setApiDevPersistenceTarget(option.value)}
            />
          ))}
        </div>
      </Card>
      )}

      {showResiliency && (
      <Card className="p-4" style={cardStyle}>
        <CardTitle className="mb-2">Resiliency</CardTitle>
        <p className="mb-3 text-xs text-gray-400">Generate patterns that protect the service from downstream failures.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {API_DEVELOPMENT_RESILIENCY_OPTIONS.map((option) => (
            <EnterpriseOptionCard
              key={option.value}
              type="checkbox"
              checked={false}
              disabled
              label={option.label}
              description={option.description}
              badge={option.badge}
            />
          ))}
        </div>
      </Card>
      )}
    </>
  );
}
