import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ShiftContext = createContext();

export const useShift = () => {
  const context = useContext(ShiftContext);
  if (!context) {
    throw new Error('useShift must be used within a ShiftProvider');
  }
  return context;
};

export const ShiftProvider = ({ children }) => {
  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [shiftStartTime, setShiftStartTime] = useState(null);

  // Check shift status from localStorage on mount
  useEffect(() => {
    const shiftStatus = localStorage.getItem('shiftStatus');
    const startTime = localStorage.getItem('shiftStartTime');
    
    if (shiftStatus === 'open' && startTime) {
      setIsShiftOpen(true);
      setShiftStartTime(new Date(startTime));
    }
  }, []);

  const openShift = useCallback(() => {
    const now = new Date();
    console.log("Opening shift at:", now); // Debug log
    setIsShiftOpen(true);
    setShiftStartTime(now);
    localStorage.setItem('shiftStatus', 'open');
    localStorage.setItem('shiftStartTime', now.toISOString());
  }, []);

  const closeShift = useCallback(() => {
    setIsShiftOpen(false);
    setShiftStartTime(null);
    localStorage.removeItem('shiftStatus');
    localStorage.removeItem('shiftStartTime');
  }, []);

  return (
    <ShiftContext.Provider 
      value={{ 
        isShiftOpen, 
        shiftStartTime, 
        openShift, 
        closeShift 
      }}
    >
      {children}
    </ShiftContext.Provider>
  );
};