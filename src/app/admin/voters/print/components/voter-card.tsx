'use client';
import type { Voter } from '@/lib/types';
import type { Election } from '@/lib/types';

interface VoterCardProps {
  voter: Voter & { followedElections?: Election[] };
}

const formatBirthDate = (dateString?: string): string => {
  if (!dateString || dateString.trim() === '') return '-';
  try {
    // Try to handle various formats by replacing separators with a standard one.
    const sanitizedDate = dateString.replace(/[.\/]/g, '-');
    const parts = sanitizedDate.split('-');

    let date;
    // Guess format based on parts
    if (parts.length === 3) {
      if (parts[0].length === 4) { // YYYY-MM-DD
        date = new Date(`${parts[0]}-${parts[1]}-${parts[2]}T00:00:00Z`);
      } else if (parts[2].length === 4) { // DD-MM-YYYY or MM-DD-YYYY
         // Assuming DD-MM-YYYY as it's a common local format
        date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
      }
    }
    
    // If parsing is still weird, try the native parser as a last resort
    if (!date || isNaN(date.getTime())) {
        date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) {
      // If it's still not a valid date, return original string
      return dateString;
    }

    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
  } catch (error) {
    // If any error occurs, return the original string.
    return dateString;
  }
};


export function VoterCard({ voter }: VoterCardProps) {
  return (
    <div
      style={{
        border: '1px solid black',
        padding: '8px',
        borderRadius: '4px',
        fontFamily: 'sans-serif',
        height: '6.6cm',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        pageBreakInside: 'avoid',
        backgroundColor: 'white',
        fontSize: '8px', // Reduced base font size
      }}
    >
      <div>
        <div style={{ borderBottom: '1px solid #ccc', paddingBottom: '6px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '10px', fontWeight: 'bold', margin: 0 }}>Kartu Login Pemilih</h2>
        </div>
        <div style={{ marginTop: '8px' }}>
          <p style={{ margin: '0 0 2px 0', fontSize: '8px', color: '#333' }}>Nama Pemilih:</p>
          <p style={{ margin: 0, fontSize: '9px', fontWeight: '600', wordBreak: 'break-word' }}>{voter.name}</p>
        </div>
        <div style={{ marginTop: '4px' }}>
          <p style={{ margin: '0 0 2px 0', fontSize: '8px', color: '#333' }}>NIK:</p>
          <p style={{ margin: 0, fontSize: '9px', fontWeight: '600', wordBreak: 'break-word' }}>{voter.nik || '-'}</p>
        </div>
        <div style={{ marginTop: '4px' }}>
          <p style={{ margin: '0 0 2px 0', fontSize: '8px', color: '#333' }}>Tanggal Lahir:</p>
          <p style={{ margin: 0, fontSize: '9px', fontWeight: '600', wordBreak: 'break-word' }}>{formatBirthDate(voter.birthDate)}</p>
        </div>
         <div style={{ marginTop: '8px' }}>
          <p style={{ margin: '0 0 2px 0', fontSize: '8px', color: '#333' }}>Pemilihan yang Diikuti:</p>
          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '8px', listStyle: 'disc' }}>
            {voter.followedElections && voter.followedElections.length > 0 ? (
                voter.followedElections?.map(election => (
                    <li key={election.id} style={{ marginBottom: '2px' }}>{election.name}</li>
                ))
            ) : (
                <li>(Tidak ada pemilihan yang diikuti)</li>
            )}
          </ul>
        </div>
      </div>
      
      <div style={{ backgroundColor: '#f3f4f6', padding: '8px', borderRadius: '2px', textAlign: 'center', marginTop: '8px' }}>
        <p style={{ margin: '0 0 4px 0', fontSize: '8px', color: '#333' }}>Gunakan kredensial berikut untuk login:</p>
        <div style={{ marginTop: '4px' }}>
          <p style={{ margin: 0 }}>
            <span style={{ fontWeight: '600' }}>ID Pemilih:</span> 
            <span style={{ fontFamily: 'monospace', fontSize: '9px', marginLeft: '4px' }}>{voter.id}</span>
          </p>
          <p style={{ margin: '2px 0 0 0' }}>
            <span style={{ fontWeight: '600' }}>Password:</span> 
            <span style={{ fontFamily: 'monospace', fontSize: '9px', marginLeft: '4px' }}>{voter.password}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
