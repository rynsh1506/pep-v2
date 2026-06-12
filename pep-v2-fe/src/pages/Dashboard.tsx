import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, Search, UserPlus, ShieldAlert, Cpu, RefreshCw, X, Edit2, Trash2 } from 'lucide-react';

interface Candidate {
  id: number;
  namaCadeb: string;
  noIdentitas: string;
  namaPasangan: string;
  noIdentitasPasangan: string;
  keteranganPep: string;
  goLive: string;
  createdAt: string;
  kategori: string;
}

export const Dashboard: React.FC = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [search, setSearch] = useState('');
  const [pepFilter, setPepFilter] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scraper Actions
  const [scraping, setScraping] = useState(false);
  const [scraperMessage, setScraperMessage] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editCandidate, setEditCandidate] = useState<Candidate | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    namaCadeb: '',
    noIdentitas: '',
    namaPasangan: '',
    noIdentitasPasangan: '',
    keteranganPep: 'Cadeb',
    goLive: 'Tidak',
    kategori: 'Calon Debitur',
  });

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  // Fetch candidates
  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (pepFilter) params.pepFilter = pepFilter;
      if (kategoriFilter) params.kategoriFilter = kategoriFilter;

      const response = await axios.get('/api/candidates', {
        ...getAuthHeaders(),
        params
      });

      if (response.data.success) {
        setCandidates(response.data.data);
      } else {
        setError(response.data.error || 'Gagal memuat data.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
    } else {
      fetchCandidates();
    }
  }, [token, search, pepFilter, kategoriFilter]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Scraper Trigger
  const triggerScrape = async () => {
    setScraping(true);
    setScraperMessage(null);
    try {
      const response = await axios.get('/api/scraper/token', getAuthHeaders());
      setScraperMessage(response.data.message || 'Scraper berhasil dijalankan.');
    } catch (err: any) {
      setScraperMessage(err.response?.data?.error || 'Scraper gagal dijalankan.');
    } finally {
      setScraping(false);
    }
  };

  // Form Submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editCandidate) {
        const response = await axios.put(`/api/candidates/${editCandidate.id}`, formData, getAuthHeaders());
        alert(response.data.message);
      } else {
        const response = await axios.post('/api/candidates', formData, getAuthHeaders());
        alert(response.data.message);
      }
      setModalOpen(false);
      resetForm();
      fetchCandidates();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal menyimpan data.');
    }
  };

  const resetForm = () => {
    setFormData({
      namaCadeb: '',
      noIdentitas: '',
      namaPasangan: '',
      noIdentitasPasangan: '',
      keteranganPep: 'Cadeb',
      goLive: 'Tidak',
      kategori: 'Calon Debitur',
    });
    setEditCandidate(null);
  };

  const openEditModal = (candidate: Candidate) => {
    setEditCandidate(candidate);
    setFormData({
      namaCadeb: candidate.namaCadeb,
      noIdentitas: candidate.noIdentitas,
      namaPasangan: candidate.namaPasangan,
      noIdentitasPasangan: candidate.noIdentitasPasangan,
      keteranganPep: candidate.keteranganPep,
      goLive: candidate.goLive,
      kategori: candidate.kategori,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      const response = await axios.delete(`/api/candidates/${id}`, getAuthHeaders());
      alert(response.data.message);
      fetchCandidates();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal menghapus data.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wider flex items-center gap-2">
            <ShieldAlert className="text-blue-500" />
            SISTEM PEP PORTAL V2
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Logged in: <span className="font-semibold text-slate-300">{user?.namaLengkap}</span> (Level {user?.level})
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={triggerScrape}
            disabled={scraping}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            <Cpu size={16} className={scraping ? 'animate-spin' : ''} />
            {scraping ? 'Syncing...' : 'Sync PPATK Token'}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg border border-slate-700 transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Scraper Info */}
        {scraperMessage && (
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-sm text-slate-300 flex justify-between items-center">
            <span>ℹ️ {scraperMessage}</span>
            <button onClick={() => setScraperMessage(null)} className="text-slate-500 hover:text-white">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Error Info */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg text-sm text-red-200 flex justify-between items-center">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Filters & Actions */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Cari Nama / Identitas</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ketik nama/NIK..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <Search size={16} className="absolute left-3 top-2.5 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Keterangan PEP</label>
              <select
                value={pepFilter}
                onChange={(e) => setPepFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none"
              >
                <option value="">Semua Kategori</option>
                <option value="Cadeb">Cadeb</option>
                <option value="Pasangan Cadeb">Pasangan Cadeb</option>
                <option value="Cadeb & Pasangan">Cadeb & Pasangan</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Kategori</label>
              <select
                value={kategoriFilter}
                onChange={(e) => setKategoriFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-white focus:outline-none"
              >
                <option value="">Semua</option>
                <option value="Calon Debitur">Calon Debitur</option>
                <option value="Debitur Existing">Debitur Existing</option>
                <option value="Karyawan">Karyawan</option>
                <option value="Rekanan">Rekanan</option>
              </select>
            </div>
          </div>

          <div>
            <button
              onClick={() => { resetForm(); setModalOpen(true); }}
              className="w-full md:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-md transition-colors"
            >
              <UserPlus size={16} />
              Tambah Kandidat
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          {loading ? (
            <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-3">
              <RefreshCw className="animate-spin text-blue-500" size={32} />
              <span>Memproses data...</span>
            </div>
          ) : candidates.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Belum ada data kandidat ditemukan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-xs font-semibold text-slate-400 tracking-wider">
                    <th className="px-5 py-3.5">Nama</th>
                    <th className="px-5 py-3.5">No. Identitas (NIK)</th>
                    <th className="px-5 py-3.5">Pasangan</th>
                    <th className="px-5 py-3.5">NIK Pasangan</th>
                    <th className="px-5 py-3.5">Kategori</th>
                    <th className="px-5 py-3.5">Status PEP</th>
                    <th className="px-5 py-3.5">Go Live</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm">
                  {candidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-4 font-semibold text-white">{candidate.namaCadeb}</td>
                      <td className="px-5 py-4 text-slate-300">{candidate.noIdentitas}</td>
                      <td className="px-5 py-4 text-slate-400">{candidate.namaPasangan || '-'}</td>
                      <td className="px-5 py-4 text-slate-400">{candidate.noIdentitasPasangan || '-'}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {candidate.kategori}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          candidate.keteranganPep !== 'Tidak Ada Indikasi'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {candidate.keteranganPep}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          candidate.goLive === 'Ya'
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {candidate.goLive}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(candidate)}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(candidate.id)}
                            className="p-1 hover:bg-slate-800 text-red-400 hover:text-red-300 rounded transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-white text-lg">
                {editCandidate ? 'Edit Data Kandidat' : 'Tambah Data Kandidat'}
              </h3>
              <button
                onClick={() => { setModalOpen(false); resetForm(); }}
                className="text-slate-500 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={formData.namaCadeb}
                    onChange={(e) => setFormData({ ...formData, namaCadeb: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500 text-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">NIK (Nomor Identitas)</label>
                  <input
                    type="text"
                    required
                    value={formData.noIdentitas}
                    onChange={(e) => setFormData({ ...formData, noIdentitas: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Nama Pasangan (Opsional)</label>
                  <input
                    type="text"
                    value={formData.namaPasangan}
                    onChange={(e) => setFormData({ ...formData, namaPasangan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">NIK Pasangan (Opsional)</label>
                  <input
                    type="text"
                    value={formData.noIdentitasPasangan}
                    onChange={(e) => setFormData({ ...formData, noIdentitasPasangan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-blue-500 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Kategori</label>
                  <select
                    value={formData.kategori}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none text-white"
                  >
                    <option value="Calon Debitur">Calon Debitur</option>
                    <option value="Debitur Existing">Debitur Existing</option>
                    <option value="Karyawan">Karyawan</option>
                    <option value="Rekanan">Rekanan</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Go Live</label>
                  <select
                    value={formData.goLive}
                    onChange={(e) => setFormData({ ...formData, goLive: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none text-white"
                  >
                    <option value="Ya">Ya</option>
                    <option value="Tidak">Tidak</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Status PEP</label>
                  <select
                    value={formData.keteranganPep}
                    onChange={(e) => setFormData({ ...formData, keteranganPep: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none text-white"
                  >
                    <option value="Tidak Ada Indikasi">Tidak Ada Indikasi</option>
                    <option value="Cadeb">Terindikasi Cadeb</option>
                    <option value="Pasangan Cadeb">Terindikasi Pasangan Cadeb</option>
                    <option value="Cadeb & Pasangan">Terindikasi Cadeb & Pasangan</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); resetForm(); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
