import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LogOut, Search, ShieldAlert, Cpu, RefreshCw, X, Edit2, Trash2,
  Users, FileText, UserCheck, LayoutDashboard, CloudUpload, 
  Database, FolderOpen, ClipboardList, Info, Plus, SlidersHorizontal, Settings
} from 'lucide-react';

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

interface DtotSuspect {
  id: number;
  nama: string;
  terdugaType: 'Orang' | 'Korporasi' | 'Tidak Terduga';
  kodeDensus: string | null;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  wnAsalNegara: string | null;
  deskripsi: string | null;
  alamat: string | null;
  createdAt: string;
  deletedAt: string | null;
  isPending: number;
}

interface PepApproval {
  id: number;
  candidateId: number;
  type: 'EDIT' | 'DELETE';
  oldData: string;
  newData: string;
  requesterId: number;
  l2Status: 'PENDING' | 'APPROVED' | 'REJECTED';
  l2Notes: string | null;
  l3Status: 'PENDING' | 'APPROVED' | 'REJECTED';
  l3Notes: string | null;
  createdAt: string;
}

interface DtotApproval {
  id: number;
  targetId: number;
  requestType: 'ADD' | 'EDIT' | 'DELETE';
  dataJson: string;
  requesterId: number;
  status: 'PENDING_SPV' | 'PENDING_MANAGER' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

interface ReksaloanAgreement {
  nama: string;
  ktp: string;
  no_kontrak: string;
  status: string;
  GoliveDate: string;
  cabang: string;
  pekerjaan: string;
  last_check: {
    hasil_dtot: string;
    hasil_pep: string;
    keterangan: string | null;
    checked_at: string;
  } | null;
}

export const Dashboard: React.FC = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Navigation Tab State aligned with PHP Sidebar
  // 'dtot_dashboard' | 'dtot_upload' | 'dtot_search' | 'pep_dashboard' | 'pep_search' | 'pengajuan_cek' | 'report_pengajuan' | 'reksaloan' | 'monthly_reports' | 'approvals' | 'users'
  const [activeTab, setActiveTab] = useState<string>('dtot_dashboard');

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token]);

  // ==========================================
  // STATE: DTTOT
  // ==========================================
  const [dtotData, setDtotData] = useState<DtotSuspect[]>([]);
  const [dtotSearch, setDtotSearch] = useState('');
  const [dtotTypeFilter, setDtotTypeFilter] = useState('');
  const [dtotStats, setDtotStats] = useState({ total: 0, orang: 0, korporasi: 0 });
  const [dtotLoading, setDtotLoading] = useState(false);
  const [dtotModalOpen, setDtotModalOpen] = useState(false);
  const [editDtotItem, setEditDtotItem] = useState<DtotSuspect | null>(null);
  const [dtotFormData, setDtotFormData] = useState({
    nama: '',
    terdugaType: 'Orang' as 'Orang' | 'Korporasi' | 'Tidak Terduga',
    kodeDensus: '',
    tempatLahir: '',
    tanggalLahir: '',
    wnAsalNegara: 'Indonesia',
    deskripsi: '',
    alamat: '',
  });

  // ==========================================
  // STATE: PEP
  // ==========================================
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [pepSearch, setPepSearch] = useState('');
  const [pepFilter, setPepFilter] = useState('');
  const [pepLoading, setPepLoading] = useState(false);
  const [pepModalOpen, setPepModalOpen] = useState(false);
  const [editCandidate, setEditCandidate] = useState<Candidate | null>(null);
  const [pepFormData, setPepFormData] = useState({
    namaCadeb: '',
    noIdentitas: '',
    namaPasangan: '',
    noIdentitasPasangan: '',
    keteranganPep: 'Tidak Ada Indikasi',
    goLive: 'Tidak',
    kategori: 'Calon Debitur',
  });

  // ==========================================
  // STATE: VERIFIKASI / PENGAJUAN
  // ==========================================
  const [screeningForm, setScreeningForm] = useState({
    noKontrak: '',
    nama: '',
    nik: '',
    kategori: 'Calon Debitur',
    keterangan: '',
  });
  const [screeningResults, setScreeningResults] = useState<{
    searched: boolean;
    pepMatches: Candidate[];
    dtotMatches: DtotSuspect[];
    scraperMatches: any[];
    scraperInfo: string | null;
  }>({
    searched: false,
    pepMatches: [],
    dtotMatches: [],
    scraperMatches: [],
    scraperInfo: null
  });
  const [screeningLoading, setScreeningLoading] = useState(false);
  const [hasilPep, setHasilPep] = useState('Tidak Terindikasi');
  const [hasilDtot, setHasilDtot] = useState('Tidak Terindikasi');
  const [dtotHistory, setDtotHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ==========================================
  // STATE: REKSALOAN
  // ==========================================
  const [reksaloanBranch, setReksaloanBranch] = useState('ALL');
  const [reksaloanBulan, setReksaloanBulan] = useState('06');
  const [reksaloanTahun, setReksaloanTahun] = useState('2026');
  const [reksaloanNama, setReksaloanNama] = useState('');
  const [reksaloanNik, setReksaloanNik] = useState('');
  const [reksaloanKontrak, setReksaloanKontrak] = useState('');
  const [reksaloanData, setReksaloanData] = useState<ReksaloanAgreement[]>([]);
  const [reksaloanLoading, setReksaloanLoading] = useState(false);
  const [reksaloanCekItem, setReksaloanCekItem] = useState<ReksaloanAgreement | null>(null);
  
  // ==========================================
  // STATE: PERSETUJUAN / APPROVALS
  // ==========================================
  const [pepApprovals, setPepApprovals] = useState<PepApproval[]>([]);
  const [dtotApprovals, setDtotApprovals] = useState<DtotApproval[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);

  const [scrapingTokenLoading, setScrapingTokenLoading] = useState(false);

  // ==========================================
  // FETCH DTTOT DATA
  // ==========================================
  const fetchDtotData = async () => {
    setDtotLoading(true);
    try {
      const params: any = {};
      if (dtotSearch && (activeTab === 'dtot_search' || activeTab === 'dtot_dashboard')) {
        params.search = dtotSearch;
      }
      if (dtotTypeFilter) params.type = dtotTypeFilter;

      const response = await axios.get('/api/dtot', {
        ...getAuthHeaders(),
        params
      });
      if (response.data.success) {
        setDtotData(response.data.data);
      }
    } catch (_) {}
    setDtotLoading(false);
  };

  const fetchDtotStats = async () => {
    try {
      const response = await axios.get('/api/dtot/stats', getAuthHeaders());
      if (response.data.success) {
        setDtotStats(response.data.stats);
      }
    } catch (_) {}
  };

  // ==========================================
  // FETCH PEP DATA
  // ==========================================
  const fetchCandidates = async () => {
    setPepLoading(true);
    try {
      const params: any = {};
      if (pepSearch && (activeTab === 'pep_search' || activeTab === 'pep_dashboard')) {
        params.search = pepSearch;
      }
      if (pepFilter) params.pepFilter = pepFilter;

      const response = await axios.get('/api/candidates', {
        ...getAuthHeaders(),
        params
      });
      if (response.data.success) {
        setCandidates(response.data.data);
      }
    } catch (_) {}
    setPepLoading(false);
  };

  // ==========================================
  // FETCH REKSALOAN AGREEMENTS (SIMULASI SQL SERVER)
  // ==========================================
  const fetchReksaloanAgreements = async () => {
    setReksaloanLoading(true);
    try {
      const params = {
        branch_id: reksaloanBranch,
        q_nama: reksaloanNama,
        q_nik: reksaloanNik,
        q_kontrak: reksaloanKontrak
      };
      const response = await axios.get('/api/dtot/reksaloan-list', {
        ...getAuthHeaders(),
        params
      });
      if (response.data.success) {
        setReksaloanData(response.data.data);
      }
    } catch (_) {}
    setReksaloanLoading(false);
  };

  // ==========================================
  // FETCH APPROVALS & HISTORY
  // ==========================================
  const fetchApprovals = async () => {
    if (user && user.level < 2) return;
    setApprovalsLoading(true);
    try {
      const pepRes = await axios.get('/api/approvals', getAuthHeaders());
      const dtotRes = await axios.get('/api/dtot/approvals', getAuthHeaders());
      if (pepRes.data.success) setPepApprovals(pepRes.data.data);
      if (dtotRes.data.success) setDtotApprovals(dtotRes.data.data);
    } catch (_) {}
    setApprovalsLoading(false);
  };

  const fetchDtotHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await axios.get('/api/dtot/checks/dtot', getAuthHeaders());
      if (response.data.success) {
        setDtotHistory(response.data.data);
      }
    } catch (_) {}
    setHistoryLoading(false);
  };

  // Trigger queries based on active Tab
  useEffect(() => {
    if (!token) return;
    if (activeTab === 'dtot_dashboard' || activeTab === 'dtot_search') {
      fetchDtotData();
      fetchDtotStats();
    } else if (activeTab === 'pep_dashboard' || activeTab === 'pep_search') {
      fetchCandidates();
    } else if (activeTab === 'report_pengajuan' || activeTab === 'pengajuan_cek') {
      fetchDtotHistory();
    } else if (activeTab === 'reksaloan') {
      fetchReksaloanAgreements();
    } else if (activeTab === 'approvals') {
      fetchApprovals();
    }
  }, [token, activeTab, dtotSearch, dtotTypeFilter, pepSearch, pepFilter]);

  // Sync session handler
  const handleSyncToken = async () => {
    setScrapingTokenLoading(true);
    try {
      const response = await axios.get('/api/scraper/token', getAuthHeaders());
      alert(response.data.message || 'Sesi PPATK berhasil diperbarui.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal sinkronisasi sesi PPATK.');
    } finally {
      setScrapingTokenLoading(false);
    }
  };

  // DTTOT Submit
  const handleDtotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editDtotItem) {
        const response = await axios.put(`/api/dtot/${editDtotItem.id}`, dtotFormData, getAuthHeaders());
        alert(response.data.message);
      } else {
        const response = await axios.post('/api/dtot', dtotFormData, getAuthHeaders());
        alert(response.data.message);
      }
      setDtotModalOpen(false);
      resetDtotForm();
      fetchDtotData();
      fetchDtotStats();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal menyimpan data DTTOT.');
    }
  };

  const resetDtotForm = () => {
    setDtotFormData({
      nama: '',
      terdugaType: 'Orang',
      kodeDensus: '',
      tempatLahir: '',
      tanggalLahir: '',
      wnAsalNegara: 'Indonesia',
      deskripsi: '',
      alamat: '',
    });
    setEditDtotItem(null);
  };

  const openDtotEdit = (item: DtotSuspect) => {
    setEditDtotItem(item);
    setDtotFormData({
      nama: item.nama,
      terdugaType: item.terdugaType,
      kodeDensus: item.kodeDensus || '',
      tempatLahir: item.tempatLahir || '',
      tanggalLahir: item.tanggalLahir ? new Date(item.tanggalLahir).toISOString().slice(0, 10) : '',
      wnAsalNegara: item.wnAsalNegara || '',
      deskripsi: item.deskripsi || '',
      alamat: item.alamat || '',
    });
    setDtotModalOpen(true);
  };

  const handleDtotDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data DTTOT ini?')) return;
    try {
      const response = await axios.delete(`/api/dtot/${id}`, getAuthHeaders());
      alert(response.data.message);
      fetchDtotData();
      fetchDtotStats();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal menghapus data DTTOT.');
    }
  };

  // PEP Submit
  const handlePepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editCandidate) {
        const response = await axios.put(`/api/candidates/${editCandidate.id}`, pepFormData, getAuthHeaders());
        alert(response.data.message);
      } else {
        const response = await axios.post('/api/candidates', pepFormData, getAuthHeaders());
        alert(response.data.message);
      }
      setPepModalOpen(false);
      resetPepForm();
      fetchCandidates();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal menyimpan data PEP.');
    }
  };

  const resetPepForm = () => {
    setPepFormData({
      namaCadeb: '',
      noIdentitas: '',
      namaPasangan: '',
      noIdentitasPasangan: '',
      keteranganPep: 'Tidak Ada Indikasi',
      goLive: 'Tidak',
      kategori: 'Calon Debitur',
    });
    setEditCandidate(null);
  };

  const openPepEdit = (candidate: Candidate) => {
    setEditCandidate(candidate);
    setPepFormData({
      namaCadeb: candidate.namaCadeb,
      noIdentitas: candidate.noIdentitas,
      namaPasangan: candidate.namaPasangan || '',
      noIdentitasPasangan: candidate.noIdentitasPasangan || '',
      keteranganPep: candidate.keteranganPep,
      goLive: candidate.goLive,
      kategori: candidate.kategori,
    });
    setPepModalOpen(true);
  };

  const handlePepDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data PEP ini?')) return;
    try {
      const response = await axios.delete(`/api/candidates/${id}`, getAuthHeaders());
      alert(response.data.message);
      fetchCandidates();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal menghapus data PEP.');
    }
  };

  // Screening Submit
  const handleScreeningSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screeningForm.nama || !screeningForm.nik) {
      alert('Nama dan NIK harus diisi.');
      return;
    }

    setScreeningLoading(true);
    try {
      const pepRes = await axios.get('/api/candidates', {
        ...getAuthHeaders(),
        params: { search: screeningForm.nama }
      });

      const dtotRes = await axios.get('/api/dtot', {
        ...getAuthHeaders(),
        params: { search: screeningForm.nama }
      });

      let scraperMatches: any[] = [];
      let scraperInfo = 'Offline';
      try {
        const scraperRes = await axios.post('/api/scraper/search', { nik: screeningForm.nik }, getAuthHeaders());
        if (scraperRes.data.success) {
          scraperMatches = scraperRes.data.data?.data || [];
          scraperInfo = scraperRes.data.data?.pesan_sistem || 'OK';
        }
      } catch (err: any) {
        scraperInfo = err.response?.data?.error || 'PPATK connection timeout';
      }

      const pepMatches = pepRes.data.success 
        ? pepRes.data.data.filter((c: Candidate) => 
            c.namaCadeb.toLowerCase().includes(screeningForm.nama.toLowerCase()) || c.noIdentitas === screeningForm.nik
          )
        : [];

      const dtotMatches = dtotRes.data.success
        ? dtotRes.data.data.filter((d: DtotSuspect) =>
            d.nama.toLowerCase().includes(screeningForm.nama.toLowerCase()) || d.kodeDensus === screeningForm.nik
          )
        : [];

      setScreeningResults({
        searched: true,
        pepMatches,
        dtotMatches,
        scraperMatches,
        scraperInfo
      });

      setHasilPep(pepMatches.length > 0 || scraperMatches.length > 0 ? 'Terindikasi' : 'Tidak Terindikasi');
      setHasilDtot(dtotMatches.length > 0 ? 'Terindikasi' : 'Tidak Terindikasi');
    } catch (_) {
      alert('Error saat mengecek database.');
    } finally {
      setScreeningLoading(false);
    }
  };

  const handleSaveScreeningReport = async () => {
    try {
      const payload = {
        namaCadeb: screeningForm.nama,
        nik: screeningForm.nik,
        hasilPengecekan: hasilDtot,
        hasilPep: hasilPep,
        kategori: screeningForm.kategori,
        keterangan: screeningForm.keterangan || `Pengecekan manual internal. DTTOT: ${hasilDtot}, PEP: ${hasilPep}`,
      };

      const response = await axios.post('/api/dtot/checks/dtot', payload, getAuthHeaders());
      alert(response.data.message || 'Laporan verifikasi disimpan.');
      fetchDtotHistory();
      
      setScreeningResults({
        searched: false,
        pepMatches: [],
        dtotMatches: [],
        scraperMatches: [],
        scraperInfo: null
      });
      setScreeningForm({
        noKontrak: '',
        nama: '',
        nik: '',
        kategori: 'Calon Debitur',
        keterangan: '',
      });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal menyimpan laporan.');
    }
  };

  // Reksaloan Check Submit
  const handleReksaloanCekSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reksaloanCekItem) return;

    try {
      const payload = {
        noKontrak: reksaloanCekItem.no_kontrak,
        namaDebitur: reksaloanCekItem.nama,
        nik: reksaloanCekItem.ktp,
        hasilDtot: hasilDtot,
        hasilPep: hasilPep,
        keterangan: screeningForm.keterangan || `Cek Reksaloan. DTTOT: ${hasilDtot}, PEP: ${hasilPep}`,
      };

      const response = await axios.post('/api/dtot/checks/reksaloan', payload, getAuthHeaders());
      alert(response.data.message || 'Hasil cek Reksaloan berhasil disimpan!');
      setReksaloanCekItem(null);
      fetchReksaloanAgreements();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal menyimpan hasil cek Reksaloan.');
    }
  };

  // Approvals actions
  const handlePepApprovalAction = async (id: number, action: 'APPROVE' | 'REJECT') => {
    try {
      const response = await axios.post(`/api/approvals/${id}/action`, { action }, getAuthHeaders());
      alert(response.data.message);
      fetchApprovals();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal memproses approval.');
    }
  };

  const handleDtotApprovalAction = async (id: number, action: 'APPROVE' | 'REJECT') => {
    try {
      const response = await axios.post(`/api/dtot/approvals/${id}/action`, { action }, getAuthHeaders());
      alert(response.data.message);
      fetchApprovals();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal memproses approval.');
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-5 shrink-0 z-10 shadow-xl">
        <div className="space-y-6 overflow-y-auto">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="bg-indigo-650 p-2 rounded-lg text-white">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wider text-white">DTTOT & PEP SYSTEM</h1>
              <p className="text-xxs text-slate-500 font-mono">INTEGRASI V2</p>
            </div>
          </div>

          {/* Menus Grouped by Legacy Sections */}
          <nav className="space-y-4">
            
            {/* GROUP DTTOT */}
            <div className="space-y-1">
              <h5 className="text-xxs font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">Dashboard DTTOT</h5>
              <button
                onClick={() => { setActiveTab('dtot_dashboard'); setDtotSearch(''); setDtotTypeFilter(''); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'dtot_dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <LayoutDashboard size={14} />
                <span>Dashboard DTTOT</span>
              </button>
              {user && (user.level === 1 || user.level === 4) && (
                <button
                  onClick={() => setActiveTab('dtot_upload')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                    activeTab === 'dtot_upload' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <CloudUpload size={14} />
                  <span>Upload Data</span>
                </button>
              )}
              <button
                onClick={() => { setActiveTab('dtot_search'); setDtotSearch(''); setDtotTypeFilter(''); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'dtot_search' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Search size={14} />
                <span>Search Data DTTOT</span>
              </button>
            </div>

            {/* GROUP PEP */}
            <div className="space-y-1">
              <h5 className="text-xxs font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">Dashboard PEP</h5>
              <button
                onClick={() => { setActiveTab('pep_dashboard'); setPepSearch(''); setPepFilter(''); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'pep_dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <LayoutDashboard size={14} />
                <span>Dashboard PEP</span>
              </button>
              <button
                onClick={() => { setActiveTab('pep_search'); setPepSearch(''); setPepFilter(''); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'pep_search' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Search size={14} />
                <span>Search Data PEP</span>
              </button>
            </div>

            {/* INTEGRASI & VERIFIKASI */}
            <div className="space-y-1">
              <h5 className="text-xxs font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">Input / Report</h5>
              <button
                onClick={() => {
                  setActiveTab('pengajuan_cek');
                  setScreeningForm({ noKontrak: '', nama: '', nik: '', kategori: 'Calon Debitur', keterangan: '' });
                  setScreeningResults({ searched: false, pepMatches: [], dtotMatches: [], scraperMatches: [], scraperInfo: null });
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'pengajuan_cek' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <ClipboardList size={14} />
                <span>Pengajuan Cek Debitur</span>
              </button>
              <button
                onClick={() => setActiveTab('report_pengajuan')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'report_pengajuan' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <FileText size={14} />
                <span>Report Hasil Cek PEP</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('reksaloan');
                  setReksaloanBranch('ALL');
                  setReksaloanNama('');
                  setReksaloanNik('');
                  setReksaloanKontrak('');
                  fetchReksaloanAgreements();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'reksaloan' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Database size={14} />
                <span>Cek Data Reksaloan</span>
              </button>
              <button
                onClick={() => setActiveTab('monthly_reports')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'monthly_reports' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <FolderOpen size={14} />
                <span>Laporan Bulanan</span>
              </button>
            </div>

            {/* ADMINISTRATIVE WORKFLOW */}
            <div className="space-y-1">
              <h5 className="text-xxs font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">Administrasi</h5>
              {user && user.level >= 2 && (
                <button
                  onClick={() => { setActiveTab('approvals'); fetchApprovals(); }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                    activeTab === 'approvals' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <UserCheck size={14} />
                    <span>Persetujuan (Approvals)</span>
                  </div>
                  {(pepApprovals.length + dtotApprovals.length) > 0 && (
                    <span className="bg-red-500 text-white text-xxs font-bold px-1.5 py-0.5 rounded-full">
                      {pepApprovals.length + dtotApprovals.length}
                    </span>
                  )}
                </button>
              )}
              {user && user.level === 4 && (
                <button
                  onClick={() => setActiveTab('users')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                    activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Settings size={14} />
                  <span>User Management</span>
                </button>
              )}
            </div>

          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="border-t border-slate-800 pt-4 space-y-4 shrink-0">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-xs text-indigo-400">
              {user?.username ? user.username.slice(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-white truncate">{user?.namaLengkap}</h4>
              <p className="text-xxs text-slate-500 truncate">Level {user?.level} (Role)</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-850 hover:bg-red-950/20 hover:text-red-400 border border-slate-800 hover:border-red-900/30 text-xs font-medium rounded-xl transition-all"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header */}
        <header className="border-b border-slate-900 bg-slate-900/40 backdrop-blur px-8 py-5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide uppercase">
              {activeTab === 'dtot_dashboard' && 'Dashboard DTTOT'}
              {activeTab === 'dtot_upload' && 'Upload Database Terduga Teroris'}
              {activeTab === 'dtot_search' && 'Pencarian Terduga Teroris'}
              {activeTab === 'pep_dashboard' && 'Dashboard Politically Exposed Persons (PEP)'}
              {activeTab === 'pep_search' && 'Pencarian Database PEP'}
              {activeTab === 'pengajuan_cek' && 'Pengajuan Cek Debitur Baru'}
              {activeTab === 'report_pengajuan' && 'Report Hasil Cek PEP & DTTOT'}
              {activeTab === 'reksaloan' && 'Cek Debitur Reksaloan (SQL Server)'}
              {activeTab === 'monthly_reports' && 'Laporan Bulanan Automasi'}
              {activeTab === 'approvals' && 'Persetujuan Perubahan Data'}
              {activeTab === 'users' && 'Manajemen Pengguna'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Sistem Skrining & Monitoring Internal Bank PEP & DTTOT</p>
          </div>

          <button
            onClick={handleSyncToken}
            disabled={scrapingTokenLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-indigo-900/30 hover:border-indigo-900/60 text-xs font-semibold rounded-xl transition-all"
          >
            <Cpu size={14} className={scrapingTokenLoading ? 'animate-spin' : ''} />
            <span>Sync PPATK Session</span>
          </button>
        </header>

        {/* Content Body */}
        <div className="p-8 max-w-7xl w-full mx-auto flex-1 space-y-6">

          {/* ======================================================== */}
          {/* VIEW: DTTOT DASHBOARD */}
          {/* ======================================================== */}
          {activeTab === 'dtot_dashboard' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl flex items-center justify-between shadow-md">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total DTTOT</p>
                    <h3 className="text-2xl font-black text-white mt-1.5">{dtotStats.total}</h3>
                    <p className="text-xxs text-emerald-400 font-semibold mt-1">✓ Aktif dalam sistem</p>
                  </div>
                  <div className="bg-indigo-600/10 p-3.5 rounded-2xl text-indigo-400">
                    <FileText size={20} />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl flex items-center justify-between shadow-md">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Individu (Orang)</p>
                    <h3 className="text-2xl font-black text-emerald-400 mt-1.5">{dtotStats.orang}</h3>
                    <p className="text-xxs text-slate-500 mt-1">Daftar terduga perorangan</p>
                  </div>
                  <div className="bg-emerald-600/10 p-3.5 rounded-2xl text-emerald-400">
                    <Users size={20} />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl flex items-center justify-between shadow-md">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Korporasi / Organisasi</p>
                    <h3 className="text-2xl font-black text-amber-400 mt-1.5">{dtotStats.korporasi}</h3>
                    <p className="text-xxs text-slate-500 mt-1">Daftar afiliasi korporat</p>
                  </div>
                  <div className="bg-amber-600/10 p-3.5 rounded-2xl text-amber-400">
                    <ShieldAlert size={20} />
                  </div>
                </div>
              </div>

              {/* Recent DTTOT list */}
              <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-md">
                <div className="px-6 py-4 bg-slate-950 border-b border-slate-850 flex justify-between items-center">
                  <h4 className="font-bold text-white text-sm">Data Terduga Terbaru</h4>
                  <button onClick={() => setActiveTab('dtot_search')} className="text-indigo-400 text-xs font-bold hover:underline">Lihat Semua →</button>
                </div>
                {dtotLoading ? (
                  <div className="p-8 text-center text-slate-500 flex justify-center items-center gap-2">
                    <RefreshCw className="animate-spin text-indigo-500" size={20} />
                    <span>Memproses data DTTOT...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-950/60 border-b border-slate-850 text-slate-400 font-semibold uppercase">
                          <th className="px-5 py-3">Nama</th>
                          <th className="px-5 py-3">Tipe</th>
                          <th className="px-5 py-3 font-mono">Kode Densus</th>
                          <th className="px-5 py-3">Negara</th>
                          <th className="px-5 py-3 max-w-xs">Deskripsi & Alamat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-300">
                        {dtotData.slice(0, 10).map((d) => (
                          <tr key={d.id} className="hover:bg-slate-850/10">
                            <td className="px-5 py-3.5 font-bold text-white">{d.nama}</td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 rounded text-xxs font-bold ${d.terdugaType === 'Orang' ? 'bg-indigo-550/10 text-indigo-400' : 'bg-amber-550/10 text-amber-400'}`}>
                                {d.terdugaType}
                              </span>
                            </td>
                            <td className="px-5 py-3 font-mono">{d.kodeDensus || '-'}</td>
                            <td className="px-5 py-3">{d.wnAsalNegara || '-'}</td>
                            <td className="px-5 py-3 max-w-xs truncate">{d.deskripsi}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW: DTTOT SEARCH / EDIT DATA */}
          {/* ======================================================== */}
          {(activeTab === 'dtot_search') && (
            <div className="space-y-6">
              {/* Search bar */}
              <div className="flex gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-850 shadow-md items-center">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Ketik nama terduga teroris, NIK, densus kode..."
                    value={dtotSearch}
                    onChange={(e) => setDtotSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <Search size={14} className="absolute left-3 top-3.5 text-slate-500" />
                </div>
                <button
                  onClick={() => { resetDtotForm(); setDtotModalOpen(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all"
                >
                  <Plus size={14} />
                  <span>Tambah Data Manual</span>
                </button>
              </div>

              {/* Table */}
              <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-md">
                {dtotLoading ? (
                  <div className="p-8 text-center text-slate-500 flex justify-center items-center gap-2">
                    <RefreshCw className="animate-spin text-indigo-500" size={20} />
                    <span>Mencari data DTTOT...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 font-semibold uppercase">
                          <th className="px-5 py-3">Nama Terduga</th>
                          <th className="px-5 py-3">Tipe</th>
                          <th className="px-5 py-3">Kode Densus</th>
                          <th className="px-5 py-3">Tgl Lahir</th>
                          <th className="px-5 py-3">Warganegara</th>
                          <th className="px-5 py-3 max-w-sm">Alamat & Keterangan</th>
                          <th className="px-5 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-300">
                        {dtotData.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-850/10">
                            <td className="px-5 py-3.5 font-bold text-white">
                              <div>{d.nama}</div>
                              {d.isPending === 1 && (
                                <span className="bg-amber-500/10 text-amber-400 text-xxs font-bold px-1.5 py-0.5 rounded mt-1 inline-block">
                                  Menunggu Approval
                                </span>
                              )}
                            </td>
                            <td>
                              <span className={`px-2 py-0.5 rounded text-xxs font-semibold ${d.terdugaType === 'Orang' ? 'bg-indigo-650/10 text-indigo-400' : 'bg-amber-600/10 text-amber-400'}`}>
                                {d.terdugaType}
                              </span>
                            </td>
                            <td className="font-mono text-slate-350">{d.kodeDensus || '-'}</td>
                            <td>{d.tanggalLahir ? new Date(d.tanggalLahir).toLocaleDateString('id-ID') : '-'}</td>
                            <td>{d.wnAsalNegara || '-'}</td>
                            <td className="max-w-sm whitespace-normal leading-relaxed text-slate-400 py-3.5">
                              <strong>Alamat:</strong> {d.alamat || '-'}<br/>
                              <strong>Desc:</strong> {d.deskripsi || '-'}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => openDtotEdit(d)}
                                  disabled={d.isPending === 1}
                                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => handleDtotDelete(d.id)}
                                  disabled={d.isPending === 1}
                                  className="p-1 hover:bg-slate-800 text-red-400 hover:text-red-300 rounded"
                                >
                                  <Trash2 size={13} />
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
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW: DTTOT CSV UPLOAD DATA */}
          {/* ======================================================== */}
          {activeTab === 'dtot_upload' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="bg-slate-900 border border-slate-850 p-8 rounded-3xl shadow-lg space-y-6 text-center">
                <div className="mx-auto w-16 h-16 bg-indigo-600/10 text-indigo-400 flex items-center justify-center rounded-2xl">
                  <CloudUpload size={36} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Unggah Berkas DTTOT</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Pilih file CSV DTTOT hasil rilis Densus 88 atau PPATK untuk diimpor secara otomatis ke database sistem.
                  </p>
                </div>
                <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-8 transition-colors cursor-pointer bg-slate-950">
                  <input type="file" className="hidden" id="csv-file-input" accept=".csv" />
                  <label htmlFor="csv-file-input" className="cursor-pointer space-y-2 block">
                    <span className="text-xs font-semibold text-slate-300 block">Tarik dan jatuhkan file di sini</span>
                    <span className="text-xxs text-slate-500 block">Hanya berkas format .csv (Maksimal 10MB)</span>
                  </label>
                </div>
                <button 
                  onClick={() => alert('Sistem simulasi: File CSV berhasil di-parsing. 0 record baru masuk ke approval.')}
                  className="px-6 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                >
                  Proses & Impor Berkas
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW: PEP DASHBOARD */}
          {/* ======================================================== */}
          {activeTab === 'pep_dashboard' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-md">
                <div className="px-6 py-4 bg-slate-950 border-b border-slate-850 flex justify-between items-center">
                  <h4 className="font-bold text-white text-sm">Data Kandidat PEP Terakhir</h4>
                  <button onClick={() => setActiveTab('pep_search')} className="text-indigo-400 text-xs font-bold hover:underline">Lihat Semua →</button>
                </div>
                {pepLoading ? (
                  <div className="p-8 text-center text-slate-500 flex justify-center items-center gap-2">
                    <RefreshCw className="animate-spin text-indigo-500" size={20} />
                    <span>Memproses data PEP...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-950/60 border-b border-slate-850 text-slate-400 font-semibold uppercase">
                          <th className="px-5 py-3">Nama</th>
                          <th className="px-5 py-3">NIK</th>
                          <th className="px-5 py-3">Pasangan</th>
                          <th className="px-5 py-3">Kategori</th>
                          <th className="px-5 py-3">Status Indikasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-350">
                        {candidates.slice(0, 10).map((c) => (
                          <tr key={c.id} className="hover:bg-slate-850/10">
                            <td className="px-5 py-3.5 font-bold text-white">{c.namaCadeb}</td>
                            <td className="px-5 py-3 font-mono">{c.noIdentitas}</td>
                            <td className="px-5 py-3">{c.namaPasangan || '-'}</td>
                            <td className="px-5 py-3">{c.kategori}</td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 rounded text-xxs font-semibold border ${
                                c.keteranganPep !== 'Tidak Ada Indikasi' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}>
                                {c.keteranganPep}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW: PEP SEARCH / CRUD */}
          {/* ======================================================== */}
          {activeTab === 'pep_search' && (
            <div className="space-y-6">
              <div className="flex gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-850 shadow-md items-center">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Ketik nama kandidat PEP, NIK, status..."
                    value={pepSearch}
                    onChange={(e) => setPepSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <Search size={14} className="absolute left-3 top-3.5 text-slate-500" />
                </div>
                <button
                  onClick={() => { resetPepForm(); setPepModalOpen(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all"
                >
                  <Plus size={14} />
                  <span>Tambah Kandidat PEP</span>
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-md">
                {pepLoading ? (
                  <div className="p-8 text-center text-slate-500 flex justify-center items-center gap-2">
                    <RefreshCw className="animate-spin text-indigo-500" size={20} />
                    <span>Mencari data PEP...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 font-semibold uppercase">
                          <th className="px-5 py-3">Nama</th>
                          <th className="px-5 py-3">NIK</th>
                          <th className="px-5 py-3">Pasangan</th>
                          <th className="px-5 py-3">Kategori</th>
                          <th className="px-5 py-3">Status Indikasi</th>
                          <th className="px-5 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-333">
                        {candidates.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-850/10">
                            <td className="px-5 py-3.5 font-bold text-white">{c.namaCadeb}</td>
                            <td className="px-5 py-3 font-mono">{c.noIdentitas}</td>
                            <td className="px-5 py-3">{c.namaPasangan || '-'}</td>
                            <td className="px-5 py-3">{c.kategori}</td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 rounded text-xxs font-semibold border ${
                                c.keteranganPep !== 'Tidak Ada Indikasi' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}>
                                {c.keteranganPep}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => openPepEdit(c)}
                                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => handlePepDelete(c.id)}
                                  className="p-1 hover:bg-slate-800 text-red-400 hover:text-red-300 rounded"
                                >
                                  <Trash2 size={13} />
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
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW: PENGAJUAN CEK DEBITUR BARU */}
          {/* ======================================================== */}
          {activeTab === 'pengajuan_cek' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 bg-slate-900 border border-slate-850 p-6 rounded-2xl shadow-md space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <ClipboardList className="text-indigo-400" size={16} />
                  <h3 className="font-bold text-white text-sm">Cek Database Gabungan</h3>
                </div>

                <form onSubmit={handleScreeningSearch} className="space-y-4 text-xs">
                  <div>
                    <label className="text-slate-400 mb-1.5 block font-semibold">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={screeningForm.nama}
                      onChange={(e) => setScreeningForm({ ...screeningForm, nama: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 focus:outline-none focus:border-indigo-500 text-white"
                      placeholder="Masukkan nama lengkap..."
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 mb-1.5 block font-semibold">NIK (Nomor KTP)</label>
                    <input
                      type="text"
                      required
                      value={screeningForm.nik}
                      onChange={(e) => setScreeningForm({ ...screeningForm, nik: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 focus:outline-none focus:border-indigo-500 text-white font-mono"
                      placeholder="Masukkan 16 digit NIK..."
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 mb-1.5 block font-semibold">Kategori Pemeriksaan</label>
                    <select
                      value={screeningForm.kategori}
                      onChange={(e) => setScreeningForm({ ...screeningForm, kategori: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 focus:outline-none text-white"
                    >
                      <option value="Calon Debitur">Calon Debitur</option>
                      <option value="Debitur Existing">Debitur Existing</option>
                      <option value="Karyawan">Karyawan</option>
                      <option value="Rekanan">Rekanan</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 mb-1.5 block font-semibold">Keterangan Tambahan</label>
                    <textarea
                      value={screeningForm.keterangan}
                      onChange={(e) => setScreeningForm({ ...screeningForm, keterangan: e.target.value })}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 focus:outline-none focus:border-indigo-500 text-white"
                      placeholder="Tulis catatan di sini..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={screeningLoading}
                    className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    {screeningLoading ? (
                      <>
                        <RefreshCw className="animate-spin text-white" size={14} />
                        <span>Mengecek Database...</span>
                      </>
                    ) : (
                      <span>Jalankan Skrining</span>
                    )}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2">
                {screeningResults.searched ? (
                  <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl shadow-md space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="font-bold text-white text-sm">Hasil Skrining PEP & DTTOT</h3>
                      <button 
                        onClick={() => setScreeningResults({ searched: false, pepMatches: [], dtotMatches: [], scraperMatches: [], scraperInfo: null })}
                        className="text-slate-500 hover:text-white"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className={`p-4 rounded-xl border ${
                        screeningResults.pepMatches.length > 0 ? 'bg-amber-950/10 border-amber-900/30 text-amber-300' : 'bg-emerald-950/10 border-emerald-900/30 text-emerald-300'
                      }`}>
                        <div className="font-bold font-mono">PEP DATABASE LOKAL</div>
                        <div className="text-lg font-black mt-1.5">
                          {screeningResults.pepMatches.length > 0 ? `${screeningResults.pepMatches.length} Data Cocok` : 'BERSIH'}
                        </div>
                      </div>

                      <div className={`p-4 rounded-xl border ${
                        screeningResults.dtotMatches.length > 0 ? 'bg-red-950/10 border-red-900/30 text-red-300' : 'bg-emerald-950/10 border-emerald-900/30 text-emerald-300'
                      }`}>
                        <div className="font-bold font-mono">DTTOT DATABASE LOKAL</div>
                        <div className="text-lg font-black mt-1.5">
                          {screeningResults.dtotMatches.length > 0 ? `${screeningResults.dtotMatches.length} Data Cocok` : 'BERSIH'}
                        </div>
                      </div>

                      <div className={`p-4 rounded-xl border ${
                        screeningResults.scraperMatches.length > 0 ? 'bg-amber-950/10 border-amber-900/30 text-amber-300' : 'bg-emerald-950/10 border-emerald-900/30 text-emerald-300'
                      }`}>
                        <div className="font-bold font-mono">KONEKSI PPATK ONLINE</div>
                        <div className="text-lg font-black mt-1.5">
                          {screeningResults.scraperMatches.length > 0 ? 'TERINDIKASI' : 'BERSIH'}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-850 rounded-xl border border-slate-800 space-y-3 text-xs">
                      <div className="font-bold text-white">Simpan Log Laporan Keputusan:</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-slate-400 mb-1 block">Status Akhir PEP</label>
                          <select value={hasilPep} onChange={(e) => setHasilPep(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white">
                            <option value="Tidak Terindikasi">Tidak Terindikasi</option>
                            <option value="Terindikasi">Terindikasi</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-slate-400 mb-1 block">Status Akhir DTTOT</label>
                          <select value={hasilDtot} onChange={(e) => setHasilDtot(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white">
                            <option value="Tidak Terindikasi">Tidak Terindikasi</option>
                            <option value="Terindikasi">Terindikasi</option>
                          </select>
                        </div>
                      </div>
                      <button onClick={handleSaveScreeningReport} className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all">
                        Simpan Laporan Hasil Cek
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl text-center text-slate-500 py-12">
                    <Info className="mx-auto text-slate-700 mb-2" size={28} />
                    <h4 className="font-bold text-white text-xs">Menunggu Input Pemeriksaan</h4>
                    <p className="text-xxs text-slate-500 mt-1">Gunakan form di sebelah kiri untuk memasukkan data debitur baru dan menjalankan skrining silang.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW: REPORT HASIL CEK PEP */}
          {/* ======================================================== */}
          {activeTab === 'report_pengajuan' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-md">
                <div className="px-6 py-4 bg-slate-950 border-b border-slate-850 flex justify-between items-center">
                  <h4 className="font-bold text-white text-sm">Riwayat Pengecekan Sistem</h4>
                </div>
                {historyLoading ? (
                  <div className="p-8 text-center text-slate-500 flex justify-center items-center gap-2">
                    <RefreshCw className="animate-spin text-indigo-500" size={20} />
                    <span>Memuat log data...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-950/60 border-b border-slate-850 text-slate-400 font-semibold uppercase">
                          <th className="px-4 py-3">Tanggal Periksa</th>
                          <th className="px-4 py-3">Nama Cadeb</th>
                          <th className="px-4 py-3">NIK</th>
                          <th className="px-4 py-3">Hasil PEP</th>
                          <th className="px-4 py-3">Hasil DTTOT</th>
                          <th className="px-4 py-3">Diperiksa Oleh</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-350">
                        {dtotHistory.map((h, idx) => (
                          <tr key={idx} className="hover:bg-slate-850/10">
                            <td className="px-4 py-3 font-mono">{new Date(h.createdAt).toLocaleDateString('id-ID')}</td>
                            <td className="px-4 py-3 font-bold text-white">{h.namaCadeb}</td>
                            <td className="px-4 py-3 font-mono">{h.nik}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-xxs font-bold ${h.hasilPep === 'Terindikasi' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                                {h.hasilPep}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-xxs font-bold ${h.hasilPengecekan === 'Terindikasi' ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                                {h.hasilPengecekan}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-400">{h.checkerName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW: CEK DATA REKSALOAN */}
          {/* ======================================================== */}
          {activeTab === 'reksaloan' && (
            <div className="space-y-6">
              
              {/* Filter bar */}
              <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl shadow-md space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <SlidersHorizontal className="text-indigo-400" size={16} />
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider">Filter Data Cabang & Golive</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 text-xxs font-semibold">
                  <div>
                    <label className="text-slate-400 block mb-1.5 uppercase">Cabang / Branch</label>
                    <select value={reksaloanBranch} onChange={(e) => setReksaloanBranch(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-white">
                      <option value="ALL">-- SEMUA CABANG --</option>
                      <option value="001">Cabang Tenggarong</option>
                      <option value="002">Cabang Jakarta Pusat</option>
                      <option value="003">Cabang Palembang</option>
                      <option value="004">Cabang Bandar Lampung</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1.5 uppercase">Bulan Golive</label>
                    <select value={reksaloanBulan} onChange={(e) => setReksaloanBulan(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-white">
                      <option value="01">Januari</option>
                      <option value="02">Februari</option>
                      <option value="03">Maret</option>
                      <option value="04">April</option>
                      <option value="05">Mei</option>
                      <option value="06">Juni</option>
                      <option value="07">Juli</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1.5 uppercase">Tahun</label>
                    <select value={reksaloanTahun} onChange={(e) => setReksaloanTahun(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-white">
                      <option value="2026">2026</option>
                      <option value="2025">2025</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1.5 uppercase">Nama Debitur</label>
                    <input type="text" value={reksaloanNama} onChange={(e) => setReksaloanNama(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-white font-normal" placeholder="Nama..."/>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1.5 uppercase">NIK / KTP</label>
                    <input type="text" value={reksaloanNik} onChange={(e) => setReksaloanNik(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-white font-normal font-mono" placeholder="NIK..."/>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1.5 uppercase">No Kontrak</label>
                    <input type="text" value={reksaloanKontrak} onChange={(e) => setReksaloanKontrak(e.target.value)} className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-white font-normal" placeholder="No Kontrak..."/>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 text-xxs font-bold">
                  <button onClick={fetchReksaloanAgreements} className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg transition-all flex items-center gap-1.5">
                    <Search size={12} />
                    Tampilkan Data
                  </button>
                  <button onClick={() => alert('Simulasi: Exporting excel data untuk ' + reksaloanData.length + ' agreement...')} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all flex items-center gap-1.5">
                    <Database size={12} />
                    Export Excel
                  </button>
                </div>
              </div>

              {/* Grid List Reksaloan */}
              <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-md">
                {reksaloanLoading ? (
                  <div className="p-8 text-center text-slate-500 flex justify-center items-center gap-2">
                    <RefreshCw className="animate-spin text-indigo-500" size={20} />
                    <span>Mengekstrak data Reksaloan SQL Server...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 font-semibold uppercase">
                          <th className="px-4 py-3">Cabang</th>
                          <th className="px-4 py-3">Nama Debitur</th>
                          <th className="px-4 py-3">Nomor KTP</th>
                          <th className="px-4 py-3">No. Kontrak</th>
                          <th className="px-4 py-3">Golive Date</th>
                          <th className="px-4 py-3">Pekerjaan</th>
                          <th className="px-4 py-3">Sistem Cek (DTOT/PEP)</th>
                          <th className="px-4 py-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-350">
                        {reksaloanData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-850/10">
                            <td className="px-4 py-3 font-semibold">{row.cabang}</td>
                            <td className="px-4 py-3 font-bold text-white">{row.nama}</td>
                            <td className="px-4 py-3 font-mono">{row.ktp}</td>
                            <td className="px-4 py-3 font-mono text-indigo-400 font-bold">{row.no_kontrak}</td>
                            <td className="px-4 py-3 font-mono">{row.GoliveDate}</td>
                            <td className="px-4 py-3">{row.pekerjaan}</td>
                            <td className="px-4 py-3">
                              {row.last_check ? (
                                <div className="space-y-1 text-xxs font-bold">
                                  <div className="flex gap-2">
                                    <span className="text-slate-500 font-mono">DTTOT:</span>
                                    <span className={row.last_check.hasil_dtot === 'Terindikasi' ? 'text-red-400' : 'text-emerald-400'}>{row.last_check.hasil_dtot}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <span className="text-slate-500 font-mono">PEP:</span>
                                    <span className={row.last_check.hasil_pep === 'Terindikasi' ? 'text-amber-400' : 'text-emerald-400'}>{row.last_check.hasil_pep}</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-550 italic text-xxs font-semibold">Belum dicek</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => {
                                  setReksaloanCekItem(row);
                                  setHasilDtot(row.last_check?.hasil_dtot || 'Tidak Terindikasi');
                                  setHasilPep(row.last_check?.hasil_pep || 'Tidak Terindikasi');
                                  setScreeningForm(prev => ({ ...prev, keterangan: row.last_check?.keterangan || '' }));
                                }}
                                className="px-3 py-1 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg text-xxs shadow"
                              >
                                Cek
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW: LAPORAN BULANAN AUTOMASI */}
          {/* ======================================================== */}
          {activeTab === 'monthly_reports' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="bg-slate-900 border border-slate-850 p-8 rounded-3xl shadow-md text-center space-y-4">
                <div className="mx-auto w-14 h-14 bg-indigo-600/10 text-indigo-400 flex items-center justify-center rounded-2xl">
                  <FolderOpen size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-md">Laporan Hasil Skrining Bulanan</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Unduh file Excel kompilasi riwayat verifikasi bulanan yang siap diaudit oleh Otoritas Jasa Keuangan (OJK) atau audit internal.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xxs font-semibold">
                  <div>
                    <label className="text-slate-400 block mb-1">Pilih Bulan</label>
                    <select className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-white">
                      <option value="06">Juni</option>
                      <option value="05">Mei</option>
                      <option value="04">April</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Tahun</label>
                    <select className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-white">
                      <option value="2026">2026</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => alert('Simulasi: Mengunduh berkas Laporan_Kompilasi_Skrining.xlsx')}
                  className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md"
                >
                  Unduh Laporan Audit Bulanan
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW: PERSETUJUAN (APPROVALS) */}
          {/* ======================================================== */}
          {activeTab === 'approvals' && user && user.level >= 2 && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* PEP approvals */}
              <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl shadow-md space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <UserCheck className="text-amber-500" size={16} />
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider">Persetujuan Perubahan Data PEP</h3>
                </div>

                {approvalsLoading ? (
                  <div className="p-8 text-center text-slate-550 flex justify-center items-center gap-2">
                    <RefreshCw className="animate-spin text-amber-500" size={18} />
                    <span>Memproses approvals...</span>
                  </div>
                ) : pepApprovals.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-xs font-semibold">Tidak ada permintaan persetujuan PEP pending.</div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 font-semibold uppercase">
                          <th className="px-4 py-3">Tanggal</th>
                          <th className="px-4 py-3">Tipe Aksi</th>
                          <th className="px-4 py-3">Perubahan</th>
                          <th className="px-4 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-350">
                        {pepApprovals.map((req) => {
                          const oldDataObj = JSON.parse(req.oldData || '{}');
                          const newDataObj = JSON.parse(req.newData || '{}');
                          
                          return (
                            <tr key={req.id} className="hover:bg-slate-850/10">
                              <td className="px-4 py-3 font-mono">{new Date(req.createdAt).toLocaleDateString('id-ID')}</td>
                              <td className="px-4 py-3 font-bold">
                                <span className={`px-2 py-0.5 rounded font-semibold text-xxs ${req.type === 'DELETE' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                  {req.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 space-y-1 leading-relaxed">
                                {req.type === 'DELETE' ? (
                                  <div>Menghapus PEP: <strong>{oldDataObj.namaCadeb}</strong> ({oldDataObj.noIdentitas})</div>
                                ) : (
                                  <div>
                                    Update pada <strong>{oldDataObj.namaCadeb}</strong> ({oldDataObj.noIdentitas}):<br/>
                                    {Object.keys(newDataObj).map((key) => {
                                      if (newDataObj[key] !== oldDataObj[key]) {
                                        return (
                                          <div key={key} className="text-xxs">
                                            • <span className="font-semibold">{key}</span>: <s>{oldDataObj[key] || '-'}</s> → <span className="text-emerald-400">{newDataObj[key]}</span>
                                          </div>
                                        );
                                      }
                                      return null;
                                    })}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => handlePepApprovalAction(req.id, 'APPROVE')} className="px-2.5 py-1 bg-emerald-650 hover:bg-emerald-700 text-white rounded font-bold text-xxs shadow">Approve</button>
                                  <button onClick={() => handlePepApprovalAction(req.id, 'REJECT')} className="px-2.5 py-1 bg-red-650 hover:bg-red-700 text-white rounded font-bold text-xxs shadow">Reject</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* DTTOT approvals */}
              <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl shadow-md space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <UserCheck className="text-amber-500" size={16} />
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider">Persetujuan Perubahan Data DTTOT</h3>
                </div>

                {approvalsLoading ? (
                  <div className="p-8 text-center text-slate-555 flex justify-center items-center gap-2">
                    <RefreshCw className="animate-spin text-amber-500" size={18} />
                    <span>Memproses approvals...</span>
                  </div>
                ) : dtotApprovals.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-xs font-semibold">Tidak ada permintaan persetujuan DTTOT pending.</div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 font-semibold uppercase">
                          <th className="px-4 py-3">Tanggal</th>
                          <th className="px-4 py-3">Tipe Aksi</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Perubahan</th>
                          <th className="px-4 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-350">
                        {dtotApprovals.map((req) => {
                          const dataNew = JSON.parse(req.dataJson || '{}');
                          return (
                            <tr key={req.id} className="hover:bg-slate-850/10">
                              <td className="px-4 py-3 font-mono">{new Date(req.createdAt).toLocaleDateString('id-ID')}</td>
                              <td className="px-4 py-3 font-bold">
                                <span className={`px-2 py-0.5 rounded font-semibold text-xxs ${req.requestType === 'DELETE' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                  {req.requestType}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-semibold text-amber-400">{req.status}</td>
                              <td className="px-4 py-3 leading-relaxed">
                                {req.requestType === 'DELETE' ? (
                                  <div>Menghapus data DTTOT Suspect ID: <strong>{req.targetId}</strong></div>
                                ) : (
                                  <div>
                                    Edit DTTOT Suspect ID: {req.targetId}<br/>
                                    <strong>Nama Baru:</strong> {dataNew.nama}<br/>
                                    <strong>Alamat Baru:</strong> {dataNew.alamat || '-'}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => handleDtotApprovalAction(req.id, 'APPROVE')} className="px-2.5 py-1 bg-emerald-650 hover:bg-emerald-700 text-white rounded font-bold text-xxs shadow">Approve</button>
                                  <button onClick={() => handleDtotApprovalAction(req.id, 'REJECT')} className="px-2.5 py-1 bg-red-650 hover:bg-red-700 text-white rounded font-bold text-xxs shadow">Reject</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW: USER MANAGEMENT MOCKUP */}
          {/* ======================================================== */}
          {activeTab === 'users' && user && user.level === 4 && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl shadow-md space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h4 className="font-bold text-white text-sm">Pengaturan Pengguna Sistem</h4>
                </div>
                <div className="text-xs text-slate-400 py-4">
                  Fitur administrator untuk mengedit level, kredensial password, dan menambah personil analis data.
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT PEP CANDIDATE */}
      {/* ======================================================== */}
      {pepModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-zoomIn">
            <div className="px-6 py-4.5 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-white text-md">
                {editCandidate ? 'Edit Data Kandidat PEP' : 'Tambah Data Kandidat PEP'}
              </h3>
              <button onClick={() => { setPepModalOpen(false); resetPepForm(); }} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePepSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-slate-400 mb-1.5 block font-semibold">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={pepFormData.namaCadeb}
                    onChange={(e) => setPepFormData({ ...pepFormData, namaCadeb: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 text-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-slate-400 mb-1.5 block font-semibold">NIK (Nomor Identitas)</label>
                  <input
                    type="text"
                    required
                    value={pepFormData.noIdentitas}
                    onChange={(e) => setPepFormData({ ...pepFormData, noIdentitas: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 mb-1.5 block font-semibold">Nama Pasangan (Opsional)</label>
                  <input
                    type="text"
                    value={pepFormData.namaPasangan}
                    onChange={(e) => setPepFormData({ ...pepFormData, namaPasangan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 mb-1.5 block font-semibold">NIK Pasangan (Opsional)</label>
                  <input
                    type="text"
                    value={pepFormData.noIdentitasPasangan}
                    onChange={(e) => setPepFormData({ ...pepFormData, noIdentitasPasangan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 mb-1.5 block font-semibold">Kategori</label>
                  <select
                    value={pepFormData.kategori}
                    onChange={(e) => setPepFormData({ ...pepFormData, kategori: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 focus:outline-none text-white"
                  >
                    <option value="Calon Debitur">Calon Debitur</option>
                    <option value="Debitur Existing">Debitur Existing</option>
                    <option value="Karyawan">Karyawan</option>
                    <option value="Rekanan">Rekanan</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 mb-1.5 block font-semibold">Go Live</label>
                  <select
                    value={pepFormData.goLive}
                    onChange={(e) => setPepFormData({ ...pepFormData, goLive: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 focus:outline-none text-white"
                  >
                    <option value="Ya">Ya</option>
                    <option value="Tidak">Tidak</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-slate-400 mb-1.5 block font-semibold">Status Indikasi PEP</label>
                  <select
                    value={pepFormData.keteranganPep}
                    onChange={(e) => setPepFormData({ ...pepFormData, keteranganPep: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 focus:outline-none text-white"
                  >
                    <option value="Tidak Ada Indikasi">Tidak Ada Indikasi</option>
                    <option value="Cadeb">Terindikasi Calon Debitur</option>
                    <option value="Pasangan Cadeb">Terindikasi Pasangan</option>
                    <option value="Cadeb & Pasangan">Terindikasi Keduanya</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-850 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setPepModalOpen(false); resetPepForm(); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 text-xxs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xxs font-bold rounded-xl shadow-lg"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT DTTOT SUSPECT */}
      {/* ======================================================== */}
      {dtotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-zoomIn">
            <div className="px-6 py-4.5 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-white text-md">
                {editDtotItem ? 'Edit Data DTTOT Suspect' : 'Tambah Data DTTOT Suspect'}
              </h3>
              <button onClick={() => { setDtotModalOpen(false); resetDtotForm(); }} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleDtotSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-slate-400 mb-1.5 block font-semibold">Nama Terduga / Korporasi</label>
                  <input
                    type="text"
                    required
                    value={dtotFormData.nama}
                    onChange={(e) => setDtotFormData({ ...dtotFormData, nama: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 focus:outline-none focus:border-emerald-500 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 mb-1.5 block font-semibold">Tipe Terduga</label>
                  <select
                    value={dtotFormData.terdugaType}
                    onChange={(e) => setDtotFormData({ ...dtotFormData, terdugaType: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 focus:outline-none text-white"
                  >
                    <option value="Orang">Orang (Individu)</option>
                    <option value="Korporasi">Korporasi / Organisasi</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 mb-1.5 block font-semibold">Kode Densus</label>
                  <input
                    type="text"
                    value={dtotFormData.kodeDensus}
                    onChange={(e) => setDtotFormData({ ...dtotFormData, kodeDensus: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 focus:outline-none focus:border-emerald-500 text-white font-mono"
                    placeholder="Contoh: IDD-032"
                  />
                </div>

                <div>
                  <label className="text-slate-400 mb-1.5 block font-semibold">Tempat Lahir</label>
                  <input
                    type="text"
                    value={dtotFormData.tempatLahir}
                    onChange={(e) => setDtotFormData({ ...dtotFormData, tempatLahir: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 focus:outline-none focus:border-emerald-500 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 mb-1.5 block font-semibold">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={dtotFormData.tanggalLahir}
                    onChange={(e) => setDtotFormData({ ...dtotFormData, tanggalLahir: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 focus:outline-none focus:border-emerald-500 text-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-slate-400 mb-1.5 block font-semibold">Kewarganegaraan / Asal Negara</label>
                  <input
                    type="text"
                    value={dtotFormData.wnAsalNegara}
                    onChange={(e) => setDtotFormData({ ...dtotFormData, wnAsalNegara: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 focus:outline-none focus:border-emerald-500 text-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-slate-400 mb-1.5 block font-semibold">Deskripsi</label>
                  <textarea
                    value={dtotFormData.deskripsi}
                    onChange={(e) => setDtotFormData({ ...dtotFormData, deskripsi: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 focus:outline-none focus:border-emerald-500 text-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-slate-400 mb-1.5 block font-semibold">Alamat Terduga</label>
                  <textarea
                    value={dtotFormData.alamat}
                    onChange={(e) => setDtotFormData({ ...dtotFormData, alamat: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 focus:outline-none focus:border-emerald-500 text-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-850 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setDtotModalOpen(false); resetDtotForm(); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 text-xxs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xxs font-bold rounded-xl shadow-lg"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CHECK DATA AGREEMENT REKSALOAN */}
      {/* ======================================================== */}
      {reksaloanCekItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-zoomIn flex flex-col md:flex-row">
            
            {/* Left section: Debitur Details & decision */}
            <div className="flex-1 p-6 space-y-4 border-r border-slate-800">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm">Verifikasi Reksaloan</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block uppercase text-xxs">NAMA DEBITUR</span>
                  <span className="text-sm font-bold text-white">{reksaloanCekItem.nama}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block uppercase text-xxs">NOMOR KTP (NIK)</span>
                  <span className="text-sm font-bold text-white font-mono">{reksaloanCekItem.ktp}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-500 font-semibold block uppercase text-xxs">NO. KONTRAK</span>
                    <span className="font-bold text-white font-mono">{reksaloanCekItem.no_kontrak}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block uppercase text-xxs">PEKERJAAN</span>
                    <span className="font-bold text-white">{reksaloanCekItem.pekerjaan}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleReksaloanCekSubmit} className="space-y-3 text-xs pt-4 border-t border-slate-800">
                <div>
                  <label className="text-slate-400 mb-1 block">Hasil Cek DTTOT</label>
                  <select value={hasilDtot} onChange={(e) => setHasilDtot(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white">
                    <option value="Tidak Terindikasi">Tidak Terindikasi</option>
                    <option value="Terindikasi">Terindikasi</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 mb-1 block">Hasil Cek PEP</label>
                  <select value={hasilPep} onChange={(e) => setHasilPep(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white">
                    <option value="Tidak Terindikasi">Tidak Terindikasi</option>
                    <option value="Terindikasi">Terindikasi</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 mb-1 block">Keterangan Hasil Cek</label>
                  <textarea
                    value={screeningForm.keterangan}
                    onChange={(e) => setScreeningForm({ ...screeningForm, keterangan: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-white"
                  />
                </div>
                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setReksaloanCekItem(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 font-semibold rounded-lg text-xxs">Batal</button>
                  <button type="submit" className="px-5 py-2 bg-indigo-650 hover:bg-indigo-750 text-white font-bold rounded-lg text-xxs">Simpan Hasil Cek</button>
                </div>
              </form>
            </div>

            {/* Right section: Cocok di DTTOT (local matching view) */}
            <div className="flex-1 p-6 bg-slate-950/40 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="font-bold text-slate-400 text-sm">Pencocokan Database Otomatis</h3>
              </div>

              <div className="space-y-4 text-xs">
                {/* DTTOT Matches */}
                <div>
                  <h4 className="font-bold text-white mb-2 text-xxs uppercase tracking-wider text-slate-400">Cocok di Database DTTOT</h4>
                  <div className="max-h-40 overflow-y-auto border border-slate-850 rounded-xl bg-slate-950">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-xxs text-slate-500 uppercase font-semibold">
                          <th className="px-3 py-2">Nama</th>
                          <th className="px-3 py-2">Tipe</th>
                          <th className="px-3 py-2">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dtotData.filter(d => d.nama.toLowerCase().includes(reksaloanCekItem.nama.toLowerCase())).length === 0 ? (
                          <tr>
                            <td colSpan={3} className="text-center py-4 text-slate-600">Tidak ada kecocokan DTTOT.</td>
                          </tr>
                        ) : (
                          dtotData.filter(d => d.nama.toLowerCase().includes(reksaloanCekItem.nama.toLowerCase())).map((d, i) => (
                            <tr key={i} className="bg-red-500/5 text-red-350 border-b border-slate-900">
                              <td className="px-3 py-2 font-bold">{d.nama}</td>
                              <td className="px-3 py-2">{d.terdugaType}</td>
                              <td className="px-3 py-2 max-w-xxs truncate">{d.deskripsi}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PEP Matches */}
                <div>
                  <h4 className="font-bold text-white mb-2 text-xxs uppercase tracking-wider text-slate-400">Cocok di Database PEP</h4>
                  <div className="max-h-40 overflow-y-auto border border-slate-850 rounded-xl bg-slate-950">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-xxs text-slate-500 uppercase font-semibold">
                          <th className="px-3 py-2">Nama</th>
                          <th className="px-3 py-2">NIK</th>
                          <th className="px-3 py-2">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidates.filter(c => c.namaCadeb.toLowerCase().includes(reksaloanCekItem.nama.toLowerCase())).length === 0 ? (
                          <tr>
                            <td colSpan={3} className="text-center py-4 text-slate-600">Tidak ada kecocokan PEP.</td>
                          </tr>
                        ) : (
                          candidates.filter(c => c.namaCadeb.toLowerCase().includes(reksaloanCekItem.nama.toLowerCase())).map((c, i) => (
                            <tr key={i} className="bg-amber-500/5 text-amber-350 border-b border-slate-900">
                              <td className="px-3 py-2 font-bold">{c.namaCadeb}</td>
                              <td className="px-3 py-2 font-mono">{c.noIdentitas}</td>
                              <td className="px-3 py-2 max-w-xxs truncate">{c.keteranganPep}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
