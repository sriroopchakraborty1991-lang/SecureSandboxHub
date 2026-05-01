import React from 'react';

export default function AuthHeroArt() {
  return (
    <div className="auth-art" aria-hidden="true">
      <svg className="auth-artSvg" viewBox="0 0 900 650" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="a_mesh_1" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(180 140) rotate(45) scale(520 420)">
            <stop stopColor="#20E3D2" stopOpacity="0.65" />
            <stop offset="0.55" stopColor="#7C5CFF" stopOpacity="0.18" />
            <stop offset="1" stopColor="#050814" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="a_mesh_2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(720 460) rotate(25) scale(560 520)">
            <stop stopColor="#FFB020" stopOpacity="0.45" />
            <stop offset="0.6" stopColor="#7C5CFF" stopOpacity="0.14" />
            <stop offset="1" stopColor="#050814" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="a_line" x1="120" y1="80" x2="820" y2="560" gradientUnits="userSpaceOnUse">
            <stop stopColor="#20E3D2" stopOpacity="0.6" />
            <stop offset="0.45" stopColor="#7C5CFF" stopOpacity="0.52" />
            <stop offset="1" stopColor="#FFB020" stopOpacity="0.5" />
          </linearGradient>
          <filter id="a_glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6.5" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .35 0"
              result="glow"
            />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect className="auth-artMesh auth-artMeshA" x="0" y="0" width="900" height="650" fill="url(#a_mesh_1)" />
        <rect className="auth-artMesh auth-artMeshB" x="0" y="0" width="900" height="650" fill="url(#a_mesh_2)" />

        <g className="auth-artRing" opacity="0.8">
          <circle cx="520" cy="320" r="200" stroke="url(#a_line)" strokeOpacity="0.35" strokeWidth="1.2" />
          <circle cx="520" cy="320" r="140" stroke="url(#a_line)" strokeOpacity="0.18" strokeWidth="1.2" />
        </g>

        <g className="auth-artGraph" filter="url(#a_glow)">
          <path className="auth-artPath" d="M140 470C215 350 330 320 410 280C500 235 600 175 730 150" stroke="url(#a_line)" strokeWidth="2.2" strokeLinecap="round" />
          <path className="auth-artPath" d="M210 140C260 205 320 250 410 280C520 320 610 400 690 510" stroke="url(#a_line)" strokeOpacity="0.65" strokeWidth="2" strokeLinecap="round" />
          <path className="auth-artPath auth-artPathThin" d="M220 520C310 475 370 430 440 360C505 295 570 265 650 260" stroke="url(#a_line)" strokeOpacity="0.5" strokeWidth="1.6" strokeLinecap="round" />
          <path className="auth-artPath auth-artPathThin" d="M330 120C410 180 460 220 520 320C560 385 625 430 760 465" stroke="url(#a_line)" strokeOpacity="0.45" strokeWidth="1.6" strokeLinecap="round" />

          <g className="auth-artNodes">
            <circle className="auth-artNode auth-artNode1" cx="210" cy="140" r="7.5" fill="#20E3D2" />
            <circle className="auth-artNode auth-artNode2" cx="730" cy="150" r="8.5" fill="#7C5CFF" />
            <circle className="auth-artNode auth-artNode3" cx="520" cy="320" r="10.5" fill="#20E3D2" />
            <circle className="auth-artNode auth-artNode4" cx="140" cy="470" r="8" fill="#7C5CFF" />
            <circle className="auth-artNode auth-artNode5" cx="690" cy="510" r="9" fill="#FFB020" />
            <circle className="auth-artNode auth-artNode6" cx="650" cy="260" r="6.5" fill="#20E3D2" />
            <circle className="auth-artNode auth-artNodeAlert" cx="760" cy="465" r="8" fill="#FF5C7A" />
          </g>
        </g>

        <g className="auth-artOrbit">
          <circle cx="520" cy="320" r="4" fill="#20E3D2" />
        </g>
      </svg>
    </div>
  );
}

