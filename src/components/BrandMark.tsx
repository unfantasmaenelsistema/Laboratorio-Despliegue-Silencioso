import React, { useState } from 'react';
import { Terminal } from 'lucide-react';

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg';
}

export const BrandMark: React.FC<BrandMarkProps> = ({ size = 'md' }) => {
  const [imgFailed, setImgFailed] = useState(false);

  const dims =
    size === 'sm'
      ? 'w-8 h-8'
      : size === 'lg'
      ? 'w-14 h-14'
      : 'w-10 h-10';

  const logoSrc = `${import.meta.env.BASE_URL}assets/aistudio/icono_81a3db5b.png`;

  if (imgFailed) {
    return (
      <div
        className={`${dims} rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 border border-slate-800`}
        aria-hidden="true"
      >
        <Terminal className="w-5 h-5 text-sky-400" />
      </div>
    );
  }

  return (
    <img
      src={logoSrc}
      alt="Logotipo de Un Fantasma en el Sistema"
      referrerPolicy="no-referrer"
      onError={() => setImgFailed(true)}
      className={`${dims} object-contain shrink-0 select-none`}
    />
  );
};
