/**
 * Logo component with mark and lockup variants
 * Uses inline SVG for no duplicated markup beyond necessity
 */

'use client';

import React from 'react';

interface LogoProps {
  variant: 'mark' | 'lockup';
  className?: string;
  'aria-label'?: string;
}

const markSvg = (
  <svg viewBox="0 0 320 380" role="img" aria-hidden="true" focusable="false">
    <defs>
      <clipPath id="archClip">
        <path d="M16 372V172C16 96 76 44 160 10C244 44 304 96 304 172V372Z" fill="none"/>
      </clipPath>
      <pattern id="warpPattern" x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
        <line x1="1" y1="0" x2="1" y2="3" stroke="#000000" strokeWidth="0.5" opacity="0.11"/>
      </pattern>
      <pattern id="weftPattern" x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
        <line x1="0" y1="1" x2="3" y2="1" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.14"/>
      </pattern>
      <pattern id="bandhaniPattern" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
        <circle cx="9" cy="3" r="1.5" fill="#FBF3E4"/>
        <circle cx="3" cy="9" r="1.5" fill="#FBF3E4"/>
        <circle cx="15" cy="9" r="1.5" fill="#FBF3E4"/>
        <circle cx="9" cy="15" r="1.5" fill="#FBF3E4"/>
        <circle cx="9" cy="9" r="1.5" fill="#FFB300"/>
      </pattern>
      <filter id="grainFilter" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" result="noise"/>
        <feBlend in="SourceGraphic" in2="noise" mode="multiply" result="grain"/>
      </filter>
    </defs>
    <path d="M16 372V172C16 96 76 44 160 10C244 44 304 96 304 172V372Z" fill="#D81B60" clipPath="url(#archClip)"/>
    <rect x="16" y="16" width="18" height="356" fill="#FF9933" clipPath="url(#archClip)"/>
    <rect x="34" y="16" width="8" height="356" fill="#FBF3E4" clipPath="url(#archClip)"/>
    <rect x="42" y="16" width="14" height="356" fill="#00838F" clipPath="url(#archClip)"/>
    <rect x="264" y="16" width="14" height="356" fill="#00838F" clipPath="url(#archClip)"/>
    <rect x="278" y="16" width="8" height="356" fill="#FBF3E4" clipPath="url(#archClip)"/>
    <rect x="286" y="16" width="18" height="356" fill="#FF9933" clipPath="url(#archClip)"/>
    <rect x="16" y="330" width="288" height="42" fill="#2E3A8C" clipPath="url(#archClip)"/>
    <rect x="16" y="330" width="288" height="42" fill="url(#bandhaniPattern)" clipPath="url(#archClip)"/>
    <circle cx="160" cy="52" r="12" fill="#FBF3E4" clipPath="url(#archClip)"/>
    <circle cx="160" cy="52" r="6.5" fill="#FFB300" clipPath="url(#archClip)"/>
    <path d="M70 330V190C70 138 108 100 160 76C212 100 250 138 250 190V330Z" fill="#FBF3E4" stroke="#FFB300" strokeWidth="10" clipPath="url(#archClip)"/>
    <path d="M82 322V192C82 148 114 114 160 92C206 114 238 148 238 192V322Z" fill="none" stroke="#D81B60" strokeWidth="2" strokeDasharray="6 4" clipPath="url(#archClip)"/>
    <text x="160" y="268" fontFamily="Fraunces, Georgia, serif" fontSize="170" fontWeight="700" fill="#5B1033" textAnchor="middle" dominantBaseline="central" clipPath="url(#archClip)">D</text>
    <rect x="16" y="16" width="288" height="356" fill="url(#warpPattern)" clipPath="url(#archClip)" filter="url(#grainFilter)"/>
    <rect x="16" y="16" width="288" height="356" fill="url(#weftPattern)" clipPath="url(#archClip)"/>
  </svg>
);

