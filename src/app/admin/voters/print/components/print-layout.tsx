'use client';
import React from 'react';
import type { Voter } from '@/lib/types';
import { VoterCard } from './voter-card';

interface PrintLayoutProps {
  voters: Voter[];
}

export const PrintLayout = React.forwardRef<HTMLDivElement, PrintLayoutProps>(
  ({ voters }, ref) => {
    return (
      <div ref={ref} className="p-4">
        <style>
          {`
            @page {
              size: A4;
              margin: 1cm;
            }
            @media print {
              body {
                background-color: #fff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              * {
                box-shadow: none !important;
                text-shadow: none !important;
              }
            }
          `}
        </style>
        <div className="grid grid-cols-4 gap-2">
          {voters.map((voter) => (
            <VoterCard key={voter.id} voter={voter} />
          ))}
        </div>
      </div>
    );
  }
);

PrintLayout.displayName = 'PrintLayout';
