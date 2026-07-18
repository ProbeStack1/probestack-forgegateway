import { createContext, useContext, useState } from 'react';

const LayoutContext = createContext({ hideNav: false, setHideNav: () => {} });

export function LayoutProvider({ children }) {
  const [hideNav, setHideNav] = useState(false);
  return (
    <LayoutContext.Provider value={{ hideNav, setHideNav }}>
      {children}
    </LayoutContext.Provider>
  );
}

export const useLayout = () => useContext(LayoutContext);
