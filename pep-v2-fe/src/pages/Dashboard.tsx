import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LogOut, Search, UserPlus, ShieldAlert, Cpu, RefreshCw, X, Edit2, Trash2,
  Users, FileText, CheckSquare, UserCheck
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

export const Dashboard: React.FC = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  // Navigation Tab State: 'pep' | 'dtot' | 'screening' | 'approvals'
  const [activeTab, setActiveTab] = useState<'pep' | 'dtot' | 'screening' | 'approvals'>('pep');

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ==========================================
  // STATE & EFFECTS: PEP TAB
  // ==========================================
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [pepSearch, setPepSearch] = useState('');
  const [pepFilter, setPepFilter] = useState('');
  const [pepKategoriFilter, setPepKategoriFilter] = useState('');
  const [pepLoading, setPepLoading] = useState(false);
  const [pepError, setPepError] = useState<string | null>(null);
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

  const fetchCandidates = async () => {
    setPepLoading(true);
    setPepError(null);
    try {
      const params: any = {};
      if (pepSearch) params.search = pepSearch;
      if (pepFilter) params.pepFilter = pepFilter;
      if (pepKategoriFilter) params.kategoriFilter = pepKategoriFilter;

      const response = await axios.get('/api/candidates', {
        ...getAuthHeaders(),
        params
      });

      if (response.data.success) {
        setCandidates(response.data.data);
      } else {
        setPepError(response.data.error || 'Gagal memuat data PEP.');
      }
    } catch (err: any) {
      setPepError(err.response?.data?.error || 'Terjadi kesalahan sistem PEP.');
    } finally {
      setPepLoading(false);
    }
  };

  useEffect(() => {
    if (token && activeTab === 'pep') {
      fetchCandidates();
    }
  }, [token, activeTab, pepSearch, pepFilter, pepKategoriFilter]);

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
      alert(err.response?.data?.error || 'Gagal menyimpan data kandidat.');
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
    if (!confirm('Apakah Anda yakin ingin menghapus kandidat ini?')) return;
    try {
      const response = await axios.delete(`/api/candidates/${id}`, getAuthHeaders());
      alert(response.data.message);
      fetchCandidates();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal menghapus data.');
    }
  };


  // ==========================================
  // STATE & EFFECTS: DTTOT TAB
  // ==========================================
  const [dtotData, setDtotData] = useState<DtotSuspect[]>([]);
  const [dtotSearch, setDtotSearch] = useState('');
  const [dtotTypeFilter, setDtotTypeFilter] = useState('');
  const [dtotStats, setDtotStats] = useState({ total: 0, orang: 0, korporasi: 0 });
  const [dtotLoading, setDtotLoading] = useState(false);
  const [dtotError, setDtotError] = useState<string | null>(null);
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

  const fetchDtotData = async () => {
    setDtotLoading(true);
    setDtotError(null);
    try {
      const params: any = {};
      if (dtotSearch) params.search = dtotSearch;
      if (dtotTypeFilter) params.type = dtotTypeFilter;

      const response = await axios.get('/api/dtot', {
        ...getAuthHeaders(),
        params
      });

      if (response.data.success) {
        setDtotData(response.data.data);
      } else {
        setDtotError(response.data.error || 'Gagal memuat data DTTOT.');
      }
    } catch (err: any) {
      setDtotError(err.response?.data?.error || 'Terjadi kesalahan sistem DTTOT.');
    } finally {
      setDtotLoading(false);
    }
  };

  const fetchDtotStats = async () => {
    try {
      const response = await axios.get('/api/dtot/stats', getAuthHeaders());
      if (response.data.success) {
        setDtotStats(response.data.stats);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (token && activeTab === 'dtot') {
      fetchDtotData();
      fetchDtotStats();
    }
  }, [token, activeTab, dtotSearch, dtotTypeFilter]);

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


  // ==========================================
  // STATE & EFFECTS: SCREENING (VERIFIKASI GABUNGAN)
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
  const [scrapingTokenLoading, setScrapingTokenLoading] = useState(false);
  
  // Results status options
  const [hasilPep, setHasilPep] = useState('Tidak Terindikasi');
  const [hasilDtot, setHasilDtot] = useState('Tidak Terindikasi');
  
  // Check logs history
  const [historyTab, setHistoryTab] = useState<'dtot' | 'reksaloan'>('dtot');
  const [dtotHistory, setDtotHistory] = useState<any[]>([]);
  const [reksaloanHistory, setReksaloanHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchCheckHistory = async () => {
    setHistoryLoading(true);
    try {
      const path = historyTab === 'dtot' ? '/api/dtot/checks/dtot' : '/api/dtot/checks/reksaloan';
      const response = await axios.get(path, getAuthHeaders());
      if (response.data.success) {
        if (historyTab === 'dtot') setDtotHistory(response.data.data);
        else setReksaloanHistory(response.data.data);
      }
    } catch (_) {}
    setHistoryLoading(false);
  };

  useEffect(() => {
    if (token && activeTab === 'screening') {
      fetchCheckHistory();
    }
  }, [token, activeTab, historyTab]);

  const handleScreeningSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screeningForm.nama || !screeningForm.nik) {
      alert('Nama dan NIK harus diisi untuk pencarian screening.');
      return;
    }

    setScreeningLoading(true);
    try {
      // 1. Search local PEP candidates
      const pepRes = await axios.get('/api/candidates', {
        ...getAuthHeaders(),
        params: { search: screeningForm.nama }
      });

      // 2. Search local DTTOT suspects
      const dtotRes = await axios.get('/api/dtot', {
        ...getAuthHeaders(),
        params: { search: screeningForm.nama }
      });

      // 3. Search online via PPATK Scraper API
      let scraperMatches: any[] = [];
      let scraperInfo = 'Pencarian online gagal';
      try {
        const scraperRes = await axios.post('/api/scraper/search', { nik: screeningForm.nik }, getAuthHeaders());
        if (scraperRes.data.success) {
          scraperMatches = scraperRes.data.data?.data || [];
          scraperInfo = scraperRes.data.data?.pesan_sistem || 'Sukses';
        }
      } catch (err: any) {
        scraperInfo = err.response?.data?.error || 'Scraper offline/timeout';
      }

      // Filter local matches exactly to double check
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

      // Auto-suggest results based on checks
      setHasilPep(pepMatches.length > 0 || scraperMatches.length > 0 ? 'Terindikasi' : 'Tidak Terindikasi');
      setHasilDtot(dtotMatches.length > 0 ? 'Terindikasi' : 'Tidak Terindikasi');

    } catch (err) {
      alert('Gagal memproses screening.');
    } finally {
      setScreeningLoading(false);
    }
  };

  const handleSaveScreeningReport = async () => {
    try {
      const payload: any = {
        namaCadeb: screeningForm.nama,
        nik: screeningForm.nik,
        hasilPengecekan: hasilDtot,
        hasilPep: hasilPep,
        kategori: screeningForm.kategori,
        keterangan: screeningForm.keterangan || `Diperiksa secara mandiri. PEP: ${hasilPep}, DTTOT: ${hasilDtot}`,
      };

      let savePath = '/api/dtot/checks/dtot';
      
      // If contract number is filled, use reksaloan endpoint
      if (screeningForm.noKontrak) {
        savePath = '/api/dtot/checks/reksaloan';
        payload.noKontrak = screeningForm.noKontrak;
        payload.namaDebitur = screeningForm.nama;
        payload.hasilDtot = hasilDtot;
      }

      const response = await axios.post(savePath, payload, getAuthHeaders());
      alert(response.data.message || 'Laporan berhasil disimpan.');
      
      // Refresh checks history
      fetchCheckHistory();
      
      // Clear results
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
      alert(err.response?.data?.error || 'Gagal menyimpan laporan verifikasi.');
    }
  };

  const handleSyncToken = async () => {
    setScrapingTokenLoading(true);
    try {
      const response = await axios.get('/api/scraper/token', getAuthHeaders());
      alert(response.data.message || 'Token PPATK berhasil disinkronisasi.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal sinkronisasi token PPATK.');
    } finally {
      setScrapingTokenLoading(false);
    }
  };


  // ==========================================
  // STATE & EFFECTS: APPROVALS TAB
  // ==========================================
  const [pepApprovals, setPepApprovals] = useState<PepApproval[]>([]);
  const [dtotApprovals, setDtotApprovals] = useState<DtotApproval[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);

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

  useEffect(() => {
    if (token && activeTab === 'approvals' && user && user.level >= 2) {
      fetchApprovals();
    }
  }, [token, activeTab]);

  const handlePepApprovalAction = async (id: number, action: 'APPROVE' | 'REJECT') => {
    if (!confirm(`Apakah Anda yakin ingin menindaklanjuti dengan status ${action}?`)) return;
    try {
      const response = await axios.post(`/api/approvals/${id}/action`, { action }, getAuthHeaders());
      alert(response.data.message);
      fetchApprovals();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal merespon permintaan.');
    }
  };

  const handleDtotApprovalAction = async (id: number, action: 'APPROVE' | 'REJECT') => {
    if (!confirm(`Apakah Anda yakin ingin menindaklanjuti dengan status ${action}?`)) return;
    try {
      const response = await axios.post(`/api/dtot/approvals/${id}/action`, { action }, getAuthHeaders());
      alert(response.data.message);
      fetchApprovals();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gagal merespon permintaan.');
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-5 shrink-0 z-10 shadow-xl">
        <div className="space-y-8">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 px-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <ShieldAlert size={20} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-md font-bold tracking-wider text-white">SISTEM SCREENING</h1>
              <p className="text-xxs text-slate-500 font-mono">VERSION 2.0</p>
            </div>
          </div>

          {/* Menus */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('pep')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                activeTab === 'pep' 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Users size={18} />
              <span>Sistem PEP</span>
            </button>

            <button
              onClick={() => setActiveTab('dtot')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                activeTab === 'dtot' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FileText size={18} />
              <span>Sistem DTTOT</span>
            </button>

            <button
              onClick={() => setActiveTab('screening')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                activeTab === 'screening' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <CheckSquare size={18} />
              <span>Verifikasi & Cek</span>
            </button>

            {user && user.level >= 2 && (
              <button
                onClick={() => setActiveTab('approvals')}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  activeTab === 'approvals' 
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <UserCheck size={18} />
                  <span>Pending Approvals</span>
                </div>
                {(pepApprovals.length + dtotApprovals.length) > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {pepApprovals.length + dtotApprovals.length}
                  </span>
                )}
              </button>
            )}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="border-t border-slate-800 pt-4 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-blue-400">
              {user?.username ? user.username.slice(0,2).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-bold text-white truncate">{user?.namaLengkap}</h4>
              <p className="text-xs text-slate-500 truncate">Level {user?.level} (Checker)</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-850 hover:bg-red-950/20 hover:text-red-400 border border-slate-800 hover:border-red-900/30 text-sm font-medium rounded-xl transition-all"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header */}
        <header className="border-b border-slate-900 bg-slate-900/40 backdrop-blur px-8 py-5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              {activeTab === 'pep' && 'Sistem Politically Exposed Persons (PEP)'}
              {activeTab === 'dtot' && 'Sistem Daftar Terduga Teroris (DTTOT)'}
              {activeTab === 'screening' && 'Screening & Verifikasi Mandiri'}
              {activeTab === 'approvals' && 'Approval Management Center'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Kelola data pemantauan internal bank dan sinkronisasi scraper PPATK</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncToken}
              disabled={scrapingTokenLoading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-blue-400 border border-blue-900/30 hover:border-blue-900/60 text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
            >
              <Cpu size={16} className={scrapingTokenLoading ? 'animate-spin' : ''} />
              <span>{scrapingTokenLoading ? 'Syncing...' : 'Sync PPATK Session'}</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-8 max-w-7xl w-full mx-auto flex-1 space-y-6">

          {/* ======================================================== */}
          {/* TAB 1: SYSTEM PEP PANEL */}
          {/* ======================================================== */}
          {activeTab === 'pep' && (
            <div className="space-y-6">
              {pepError && (
                <div className="bg-red-950/20 border border-red-900/30 p-4 rounded-xl text-sm text-red-300 flex justify-between items-center">
                  <span>⚠️ {pepError}</span>
                  <button onClick={() => setPepError(null)} className="text-red-400 hover:text-red-200">
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-slate-900 p-5 rounded-2xl border border-slate-850 shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 w-full">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5 font-medium">Cari Nama / NIK</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Cari..."
                        value={pepSearch}
                        onChange={(e) => setPepSearch(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <Search size={16} className="absolute left-3 top-2.5 text-slate-500" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5 font-medium">Kategori PEP</label>
                    <select
                      value={pepFilter}
                      onChange={(e) => setPepFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm text-white focus:outline-none"
                    >
                      <option value="">Semua Status</option>
                      <option value="Tidak Ada Indikasi">Tidak Ada Indikasi</option>
                      <option value="Cadeb">Terindikasi Cadeb</option>
                      <option value="Pasangan Cadeb">Terindikasi Pasangan Cadeb</option>
                      <option value="Cadeb & Pasangan">Terindikasi Keduanya</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5 font-medium">Kategori Debitur</label>
                    <select
                      value={pepKategoriFilter}
                      onChange={(e) => setPepKategoriFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm text-white focus:outline-none"
                    >
                      <option value="">Semua Kategori</option>
                      <option value="Calon Debitur">Calon Debitur</option>
                      <option value="Debitur Existing">Debitur Existing</option>
                      <option value="Karyawan">Karyawan</option>
                      <option value="Rekanan">Rekanan</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => { resetPepForm(); setPepModalOpen(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/10 transition-all"
                >
                  <UserPlus size={16} />
                  <span>Tambah PEP</span>
                </button>
              </div>

              {/* Data Table */}
              <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-lg">
                {pepLoading ? (
                  <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
                    <RefreshCw className="animate-spin text-blue-500" size={32} />
                    <span>Memproses data...</span>
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 font-medium">
                    Belum ada data kandidat PEP ditemukan.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-850 text-xs font-semibold text-slate-400 tracking-wider">
                          <th className="px-6 py-4">Nama Kandidat</th>
                          <th className="px-6 py-4">NIK</th>
                          <th className="px-6 py-4">Pasangan</th>
                          <th className="px-6 py-4">NIK Pasangan</th>
                          <th className="px-6 py-4">Kategori</th>
                          <th className="px-6 py-4">Status PEP</th>
                          <th className="px-6 py-4">Go Live</th>
                          <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-sm">
                        {candidates.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-850/20 transition-colors">
                            <td className="px-6 py-4 font-semibold text-white">{c.namaCadeb}</td>
                            <td className="px-6 py-4 text-slate-300 font-mono">{c.noIdentitas}</td>
                            <td className="px-6 py-4 text-slate-400">{c.namaPasangan || '-'}</td>
                            <td className="px-6 py-4 text-slate-500 font-mono">{c.noIdentitasPasangan || '-'}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                {c.kategori}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                c.keteranganPep !== 'Tidak Ada Indikasi'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}>
                                {c.keteranganPep}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                                c.goLive === 'Ya' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {c.goLive}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => openPepEdit(c)}
                                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  onClick={() => handlePepDelete(c.id)}
                                  className="p-1.5 hover:bg-slate-800 text-red-400 hover:text-red-300 rounded-lg transition-colors"
                                >
                                  <Trash2 size={15} />
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
          {/* TAB 2: SYSTEM DTTOT PANEL */}
          {/* ======================================================== */}
          {activeTab === 'dtot' && (
            <div className="space-y-6">
              {dtotError && (
                <div className="bg-red-950/20 border border-red-900/30 p-4 rounded-xl text-sm text-red-300 flex justify-between items-center">
                  <span>⚠️ {dtotError}</span>
                  <button onClick={() => setDtotError(null)} className="text-red-400 hover:text-red-200">
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl flex items-center justify-between shadow-md">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total DTTOT</p>
                    <h3 className="text-2xl font-black text-white mt-1.5">{dtotStats.total}</h3>
                    <p className="text-xxs text-emerald-400 font-semibold mt-1">✓ Aktif dalam sistem</p>
                  </div>
                  <div className="bg-blue-600/10 p-3.5 rounded-2xl text-blue-400">
                    <FileText size={24} />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl flex items-center justify-between shadow-md">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Individu (Orang)</p>
                    <h3 className="text-2xl font-black text-emerald-400 mt-1.5">{dtotStats.orang}</h3>
                    <p className="text-xxs text-slate-500 mt-1">Daftar terduga perorangan</p>
                  </div>
                  <div className="bg-emerald-600/10 p-3.5 rounded-2xl text-emerald-400">
                    <Users size={24} />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl flex items-center justify-between shadow-md">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Korporasi / Organisasi</p>
                    <h3 className="text-2xl font-black text-amber-400 mt-1.5">{dtotStats.korporasi}</h3>
                    <p className="text-xxs text-slate-500 mt-1">Daftar afiliasi korporat</p>
                  </div>
                  <div className="bg-amber-600/10 p-3.5 rounded-2xl text-amber-400">
                    <ShieldAlert size={24} />
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 items-end justify-between bg-slate-900 p-5 rounded-2xl border border-slate-850 shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5 font-medium">Cari Terduga (Nama / Kode / Alamat)</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ketik kata kunci pencarian..."
                        value={dtotSearch}
                        onChange={(e) => setDtotSearch(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-555"
                      />
                      <Search size={16} className="absolute left-3 top-2.5 text-slate-500" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5 font-medium">Tipe Terduga</label>
                    <select
                      value={dtotTypeFilter}
                      onChange={(e) => setDtotTypeFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm text-white focus:outline-none"
                    >
                      <option value="">Semua Tipe</option>
                      <option value="Orang">Orang (Individu)</option>
                      <option value="Korporasi">Korporasi / Organisasi</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => { resetDtotForm(); setDtotModalOpen(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-500/10 transition-all"
                >
                  <UserPlus size={16} />
                  <span>Tambah DTTOT</span>
                </button>
              </div>

              {/* Data Table */}
              <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden shadow-lg">
                {dtotLoading ? (
                  <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
                    <RefreshCw className="animate-spin text-emerald-500" size={32} />
                    <span>Memproses data DTTOT...</span>
                  </div>
                ) : dtotData.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 font-medium">
                    Belum ada data DTTOT ditemukan.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-850 text-xs font-semibold text-slate-400 tracking-wider">
                          <th className="px-6 py-4">Nama Terduga</th>
                          <th className="px-6 py-4">Tipe</th>
                          <th className="px-6 py-4">Kode Densus</th>
                          <th className="px-6 py-4">Tempat/Tgl Lahir</th>
                          <th className="px-6 py-4">Kewarganegaraan</th>
                          <th className="px-6 py-4 max-w-xs">Deskripsi & Alamat</th>
                          <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-sm">
                        {dtotData.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-850/20 transition-colors">
                            <td className="px-6 py-4 font-semibold text-white">
                              <div>{d.nama}</div>
                              {d.isPending === 1 && (
                                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xxs font-bold px-1.5 py-0.5 rounded mt-1 inline-block">
                                  Menunggu Approval
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                                d.terdugaType === 'Orang' ? 'bg-indigo-650/10 text-indigo-400' : 'bg-amber-550/10 text-amber-400'
                              }`}>
                                {d.terdugaType}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-slate-350">{d.kodeDensus || '-'}</td>
                            <td className="px-6 py-4 text-slate-400">
                              {d.tempatLahir || '-'}
                              {d.tanggalLahir && ` / ${new Date(d.tanggalLahir).toLocaleDateString('id-ID')}`}
                            </td>
                            <td className="px-6 py-4 text-slate-300">{d.wnAsalNegara || '-'}</td>
                            <td className="px-6 py-4 max-w-xs text-xs text-slate-400 truncate-lines-2 leading-relaxed">
                              <strong>Desc:</strong> {d.deskripsi || '-'}<br/>
                              <strong>Alamat:</strong> {d.alamat || '-'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => openDtotEdit(d)}
                                  disabled={d.isPending === 1}
                                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors disabled:opacity-30"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  onClick={() => handleDtotDelete(d.id)}
                                  disabled={d.isPending === 1}
                                  className="p-1.5 hover:bg-slate-800 text-red-400 hover:text-red-300 rounded-lg transition-colors disabled:opacity-30"
                                >
                                  <Trash2 size={15} />
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
          {/* TAB 3: SCREENING PANEL */}
          {/* ======================================================== */}
          {activeTab === 'screening' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Form input */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl shadow-md space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <CheckSquare className="text-indigo-400" size={18} />
                    <h3 className="font-bold text-white text-md">Cek PEP & DTTOT</h3>
                  </div>

                  <form onSubmit={handleScreeningSearch} className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block font-semibold">Nama Lengkap Debitur</label>
                      <input
                        type="text"
                        required
                        value={screeningForm.nama}
                        onChange={(e) => setScreeningForm({ ...screeningForm, nama: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 text-white"
                        placeholder="Contoh: Mira Ariani"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block font-semibold">NIK (Nomor Identitas)</label>
                      <input
                        type="text"
                        required
                        value={screeningForm.nik}
                        onChange={(e) => setScreeningForm({ ...screeningForm, nik: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 text-white font-mono"
                        placeholder="16 digit nomor NIK"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block font-semibold">Nomor Kontrak (Opsional)</label>
                      <input
                        type="text"
                        value={screeningForm.noKontrak}
                        onChange={(e) => setScreeningForm({ ...screeningForm, noKontrak: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 text-white"
                        placeholder="Contoh: RKS-2026-001"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block font-semibold">Kategori</label>
                      <select
                        value={screeningForm.kategori}
                        onChange={(e) => setScreeningForm({ ...screeningForm, kategori: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm focus:outline-none text-white"
                      >
                        <option value="Calon Debitur">Calon Debitur</option>
                        <option value="Debitur Existing">Debitur Existing</option>
                        <option value="Karyawan">Karyawan</option>
                        <option value="Rekanan">Rekanan</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 mb-1.5 block font-semibold">Keterangan / Notes</label>
                      <textarea
                        value={screeningForm.keterangan}
                        onChange={(e) => setScreeningForm({ ...screeningForm, keterangan: e.target.value })}
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 text-white"
                        placeholder="Keterangan tambahan pengecekan..."
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={screeningLoading}
                      className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      {screeningLoading ? (
                        <>
                          <RefreshCw className="animate-spin text-white" size={16} />
                          <span>Memeriksa database...</span>
                        </>
                      ) : (
                        <span>Jalankan Screening</span>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Search Results & Logs */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Screening Output Panel */}
                {screeningResults.searched ? (
                  <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl shadow-lg space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="font-bold text-white text-md">Hasil Screening Silang</h3>
                      <button 
                        onClick={() => setScreeningResults({ searched: false, pepMatches: [], dtotMatches: [], scraperMatches: [], scraperInfo: null })}
                        className="text-slate-500 hover:text-white"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Box 1: PEP local match */}
                      <div className={`p-4 rounded-xl border ${
                        screeningResults.pepMatches.length > 0
                          ? 'bg-amber-950/10 border-amber-900/30 text-amber-250'
                          : 'bg-emerald-950/10 border-emerald-900/30 text-emerald-250'
                      }`}>
                        <div className="font-bold text-xs uppercase tracking-wide">Database PEP Lokal</div>
                        <div className="text-xl font-black mt-2">
                          {screeningResults.pepMatches.length > 0 ? `${screeningResults.pepMatches.length} Temuan` : 'Bersih'}
                        </div>
                        <p className="text-xxs text-slate-400 mt-1">Pencocokan nama & NIK lokal</p>
                      </div>

                      {/* Box 2: DTTOT local match */}
                      <div className={`p-4 rounded-xl border ${
                        screeningResults.dtotMatches.length > 0
                          ? 'bg-red-950/10 border-red-900/30 text-red-250'
                          : 'bg-emerald-950/10 border-emerald-900/30 text-emerald-250'
                      }`}>
                        <div className="font-bold text-xs uppercase tracking-wide">Database DTTOT Lokal</div>
                        <div className="text-xl font-black mt-2">
                          {screeningResults.dtotMatches.length > 0 ? `${screeningResults.dtotMatches.length} Temuan` : 'Bersih'}
                        </div>
                        <p className="text-xxs text-slate-400 mt-1">Daftar Terduga Teroris</p>
                      </div>

                      {/* Box 3: PPATK online scraper match */}
                      <div className={`p-4 rounded-xl border ${
                        screeningResults.scraperMatches.length > 0
                          ? 'bg-amber-950/10 border-amber-900/30 text-amber-250'
                          : 'bg-emerald-950/10 border-emerald-900/30 text-emerald-250'
                      }`}>
                        <div className="font-bold text-xs uppercase tracking-wide">Peladen PPATK Online</div>
                        <div className="text-xl font-black mt-2">
                          {screeningResults.scraperMatches.length > 0 ? 'Terindikasi' : 'Bersih'}
                        </div>
                        <p className="text-xxs text-slate-400 mt-1 truncate">Status: {screeningResults.scraperInfo || 'OK'}</p>
                      </div>
                    </div>

                    {/* Result details if found */}
                    {(screeningResults.pepMatches.length > 0 || screeningResults.dtotMatches.length > 0 || screeningResults.scraperMatches.length > 0) && (
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                        <h4 className="font-bold text-xs text-white uppercase tracking-wider">Detail Temuan:</h4>
                        
                        {screeningResults.pepMatches.map((m, idx) => (
                          <div key={idx} className="text-xs text-amber-300 border-l-2 border-amber-500 pl-2">
                            [PEP Lokal] <strong>{m.namaCadeb}</strong> ({m.noIdentitas}) - Status: {m.keteranganPep} ({m.kategori})
                          </div>
                        ))}

                        {screeningResults.dtotMatches.map((m, idx) => (
                          <div key={idx} className="text-xs text-red-300 border-l-2 border-red-500 pl-2">
                            [DTTOT Lokal] <strong>{m.nama}</strong> - Type: {m.terdugaType} | Alamat: {m.alamat} | Desc: {m.deskripsi}
                          </div>
                        ))}

                        {screeningResults.scraperMatches.map((_, idx) => (
                          <div key={idx} className="text-xs text-amber-300 border-l-2 border-amber-500 pl-2">
                            [PPATK Online] NIK terdeteksi di database terpusat PPATK.
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Save verification log panel */}
                    <div className="p-4 bg-slate-850 rounded-xl border border-slate-800 space-y-4">
                      <div className="font-bold text-white text-sm">Form Keputusan & Simpan Laporan</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">Kesimpulan Hasil PEP</label>
                          <select 
                            value={hasilPep} 
                            onChange={(e) => setHasilPep(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white"
                          >
                            <option value="Tidak Terindikasi">Tidak Terindikasi</option>
                            <option value="Terindikasi">Terindikasi</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">Kesimpulan Hasil DTTOT</label>
                          <select 
                            value={hasilDtot} 
                            onChange={(e) => setHasilDtot(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white"
                          >
                            <option value="Tidak Terindikasi">Tidak Terindikasi</option>
                            <option value="Terindikasi">Terindikasi</option>
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={handleSaveScreeningReport}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all"
                      >
                        Simpan Laporan Pengecekan
                      </button>
                    </div>
                  </div>
                ) : (
                  /* History Log Table */
                  <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl shadow-md space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="font-bold text-white text-md">Riwayat Pengecekan Terakhir</h3>
                      <div className="flex gap-2 bg-slate-950 p-1 rounded-lg border border-slate-850">
                        <button
                          onClick={() => setHistoryTab('dtot')}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                            historyTab === 'dtot' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                          }`}
                        >
                          Umum (PEP & DTTOT)
                        </button>
                        <button
                          onClick={() => setHistoryTab('reksaloan')}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                            historyTab === 'reksaloan' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                          }`}
                        >
                          Reksaloan
                        </button>
                      </div>
                    </div>

                    {historyLoading ? (
                      <div className="py-8 text-center text-slate-500 flex flex-col items-center gap-2">
                        <RefreshCw className="animate-spin text-indigo-500" size={24} />
                        <span>Memuat riwayat log...</span>
                      </div>
                    ) : historyTab === 'dtot' ? (
                      /* DTTOT Log table */
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 font-semibold uppercase">
                              <th className="px-4 py-3">Tanggal</th>
                              <th className="px-4 py-3">Nama Cadeb</th>
                              <th className="px-4 py-3">Hasil PEP</th>
                              <th className="px-4 py-3">Hasil DTTOT</th>
                              <th className="px-4 py-3">Checker</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850 text-slate-300">
                            {dtotHistory.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="text-center py-6 text-slate-500 font-medium">Belum ada riwayat pengecekan umum.</td>
                              </tr>
                            ) : (
                              dtotHistory.map((h, i) => (
                                <tr key={i} className="hover:bg-slate-850/10">
                                  <td className="px-4 py-3 font-mono">{new Date(h.createdAt).toLocaleDateString('id-ID')}</td>
                                  <td className="px-4 py-3 font-semibold text-white">{h.namaCadeb}</td>
                                  <td className="px-4 py-3">
                                    <span className={`px-1.5 py-0.5 rounded ${h.hasilPep === 'Terindikasi' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                                      {h.hasilPep}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`px-1.5 py-0.5 rounded ${h.hasilPengecekan === 'Terindikasi' ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                                      {h.hasilPengecekan}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-slate-400 font-semibold">{h.checkerName}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      /* Reksaloan Log table */
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 font-semibold uppercase">
                              <th className="px-4 py-3">No. Kontrak</th>
                              <th className="px-4 py-3">Debitur</th>
                              <th className="px-4 py-3">Hasil PEP</th>
                              <th className="px-4 py-3">Hasil DTTOT</th>
                              <th className="px-4 py-3">Checker</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850 text-slate-300">
                            {reksaloanHistory.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="text-center py-6 text-slate-500 font-medium">Belum ada riwayat pengecekan Reksaloan.</td>
                              </tr>
                            ) : (
                              reksaloanHistory.map((h, i) => (
                                <tr key={i} className="hover:bg-slate-850/10">
                                  <td className="px-4 py-3 font-mono font-bold text-indigo-400">{h.noKontrak}</td>
                                  <td className="px-4 py-3 font-semibold text-white">{h.namaDebitur}</td>
                                  <td className="px-4 py-3">{h.hasilPep || '-'}</td>
                                  <td className="px-4 py-3">{h.hasilDtot || '-'}</td>
                                  <td className="px-4 py-3 text-slate-400 font-semibold">{h.checkerName}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: APPROVALS PANEL */}
          {/* ======================================================== */}
          {activeTab === 'approvals' && user && user.level >= 2 && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* PEP approvals section */}
              <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl shadow-md space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <UserCheck className="text-amber-500" size={18} />
                  <h3 className="font-bold text-white text-md">Persetujuan Perubahan Data PEP</h3>
                </div>

                {approvalsLoading ? (
                  <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                    <RefreshCw className="animate-spin text-amber-500" size={24} />
                    <span>Memproses approvals...</span>
                  </div>
                ) : pepApprovals.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 font-medium text-sm">Tidak ada permintaan persetujuan PEP pending.</div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
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
                                <span className={`px-2 py-0.5 rounded font-semibold text-xxs ${
                                  req.type === 'DELETE' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                                }`}>
                                  {req.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 space-y-1 leading-relaxed">
                                {req.type === 'DELETE' ? (
                                  <div>Menghapus kandidat: <strong>{oldDataObj.namaCadeb}</strong> ({oldDataObj.noIdentitas})</div>
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
                                  <button
                                    onClick={() => handlePepApprovalAction(req.id, 'APPROVE')}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xxs shadow"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handlePepApprovalAction(req.id, 'REJECT')}
                                    className="px-2.5 py-1 bg-red-650 hover:bg-red-700 text-white rounded font-bold text-xxs shadow"
                                  >
                                    Reject
                                  </button>
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

              {/* DTTOT approvals section */}
              <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl shadow-md space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <UserCheck className="text-amber-500" size={18} />
                  <h3 className="font-bold text-white text-md">Persetujuan Perubahan Data DTTOT</h3>
                </div>

                {approvalsLoading ? (
                  <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                    <RefreshCw className="animate-spin text-amber-500" size={24} />
                    <span>Memproses approvals...</span>
                  </div>
                ) : dtotApprovals.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 font-medium text-sm">Tidak ada permintaan persetujuan DTTOT pending.</div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 font-semibold uppercase">
                          <th className="px-4 py-3">Tanggal</th>
                          <th className="px-4 py-3">Tipe Aksi</th>
                          <th className="px-4 py-3">Status Request</th>
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
                                <span className={`px-2 py-0.5 rounded font-semibold text-xxs ${
                                  req.requestType === 'DELETE' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                                }`}>
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
                                  <button
                                    onClick={() => handleDtotApprovalAction(req.id, 'APPROVE')}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xxs shadow"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleDtotApprovalAction(req.id, 'REJECT')}
                                    className="px-2.5 py-1 bg-red-650 hover:bg-red-700 text-white rounded font-bold text-xxs shadow"
                                  >
                                    Reject
                                  </button>
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

            <form onSubmit={handlePepSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1.5 block font-semibold">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={pepFormData.namaCadeb}
                    onChange={(e) => setPepFormData({ ...pepFormData, namaCadeb: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-blue-500 text-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1.5 block font-semibold">NIK (Nomor Identitas)</label>
                  <input
                    type="text"
                    required
                    value={pepFormData.noIdentitas}
                    onChange={(e) => setPepFormData({ ...pepFormData, noIdentitas: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-blue-500 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-semibold">Nama Pasangan (Opsional)</label>
                  <input
                    type="text"
                    value={pepFormData.namaPasangan}
                    onChange={(e) => setPepFormData({ ...pepFormData, namaPasangan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-blue-500 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-semibold">NIK Pasangan (Opsional)</label>
                  <input
                    type="text"
                    value={pepFormData.noIdentitasPasangan}
                    onChange={(e) => setPepFormData({ ...pepFormData, noIdentitasPasangan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-blue-500 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-semibold">Kategori</label>
                  <select
                    value={pepFormData.kategori}
                    onChange={(e) => setPepFormData({ ...pepFormData, kategori: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm focus:outline-none text-white"
                  >
                    <option value="Calon Debitur">Calon Debitur</option>
                    <option value="Debitur Existing">Debitur Existing</option>
                    <option value="Karyawan">Karyawan</option>
                    <option value="Rekanan">Rekanan</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-semibold">Go Live</label>
                  <select
                    value={pepFormData.goLive}
                    onChange={(e) => setPepFormData({ ...pepFormData, goLive: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm focus:outline-none text-white"
                  >
                    <option value="Ya">Ya</option>
                    <option value="Tidak">Tidak</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1.5 block font-semibold">Status Indikasi PEP</label>
                  <select
                    value={pepFormData.keteranganPep}
                    onChange={(e) => setPepFormData({ ...pepFormData, keteranganPep: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm focus:outline-none text-white"
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
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 text-xs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-650 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/10"
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

            <form onSubmit={handleDtotSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1.5 block font-semibold">Nama Terduga / Korporasi</label>
                  <input
                    type="text"
                    required
                    value={dtotFormData.nama}
                    onChange={(e) => setDtotFormData({ ...dtotFormData, nama: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-semibold">Tipe Terduga</label>
                  <select
                    value={dtotFormData.terdugaType}
                    onChange={(e) => setDtotFormData({ ...dtotFormData, terdugaType: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm focus:outline-none text-white"
                  >
                    <option value="Orang">Orang (Individu)</option>
                    <option value="Korporasi">Korporasi / Organisasi</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-semibold">Kode Densus</label>
                  <input
                    type="text"
                    value={dtotFormData.kodeDensus}
                    onChange={(e) => setDtotFormData({ ...dtotFormData, kodeDensus: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500 text-white font-mono"
                    placeholder="Contoh: IDD-032"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-semibold">Tempat Lahir</label>
                  <input
                    type="text"
                    value={dtotFormData.tempatLahir}
                    onChange={(e) => setDtotFormData({ ...dtotFormData, tempatLahir: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-semibold">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={dtotFormData.tanggalLahir}
                    onChange={(e) => setDtotFormData({ ...dtotFormData, tanggalLahir: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500 text-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1.5 block font-semibold">Kewarganegaraan / Asal Negara</label>
                  <input
                    type="text"
                    value={dtotFormData.wnAsalNegara}
                    onChange={(e) => setDtotFormData({ ...dtotFormData, wnAsalNegara: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500 text-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1.5 block font-semibold">Deskripsi</label>
                  <textarea
                    value={dtotFormData.deskripsi}
                    onChange={(e) => setDtotFormData({ ...dtotFormData, deskripsi: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500 text-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1.5 block font-semibold">Alamat Terduga</label>
                  <textarea
                    value={dtotFormData.alamat}
                    onChange={(e) => setDtotFormData({ ...dtotFormData, alamat: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-emerald-500 text-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-850 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setDtotModalOpen(false); resetDtotForm(); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 text-xs font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/10"
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
