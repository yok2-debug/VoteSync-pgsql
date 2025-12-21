import { NextResponse } from 'next/server';
import { handleApiError, verifyAdminSession } from '../lib/api-helpers';
import {
    createCommittee,
    updateCommittee,
    deleteCommittee,
    addMemberToCommittee,
    updateCommitteeMember,
    deleteMemberFromCommittee,
} from '@/app/actions/committees';

// Committee CRUD
export async function POST(request: Request) {
    try {
        await verifyAdminSession('committees');

        const body = await request.json();
        const { action, ...data } = body;

        // Member operations
        if (action === 'addMember') {
            const { committeeId, member } = data;
            if (!committeeId || !member) {
                return NextResponse.json({ message: 'Data tidak lengkap.' }, { status: 400 });
            }
            const result = await addMemberToCommittee(committeeId, member);
            if (!result.success) {
                return NextResponse.json({ message: result.message }, { status: 400 });
            }
            return NextResponse.json({ message: result.message, data: result.data }, { status: 201 });
        }

        // Create committee
        const result = await createCommittee(data);
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
            if (!committeeId || !memberId || !data) {
                return NextResponse.json({ message: 'Data tidak lengkap.' }, { status: 400 });
            }
            const result = await updateCommitteeMember(committeeId, memberId, data);
            if (!result.success) {
                return NextResponse.json({ message: result.message }, { status: 400 });
            }
            return NextResponse.json({ message: result.message }, { status: 200 });
        }

        // Committee update
        if (!committeeId || !data) {
            return NextResponse.json({ message: 'Data tidak lengkap.' }, { status: 400 });
        }
        const result = await updateCommittee(committeeId, data);
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
            if (!committeeId || !memberId) {
                return NextResponse.json({ message: 'Data tidak lengkap.' }, { status: 400 });
            }
            const result = await deleteMemberFromCommittee(committeeId, memberId);
            if (!result.success) {
                return NextResponse.json({ message: result.message }, { status: 400 });
            }
            return NextResponse.json({ message: result.message }, { status: 200 });
        }

        // Committee delete
        if (!committeeId) {
            return NextResponse.json({ message: 'Data tidak lengkap.' }, { status: 400 });
        }
        const result = await deleteCommittee(committeeId);
        if (!result.success) {
            return NextResponse.json({ message: result.message }, { status: 400 });
        }
        return NextResponse.json({ message: result.message }, { status: 200 });
    } catch (error) {
        return handleApiError(error);
    }
}
