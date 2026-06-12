import { Elysia, t } from 'elysia';
import { db } from '../db';
import { approvalRequests, candidates, users } from '../db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { jwt } from '@elysiajs/jwt';

export const approvalRoutes = new Elysia({ prefix: '/approvals' })
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'supersecretjwtkeychangeinprod',
    })
  )
  .derive(async ({ headers, jwt, set }) => {
    const auth = headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
      set.status = 401;
      return { user: null };
    }
    const token = auth.substring(7);
    const user = await jwt.verify(token);
    if (!user) {
      set.status = 401;
      return { user: null };
    }
    return { user: user as any };
  })
  .onBeforeHandle(({ user, set }) => {
    if (!user || user.level < 2) {
      set.status = 403;
      return { success: false, error: 'Forbidden. Hanya Supervisor/Manager yang diizinkan.' };
    }
  })
  .get('/', async ({ user }) => {
    try {
      let conditions = [];

      // Final status must be PENDING
      conditions.push(eq(approvalRequests.finalStatus, 'PENDING'));

      // If user is Supervisor (Level 2), show where l2_status is PENDING
      if (user.level === 2) {
        conditions.push(eq(approvalRequests.l2Status, 'PENDING'));
      }
      
      // If user is Manager (Level 3), show where l2_status is APPROVED and l3_status is PENDING
      if (user.level === 3) {
        conditions.push(
          and(
            eq(approvalRequests.l2Status, 'APPROVED'),
            eq(approvalRequests.l3Status, 'PENDING')
          )
        );
      }

      // If Level 4 (Admin), show all pending
      const results = await db.select({
        id: approvalRequests.id,
        candidateId: approvalRequests.candidateId,
        type: approvalRequests.type,
        oldData: approvalRequests.oldData,
        newData: approvalRequests.newData,
        requesterId: approvalRequests.requesterId,
        l2Status: approvalRequests.l2Status,
        l2Notes: approvalRequests.l2Notes,
        l3Status: approvalRequests.l3Status,
        l3Notes: approvalRequests.l3Notes,
        createdAt: approvalRequests.createdAt,
      })
      .from(approvalRequests)
      .where(and(...conditions))
      .orderBy(desc(approvalRequests.createdAt));

      return { success: true, data: results };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  })
  .post('/:id/action', async ({ params, body, user, set }) => {
    const id = parseInt(params.id);
    const { action, notes } = body; // action: 'APPROVE' or 'REJECT'
    
    try {
      const existing = await db.select().from(approvalRequests).where(eq(approvalRequests.id, id)).limit(1);
      if (existing.length === 0) {
        set.status = 404;
        return { success: false, error: 'Permintaan approval tidak ditemukan.' };
      }

      const req = existing[0];

      if (user.level === 2) {
        if (action === 'APPROVE') {
          await db.update(approvalRequests).set({
            l2Status: 'APPROVED',
            l2ApproverId: user.id as number,
            l2Notes: notes || '',
          }).where(eq(approvalRequests.id, id));
        } else {
          await db.update(approvalRequests).set({
            l2Status: 'REJECTED',
            finalStatus: 'REJECTED',
            l2ApproverId: user.id as number,
            l2Notes: notes || '',
          }).where(eq(approvalRequests.id, id));
        }
      } else if (user.level === 3 || user.level === 4) {
        if (action === 'APPROVE') {
          // Update status
          await db.update(approvalRequests).set({
            l3Status: 'APPROVED',
            finalStatus: 'COMPLETED',
            l3ApproverId: user.id as number,
            l3Notes: notes || '',
          }).where(eq(approvalRequests.id, id));

          // Apply changes to database!
          const targetId = req.candidateId;
          if (targetId) {
            if (req.type === 'DELETE') {
              await db.delete(candidates).where(eq(candidates.id, targetId));
            } else if (req.type === 'EDIT' && req.newData) {
              const updatedData = JSON.parse(req.newData);
              await db.update(candidates).set({
                namaCadeb: updatedData.namaCadeb,
                noIdentitas: updatedData.noIdentitas,
                namaPasangan: updatedData.namaPasangan || '',
                noIdentitasPasangan: updatedData.noIdentitasPasangan || '',
                keteranganPep: updatedData.keteranganPep,
                goLive: updatedData.goLive,
                kategori: updatedData.kategori || 'Cadeb',
              }).where(eq(candidates.id, targetId));
            }
          }
        } else {
          await db.update(approvalRequests).set({
            l3Status: 'REJECTED',
            finalStatus: 'REJECTED',
            l3ApproverId: user.id as number,
            l3Notes: notes || '',
          }).where(eq(approvalRequests.id, id));
        }
      }

      return { success: true, message: `Permintaan berhasil di-${action.toLowerCase()}.` };
    } catch (e: any) {
      set.status = 500;
      return { success: false, error: e.message };
    }
  }, {
    body: t.Object({
      action: t.Union([t.Literal('APPROVE'), t.Literal('REJECT')]),
      notes: t.Optional(t.String()),
    })
  });
