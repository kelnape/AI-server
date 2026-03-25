// src/components/common/Overlay.jsx
import React from 'react';

export const Overlay = ({ onClick }) => (
  <div className="fixed inset-0 theme-input-bg z-40 backdrop-blur-sm" onClick={onClick}/>
);
