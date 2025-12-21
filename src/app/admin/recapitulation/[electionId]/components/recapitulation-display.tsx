'use client';

import type { Election, Category, CommitteeMember } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMemo, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { getRecapitulationStats, type RecapitulationStats } from '@/app/actions/recapitulation';
import { getCommitteesForElection } from '@/app/actions/committees';

type RecapitulationDisplayProps = {
    election: Election;
    categories: Category[];
};

const toWords = (num: number): string => {
    const ones = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];
    const teens = ['sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas', 'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas'];
    const tens = ['', '', 'dua puluh', 'tiga puluh', 'empat puluh', 'lima puluh', 'enam puluh', 'tujuh puluh', 'delapan puluh', 'sembilan puluh'];

    if (num === 0) return 'nol';

    let words = '';

    if (num >= 1000000000) {
        words += toWords(Math.floor(num / 1000000000)) + ' milyar ';
        num %= 1000000000;
    }

    if (num >= 1000000) {
        words += toWords(Math.floor(num / 1000000)) + ' juta ';
        num %= 1000000;
    }

    if (Math.floor(num / 1000) > 0) {
        if (Math.floor(num / 1000) === 1) {
            words += 'seribu ';
        } else {
            words += toWords(Math.floor(num / 1000)) + ' ribu ';
        }
        num %= 1000;
    }

    if (Math.floor(num / 100) > 0) {
        if (Math.floor(num / 100) === 1) {
            words += 'seratus ';
        } else {
            words += ones[Math.floor(num / 100)] + ' ratus ';
        }
        num %= 100;
    }

    if (num >= 10 && num < 20) {
        words += teens[num - 10] + ' ';
        num = 0;
    } else if (Math.floor(num / 10) > 0) {
        words += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
    }

    if (num > 0) {
        words += ones[num] + ' ';
    }

    return words.trim();
};


const formatDateToWords = (date: Date) => {
    const dayName = format(date, 'EEEE', { locale: localeID });
    const day = date.getDate();
    const monthName = format(date, 'MMMM', { locale: localeID });
    const year = date.getFullYear();

    const dayInWords = toWords(day);
    const yearInWords = toWords(year);

    return `Pada hari ini <b>${dayName}</b> tanggal <b>${dayInWords}</b> bulan <b>${monthName}</b> tahun <b>${yearInWords}</b>`;
};


