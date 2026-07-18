// src/hooks/useOnboardingData.js
import { useState, useEffect } from 'react';

export const useOnboardingData = () => {
  const [onboardingId, setOnboardingId] = useState(null);
  const [onboardingData, setOnboardingData] = useState(null);
  const [connectorId, setConnectorId] = useState(null);
  const [consumerIds, setConsumerIds] = useState([]);
  const [requirements, setRequirements] = useState(null);
  const [designData, setDesignData] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load all onboarding data from localStorage
    const storedId = localStorage.getItem('probeStack_onboardingId');
    const storedData = localStorage.getItem('probeStack_onboardingData');
    const storedConnectorId = localStorage.getItem('probeStack_connectorId');
    const storedConsumerIds = localStorage.getItem('probeStack_onboardingConsumerIds');
    const storedRequirements = localStorage.getItem('probeStack_onboardingRequirements');
    const storedDesignData = localStorage.getItem('probeStack_onboardingDesignData');

    if (storedId) setOnboardingId(storedId);
    if (storedData) setOnboardingData(JSON.parse(storedData));
    if (storedConnectorId) setConnectorId(storedConnectorId);
    if (storedConsumerIds) setConsumerIds(JSON.parse(storedConsumerIds));
    if (storedRequirements) setRequirements(JSON.parse(storedRequirements));
    if (storedDesignData) setDesignData(JSON.parse(storedDesignData));
    
    setIsLoaded(true);
  }, []);

  const clearOnboardingData = () => {
    localStorage.removeItem('probeStack_onboardingId');
    localStorage.removeItem('probeStack_onboardingData');
    localStorage.removeItem('probeStack_connectorId');
    localStorage.removeItem('probeStack_onboardingConsumerIds');
    localStorage.removeItem('probeStack_onboardingRequirements');
    localStorage.removeItem('probeStack_onboardingDesignData');
    setOnboardingId(null);
    setOnboardingData(null);
    setConnectorId(null);
    setConsumerIds([]);
    setRequirements(null);
    setDesignData(null);
  };

  return {
    onboardingId,
    onboardingData,
    connectorId,
    consumerIds,
    requirements,
    designData,
    isLoaded,
    clearOnboardingData,
    hasOnboarding: !!onboardingId && !!onboardingData
  };
};