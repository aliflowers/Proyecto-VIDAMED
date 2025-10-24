import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = 'h-10' }) => {
  return (
    <img src="/assets/vidamed_logo.png" alt="Laboratorio VidaMed Logo" className={`${className} w-auto`} />
  );
};

export default Logo;
