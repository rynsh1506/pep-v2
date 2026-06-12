import { Elysia, t } from 'elysia';
import { connectionCadeb, connectionDtot } from '../db';
import { jwt } from '@elysiajs/jwt';

export const dtotRoutes = new Elysia({ prefix: '/dtot' })
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
    if (!user) {
      set.status = 401;
      return { success: false, error: 'Unauthorized' };
    }
  })
  .get('/', async ({ query }) => {
    const { search, type, page = 1, limit = 10 } = query;
    try {
      const offset = (Number(page) - 1) * Number(limit);
      let queryStr = 'SELECT id, nama, terduga_type AS terdugaType, kode_densus AS kodeDensus, tempat_lahir AS tempatLahir, tanggal_lahir AS tanggalLahir, wn_asal_negara AS wnAsalNegara, deskripsi, alamat, created_at AS createdAt, deleted_at AS deletedAt, is_pending AS isPending FROM terduga';
      let conditions: string[] = ['deleted_at IS NULL'];
      let values: any[] = [];

      if (search) {
        conditions.push('(nama LIKE ? OR kode_densus LIKE ? OR alamat LIKE ? OR deskripsi LIKE ?)');
        values.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (type && type !== '') {
        conditions.push('terduga_type = ?');
        values.push(type);
      }

      if (conditions.length > 0) {
        queryStr += ' WHERE ' + conditions.join(' AND ');
      }
      queryStr += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

      const [rows] = await connectionDtot.execute(queryStr, [...values, Number(limit), offset]);
      const results = rows as any[];

      // Fetch count for pagination
      let countQueryStr = 'SELECT COUNT(*) AS count FROM terduga';
      if (conditions.length > 0) {
        countQueryStr += ' WHERE ' + conditions.join(' AND ');
      }
      const [countRows] = await connectionDtot.execute(countQueryStr, values);
      const total = (countRows as any[])[0]?.count || 0;

      return {
        success: true,
        data: results,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }, {
    query: t.Object({
      search: t.Optional(t.String()),
      type: t.Optional(t.String()),
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    })
  })
  .get('/stats', async () => {
    try {
      const [totalRows] = await connectionDtot.execute('SELECT COUNT(*) AS count FROM terduga WHERE deleted_at IS NULL');
      const [orangRows] = await connectionDtot.execute("SELECT COUNT(*) AS count FROM terduga WHERE deleted_at IS NULL AND terduga_type = 'Orang'");
      const [korporasiRows] = await connectionDtot.execute("SELECT COUNT(*) AS count FROM terduga WHERE deleted_at IS NULL AND terduga_type = 'Korporasi'");

      return {
        success: true,
        stats: {
          total: (totalRows as any[])[0]?.count || 0,
          orang: (orangRows as any[])[0]?.count || 0,
          korporasi: (korporasiRows as any[])[0]?.count || 0
        }
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  })
  .post('/', async ({ body, user, set }) => {
    try {
      const { nama, terdugaType, kodeDensus, tempatLahir, tanggalLahir, wnAsalNegara, deskripsi, alamat } = body;

      // Note: Legacy code does a direct save for everyone. Let's do direct insert into terduga.
      await connectionDtot.execute(
        'INSERT INTO terduga (nama, terduga_type, kode_densus, tempat_lahir, tanggal_lahir, wn_asal_negara, deskripsi, alamat, is_pending) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
        [
          nama,
          terdugaType,
          kodeDensus || null,
          tempatLahir || null,
          tanggalLahir || null,
          wnAsalNegara || null,
          deskripsi || null,
          alamat || null
        ]
      );

      return { success: true, message: 'Data DTTOT berhasil ditambahkan.' };
    } catch (e: any) {
      set.status = 500;
      return { success: false, error: e.message };
    }
  }, {
    body: t.Object({
      nama: t.String(),
      terdugaType: t.Union([t.Literal('Orang'), t.Literal('Korporasi'), t.Literal('Tidak Terduga')]),
      kodeDensus: t.Optional(t.String()),
      tempatLahir: t.Optional(t.String()),
      tanggalLahir: t.Optional(t.String()),
      wnAsalNegara: t.Optional(t.String()),
      deskripsi: t.Optional(t.String()),
      alamat: t.Optional(t.String()),
    })
  })
  .put('/:id', async ({ params, body, user, set }) => {
    const id = parseInt(params.id);
    try {
      const [rows] = await connectionDtot.execute(
        'SELECT id, nama, terduga_type AS terdugaType, kode_densus AS kodeDensus, tempat_lahir AS tempatLahir, tanggal_lahir AS tanggalLahir, wn_asal_negara AS wnAsalNegara, deskripsi, alamat, created_at AS createdAt, deleted_at AS deletedAt, is_pending AS isPending FROM terduga WHERE id = ? LIMIT 1',
        [id]
      );
      const existing = rows as any[];
      if (existing.length === 0) {
        set.status = 404;
        return { success: false, error: 'Data tidak ditemukan.' };
      }

      // If user level is 1 (Staff), edit must go to change_requests approval
      if (user.level === 1) {
        // Serialized body with id
        const requestData = { id, ...body };
        await connectionDtot.execute(
          'INSERT INTO change_requests (target_id, request_type, data_json, requester_id, status) VALUES (?, ?, ?, ?, ?)',
          [id, 'EDIT', JSON.stringify(requestData), user.id, 'PENDING_SPV']
        );

        // Set pending flag in database
        await connectionDtot.execute('UPDATE terduga SET is_pending = 1 WHERE id = ?', [id]);

        return { success: true, message: 'Permintaan perubahan data (EDIT) DTTOT berhasil dikirim untuk approval.' };
      }

      // If L2/L3/L4, edit directly
      await connectionDtot.execute(
        'UPDATE terduga SET nama = ?, terduga_type = ?, kode_densus = ?, tempat_lahir = ?, tanggal_lahir = ?, wn_asal_negara = ?, deskripsi = ?, alamat = ?, is_pending = 0 WHERE id = ?',
        [
          body.nama,
          body.terdugaType,
          body.kodeDensus || null,
          body.tempatLahir || null,
          body.tanggalLahir || null,
          body.wnAsalNegara || null,
          body.deskripsi || null,
          body.alamat || null,
          id
        ]
      );

      return { success: true, message: 'Data DTTOT berhasil diperbarui.' };
    } catch (e: any) {
      set.status = 500;
      return { success: false, error: e.message };
    }
  }, {
    body: t.Object({
      nama: t.String(),
      terdugaType: t.Union([t.Literal('Orang'), t.Literal('Korporasi'), t.Literal('Tidak Terduga')]),
      kodeDensus: t.Optional(t.String()),
      tempatLahir: t.Optional(t.String()),
      tanggalLahir: t.Optional(t.String()),
      wnAsalNegara: t.Optional(t.String()),
      deskripsi: t.Optional(t.String()),
      alamat: t.Optional(t.String()),
    })
  })
  .delete('/:id', async ({ params, user, set }) => {
    const id = parseInt(params.id);
    try {
      const [rows] = await connectionDtot.execute(
        'SELECT id, nama, terduga_type AS terdugaType, kode_densus AS kodeDensus, tempat_lahir AS tempatLahir, tanggal_lahir AS tanggalLahir, wn_asal_negara AS wnAsalNegara, deskripsi, alamat, created_at AS createdAt, deleted_at AS deletedAt, is_pending AS isPending FROM terduga WHERE id = ? LIMIT 1',
        [id]
      );
      const existing = rows as any[];
      if (existing.length === 0) {
        set.status = 404;
        return { success: false, error: 'Data tidak ditemukan.' };
      }

      // If user level is 1 (Staff), delete must go to approval
      if (user.level === 1) {
        await connectionDtot.execute(
          'INSERT INTO change_requests (target_id, request_type, data_json, requester_id, status) VALUES (?, ?, ?, ?, ?)',
          [id, 'DELETE', '{}', user.id, 'PENDING_SPV']
        );

        // Set pending flag in database
        await connectionDtot.execute('UPDATE terduga SET is_pending = 1 WHERE id = ?', [id]);

        return { success: true, message: 'Permintaan penghapusan data (DELETE) DTTOT berhasil dikirim untuk approval.' };
      }

      // Admin or higher soft-deletes directly
      await connectionDtot.execute(
        'UPDATE terduga SET deleted_at = NOW(), is_pending = 0 WHERE id = ?',
        [id]
      );

      return { success: true, message: 'Data DTTOT berhasil dihapus.' };
    } catch (e: any) {
      set.status = 500;
      return { success: false, error: e.message };
    }
  })
  .get('/approvals', async ({ user, set }) => {
    if (user.level < 2) {
      set.status = 403;
      return { success: false, error: 'Akses ditolak.' };
    }

    try {
      let queryStr = 'SELECT id, target_id AS targetId, request_type AS requestType, data_json AS dataJson, requester_id AS requesterId, status, approver_id AS approverId, created_at AS createdAt, processed_at AS processedAt FROM change_requests';
      let conditions: string[] = [];

      if (user.level === 2) {
        conditions.push("status = 'PENDING_SPV'");
      } else if (user.level === 3) {
        conditions.push("status = 'PENDING_MANAGER'");
      } else {
        conditions.push("(status = 'PENDING_SPV' OR status = 'PENDING_MANAGER')");
      }

      if (conditions.length > 0) {
        queryStr += ' WHERE ' + conditions.join(' AND ');
      }
      queryStr += ' ORDER BY created_at DESC';

      const [rows] = await connectionDtot.execute(queryStr);
      return { success: true, data: rows };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  })
  .post('/approvals/:id/action', async ({ params, body, user, set }) => {
    if (user.level < 2) {
      set.status = 403;
      return { success: false, error: 'Akses ditolak.' };
    }

    const id = parseInt(params.id);
    const { action } = body; // action: 'APPROVE' | 'REJECT'

    try {
      const [rows] = await connectionDtot.execute(
        'SELECT id, target_id AS targetId, request_type AS requestType, data_json AS dataJson, requester_id AS requesterId, status, approver_id AS approverId, created_at AS createdAt, processed_at AS processedAt FROM change_requests WHERE id = ? LIMIT 1',
        [id]
      );
      const existing = rows as any[];
      if (existing.length === 0) {
        set.status = 404;
        return { success: false, error: 'Permintaan approval tidak ditemukan.' };
      }

      const req = existing[0];

      if (action === 'REJECT') {
        // Rejection
        if (req.targetId) {
          await connectionDtot.execute('UPDATE terduga SET is_pending = 0 WHERE id = ?', [req.targetId]);
        }

        await connectionDtot.execute(
          'UPDATE change_requests SET status = ?, approver_id = ?, processed_at = NOW() WHERE id = ?',
          ['REJECTED', user.id, id]
        );

        return { success: true, message: 'Permintaan approval berhasil ditolak.' };
      }

      // Approval flow
      if (user.level === 2) {
        // Supervisor forwards to Manager
        await connectionDtot.execute(
          'UPDATE change_requests SET status = ?, approver_id = ? WHERE id = ?',
          ['PENDING_MANAGER', user.id, id]
        );

        return { success: true, message: 'Permintaan berhasil disetujui Supervisor dan diteruskan ke Manager.' };
      }

      // Manager or Admin - Final Approval
      if (user.level >= 3) {
        if (req.requestType === 'DELETE' && req.targetId) {
          // Soft delete terduga
          await connectionDtot.execute(
            'UPDATE terduga SET deleted_at = NOW(), is_pending = 0 WHERE id = ?',
            [req.targetId]
          );
        } else if (req.requestType === 'EDIT' && req.targetId) {
          const data = JSON.parse(req.dataJson);
          await connectionDtot.execute(
            'UPDATE terduga SET nama = ?, terduga_type = ?, kode_densus = ?, tempat_lahir = ?, tanggal_lahir = ?, wn_asal_negara = ?, deskripsi = ?, alamat = ?, is_pending = 0 WHERE id = ?',
            [
              data.nama,
              data.terdugaType,
              data.kodeDensus || null,
              data.tempatLahir || null,
              data.tanggalLahir || null,
              data.wnAsalNegara || null,
              data.deskripsi || null,
              data.alamat || null,
              req.targetId
            ]
          );
        }

        // Complete the change request
        await connectionDtot.execute(
          'UPDATE change_requests SET status = ?, approver_id = ?, processed_at = NOW() WHERE id = ?',
          ['APPROVED', user.id, id]
        );

        return { success: true, message: 'Permintaan approval disetujui sepenuhnya.' };
      }

      return { success: false, error: 'Aksi tidak valid.' };
    } catch (e: any) {
      set.status = 500;
      return { success: false, error: e.message };
    }
  }, {
    body: t.Object({
      action: t.Union([t.Literal('APPROVE'), t.Literal('REJECT')]),
    })
  })
  .post('/checks/dtot', async ({ body, user, set }) => {
    try {
      const { namaCadeb, nik, namaPasangan, nikPasangan, hasilPengecekan, hasilPep, kategori, keterangan, buktiSs } = body;
      await connectionDtot.execute(
        'INSERT INTO pengajuan_dtot (tanggal, nama_cadeb, nik, nama_pasangan, nik_pasangan, hasil_pengecekan, hasil_pep, kategori, keterangan, bukti_ss, checked_by, checked_at) VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
        [
          namaCadeb,
          nik,
          namaPasangan || '',
          nikPasangan || '',
          hasilPengecekan,
          hasilPep,
          kategori || 'Calon Debitur',
          keterangan || null,
          buktiSs || null,
          user.id
        ]
      );
      return { success: true, message: 'Hasil pengecekan DTTOT berhasil disimpan.' };
    } catch (e: any) {
      set.status = 500;
      return { success: false, error: e.message };
    }
  }, {
    body: t.Object({
      namaCadeb: t.String(),
      nik: t.String(),
      namaPasangan: t.Optional(t.String()),
      nikPasangan: t.Optional(t.String()),
      hasilPengecekan: t.Union([t.Literal('Belum Dicek'), t.Literal('Terindikasi'), t.Literal('Tidak Terindikasi')]),
      hasilPep: t.String(),
      kategori: t.Optional(t.String()),
      keterangan: t.Optional(t.String()),
      buktiSs: t.Optional(t.String()),
    })
  })
  .get('/checks/dtot', async () => {
    try {
      const [rows] = await connectionDtot.execute(
        'SELECT id, tanggal, nama_cadeb AS namaCadeb, nik, nama_pasangan AS namaPasangan, nik_pasangan AS nikPasangan, hasil_pengecekan AS hasilPengecekan, hasil_pep AS hasilPep, kategori, keterangan, bukti_ss AS buktiSs, checked_by AS checkedBy, checked_at AS checkedAt, created_at AS createdAt, updated_at AS updatedAt FROM pengajuan_dtot ORDER BY created_at DESC LIMIT 100'
      );
      const results = rows as any[];
      
      // Fetch users for join representation
      const [userRows] = await connectionCadeb.execute(
        'SELECT id, nama_lengkap AS namaLengkap, username FROM users'
      );
      const allUsers = userRows as any[];
      const userMap = new Map(allUsers.map(u => [u.id, u.namaLengkap || u.username]));

      const mapped = results.map(r => ({
        ...r,
        checkerName: r.checkedBy ? userMap.get(r.checkedBy) || 'System' : 'System'
      }));

      return { success: true, data: mapped };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  })
  .post('/checks/reksaloan', async ({ body, user, set }) => {
    try {
      const { noKontrak, namaDebitur, nik, hasilDtot, hasilPep, keterangan, buktiSs } = body;
      await connectionDtot.execute(
        'INSERT INTO cekreksaloan (no_kontrak, nama_debitur, nik, hasil_dtot, hasil_pep, keterangan, bukti_ss, checked_by, checked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
        [
          noKontrak,
          namaDebitur || null,
          nik || null,
          hasilDtot || null,
          hasilPep || null,
          keterangan || null,
          buktiSs || null,
          user.id
        ]
      );
      return { success: true, message: 'Hasil verifikasi Reksaloan berhasil disimpan.' };
    } catch (e: any) {
      set.status = 500;
      return { success: false, error: e.message };
    }
  }, {
    body: t.Object({
      noKontrak: t.String(),
      namaDebitur: t.Optional(t.String()),
      nik: t.Optional(t.String()),
      hasilDtot: t.Optional(t.String()),
      hasilPep: t.Optional(t.String()),
      keterangan: t.Optional(t.String()),
      buktiSs: t.Optional(t.String()),
    })
  })
  .get('/checks/reksaloan', async () => {
    try {
      const [rows] = await connectionDtot.execute(
        'SELECT id, no_kontrak AS noKontrak, nama_debitur AS namaDebitur, nik, hasil_dtot AS hasilDtot, hasil_pep AS hasilPep, keterangan, bukti_ss AS buktiSs, checked_by AS checkedBy, checked_at AS checkedAt FROM cekreksaloan ORDER BY checked_at DESC LIMIT 100'
      );
      const results = rows as any[];
      
      const [userRows] = await connectionCadeb.execute(
        'SELECT id, nama_lengkap AS namaLengkap, username FROM users'
      );
      const allUsers = userRows as any[];
      const userMap = new Map(allUsers.map(u => [u.id, u.namaLengkap || u.username]));

      const mapped = results.map(r => ({
        ...r,
        checkerName: r.checkedBy ? userMap.get(r.checkedBy) || 'System' : 'System'
      }));

      return { success: true, data: mapped };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  })
  .get('/reksaloan-list', async ({ query }) => {
    const { branch_id, q_nama, q_nik, q_kontrak } = query;
    try {
      const MOCK_AGREEMENTS = [
        { nama: 'MIRA ARIANI alias UMM ZAHRA', ktp: '640201205820003', no_kontrak: 'CON-001', status: 'LIV', GoliveDate: '2026-05-10', cabang: 'Tenggarong', pekerjaan: 'Ibu Rumah Tangga' },
        { nama: 'EDDY SANTOSO', ktp: '3172041506010002', no_kontrak: 'CON-002', status: 'LIV', GoliveDate: '2026-06-01', cabang: 'Jakarta Pusat', pekerjaan: 'Wiraswasta' },
        { nama: 'ADE ARYANA RESTU SAPUTRI', ktp: '1371116305920012', no_kontrak: 'CON-003', status: 'LIV', GoliveDate: '2026-04-12', cabang: 'Palembang', pekerjaan: 'Pegawai Swasta' },
        { nama: 'Candra Pradana', ktp: '1208110304930007', no_kontrak: 'CON-004', status: 'LIV', GoliveDate: '2026-03-15', cabang: 'Bandar Lampung', pekerjaan: 'Karyawan Swasta' },
        { nama: 'Karlina Sofyarto', ktp: '1371115602920008', no_kontrak: 'CON-005', status: 'LIV', GoliveDate: '2026-04-20', cabang: 'Palembang', pekerjaan: 'Pegawai Negeri' },
        { nama: 'Abubakar Swalleh', ktp: '9988776655443322', no_kontrak: 'CON-006', status: 'LIV', GoliveDate: '2026-01-18', cabang: 'Jakarta Selatan', pekerjaan: 'Professional' },
        { nama: 'Citra Indah', ktp: '3173021908900004', no_kontrak: 'CON-007', status: 'LIV', GoliveDate: '2026-05-22', cabang: 'Bandung', pekerjaan: 'Wiraswasta' },
        { nama: 'Ahmad Faisal', ktp: '3201081512880003', no_kontrak: 'CON-008', status: 'LIV', GoliveDate: '2026-06-05', cabang: 'Surabaya', pekerjaan: 'PNS' }
      ];

      let filtered = [...MOCK_AGREEMENTS];

      if (q_nama) {
        filtered = filtered.filter(a => a.nama.toLowerCase().includes(q_nama.toLowerCase()));
      }
      if (q_nik) {
        filtered = filtered.filter(a => a.ktp.includes(q_nik));
      }
      if (q_kontrak) {
        filtered = filtered.filter(a => a.no_kontrak.toLowerCase().includes(q_kontrak.toLowerCase()));
      }

      // Fetch actual check records from MySQL db
      const contractNos = filtered.map(f => f.no_kontrak);
      let checks: any[] = [];
      if (contractNos.length > 0) {
        const [rows] = await connectionDtot.execute(
          'SELECT id, no_kontrak AS noKontrak, nama_debitur AS namaDebitur, nik, hasil_dtot AS hasilDtot, hasil_pep AS hasilPep, keterangan, bukti_ss AS buktiSs, checked_by AS checkedBy, checked_at AS checkedAt FROM cekreksaloan'
        );
        checks = rows as any[];
      }

      const checkMap = new Map(checks.map(c => [c.noKontrak, c]));

      const results = filtered.map(f => ({
        ...f,
        last_check: checkMap.get(f.no_kontrak) || null
      }));

      return { success: true, data: results };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }, {
    query: t.Object({
      branch_id: t.Optional(t.String()),
      q_nama: t.Optional(t.String()),
      q_nik: t.Optional(t.String()),
      q_kontrak: t.Optional(t.String())
    })
  });
