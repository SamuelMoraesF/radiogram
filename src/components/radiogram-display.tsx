'use client';

import type { Radiogram } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

const precedenceLabels: Record<string, { label: string; color: string }> = {
  R: { label: 'ROTINA', color: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50' },
  W: { label: 'BEM-ESTAR', color: 'bg-amber-900/40 text-amber-300 border-amber-700/50' },
  P: { label: 'PRIORIDADE', color: 'bg-orange-900/40 text-orange-300 border-orange-700/50' },
  EMERGENCY: { label: 'EMERGÊNCIA', color: 'bg-red-900/50 text-red-300 border-red-600/50' },
};

export function RadiogramDisplay({ radiogram }: { radiogram: Radiogram }) {
  const prec = precedenceLabels[radiogram.preamble.precedence] || precedenceLabels.R;

  return (
    <div className="font-mono text-sm space-y-0 border border-zinc-700/60 rounded-lg overflow-hidden bg-zinc-900/50 shadow-lg">
      {/* Header */}
      <div className="bg-zinc-800/80 px-4 py-2.5 flex items-center justify-between border-b border-zinc-700/60">
        <span className="text-xs tracking-[0.2em] uppercase text-zinc-400 font-semibold">
          Radiograma ARRL / USRA
        </span>
        <Badge variant="outline" className={`text-[11px] font-bold tracking-wider ${prec.color}`}>
          {prec.label}
        </Badge>
      </div>

      {/* 1. Preâmbulo */}
      <div className="px-4 py-3 border-b border-zinc-700/40">
        <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-2 font-semibold">
          1. Preâmbulo
        </div>
        <div className="grid grid-cols-4 gap-x-3 gap-y-1.5 text-xs">
          <Field label="NR" value={String(radiogram.preamble.number)} />
          <Field label="PREC" value={radiogram.preamble.precedence} />
          <Field label="HX" value={radiogram.preamble.hx || '—'} />
          <Field label="ESTAÇÃO" value={radiogram.preamble.stationOfOrigin} />
          <Field label="CHECK" value={String(radiogram.preamble.check)} />
          <Field label="ORIGEM" value={radiogram.preamble.placeOfOrigin} />
          <Field label="HORA" value={radiogram.preamble.timeField} />
          <Field label="DATA" value={radiogram.preamble.date} />
        </div>
      </div>

      {/* 2. Endereço */}
      <div className="px-4 py-3 border-b border-zinc-700/40">
        <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-1.5 font-semibold">
          2. Endereço
        </div>
        <div className="text-zinc-200 space-y-0.5 text-xs leading-relaxed">
          <div className="font-semibold">{radiogram.address.name}</div>
          <div>{radiogram.address.street}</div>
          <div>
            {radiogram.address.city} {radiogram.address.state} {radiogram.address.zip}
          </div>
          {radiogram.address.phone && (
            <div className="text-zinc-400">{radiogram.address.phone}</div>
          )}
        </div>
      </div>

      {/* 3. Texto */}
      <div className="px-4 py-3 border-b border-zinc-700/40">
        <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-1.5 font-semibold">
          3. Texto
        </div>
        <div className="text-zinc-100 font-semibold text-sm leading-relaxed tracking-wide bg-zinc-800/40 rounded px-3 py-2">
          {radiogram.text}
        </div>
      </div>

      {/* 4. Assinatura */}
      <div className="px-4 py-3">
        <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-1 font-semibold">
          4. Assinatura
        </div>
        <div className="text-zinc-200 text-xs">{radiogram.signature}</div>
      </div>

      {/* Cenário (se disponível) */}
      {radiogram.scenario && (
        <div className="px-4 py-2.5 bg-zinc-800/50 border-t border-zinc-700/40">
          <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-1 font-semibold">
            Cenário
          </div>
          <div className="text-zinc-400 text-xs italic">{radiogram.scenario}</div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-zinc-500 text-[10px]">{label}: </span>
      <span className="text-zinc-200 font-semibold">{value}</span>
    </div>
  );
}
