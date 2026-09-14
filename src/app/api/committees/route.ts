import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError, verifyAdminSession } from '../lib/api-helpers';
import {
    createCommittee,
    updateCommittee,
    deleteCommittee,
    addMemberToCommittee,
    updateCommitteeMember,
    deleteMemberFromCommittee,
} from '@/app/actions/committees';

const committeeMemberInputSchema = z.object({
    name: z.string().trim().min(1),
    role: z.enum(['Ketua', 'Anggota']),
});

const committeeMemberUpdateSchema = committeeMemberInputSchema.partial();

const committeeSchema = z.object({
    name: z.string().trim().min(1),
    electionIds: z.array(z.string().min(1)),
    members: z.array(
        z.object({
            id: z.string().min(1),
            name: z.string().trim().min(1),
            role: z.enum(['Ketua', 'Anggota']),
        })
    ),
});

const committeeUpdateSchema = committeeSchema.partial();

// Committee CRUD
export async function POST(request: Request) {
    try {
        await verifyAdminSession('committees');

        const body = await request.json();
        const { action, ...data } = body;

        // Member operations
        if (action === 'addMember') {
            const committeeIdResult = z.string().min(1).safeParse(data.committeeId);
            const memberResult = committeeMemberInputSchema.safeParse(data.member);

            if (!committeeIdResult.success || !memberResult.success) {
                return NextResponse.json(
                    {
                        message: 'Data tidak valid.',
                        errors: {
                            committeeId: committeeIdResult.success ? undefined : committeeIdResult.error.flatten(),
                            member: memberResult.success ? undefined : memberResult.error.flatten(),
                        },
                    },
                    { status: 400 }
                );
            }

            const committeeId = committeeIdResult.data;
            const member = memberResult.data;
            const result = await addMemberToCommittee(committeeId, member);
            if (!result.success) {
                return NextResponse.json({ message: result.message }, { status: 400 });
            }
            return NextResponse.json({ message: result.message, data: result.data }, { status: 201 });
        }

        // Create committee
        const parsed = committeeSchema.safeParse(data);
        if (!parsed.success) {
            return NextResponse.json(
                { message: 'Data tidak valid.', errors: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const result = await createCommittee(parsed.data);
        if (!result.success) {
            return NextResponse.json({ message: result.message }, { status: 400 });
        }
        return NextResponse.json({ message: result.message, data: result.data }, { status: 201 });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: Request) {
    try {
        await verifyAdminSession('committees');

        const body = await request.json();
        const { action, committeeId, memberId, data } = body;

        // Member update
        if (action === 'updateMember') {
            const committeeIdResult = z.string().min(1).safeParse(committeeId);
            const memberIdResult = z.string().min(1).safeParse(memberId);
            const dataResult = committeeMemberUpdateSchema.safeParse(data);

            if (!committeeIdResult.success || !memberIdResult.success || !dataResult.success) {
                return NextResponse.json(
                    {
                        message: 'Data tidak valid.',
                        errors: {
                            committeeId: committeeIdResult.success ? undefined : committeeIdResult.error.flatten(),
                            memberId: memberIdResult.success ? undefined : memberIdResult.error.flatten(),
                            data: dataResult.success ? undefined : dataResult.error.flatten(),
                        },
                    },
                    { status: 400 }
                );
            }

            const result = await updateCommitteeMember(
                committeeIdResult.data,
                memberIdResult.data,
                dataResult.data
            );
            if (!result.success) {
                return NextResponse.json({ message: result.message }, { status: 400 });
            }
            return NextResponse.json({ message: result.message }, { status: 200 });
        }

        // Committee update
        const committeeIdResult = z.string().min(1).safeParse(committeeId);
        const dataResult = committeeUpdateSchema.safeParse(data);

        if (!committeeIdResult.success || !dataResult.success) {
            return NextResponse.json(
                {
                    message: 'Data tidak valid.',
                    errors: {
                        committeeId: committeeIdResult.success ? undefined : committeeIdResult.error.flatten(),
                        data: dataResult.success ? undefined : dataResult.error.flatten(),
                    },
                },
                { status: 400 }
            );
        }

        const result = await updateCommittee(committeeIdResult.data, dataResult.data);
        if (!result.success) {
            return NextResponse.json({ message: result.message }, { status: 400 });
        }
        return NextResponse.json({ message: result.message }, { status: 200 });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(request: Request) {
    try {
        await verifyAdminSession('committees');

        const body = await request.json();
        const { action, committeeId, memberId } = body;

        // Member delete
        if (action === 'deleteMember') {
            const committeeIdResult = z.string().min(1).safeParse(committeeId);
            const memberIdResult = z.string().min(1).safeParse(memberId);

            if (!committeeIdResult.success || !memberIdResult.success) {
                return NextResponse.json(
                    {
                        message: 'Data tidak valid.',
                        errors: {
                            committeeId: committeeIdResult.success ? undefined : committeeIdResult.error.flatten(),
                            memberId: memberIdResult.success ? undefined : memberIdResult.error.flatten(),
                        },
                    },
                    { status: 400 }
                );
            }

            const result = await deleteMemberFromCommittee(
                committeeIdResult.data,
                memberIdResult.data
            );
            if (!result.success) {
                return NextResponse.json({ message: result.message }, { status: 400 });
            }
            return NextResponse.json({ message: result.message }, { status: 200 });
        }

        // Committee delete
        const committeeIdResult = z.string().min(1).safeParse(committeeId);
        if (!committeeIdResult.success) {
            return NextResponse.json(
                { message: 'Data tidak valid.', errors: committeeIdResult.error.flatten() },
                { status: 400 }
            );
        }

        const result = await deleteCommittee(committeeIdResult.data);
        if (!result.success) {
            return NextResponse.json({ message: result.message }, { status: 400 });
        }
        return NextResponse.json({ message: result.message }, { status: 200 });
    } catch (error) {
        return handleApiError(error);
    }
}