export function RecapitulationDisplay({ election }: RecapitulationDisplayProps) {
    const [stats, setStats] = useState<RecapitulationStats | null>(null);
    const [committeeMembers, setCommitteeMembers] = useState<CommitteeMember[]>([]);

    useEffect(() => {
        const fetchStats = async () => {
            const result = await getRecapitulationStats(election.id);
            if (result.success && result.data) {
                setStats(result.data);
            }
        };
        fetchStats();
    }, [election.id]);

    useEffect(() => {
        const fetchCommittees = async () => {
            const result = await getCommitteesForElection(election.id);
            if (result.success && result.data) {
                // Flatten all members from all linked committees
                const allMembers = result.data.flatMap(committee => committee.members || []);
                setCommitteeMembers(allMembers);
            }
        };
        fetchCommittees();
    }, [election.id]);

    const candidates = useMemo(() =>
        Object.values(election.candidates || {})
            .sort((a, b) => (a.orderNumber || 999) - (b.orderNumber || 999)),
        [election.candidates]
    );

    // Use election.results directly (already calculated by the voting API)
    const candidateResults = useMemo(() => {
        return election.results || {};
    }, [election.results]);

    const totalValidVotes = useMemo(() => {
        return Object.values(candidateResults).reduce((sum, count) => sum + count, 0);
    }, [candidateResults]);


    // Determine who voted by checking hasVoted property for this election


    // Stats from server
    const DPT_male = stats?.dpt.male || 0;
    const DPT_female = stats?.dpt.female || 0;
    const DPT_total = stats?.dpt.total || 0;

    const votersWhoUsedRights_total = stats?.voted.total || 0;
    const votersWhoVoted_male = stats?.voted.male || 0;
    const votersWhoVoted_female = stats?.voted.female || 0;

    const votersDidNotVote_total = stats?.notVoted.total || 0;
    const votersDidNotVote_male = stats?.notVoted.male || 0;
    const votersDidNotVote_female = stats?.notVoted.female || 0;


    const handlePrint = () => {
        window.print();
    };

    const electionDateInfo = useMemo(() => {
        if (!election.endDate) return 'Pada hari ini <b>(Tanggal tidak diatur)</b>';
        return formatDateToWords(new Date(election.endDate));
    }, [election.endDate]);


    return (
        <div className="space-y-6">
            <style>
                {`
          @page {
            size: A4;
            margin: 1.5cm 1.5cm 2cm 1.5cm;
            
            @bottom-center {
              content: "Halaman " counter(page) " dari " counter(pages);
              font-size: 10px;
              color: #666;
            }
          }
          @media print {
            body, body * {
              visibility: hidden;
              background: transparent !important;
              color: #000 !important;
              box-shadow: none !important;
              text-shadow: none !important;
            }
            #print-section * {
                font-size: 12px !important;
            }
            #print-section .print-card-header h2 {
                font-size: 16px !important;
            }
            #print-section .print-card-header h1,
            #print-section .print-card-header h3 {
                font-size: 14px !important;
            }
            #print-section h3 {
                font-size: 14px !important;
            }
            #print-section table th {
                font-size: 13px !important;
            }
            b, strong {
                font-weight: bold !important;
            }
            #print-section, #print-section * {
              visibility: visible;
            }
            #print-section {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0 1rem;
            }
            .no-print {
                display: none;
            }
            .print-card {
                border: none !important;
                background: #fff !important;
            }
            .print-card-header {
                border-bottom: 2px solid #000 !important;
                background: #fff !important;
                padding-top: 0 !important;
            }
            .print-card-content {
                border: none !important;
                background: #fff !important;
            }
            .print-table {
                color: #000 !important;
                border-collapse: collapse !important;
            }
            .print-table th, .print-table td {
                border: 1px solid #000 !important;
                color: #000 !important;
                padding: 4px 8px;
            }
            .print-table th {
                text-align: center !important;
            }
            .print-table tr {
                border: none !important;
            }
            .print-table thead {
                background-color: #f2f2f2 !important;
            }
            
             .print-signature-container {
                padding-top: 1rem;
                page-break-inside: avoid;
             }

             .print-signature-table {
                width: 100%;
                margin-top: 0;
                border-collapse: collapse;
                page-break-inside: avoid;
            }
            .print-signature-table th,
            .print-signature-table td {
                padding: 12px 8px;
                border: 1px solid #000;
                vertical-align: middle;
            }
             .print-signature-table th {
                text-align: center;
             }
            .print-signature-table tr {
                border: none !important;
            }
            .print-signature-table .signature-box {
                height: 50px;
                position: relative;
            }
            .print-signature-table .signature-dots {
                border-bottom: 1px dotted #bbb;
                width: 100%;
                position: absolute;
                bottom: 0;
            }
            .print-signature-table .no-col { width: 5%; }
            .print-signature-table .name-col { width: 30%; text-align: left;}
            .print-signature-table .role-col { width: 25%; text-align: left;}
            .print-signature-table .signature-col { width: 40%; }
            .print-signature-table .candidate-col { width: 30%; text-align: left;}
            .print-signature-table .witness-name-col { width: 35%; text-align: left;}
          }
        `}
            </style>
            <div className="flex justify-end gap-2 no-print">
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Berita Acara
                </Button>
            </div>
            <div id="print-section">
                <Card className="shadow-none border-0 print-card">
                    <CardHeader className="text-center pb-4 print-card-header">
                        <h2 className="text-2xl font-bold tracking-tight leading-tight mb-0">BERITA ACARA</h2>
                        <h3 className="text-xl font-semibold uppercase leading-tight mb-0">HASIL PENGHITUNGAN SUARA</h3>
                        <h1 className="text-xl font-semibold uppercase leading-tight mb-0">{election.name}</h1>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-6 print-card-content">

                        <p dangerouslySetInnerHTML={{ __html: `${electionDateInfo}, telah dilaksanakan pemungutan suara untuk pemilihan ${election.name} dengan hasil sebagai berikut:` }} />

                        <div>
                            <h3 className="text-lg font-semibold mb-2">A. Data Pemilih</h3>
                            <div className="rounded-md print-table">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Uraian</TableHead>
                                            <TableHead className="w-[100px] text-center">Laki-laki</TableHead>
                                            <TableHead className="w-[100px] text-center">Perempuan</TableHead>
                                            <TableHead className="w-[100px] text-center">Jumlah</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell>Jumlah Pemilih dalam Daftar Pemilih Tetap (DPT)</TableCell>
                                            <TableCell className="text-center font-bold">{DPT_male}</TableCell>
                                            <TableCell className="text-center font-bold">{DPT_female}</TableCell>
                                            <TableCell className="text-center font-bold">{DPT_total}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold mb-2">B. Penggunaan Hak Pilih</h3>
                            <div className="rounded-md print-table">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Uraian</TableHead>
                                            <TableHead className="w-[100px] text-center">Laki-laki</TableHead>
                                            <TableHead className="w-[100px] text-center">Perempuan</TableHead>
                                            <TableHead className="w-[100px] text-center">Jumlah</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell>Jumlah Pemilih yang Menggunakan Hak Pilih</TableCell>
                                            <TableCell className="text-center font-bold">{votersWhoVoted_male}</TableCell>
                                            <TableCell className="text-center font-bold">{votersWhoVoted_female}</TableCell>
                                            <TableCell className="text-center font-bold">{votersWhoUsedRights_total}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Jumlah Pemilih yang Tidak Menggunakan Hak Pilih</TableCell>
                                            <TableCell className="text-center font-bold">{votersDidNotVote_male}</TableCell>
                                            <TableCell className="text-center font-bold">{votersDidNotVote_female}</TableCell>
                                            <TableCell className="text-center font-bold">{votersDidNotVote_total}</TableCell>
                                        </TableRow>
                                        <TableRow className="font-bold bg-muted/50">
                                            <TableCell>Jumlah</TableCell>
                                            <TableCell className="text-center">{votersWhoVoted_male + votersDidNotVote_male}</TableCell>
                                            <TableCell className="text-center">{votersWhoVoted_female + votersDidNotVote_female}</TableCell>
                                            <TableCell className="text-center">{votersWhoUsedRights_total + votersDidNotVote_total}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </div>


                        <div>
                            <h3 className="text-lg font-semibold mb-2">C. Rincian Perolehan Suara Kandidat</h3>
                            <div className="rounded-md print-table">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[80px]">No. Urut</TableHead>
                                            <TableHead>Nama Kandidat</TableHead>
                                            <TableHead className="text-right">Jumlah Suara Sah</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {candidates.length > 0 ? candidates.map((candidate) => (
                                            <TableRow key={candidate.id}>
                                                <TableCell className="text-center">{candidate.orderNumber}</TableCell>
                                                <TableCell className="font-medium">{candidate.name}{candidate.viceCandidateName ? ` & ${candidate.viceCandidateName}` : ''}</TableCell>
                                                <TableCell className="text-right font-bold">{candidateResults[candidate.id] || 0}</TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={3} className="h-24 text-center">Tidak ada kandidat dalam pemilihan ini.</TableCell>
                                            </TableRow>
                                        )}
                                        <TableRow className="font-bold bg-muted/50 print-table">
                                            <TableCell colSpan={2}>Total Seluruh Suara Sah</TableCell>
                                            <TableCell className="text-right">{totalValidVotes}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        <p>
                            Demikian Berita Acara ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.
                        </p>

                        {committeeMembers && committeeMembers.length > 0 && (
                            <div className="print-signature-container">
                                <h3 className="text-lg font-semibold mb-4 text-center">Nama dan Tanda Tangan Panitia Pemilihan</h3>
                                <table className="print-signature-table">
                                    <thead>
                                        <tr>
                                            <th className="no-col">No.</th>
                                            <th className="name-col">Nama</th>
                                            <th className="role-col">Jabatan</th>
                                            <th className="signature-col">Tanda Tangan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {committeeMembers.map((member, index) => (
                                            <tr key={member.id || `committee-member-${index}`}>
                                                <td className="text-center">{index + 1}</td>
                                                <td>{member.name}</td>
                                                <td>{member.role}</td>
                                                <td>
                                                    <div className="signature-box">
                                                        <div className="signature-dots"></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {election.useWitnesses && candidates && candidates.length > 0 && (
                            <div className="print-signature-container" style={{ paddingTop: '2rem' }}>
                                <h3 className="text-lg font-semibold mb-4 text-center">Nama dan Tanda Tangan Saksi Pasangan Calon</h3>
                                <table className="print-signature-table">
                                    <thead>
                                        <tr>
                                            <th className="no-col">No.</th>
                                            <th className="witness-name-col">Nama Saksi</th>
                                            <th className="candidate-col">Pasangan Calon</th>
                                            <th className="signature-col">Tanda Tangan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {candidates.map((candidate, index) => (
                                            <tr key={`witness-${candidate.id}`}>
                                                <td className="text-center">{index + 1}</td>
                                                <td>
                                                    <div className="signature-box">
                                                        <div className="signature-dots"></div>
                                                    </div>
                                                </td>
                                                <td>{candidate.name}{candidate.viceCandidateName ? ` & ${candidate.viceCandidateName}` : ''}</td>
                                                <td>
                                                    <div className="signature-box">
                                                        <div className="signature-dots"></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
