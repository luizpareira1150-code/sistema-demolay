import React, { createContext, useContext, useState } from 'react';
import { ManagementTerm } from '../types';
import { getActiveManagementTerm, saveActiveManagementTerm } from '../utils/storage';

interface ManagementTermContextType {
  activeTerm: ManagementTerm | null;
  setActiveTerm: (term: ManagementTerm | null) => void;
  clearTerm: () => void;
}

const ManagementTermContext = createContext<ManagementTermContextType | undefined>(undefined);

export const ManagementTermProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTerm, setActiveTermState] = useState<ManagementTerm | null>(() => getActiveManagementTerm());

  const setActiveTerm = (term: ManagementTerm | null) => {
    setActiveTermState(term);
    saveActiveManagementTerm(term);
  };

  const clearTerm = () => {
    setActiveTermState(null);
    saveActiveManagementTerm(null);
  };

  return (
    <ManagementTermContext.Provider value={{ activeTerm, setActiveTerm, clearTerm }}>
      {children}
    </ManagementTermContext.Provider>
  );
};

export const useManagementTerm = () => {
  const context = useContext(ManagementTermContext);
  if (!context) {
    throw new Error('useManagementTerm deve ser utilizado dentro de ManagementTermProvider');
  }
  return context;
};