const lockupSvg = (
  <svg viewBox="0 0 640 200" role="img" aria-hidden="true" focusable="false">
    <defs>
      <clipPath id="archClip">
        <path d="M16 372V172C16 96 76 44 160 10C244 44 304 96 304 172V372Z" fill="none"/>
      </clipPath>
      <pattern id="warpPattern" x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
        <line x1="1" y1="0" x2="1" y2="3" stroke="#000000" strokeWidth="0.5" opacity="0.11"/>
      </pattern>
      <pattern id="weftPattern" x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
        <line x1="0" y1="1" x2="3" y2="1" stroke="#FFFFFF" strokeWidth="0.5" opacity="0.14"/>
      </pattern>
      <pattern id="bandhaniPattern" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
        <circle cx="9" cy="3" r="1.5" fill="#FBF3E4"/>
        <circle cx="3" cy="9" r="1.5" fill="#FBF3E4"/>
        <circle cx="15" cy="9" r="1.5" fill="#FBF3E4"/>
        <circle cx="9" cy="15" r="1.5" fill="#FBF3E4"/>
        <circle cx="9" cy="9" r="1.5" fill="#FFB300"/>
      </pattern>
      <filter id="grainFilter" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" result="noise"/>
        <feBlend in="SourceGraphic" in2="noise" mode="multiply" result="grain"/>
      </filter>
    </defs>
    <g transform="translate(20, 10) scale(0.45)">
      <path d="M16 372V172C16 96 76 44 160 10C244 44 304 96 304 172V372Z" fill="#D81B60" clipPath="url(#archClip)"/>
      <rect x="16" y="16" width="18" height="356" fill="#FF9933" clipPath="url(#archClip)"/>
      <rect x="34" y="16" width="8" height="356" fill="#FBF3E4" clipPath="url(#archClip)"/>
      <rect x="42" y="16" width="14" height="356" fill="#00838F" clipPath="url(#archClip)"/>
      <rect x="264" y="16" width="14" height="356" fill="#00838F" clipPath="url(#archClip)"/>
      <rect x="278" y="16" width="8" height="356" fill="#FBF3E4" clipPath="url(#archClip)"/>
      <rect x="286" y="16" width="18" height="356" fill="#FF9933" clipPath="url(#archClip)"/>
      <rect x="16" y="330" width="288" height="42" fill="#2E3A8C" clipPath="url(#archClip)"/>
      <rect x="16" y="330" width="288" height="42" fill="url(#bandhaniPattern)" clipPath="url(#archClip)"/>
      <circle cx="160" cy="52" r="12" fill="#FBF3E4" clipPath="url(#archClip)"/>
      <circle cx="160" cy="52" r="6.5" fill="#FFB300" clipPath="url(#archClip)"/>
      <path d="M70 330V190C70 138 108 100 160 76C212 100 250 138 250 190V330Z" fill="#FBF3E4" stroke="#FFB300" strokeWidth="10" clipPath="url(#archClip)"/>
      <path d="M82 322V192C82 148 114 114 160 92C206 114 238 148 238 192V322Z" fill="none" stroke="#D81B60" strokeWidth="2" strokeDasharray="6 4" clipPath="url(#archClip)"/>
      <text x="160" y="268" fontFamily="Fraunces, Georgia, serif" fontSize="170" fontWeight="700" fill="#5B1033" textAnchor="middle" dominantBaseline="central" clipPath="url(#archClip)">D</text>
      <rect x="16" y="16" width="288" height="356" fill="url(#warpPattern)" clipPath="url(#archClip)" filter="url(#grainFilter)"/>
      <rect x="16" y="16" width="288" height="356" fill="url(#weftPattern)" clipPath="url(#archClip)"/>
    </g>
    <g transform="translate(180, 0)">
      <text x="0" y="70" fontFamily="Fraunces, Georgia, serif" fontSize="48" fontWeight="700" fill="#00606B" textAnchor="start">Dirghayu</text>
      <text x="0" y="125" fontFamily="'Noto Serif Devanagari', serif" fontSize="36" fontWeight="700" fill="#00606B" textAnchor="start">दीर्घायु</text>
      <g transform="translate(0, 140)">
        <rect x="0" y="0" width="40" height="4" fill="#FF9933"/>
        <rect x="40" y="0" width="40" height="4" fill="#D81B60"/>
        <rect x="80" y="0" width="40" height="4" fill="#00838F"/>
        <rect x="120" y="0" width="40" height="4" fill="#FFB300"/>
        <rect x="160" y="0" width="40" height="4" fill="#2E3A8C"/>
      </g>
      <text x="0" y="175" fontFamily="Fraunces, Georgia, serif" fontSize="18" fontWeight="400" fill="#00606B" textAnchor="start">Long life, on their own terms.</text>
    </g>
  </svg>
);

export function Logo({ variant, className = '', 'aria-label': ariaLabel }: LogoProps) {
  const defaultLabel = variant === 'mark' 
    ? 'Dirghayu logo mark: temple arch woven from Indian cloth with letter D'
    : 'Dirghayu: दीर्घायु - Long life, on their own terms';

  return (
    <span 
      className={`inline-block ${className}`}
      role="img"
      aria-label={ariaLabel ?? defaultLabel}
    >
      {variant === 'mark' ? markSvg : lockupSvg}
    </span>
  );
}

export default Logo;