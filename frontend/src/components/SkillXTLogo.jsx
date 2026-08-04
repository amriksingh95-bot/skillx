import React from 'react';

export default function SkillXTLogo({ size = 'md', iconOnly = false }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-20 h-20'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-5xl'
  };

  const icon = (
    <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <linearGradient id="xtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FB8C3A" />
          <stop offset="100%" stopColor="#F0553D" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="96" fill="#16305C" />
      <text
        x="256" y="300"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="800"
        fontSize="118"
        textAnchor="middle"
        letterSpacing="-2"
      >
        <tspan fill="#F3EEE2">Skill</tspan>
        <tspan fill="url(#xtGrad)">XT</tspan>
      </text>
    </svg>
  );

  if (iconOnly) {
    return <div className={`${sizeClasses[size]}`}>{icon}</div>;
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`${sizeClasses[size]} rounded-xl shadow-md flex items-center justify-center overflow-hidden`}>
        {icon}
      </div>
      <span className={`${textSizeClasses[size]} font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent`}>
        SkillXT
      </span>
    </div>
  );
}
