'use client';

import type { Radiogram } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

const precedenceConfig: Record<string, { label: string; className: string }> = {
  R: {
    label: 'Rotina',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50',
  },
  W: {
    label: 'Bem-estar',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50',
  },
  P: {
    label: 'Prioridade',
    className: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800/50',
  },
  EMERGENCY: {
    label: 'Emergência',
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50',
  },
};

export function RadiogramDisplay({ radiogram }: { radiogram: Radiogram }) {
  const prec = precedenceConfig[radiogram.preamble.precedence] || precedenceConfig.R;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-border bg-muted/30">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Radiograma ARRL
        </span>
        <Badge variant="outline" className={`text-[11px] font-semibold ${prec.className}`}>
          {prec.label}
        </Badge>
      </div>

      {/* Preâmbulo */}
      <div className="px-5 py-4 border-b border-border">
        <SectionLabel>1. Preâmbulo</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 mt-2">
          <Field label="NR" value={String(radiogram.preamble.number)} />
          <Field label="Precedência" value={radiogram.preamble.precedence} />
          <Field label="HX" value={radiogram.preamble.hx || '—'} />
          <Field label="Estação" value={radiogram.preamble.stationOfOrigin} mono />
          <Field label="Check" value={String(radiogram.preamble.check)} />
          <Field label="Origem" value={radiogram.preamble.placeOfOrigin} />
          <Field label="Hora" value={radiogram.preamble.timeField} mono />
          <Field label="Data" value={radiogram.preamble.date} />
        </div>
      </div>

      {/* Endereço */}
      <div className="px-5 py-4 border-b border-border">
        <SectionLabel>2. Endereço</SectionLabel>
        <div className="mt-2 text-sm text-foreground leading-relaxed space-y-0.5">
          <p className="font-medium">{radiogram.address.name}</p>
          <p className="text-muted-foreground">{radiogram.address.street}</p>
          <p className="text-muted-foreground">
            {radiogram.address.city} {radiogram.address.state} {radiogram.address.zip}
          </p>
          {radiogram.address.phone && (
            <p className="text-muted-foreground text-xs">{radiogram.address.phone}</p>
          )}
        </div>
      </div>

      {/* Texto */}
      <div className="px-5 py-4 border-b border-border">
        <SectionLabel>3. Texto</SectionLabel>
        <div className="mt-2 font-mono text-sm font-medium text-foreground leading-relaxed bg-muted/40 rounded-md px-4 py-3 border border-border">
          {radiogram.text}
        </div>
      </div>

      {/* Assinatura */}
      <div className="px-5 py-4">
        <SectionLabel>4. Assinatura</SectionLabel>
        <p className="mt-1.5 text-sm text-foreground">{radiogram.signature}</p>
      </div>

      {/* Cenário */}
      {radiogram.scenario && (
        <div className="px-5 py-3 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Cenário:</span>{' '}
            <span className="italic">{radiogram.scenario}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={`text-sm font-medium text-foreground ${mono ? 'font-mono' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
