'use client';
import type { Voter } from '@/lib/types';
import Image from 'next/image';

interface VoterCardProps {
  voter: Voter;
  electionNames: string[];
}

export const VoterCard: React.FC<VoterCardProps> = ({ voter, electionNames }) => {
  return (
    <div className="card-wrapper bg-white text-black border border-gray-400 rounded-lg p-2 flex flex-col gap-2 text-[9px] leading-tight break-inside-avoid shadow-none w-[63mm]">
        <div className="flex items-center gap-2 border-b border-gray-400 pb-1 mb-1">
            <Image src="/logo-votesync.png" alt="VoteSync Logo" width={24} height={24} className="h-6 w-6" />
            <h1 className="font-bold text-[11px] uppercase tracking-wider">Kartu Login Pemilih</h1>
        </div>
      
        <div className="flex-grow space-y-1">
            <div className="grid grid-cols-[55px_auto_1fr] items-start">
                <span className="font-medium">Nama</span>
                <span className="mx-1">:</span>
                <span className="font-bold break-words">{voter.name}</span>
            </div>
            <div className="grid grid-cols-[55px_auto_1fr] items-start">
                <span className="font-medium">ID Pemilih</span>
                <span className="mx-1">:</span>
                <span className="font-bold font-mono break-words">{voter.id}</span>
            </div>
             <div className="grid grid-cols-[55px_auto_1fr] items-start">
                <span className="font-medium">Password</span>
                <span className="mx-1">:</span>
                <span className="font-bold font-mono break-words">{voter.password}</span>
            </div>
             <div className="grid grid-cols-[55px_auto_1fr] items-start">
                <span className="font-medium">Pemilihan</span>
                <span className="mx-1">:</span>
                <span className="font-bold break-words">
                    {electionNames.length > 0 ? electionNames.join(', ') : '-'}
                </span>
            </div>
        </div>

       <p className="text-center text-[7px] mt-2 italic border-t border-gray-300 pt-1">
        Gunakan untuk login pada saat pemilihan berlangsung.
      </p>
    </div>
  );
};
