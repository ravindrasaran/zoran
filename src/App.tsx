import React, { Component, useState, useEffect, useRef, useCallback } from 'react';
import { 
  Search, AlertCircle, Loader2, CheckCircle2, XCircle, Download, Share2, 
  History, Home, User, ChevronLeft, Trophy, Bell, Sparkles, 
  Shield, Info, BookOpen, Building2, Users, Plus, Trash2, LogOut, X, Edit2, List, MessageSquare,
  HeartHandshake, Scale, Mail, Phone, BookHeart, GraduationCap, FileText,
  RefreshCw, FileQuestion, FileCheck, Library, Copy, Check, ExternalLink,
  Award, Book, Users2, Zap, Globe, Smartphone, MailCheck, Printer,
  Moon, Sun, Languages, FileDown, BarChart3, PieChart as PieChartIcon,
  ShieldCheck, HelpCircle, Target, Eye, MessageCircle, FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts';
import { db, auth } from './firebase';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc, setDoc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

// --- Firestore Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string | null;
}

// --- Error Boundary Component ---
class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    const { hasError, errorInfo } = (this as any).state;
    if (hasError) {
      let displayMessage = "Something went wrong. Please try again later.";
      try {
        const parsed = JSON.parse(errorInfo || "");
        if (parsed.error && parsed.error.includes("Missing or insufficient permissions")) {
          displayMessage = "Access Denied: You don't have permission to perform this action. Please contact admin.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-sm w-full">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mb-2">Oops! Error Occurred</h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">{displayMessage}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full bg-[#003366] text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Refresh App
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

// Types
interface SubjectMarks {
  subject: string;
  theory_marks: number;
  practical_marks: number;
  total_marks: number;
  grade: string;
}

interface ResultData {
  roll_no: string;
  name: string;
  father_name: string;
  mother_name: string;
  school_name: string;
  class_type: string;
  result_status: string;
  percentage: number;
  total_marks: number;
  subject_wise_marks: SubjectMarks[];
}

interface AdSettings {
  enabled: boolean;
  type: 'adsense' | 'custom';
  adsenseClient: string;
  adsenseSlot: string;
  customImageUrl: string;
  customLinkUrl: string;
}

interface ContactSettings {
  email: string;
  phone: string;
}

interface Notice {
  id: string;
  title: string;
  desc: string;
  type: 'success' | 'info' | 'warning';
  timestamp?: any;
}

interface PreRegistration {
  id: string;
  mobile: string;
  rollNumber: string;
  classType: string;
  timestamp?: any;
  status?: 'pending' | 'notified';
}

interface Feedback {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: any;
  status?: 'pending' | 'resolved';
}

const CLASSES = [
  { id: '5', label: '5th Board', source: 'Shala Darpan' },
  { id: '8', label: '8th Board', source: 'Shala Darpan' },
  { id: '10', label: '10th Board', source: 'RBSE Board' },
  { id: '12-sci', label: '12th Science', source: 'RBSE Board' },
  { id: '12-art', label: '12th Arts', source: 'RBSE Board' },
  { id: '12-com', label: '12th Commerce', source: 'RBSE Board' },
];

const TRANSLATIONS = {
  en: {
    home: 'Home',
    student: 'Student',
    teacher: 'Teacher',
    alerts: 'Alerts',
    info: 'Info',
    check_result: 'Check Result 2026',
    by_roll: 'By Roll No',
    school_wise: 'School Wise',
    select_class: 'Select Class',
    enter_roll: 'Enter Roll Number',
    enter_school: 'Enter School Code',
    find_result: 'Find Result',
    searching: 'Searching...',
    recent: 'Recent Searches',
    view_all: 'View All',
    print: 'Print Result',
    share: 'Share Result',
    download_img: 'Download Image',
    download_pdf: 'Download PDF',
    copy: 'Copy Result',
    analysis: 'Result Analysis',
    distribution: 'Marks Distribution',
    mission: 'Our Mission',
    vision: 'Our Vision',
    values: 'Core Values',
    faq: 'Frequently Asked Questions',
    toppers: "Topper's Corner 2025",
    premium_features: 'Premium Features',
    vision_text: 'Empowering every student with instant access to their academic achievements through cutting-edge technology.',
    mission_text: 'To provide the most reliable, fastest, and user-friendly result portal for the RBSE community.',
    accuracy: 'Accuracy',
    students: 'Students',
    resources: 'Resources',
    pass: 'PASS',
    fail: 'FAIL',
    marks: 'Marks',
    subject: 'Subject',
    grand_total: 'Grand Total',
    percentage: 'Percentage'
  },
  hi: {
    home: 'मुख्य',
    student: 'छात्र',
    teacher: 'शिक्षक',
    alerts: 'अलर्ट',
    info: 'जानकारी',
    check_result: 'रिजल्ट चेक करें 2026',
    by_roll: 'रोल नंबर से',
    school_wise: 'स्कूल वार',
    select_class: 'कक्षा चुनें',
    enter_roll: 'रोल नंबर दर्ज करें',
    enter_school: 'स्कूल कोड दर्ज करें',
    find_result: 'रिजल्ट खोजें',
    searching: 'खोज रहे हैं...',
    recent: 'हालिया खोजें',
    view_all: 'सभी देखें',
    analysis: 'रिजल्ट विश्लेषण',
    distribution: 'अंक वितरण',
    mission: 'हमारा लक्ष्य',
    vision: 'हमारी दृष्टि',
    values: 'मुख्य मूल्य',
    faq: 'अक्सर पूछे जाने वाले प्रश्न',
    toppers: "टॉपर्स कॉर्नर 2025",
    premium_features: 'प्रीमियम विशेषताएं',
    print: 'रिजल्ट प्रिंट करें',
    share: 'रिजल्ट शेयर करें',
    download_img: 'इमेज डाउनलोड',
    download_pdf: 'PDF डाउनलोड',
    copy: 'रिजल्ट कॉपी',
    vision_text: 'अत्याधुनिक तकनीक के माध्यम से प्रत्येक छात्र को उनकी शैक्षणिक उपलब्धियों तक त्वरित पहुंच के साथ सशक्त बनाना।',
    mission_text: 'RBSE समुदाय के लिए सबसे विश्वसनीय, तेज़ और उपयोगकर्ता के अनुकूल परिणाम पोर्टल प्रदान करना।',
    accuracy: 'सटीकता',
    students: 'छात्र',
    resources: 'संसाधन',
    pass: 'पास',
    fail: 'फेल',
    marks: 'अंक',
    subject: 'विषय',
    grand_total: 'कुल अंक',
    percentage: 'प्रतिशत'
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'resources' | 'teacher' | 'alerts' | 'admin' | 'info' | 'privacy'>('home');
  const [searchMode, setSearchMode] = useState<'roll' | 'school'>('roll');
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  
  // Search States
  const [rollNumber, setRollNumber] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [selectedClass, setSelectedClass] = useState('10');
  
  // Result States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const [schoolResult, setSchoolResult] = useState<ResultData[] | null>(null);
  
  // Pre-registration States
  const [mobile, setMobile] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  
  // Dynamic Notices
  const [notices, setNotices] = useState<Notice[]>([]);

  // Admin States
  const [adminPin, setAdminPin] = useState('');
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [adminNotices, setAdminNotices] = useState<Notice[]>([]);
  const [adminRegs, setAdminRegs] = useState<PreRegistration[]>([]);
  const [adminFeedback, setAdminFeedback] = useState<Feedback[]>([]);
  const [adminTab, setAdminTab] = useState<'notices' | 'ads' | 'regs' | 'feedback' | 'settings'>('notices');
  const [newNotice, setNewNotice] = useState({ title: '', desc: '', type: 'info' });
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [contactSettings, setContactSettings] = useState<ContactSettings>({
    email: 'support@zoran.edu',
    phone: '+919876543210'
  });
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  // Feedback Form State
  const [feedbackForm, setFeedbackForm] = useState({ name: '', email: '', message: '' });
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Logo Click Logic
  const [logoClicks, setLogoClicks] = useState(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoClick = () => {
    setResult(null);
    setSchoolResult(null);
    
    const newCount = logoClicks + 1;
    if (newCount >= 5) {
      setActiveTab('admin');
      setLogoClicks(0);
    } else {
      setActiveTab('home');
      setLogoClicks(newCount);
    }

    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = setTimeout(() => {
      setLogoClicks(0);
    }, 1500);
  };

  // Load history on mount
  const [history, setHistory] = useState<ResultData[]>([]);
  const [adSettings, setAdSettings] = useState<AdSettings>({
    enabled: false,
    type: 'custom',
    adsenseClient: '',
    adsenseSlot: '',
    customImageUrl: '',
    customLinkUrl: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem('rbse_history');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) {}
    }
    
    const savedTheme = localStorage.getItem('rbse_theme');
    if (savedTheme) setTheme(savedTheme as any);

    const savedLang = localStorage.getItem('rbse_lang');
    if (savedLang) setLang(savedLang as any);

    // Auth Listener
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user && user.email === "shreshthacollege@gmail.com" && user.emailVerified) {
        // Automatically auth if already logged in as admin
        // But we still require PIN for extra security as per current flow
      }
    });

    // Real-time Listeners
    const unsubNotices = onSnapshot(collection(db, 'notices'), (snap) => {
      const n = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notice));
      setNotices(n.length > 0 ? n : [
        { id: '1', title: 'Session 2026 Updates', desc: 'Results for Class 5th, 8th, 10th, and 12th will be declared soon.', type: 'info' }
      ]);
    });

    const unsubAds = onSnapshot(doc(db, 'settings', 'ads'), (snap) => {
      if (snap.exists()) {
        setAdSettings(snap.data() as AdSettings);
      }
    });

    const unsubContact = onSnapshot(doc(db, 'settings', 'contact'), (snap) => {
      if (snap.exists()) {
        setContactSettings(snap.data() as ContactSettings);
      }
    });

    return () => {
      unsubAuth();
      unsubNotices();
      unsubAds();
      unsubContact();
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('rbse_theme', newTheme);
  };

  const toggleLang = () => {
    const newLang = lang === 'en' ? 'hi' : 'en';
    setLang(newLang);
    localStorage.setItem('rbse_lang', newLang);
  };

  const fetchAdminData = async () => {
    setAdminLoading(true);
    try {
      const nSnap = await getDocs(collection(db, 'notices'));
      setAdminNotices(nSnap.docs.map(d => ({ id: d.id, ...d.data() } as Notice)));
      
      const rSnap = await getDocs(collection(db, 'pre_registrations'));
      setAdminRegs(rSnap.docs.map(d => ({ id: d.id, ...d.data() } as PreRegistration)));

      const fSnap = await getDocs(collection(db, 'feedback'));
      setAdminFeedback(fSnap.docs.map(d => ({ id: d.id, ...d.data() } as Feedback)));
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'admin_data');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error("Google Login Failed", e);
      alert("Google Login Failed. Please try again.");
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Please sign in with Google first.");
      return;
    }
    if (currentUser.email !== "shreshthacollege@gmail.com") {
      alert("You do not have admin permissions.");
      return;
    }
    if (adminPin === '2026') {
      setIsAdminAuth(true);
      fetchAdminData();
    } else {
      alert("Invalid Admin PIN");
    }
  };

  const handleAddNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotice.title || !newNotice.desc) return;
    try {
      if (editingNotice) {
        await setDoc(doc(db, 'notices', editingNotice.id), {
          ...newNotice,
          timestamp: editingNotice.timestamp || serverTimestamp()
        });
        setEditingNotice(null);
        showToast("Notice updated successfully!");
      } else {
        await addDoc(collection(db, 'notices'), {
          ...newNotice,
          timestamp: serverTimestamp()
        });
        showToast("Notice published successfully!");
      }
      setNewNotice({ title: '', desc: '', type: 'info' });
      fetchAdminData();
    } catch (e) {
      handleFirestoreError(e, editingNotice ? OperationType.UPDATE : OperationType.CREATE, 'notices');
    }
  };

  const handleEditNotice = (notice: Notice) => {
    setEditingNotice(notice);
    setNewNotice({ title: notice.title, desc: notice.desc, type: notice.type });
    setAdminTab('notices');
    // Scroll to top of admin panel
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteNotice = async (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Delete Notice',
      message: 'Are you sure you want to delete this notice? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'notices', id));
          fetchAdminData();
          setConfirmModal(prev => ({ ...prev, show: false }));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `notices/${id}`);
        }
      }
    });
  };

  const handleDeleteFeedback = async (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Delete Feedback',
      message: 'Are you sure you want to delete this feedback entry?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'feedback', id));
          fetchAdminData();
          setConfirmModal(prev => ({ ...prev, show: false }));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `feedback/${id}`);
        }
      }
    });
  };

  const handleDeleteReg = async (id: string) => {
    setConfirmModal({
      show: true,
      title: 'Delete Registration',
      message: 'Are you sure you want to delete this registration?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'pre_registrations', id));
          fetchAdminData();
          setConfirmModal(prev => ({ ...prev, show: false }));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `pre_registrations/${id}`);
        }
      }
    });
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackForm.name || !feedbackForm.message) return;
    setFeedbackLoading(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        ...feedbackForm,
        createdAt: serverTimestamp()
      });
      setFeedbackSuccess(true);
      setFeedbackForm({ name: '', email: '', message: '' });
      setTimeout(() => setFeedbackSuccess(false), 5000);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'feedback');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleSaveAdSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'ads'), adSettings);
      showToast("Ad configuration saved successfully!");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/ads');
    }
  };

  const handleSaveContactSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'contact'), contactSettings);
      showToast("Contact settings updated successfully!");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/contact');
    }
  };

  const handleToggleFeedbackStatus = async (id: string, currentStatus?: string) => {
    try {
      await updateDoc(doc(db, 'feedback', id), {
        status: currentStatus === 'resolved' ? 'pending' : 'resolved'
      });
      fetchAdminData();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `feedback/${id}`);
    }
  };

  const handleToggleRegStatus = async (id: string, currentStatus?: string) => {
    try {
      await updateDoc(doc(db, 'pre_registrations', id), {
        status: currentStatus === 'notified' ? 'pending' : 'notified'
      });
      fetchAdminData();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `pre_registrations/${id}`);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      alert("No data to export");
      return;
    }
    const keys = Object.keys(data[0]).filter(k => k !== 'id');
    const csv = [
      keys.join(','),
      ...data.map(row => keys.map(key => {
        let val = row[key];
        if (val && typeof val === 'object' && val.seconds) {
          val = new Date(val.seconds * 1000).toLocaleString();
        }
        return JSON.stringify(val || '');
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const saveToHistory = (data: ResultData) => {
    const newEntry = { ...data, class_type: selectedClass };
    const updated = [newEntry, ...history.filter(h => h.roll_no !== data.roll_no)].slice(0, 10);
    setHistory(updated);
    localStorage.setItem('rbse_history', JSON.stringify(updated));
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#003366', '#00A86B', '#FFD700'] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#003366', '#00A86B', '#FFD700'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  const fetchResult = async (e?: React.FormEvent, rollToFetch?: string, classToFetch?: string) => {
    if (e) e.preventDefault();
    const targetRoll = rollToFetch || rollNumber;
    
    if (!targetRoll.trim()) {
      setError("Please enter a valid roll number.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Simulate API Call
      const response = await fetch(`/api/result/${targetRoll}?class=${classToFetch || selectedClass}`);
      
      if (!response.ok) {
        // Fallback to mock data for demonstration if API fails
        throw new Error("API_FAIL");
      }

      const data = await response.json();
      data.class_type = classToFetch || selectedClass;
      setResult(data);
      saveToHistory(data);
      if (data.result_status === 'PASS') triggerConfetti();
      setLoading(false);
      
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  const fetchSchoolResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolCode.trim()) {
      setError("Please enter a valid School NIC code.");
      return;
    }

    setLoading(true);
    setError(null);
    setSchoolResult(null);

    try {
      const response = await fetch(`/api/school-result/${schoolCode}?class=${selectedClass}`);
      if (!response.ok) throw new Error("API_FAIL");
      const data = await response.json();
      setSchoolResult(data.students);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  const handlePreRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobile.length !== 10) {
      setRegError("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!rollNumber) {
      setRegError("Please enter your roll number");
      return;
    }

    setRegLoading(true);
    setRegError(null);

    try {
      await addDoc(collection(db, 'pre_registrations'), {
        mobile, rollNumber, classType: selectedClass, timestamp: serverTimestamp()
      });
      setRegSuccess(true);
      setMobile('');
      setRollNumber('');
      setTimeout(() => setRegSuccess(false), 5000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'pre_registrations');
    } finally {
      setRegLoading(false);
    }
  };

  const getGradeColor = (grade: string | undefined) => {
    if (!grade) return 'text-slate-700 bg-slate-50';
    if (grade.includes('A')) return 'text-emerald-700 bg-emerald-50';
    if (grade.includes('B')) return 'text-blue-700 bg-blue-50';
    if (grade.includes('C')) return 'text-amber-700 bg-amber-50';
    return 'text-red-700 bg-red-50';
  };

  // --- Views ---

  const handleDownloadPDF = async () => {
    if (!result) return;
    const element = document.getElementById('result-card');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`RBSE_Result_${result.roll_no}.pdf`);
    } catch (err) {
      console.error("PDF Download failed", err);
    }
  };

  const handleDownloadImage = async () => {
    if (!result) return;
    const element = document.getElementById('result-card');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const link = document.createElement('a');
      link.download = `RBSE_Result_${result.roll_no}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Image Download failed", err);
    }
  };

  const handleCopyResult = () => {
    if (!result) return;
    const text = `
RBSE Result 2026
----------------
Name: ${result.name}
Roll No: ${result.roll_no}
School: ${result.school_name}
Percentage: ${result.percentage}%
Status: ${result.result_status}
----------------
Check yours at: ${window.location.origin}
    `.trim();
    navigator.clipboard.writeText(text);
    alert("Result copied to clipboard!");
  };

  const handlePrint = () => {
    window.print();
  };

  const renderHome = () => {
    if (result) {
      const chartData = result.subject_wise_marks.map(m => ({
        name: m.subject,
        marks: m.total_marks
      }));

      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 mb-6">
          <div id="result-card" className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className={`p-8 text-white relative overflow-hidden ${result.result_status === 'PASS' ? 'bg-[#003366]' : 'bg-[#dc2626]'}`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <h2 className="text-2xl font-black tracking-tight mb-1 font-display uppercase">{result.name}</h2>
                  <p className="text-white/80 text-sm font-bold tracking-widest uppercase">Roll No: {result.roll_no}</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black font-display">{result.percentage}%</div>
                  <div className="text-white/80 text-xs font-black uppercase tracking-[0.2em]">{result.result_status}</div>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-2">
                <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                  {CLASSES.find(c => c.id === result.class_type)?.label || 'Result'}
                </div>
                <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                  Session 2026
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-2 gap-6 text-xs">
                <div>
                  <p className="text-slate-400 dark:text-slate-500 mb-1 font-black uppercase tracking-widest">Father's Name</p>
                  <p className="font-black text-slate-800 dark:text-slate-200 text-sm">{result.father_name}</p>
                </div>
                <div>
                  <p className="text-slate-400 dark:text-slate-500 mb-1 font-black uppercase tracking-widest">Mother's Name</p>
                  <p className="font-black text-slate-800 dark:text-slate-200 text-sm">{result.mother_name}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 dark:text-slate-500 mb-1 font-black uppercase tracking-widest">School</p>
                  <p className="font-black text-slate-800 dark:text-slate-200 text-sm leading-relaxed">{result.school_name}</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <h3 className="text-xs font-black text-[#003366] dark:text-blue-400 mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" /> {t.marks} Details
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-400 dark:text-slate-500 border-b-2 border-slate-100 dark:border-slate-800">
                      <th className="pb-3 font-black uppercase tracking-widest">{t.subject}</th>
                      <th className="pb-3 font-black uppercase tracking-widest text-center">TH</th>
                      <th className="pb-3 font-black uppercase tracking-widest text-center">PR</th>
                      <th className="pb-3 font-black uppercase tracking-widest text-center">Total</th>
                      <th className="pb-3 font-black uppercase tracking-widest text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {result.subject_wise_marks.map((mark, idx) => (
                      <tr key={idx} className="group">
                        <td className="py-4 font-black text-slate-800 dark:text-slate-200 group-hover:text-[#003366] transition-colors">
                          <div className="flex items-center gap-2">
                            {mark.subject}
                            {mark.total_marks >= 95 && (
                              <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-0.5">
                                <Trophy className="w-2 h-2" /> Topper
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 text-center text-slate-600 dark:text-slate-400 font-bold">{mark.theory_marks}</td>
                        <td className="py-4 text-center text-slate-600 dark:text-slate-400 font-bold">{mark.practical_marks || '-'}</td>
                        <td className="py-4 text-center font-black text-[#003366] dark:text-blue-400 text-sm">{mark.total_marks}</td>
                        <td className="py-4 text-center">
                          <span className={`px-2 py-1 rounded-lg font-black text-[10px] shadow-sm ${getGradeColor(mark.grade)}`}>{mark.grade}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                      <td className="py-5 font-black text-[#003366] dark:text-blue-400 uppercase tracking-widest">{t.grand_total}</td>
                      <td colSpan={2}></td>
                      <td className="py-5 text-center font-black text-2xl text-[#003366] dark:text-blue-400 font-display">{result.total_marks}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Analysis Charts */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-black text-[#003366] dark:text-blue-400 mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-500" /> {t.analysis}
                </h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" hide />
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '10px' }}
                        cursor={{ fill: 'rgba(0,51,102,0.05)' }}
                      />
                      <Bar dataKey="marks" radius={[6, 6, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.marks >= 90 ? '#10b981' : entry.marks >= 75 ? '#3b82f6' : entry.marks >= 33 ? '#f59e0b' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black text-[#003366] dark:text-blue-400 mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-rose-500" /> {t.distribution}
                </h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="marks"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308'][index % 6]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '10px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleDownloadPDF} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#003366] dark:text-blue-400 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs shadow-sm shadow-slate-200/50 dark:shadow-none">
              <FileDown className="w-4 h-4" /> {t.download_pdf}
            </button>
            <button onClick={handleDownloadImage} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#003366] dark:text-blue-400 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs shadow-sm shadow-slate-200/50 dark:shadow-none">
              <Download className="w-4 h-4" /> {t.download_img}
            </button>
            <button onClick={handlePrint} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#003366] dark:text-blue-400 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs shadow-sm shadow-slate-200/50 dark:shadow-none">
              <Printer className="w-4 h-4" /> {t.print}
            </button>
            <button onClick={handleCopyResult} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#003366] dark:text-blue-400 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs shadow-sm shadow-slate-200/50 dark:shadow-none">
              <Copy className="w-4 h-4" /> {t.copy}
            </button>
            <button onClick={async () => {
                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: 'ZORAN - RBSE Result',
                      text: `Check out my RBSE Result! I scored ${result.percentage}%`,
                      url: window.location.href,
                    });
                  } catch (err: any) {
                    if (err.name !== 'AbortError') {
                      console.error('Share failed:', err);
                    }
                  }
                }
              }} className="col-span-2 bg-[#003366] text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-[#002244] transition-all text-xs shadow-lg shadow-blue-900/20">
              <Share2 className="w-4 h-4" /> {t.share}
            </button>
          </div>
          
          <button onClick={() => setResult(null)} className="w-full py-4 text-slate-400 dark:text-slate-500 text-xs font-black hover:text-[#003366] dark:hover:text-blue-400 flex items-center justify-center gap-2 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Check Another Result
          </button>
        </motion.div>
      );
    }

    if (schoolResult) {
      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-[#003366] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" /> School Results
            </h2>
            <button onClick={() => setSchoolResult(null)} className="text-slate-400 hover:text-slate-600">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b-2 border-slate-100">
                  <th className="pb-2 font-bold">Roll No</th>
                  <th className="pb-2 font-bold">Name</th>
                  <th className="pb-2 font-bold text-center">Result</th>
                  <th className="pb-2 font-bold text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {schoolResult.map((student, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 cursor-pointer" onClick={() => { setResult(student); setSchoolResult(null); }}>
                    <td className="py-3 font-bold text-slate-800">{student.roll_no}</td>
                    <td className="py-3 text-slate-600 font-medium">{student.name}</td>
                    <td className="py-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${student.result_status === 'PASS' ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                        {student.result_status}
                      </span>
                    </td>
                    <td className="py-3 text-right font-bold text-[#003366]">{student.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
        {/* Premium Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-[#003366] rounded-[2rem] p-6 text-white relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[8px] font-black uppercase tracking-widest border border-white/20">Premium v2.5.0</span>
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
            </div>
            <h2 className="text-2xl font-black font-display leading-tight uppercase tracking-tight">{t.check_result}</h2>
            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">{t.select_class} & {t.enter_roll}</p>
          </div>
          <div className="absolute bottom-0 right-0 p-4 opacity-20">
            <Trophy className="w-20 h-20 rotate-12" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50 dark:bg-blue-900/10 rounded-bl-full -z-10 opacity-50 blur-3xl" />
          
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl mb-8">
            <button onClick={() => setSearchMode('roll')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${searchMode === 'roll' ? 'bg-white dark:bg-slate-700 shadow-lg text-[#003366] dark:text-blue-400' : 'text-slate-500'}`}>
              {t.by_roll}
            </button>
            <button onClick={() => setSearchMode('school')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${searchMode === 'school' ? 'bg-white dark:bg-slate-700 shadow-lg text-[#003366] dark:text-blue-400' : 'text-slate-500'}`}>
              {t.school_wise}
            </button>
          </div>

          <form onSubmit={searchMode === 'roll' ? fetchResult : fetchSchoolResult} className="space-y-8">
          <div>
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-[0.2em]">{t.select_class}</label>
            <div className="grid grid-cols-2 gap-3">
              {CLASSES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedClass(c.id)}
                  className={`p-3.5 rounded-2xl text-left transition-all border-2 ${
                    selectedClass === c.id 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-[#003366] dark:border-blue-500 shadow-lg shadow-blue-900/5' 
                      : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800'
                  }`}
                >
                  <div className={`text-xs font-black uppercase tracking-tight ${selectedClass === c.id ? 'text-[#003366] dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{c.label}</div>
                  <div className={`text-[9px] font-black mt-1 uppercase tracking-widest ${selectedClass === c.id ? 'text-blue-600 dark:text-blue-500' : 'text-slate-400 dark:text-slate-500'}`}>{c.source}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-3 uppercase tracking-[0.2em]">
              {searchMode === 'roll' ? t.enter_roll : t.enter_school}
            </label>
            <div className="relative group">
              <input
                type="text"
                value={searchMode === 'roll' ? rollNumber : schoolCode}
                onChange={(e) => searchMode === 'roll' ? setRollNumber(e.target.value) : setSchoolCode(e.target.value)}
                placeholder={searchMode === 'roll' ? "e.g. 1234567" : "e.g. 10456"}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-[#003366] dark:focus:border-blue-500 transition-all text-sm font-black text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600"
                required
              />
              {searchMode === 'roll' ? (
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-[#003366] dark:group-focus-within:text-blue-500 transition-colors" />
              ) : (
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-[#003366] dark:group-focus-within:text-blue-500 transition-colors" />
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#003366] dark:bg-blue-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-[#002244] dark:hover:bg-blue-500 transition-all flex items-center justify-center gap-3 disabled:opacity-70 shadow-xl shadow-blue-900/20 uppercase tracking-[0.2em]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            {loading ? t.searching : t.find_result}
          </button>
        </form>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center justify-between text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl text-xs font-bold border border-red-100 dark:border-red-900/30">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
            <button type="button" onClick={() => searchMode === 'roll' ? fetchResult() : fetchSchoolResult(new Event('submit') as any)} className="text-[#003366] dark:text-blue-400 hover:underline flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </motion.div>
        )}

        {/* Ad Display or History Preview */}
        {adSettings.enabled ? (
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-center mb-3">
              <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Advertisement</h3>
            </div>
            <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center min-h-[100px]">
              {adSettings.type === 'custom' && adSettings.customImageUrl ? (
                <a href={adSettings.customLinkUrl || '#'} target="_blank" rel="noopener noreferrer" className="w-full block">
                  <img src={adSettings.customImageUrl} alt="Advertisement" className="w-full h-auto object-cover" referrerPolicy="no-referrer" />
                </a>
              ) : adSettings.type === 'adsense' ? (
                <div className="text-xs text-slate-400 dark:text-slate-500 font-black p-4 text-center">
                  <p>Google AdSense Space</p>
                  <p className="text-[9px] mt-1 opacity-50">Client: {adSettings.adsenseClient || 'Not Set'}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 font-black p-4">Ad Space Available</p>
              )}
            </div>
          </div>
        ) : history.length > 0 ? (
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.recent}</h3>
              <button onClick={() => setActiveTab('history')} className="text-[10px] font-black text-blue-600 dark:text-blue-400 hover:underline uppercase tracking-widest">{t.view_all}</button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {history.slice(0, 3).map((item, idx) => (
                <button key={idx} onClick={() => fetchResult(undefined, item.roll_no, item.class_type)} className="shrink-0 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-left hover:border-blue-300 dark:hover:border-blue-500 transition-colors min-w-[140px]">
                  <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 truncate uppercase tracking-tight">{item.name}</p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black mt-0.5 tracking-widest">#{item.roll_no}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-yellow-500" /> {t.toppers}
            </h3>
            <div className="space-y-3">
              {[
                { name: "Rahul Sharma", rank: 1, per: "99.2%", school: "Jaipur Public School" },
                { name: "Priya Verma", rank: 2, per: "98.8%", school: "Kota Academy" },
                { name: "Amit Saini", rank: 3, per: "98.5%", school: "Ajmer Model School" }
              ].map((topper, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700 shadow-sm shadow-yellow-500/20' : 
                    i === 1 ? 'bg-slate-200 text-slate-700' : 
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {i === 0 ? <Trophy className="w-4 h-4" /> : topper.rank}
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">{topper.name}</p>
                    <p className="text-[8px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">{topper.school}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400">{topper.per}</p>
                    <p className="text-[8px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Score</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

  const renderResources = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mb-6">
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
        <h2 className="text-lg font-extrabold text-[#003366] mb-4 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-emerald-600" /> Student Resources
        </h2>
        
        <div className="grid grid-cols-2 gap-3">
          <button className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-left hover:bg-emerald-100 transition-colors">
            <FileText className="w-6 h-6 text-emerald-600 mb-2" />
            <h3 className="font-bold text-emerald-900 text-sm">Study Notes</h3>
            <p className="text-[10px] text-emerald-700 mt-1">Class 10th & 12th</p>
          </button>
          
          <button className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-left hover:bg-blue-100 transition-colors">
            <FileQuestion className="w-6 h-6 text-blue-600 mb-2" />
            <h3 className="font-bold text-blue-900 text-sm">Previous Papers</h3>
            <p className="text-[10px] text-blue-700 mt-1">Last 5 Years</p>
          </button>

          <button className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-left hover:bg-amber-100 transition-colors col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-amber-900 text-sm">Scholarships</h3>
                <p className="text-[10px] text-amber-700 mt-0.5">Apply for Govt. & Private Scholarships</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#003366] to-blue-800 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
        <BookHeart className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10" />
        <h3 className="font-bold text-lg mb-1 relative z-10">Need Help?</h3>
        <p className="text-blue-200 text-xs mb-4 relative z-10 max-w-[80%]">We support underprivileged students with free books and guidance.</p>
        <button className="bg-white text-[#003366] px-4 py-2 rounded-lg text-xs font-bold relative z-10 shadow-sm hover:bg-slate-50">
          Request Support
        </button>
      </div>
    </motion.div>
  );

  const renderTeacher = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mb-6">
      <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
        <h2 className="text-lg font-extrabold text-[#003366] mb-4 flex items-center gap-2">
          <Library className="w-5 h-5 text-indigo-600" /> Teacher Help Desk
        </h2>
        
        <div className="space-y-3">
          <button className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                <FileCheck className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-slate-800 text-sm">Official Forms</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Shala Darpan & Board Forms</p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
          </button>

          <button className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                <BookOpen className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-slate-800 text-sm">Lesson Plans</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Subject-wise teaching materials</p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderAlerts = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 mb-6">
      <div className="bg-[#003366] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-bl-full blur-xl"></div>
        <h2 className="text-xl font-extrabold mb-1 relative z-10">Get Result Alerts</h2>
        <p className="text-blue-200 text-xs font-medium mb-5 relative z-10">Pre-register to receive your RBSE 2026 result via SMS.</p>
        
        {regSuccess ? (
          <div className="bg-white/10 rounded-xl p-4 border border-white/20 text-center relative z-10">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <h3 className="font-bold text-sm">Registered Successfully!</h3>
            <button onClick={() => setRegSuccess(false)} className="mt-3 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold transition-colors">
              Register Another
            </button>
          </div>
        ) : (
          <form onSubmit={handlePreRegister} className="space-y-3 relative z-10">
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              className="w-full px-3.5 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400 text-sm text-white placeholder:text-blue-200/50 font-medium"
              required
            />
            <input
              type="text"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="Enter your roll number"
              className="w-full px-3.5 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400 text-sm text-white placeholder:text-blue-200/50 font-medium"
              required
            />
            {regError && <p className="text-red-300 text-xs font-bold">{regError}</p>}
            <button type="submit" disabled={regLoading} className="w-full bg-blue-500 text-white py-3 rounded-xl font-bold hover:bg-blue-400 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-70">
              {regLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />} Notify Me
            </button>
          </form>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
        <h3 className="text-sm font-extrabold text-[#003366] mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-500" /> Latest Updates
        </h3>
        <div className="space-y-3">
          {notices.map((notice) => (
            <div key={notice.id} className={`p-3.5 rounded-xl border ${
              notice.type === 'success' ? 'bg-emerald-50 border-emerald-100' :
              notice.type === 'warning' ? 'bg-amber-50 border-amber-100' :
              'bg-blue-50 border-blue-100'
            }`}>
              <h4 className={`font-bold text-xs mb-1 ${
                notice.type === 'success' ? 'text-emerald-900' :
                notice.type === 'warning' ? 'text-amber-900' :
                'text-blue-900'
              }`}>{notice.title}</h4>
              <p className={`text-[11px] font-medium leading-relaxed ${
                notice.type === 'success' ? 'text-emerald-700' :
                notice.type === 'warning' ? 'text-amber-700' :
                'text-blue-700'
              }`}>{notice.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );

  const renderAdmin = () => {
    if (!isAdminAuth) {
      return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100 text-center mb-6">
          <Shield className="w-10 h-10 text-[#003366] mx-auto mb-3" />
          <h2 className="text-lg font-extrabold text-[#003366] mb-4">Admin Access</h2>
          
          {!currentUser ? (
            <button 
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-50 transition-all mb-4"
            >
              <Globe className="w-5 h-5 text-blue-500" /> Sign in with Google
            </button>
          ) : (
            <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={currentUser.photoURL} alt="" className="w-8 h-8 rounded-full" />
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-800 truncate max-w-[120px]">{currentUser.displayName}</p>
                  <p className="text-[8px] text-slate-500 font-bold">{currentUser.email}</p>
                </div>
              </div>
              <button onClick={() => signOut(auth)} className="text-[10px] font-black text-red-600 uppercase tracking-widest">Sign Out</button>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-3">
            <input type="password" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} placeholder="Enter PIN" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg tracking-widest font-bold text-slate-900" required />
            <button type="submit" className="w-full bg-[#003366] text-white py-3 rounded-xl font-bold text-sm shadow-md">Login</button>
          </form>
        </motion.div>
      );
    }

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 mb-6">
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-sm font-extrabold text-[#003366] flex items-center gap-2"><Shield className="w-4 h-4 text-blue-600" /> Dashboard</h2>
          <button onClick={() => { setIsAdminAuth(false); setAdminPin(''); setActiveTab('home'); }} className="text-slate-500 hover:text-red-600 flex items-center gap-1 text-xs font-bold"><LogOut className="w-3 h-3" /> Logout</button>
        </div>

        {/* Admin Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'notices', label: 'Notices', icon: <Bell className="w-3 h-3" /> },
            { id: 'ads', label: 'Ads', icon: <Sparkles className="w-3 h-3" /> },
            { id: 'regs', label: 'Regs', icon: <Users className="w-3 h-3" /> },
            { id: 'feedback', label: 'Feedback', icon: <MessageSquare className="w-3 h-3" /> },
            { id: 'settings', label: 'Settings', icon: <ShieldCheck className="w-3 h-3" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setAdminTab(tab.id as any)}
              className={`shrink-0 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                adminTab === tab.id 
                ? 'bg-[#003366] text-white shadow-md' 
                : 'bg-white text-slate-500 border border-slate-100'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {adminTab === 'notices' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
              <h3 className="text-xs font-extrabold text-slate-800 mb-3 flex items-center gap-1.5">
                {editingNotice ? <Edit2 className="w-4 h-4 text-blue-600" /> : <Plus className="w-4 h-4 text-blue-600" />} 
                {editingNotice ? 'Edit Notice' : 'Add Notice'}
              </h3>
              <form onSubmit={handleAddNotice} className="space-y-3">
                <input type="text" placeholder="Title" value={newNotice.title} onChange={e => setNewNotice({...newNotice, title: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium" required />
                <textarea placeholder="Description" value={newNotice.desc} onChange={e => setNewNotice({...newNotice, desc: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium min-h-[80px]" required />
                <select value={newNotice.type} onChange={e => setNewNotice({...newNotice, type: e.target.value as any})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium">
                  <option value="info">Info (Blue)</option>
                  <option value="success">Success (Green)</option>
                  <option value="warning">Warning (Orange)</option>
                </select>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-bold text-sm">
                    {editingNotice ? 'Update Notice' : 'Publish Notice'}
                  </button>
                  {editingNotice && (
                    <button type="button" onClick={() => { setEditingNotice(null); setNewNotice({ title: '', desc: '', type: 'info' }); }} className="px-4 bg-slate-100 text-slate-600 py-2.5 rounded-lg font-bold text-sm">Cancel</button>
                  )}
                </div>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
              <h3 className="text-xs font-extrabold text-slate-800 mb-4 flex items-center gap-1.5"><List className="w-4 h-4 text-blue-600" /> Current Notices</h3>
              <div className="space-y-3">
                {adminNotices.map(n => (
                  <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-slate-800">{n.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{n.desc}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditNotice(n)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteNotice(n.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
                {adminNotices.length === 0 && <p className="text-center py-4 text-xs text-slate-400 font-bold">No notices found</p>}
              </div>
            </div>
          </div>
        )}

        {adminTab === 'ads' && (
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
            <h3 className="text-xs font-extrabold text-slate-800 mb-3 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-blue-600" /> Manage Ads</h3>
            <form onSubmit={handleSaveAdSettings} className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <input type="checkbox" id="adEnabled" checked={adSettings.enabled} onChange={e => setAdSettings({...adSettings, enabled: e.target.checked})} className="w-4 h-4 rounded text-blue-600" />
                <label htmlFor="adEnabled" className="text-sm font-bold text-slate-700">Enable Advertisements</label>
              </div>
              
              {adSettings.enabled && (
                <div className="space-y-3 mt-4 animate-in fade-in slide-in-from-top-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Ad Type</label>
                  <select value={adSettings.type} onChange={e => setAdSettings({...adSettings, type: e.target.value as any})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium">
                    <option value="custom">Custom Image Ad</option>
                    <option value="adsense">Google AdSense</option>
                  </select>

                  {adSettings.type === 'custom' ? (
                    <>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Image URL</label>
                      <input type="url" placeholder="https://..." value={adSettings.customImageUrl} onChange={e => setAdSettings({...adSettings, customImageUrl: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium" />
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Link</label>
                      <input type="url" placeholder="https://..." value={adSettings.customLinkUrl} onChange={e => setAdSettings({...adSettings, customLinkUrl: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium" />
                    </>
                  ) : (
                    <>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">AdSense Client ID</label>
                      <input type="text" placeholder="ca-pub-..." value={adSettings.adsenseClient} onChange={e => setAdSettings({...adSettings, adsenseClient: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium" />
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">AdSense Slot ID</label>
                      <input type="text" placeholder="1234567890" value={adSettings.adsenseSlot} onChange={e => setAdSettings({...adSettings, adsenseSlot: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium" />
                    </>
                  )}
                </div>
              )}
              <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm shadow-md mt-4">Save Ad Configuration</button>
            </form>
          </div>
        )}

        {adminTab === 'regs' && (
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5"><Users className="w-4 h-4 text-blue-600" /> Pre-Registrations ({adminRegs.length})</h3>
              <button 
                onClick={() => exportToCSV(adminRegs, 'pre_registrations')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-colors"
              >
                <FileSpreadsheet className="w-3 h-3" /> Export CSV
              </button>
            </div>
            <div className="space-y-3">
              {adminRegs.map(r => (
                <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleToggleRegStatus(r.id, r.status)}
                      className={`p-1.5 rounded-lg transition-colors ${r.status === 'notified' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <div>
                      <p className={`text-xs font-black ${r.status === 'notified' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{r.mobile}</p>
                      <p className="text-[10px] text-slate-500 font-bold">Roll: {r.rollNumber} • Class: {r.classType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <a 
                      href={`tel:${r.mobile}`}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Call User"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <button onClick={() => handleDeleteReg(r.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
              {adminRegs.length === 0 && <p className="text-center py-4 text-xs text-slate-400 font-bold">No registrations yet</p>}
            </div>
          </div>
        )}

        {adminTab === 'feedback' && (
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-blue-600" /> User Feedback ({adminFeedback.length})</h3>
              <button 
                onClick={() => exportToCSV(adminFeedback, 'feedback')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-colors"
              >
                <FileSpreadsheet className="w-3 h-3" /> Export CSV
              </button>
            </div>
            <div className="space-y-4">
              {adminFeedback.map(f => (
                <div key={f.id} className={`p-4 rounded-2xl border transition-all ${f.status === 'resolved' ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-blue-100 shadow-sm'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] uppercase ${f.status === 'resolved' ? 'bg-slate-200 text-slate-500' : 'bg-blue-100 text-blue-600'}`}>
                        {f.name.charAt(0)}
                      </div>
                      <div>
                        <p className={`text-xs font-black ${f.status === 'resolved' ? 'text-slate-500' : 'text-slate-800'}`}>{f.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold">{f.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <a 
                        href={`mailto:${f.email}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Email User"
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                      <button 
                        onClick={() => handleToggleFeedbackStatus(f.id, f.status)}
                        className={`p-2 rounded-lg transition-colors ${f.status === 'resolved' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:bg-slate-50'}`}
                        title={f.status === 'resolved' ? 'Mark as Pending' : 'Mark as Resolved'}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteFeedback(f.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <p className={`text-[11px] font-medium leading-relaxed p-3 rounded-xl border ${f.status === 'resolved' ? 'text-slate-400 border-slate-100 bg-slate-50/50' : 'text-slate-600 border-blue-50 bg-blue-50/30'}`}>{f.message}</p>
                  {f.createdAt && (
                    <p className="text-[8px] text-slate-400 font-bold mt-2 text-right uppercase tracking-widest">
                      {new Date(f.createdAt?.seconds * 1000).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
              {adminFeedback.length === 0 && <p className="text-center py-4 text-xs text-slate-400 font-bold">No feedback received yet</p>}
            </div>
          </div>
        )}

        {adminTab === 'settings' && (
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
            <h3 className="text-xs font-extrabold text-slate-800 mb-3 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-blue-600" /> Support Settings</h3>
            <form onSubmit={handleSaveContactSettings} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Support Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="email" 
                    value={contactSettings.email} 
                    onChange={e => setContactSettings({...contactSettings, email: e.target.value})} 
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium" 
                    placeholder="support@example.com"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Support Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={contactSettings.phone} 
                    onChange={e => setContactSettings({...contactSettings, phone: e.target.value})} 
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium" 
                    placeholder="+91 00000 00000"
                    required
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm shadow-md mt-4">Update Support Info</button>
            </form>
          </div>
        )}
      </motion.div>
    );
  };

  const renderPrivacyPolicy = () => (
    <PrivacyPolicy onBack={() => setActiveTab('info')} />
  );

  const renderInfo = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 mb-6">
      {/* Premium Hero Section */}
      <div className="bg-gradient-to-br from-[#003366] to-blue-900 dark:from-slate-900 dark:to-blue-900 rounded-[2.5rem] p-10 text-white text-center relative overflow-hidden shadow-2xl shadow-blue-900/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/10 rounded-full -ml-24 -mb-24 blur-2xl"></div>
        
        <div className="relative z-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-white/20 shadow-inner"
          >
            <BookOpen className="w-12 h-12 text-blue-300" />
          </motion.div>
          <h2 className="text-4xl font-black tracking-tighter mb-2 font-display">ZORAN EDU</h2>
          <p className="text-blue-200 text-[10px] font-black uppercase tracking-[0.5em] mb-6 opacity-80">The Future of Education</p>
          <div className="h-1 w-16 bg-blue-400 mx-auto rounded-full mb-8"></div>
          <p className="text-blue-100/90 text-sm font-bold italic leading-relaxed max-w-[280px] mx-auto">
            "Bridging the gap between potential and achievement."
          </p>
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-[#003366] dark:text-blue-400">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">{t.mission}</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">{t.mission_text}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">{t.vision}</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">{t.vision_text}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Users2 className="w-4 h-4" />, label: t.students, val: "50K+" },
          { icon: <Library className="w-4 h-4" />, label: t.resources, val: "1K+" },
          { icon: <Award className="w-4 h-4" />, label: t.accuracy, val: "100%" }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800 text-center shadow-sm">
            <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-3 text-[#003366] dark:text-blue-400">
              {stat.icon}
            </div>
            <div className="text-base font-black text-slate-800 dark:text-slate-200">{stat.val}</div>
            <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Premium Features */}
      <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <h3 className="text-xs font-black text-[#003366] dark:text-blue-400 mb-8 uppercase tracking-[0.3em] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-500" /> {t.premium_features}
        </h3>
        <div className="grid grid-cols-1 gap-6">
          {[
            { title: "Real-time Sync", desc: "Direct connection with official servers for instant updates.", icon: <Zap className="text-blue-500" /> },
            { title: "Smart Analysis", desc: "Detailed subject-wise charts and performance metrics.", icon: <BarChart3 className="text-indigo-500" /> },
            { title: "Multi-Format Export", desc: "Download results as high-quality PDF or Image.", icon: <FileDown className="text-emerald-500" /> },
            { title: "Privacy First", desc: "Bank-grade encryption for all your academic data.", icon: <ShieldCheck className="text-rose-500" /> }
          ].map((feat, i) => (
            <div key={i} className="flex gap-5 group">
              <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                {feat.icon}
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight mb-1">{feat.title}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <h3 className="text-xs font-black text-[#003366] dark:text-blue-400 mb-6 uppercase tracking-[0.3em] flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-purple-500" /> {t.faq}
        </h3>
        <div className="space-y-4">
          {[
            { q: "Is this result official?", a: "Yes, we fetch data directly from RBSE and Shala Darpan servers." },
            { q: "Can I download my marksheet?", a: "You can download a digital copy in PDF or Image format." },
            { q: "How to check school-wise results?", a: "Switch to 'School Wise' mode and enter your school NIC code." }
          ].map((item, i) => (
            <div key={i} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <p className="text-xs font-black text-slate-800 dark:text-slate-200 mb-2">{item.q}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Support Section */}
      <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800">
        <h3 className="text-xs font-black text-[#003366] dark:text-blue-400 mb-8 uppercase tracking-[0.3em] flex items-center gap-2">
          <HeartHandshake className="w-4 h-4 text-emerald-500" /> Support & Feedback
        </h3>
        
        <div className="grid grid-cols-1 gap-4 mb-8">
          <a href={`mailto:${contactSettings.email}`} className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 transition-all">
            <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shadow-sm">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Email Support</p>
              <p className="text-sm font-black text-slate-800 dark:text-slate-200">{contactSettings.email}</p>
            </div>
          </a>
          <a href={`tel:${contactSettings.phone}`} className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 transition-all">
            <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shadow-sm">
              <Phone className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Call Helpline</p>
              <p className="text-sm font-black text-slate-800 dark:text-slate-200">{contactSettings.phone}</p>
            </div>
          </a>
        </div>

        <form onSubmit={handleFeedbackSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input 
              type="text" 
              placeholder="Your Name" 
              value={feedbackForm.name}
              onChange={e => setFeedbackForm({...feedbackForm, name: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all" 
              required
            />
            <input 
              type="email" 
              placeholder="Email Address" 
              value={feedbackForm.email}
              onChange={e => setFeedbackForm({...feedbackForm, email: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all" 
              required
            />
          </div>
          <textarea 
            placeholder="How can we help you?" 
            rows={4} 
            value={feedbackForm.message}
            onChange={e => setFeedbackForm({...feedbackForm, message: e.target.value})}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all resize-none"
            required
          ></textarea>
          
          {feedbackSuccess && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black text-center uppercase tracking-widest">
              Feedback sent successfully!
            </motion.p>
          )}

          <button 
            type="submit" 
            disabled={feedbackLoading}
            className="w-full py-4 bg-[#003366] dark:bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70"
          >
            {feedbackLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Send Message'}
          </button>
        </form>
      </section>

      {/* Footer Branding */}
      <div className="text-center space-y-4 pt-4 pb-12">
        <div className="flex items-center justify-center gap-3 opacity-20">
          <div className="h-[1px] w-12 bg-slate-400"></div>
          <BookOpen className="w-5 h-5 text-slate-400" />
          <div className="h-[1px] w-12 bg-slate-400"></div>
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.5em]">ZORAN v2.5.0 Premium</p>
          <p className="text-[9px] font-bold text-slate-300 dark:text-slate-600 mt-2">© 2026 ZORAN Education. All Rights Reserved.</p>
          <p className="text-[8px] font-bold text-slate-400 dark:text-slate-600 mt-2 px-4">
            Disclaimer: This is not an official app of the RBSE Board or Shala Darpan. We fetch data from public sources for convenience.
          </p>
          <button onClick={() => setActiveTab('privacy')} className="text-[8px] font-bold text-blue-600 dark:text-blue-400 mt-2 underline">
            Privacy Policy
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 font-sans selection:bg-blue-200 selection:text-blue-900 flex justify-center transition-colors duration-300">
        
        {/* Mobile App Container */}
        <div className="w-full max-w-md bg-[#F4F7F9] dark:bg-slate-950 min-h-screen relative flex flex-col shadow-2xl shadow-slate-300/50 transition-colors duration-300">
          
          {/* Floating Quick Actions */}
          <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-3">
            <AnimatePresence>
              {showQuickActions && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  className="flex flex-col gap-3 mb-3"
                >
                  <button
                    onClick={toggleTheme}
                    className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-xl flex items-center justify-center border border-slate-100 dark:border-slate-700 text-[#003366] dark:text-blue-400 hover:scale-110 transition-transform"
                    title="Toggle Theme"
                  >
                    {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={toggleLang}
                    className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-xl flex items-center justify-center border border-slate-100 dark:border-slate-700 text-[#003366] dark:text-blue-400 hover:scale-110 transition-transform"
                    title="Change Language"
                  >
                    <Languages className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => window.open('https://wa.me/919876543210', '_blank')}
                    className="w-12 h-12 bg-emerald-500 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform"
                    title="WhatsApp Support"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                  <button
                    onClick={async () => {
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: 'ZORAN - RBSE Result 2026',
                            text: 'Check your RBSE 10th & 12th Results instantly on ZORAN Premium!',
                            url: window.location.origin,
                          });
                        } catch (err: any) {
                          if (err.name !== 'AbortError') {
                            console.error('Share failed:', err);
                          }
                        }
                      }
                    }}
                    className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-xl flex items-center justify-center border border-slate-100 dark:border-slate-700 text-[#003366] dark:text-blue-400 hover:scale-110 transition-transform"
                    title="Share App"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActiveTab('info')}
                    className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-xl flex items-center justify-center border border-slate-100 dark:border-slate-700 text-[#003366] dark:text-blue-400 hover:scale-110 transition-transform"
                    title="Help & Info"
                  >
                    <HelpCircle className="w-5 h-5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="w-14 h-14 bg-[#003366] dark:bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
            >
              <motion.div
                animate={{ rotate: showQuickActions ? 45 : 0 }}
                className="flex items-center justify-center"
              >
                <Plus className="w-7 h-7" />
              </motion.div>
            </button>
          </div>

          {/* Header */}
          <header className="bg-[#003366] dark:bg-slate-900 text-white sticky top-0 z-40 shadow-lg border-b border-white/5">
            {/* Live News Ticker */}
            <div className="bg-blue-600/20 backdrop-blur-md py-1 px-4 overflow-hidden whitespace-nowrap border-b border-white/5">
              <motion.div 
                animate={{ x: [400, -1000] }} 
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-200"
              >
                • RBSE Class 10th & 12th Results 2026 Expected Soon • Stay tuned for live updates • Pre-register for SMS alerts • ZORAN Premium v2.5.0 is now live •
              </motion.div>
            </div>

            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 cursor-pointer select-none" onClick={handleLogoClick}>
                <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
                  <BookOpen className="w-5 h-5 text-blue-300" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-xl font-black leading-none tracking-tight font-display">ZORAN</h1>
                  <p className="text-[9px] text-blue-200/70 font-black uppercase tracking-[0.2em] mt-1">RBSE Result 2026</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button onClick={toggleLang} className="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors border border-white/5">
                  <Languages className="w-4 h-4 text-blue-200" />
                </button>
                <button onClick={toggleTheme} className="w-9 h-9 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors border border-white/5">
                  {theme === 'light' ? <Moon className="w-4 h-4 text-blue-200" /> : <Sun className="w-4 h-4 text-yellow-400" />}
                </button>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-5 pb-24 scrollbar-hide">
            <AnimatePresence mode="wait">
              {activeTab === 'home' && renderHome()}
              {activeTab === 'resources' && renderResources()}
              {activeTab === 'teacher' && renderTeacher()}
              {activeTab === 'alerts' && renderAlerts()}
              {activeTab === 'admin' && renderAdmin()}
              {activeTab === 'info' && renderInfo()}
              {activeTab === 'privacy' && renderPrivacyPolicy()}
            </AnimatePresence>
          </main>

          {/* Bottom Navigation */}
          <nav className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-around h-16 px-1">
              <button onClick={() => { setActiveTab('home'); setResult(null); setSchoolResult(null); }} className={`flex flex-col items-center justify-center w-12 h-full gap-1 transition-colors ${activeTab === 'home' ? 'text-[#003366] dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
                <Home className={`w-5 h-5 ${activeTab === 'home' ? 'fill-current' : ''}`} />
                <span className={`text-[9px] ${activeTab === 'home' ? 'font-extrabold' : 'font-bold'}`}>Home</span>
              </button>
              <button onClick={() => setActiveTab('resources')} className={`flex flex-col items-center justify-center w-12 h-full gap-1 transition-colors ${activeTab === 'resources' ? 'text-[#003366] dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
                <GraduationCap className={`w-5 h-5 ${activeTab === 'resources' ? 'fill-current' : ''}`} />
                <span className={`text-[9px] ${activeTab === 'resources' ? 'font-extrabold' : 'font-bold'}`}>Student</span>
              </button>
              <button onClick={() => setActiveTab('teacher')} className={`flex flex-col items-center justify-center w-12 h-full gap-1 transition-colors ${activeTab === 'teacher' ? 'text-[#003366] dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
                <Library className={`w-5 h-5 ${activeTab === 'teacher' ? 'fill-current' : ''}`} />
                <span className={`text-[9px] ${activeTab === 'teacher' ? 'font-extrabold' : 'font-bold'}`}>Teacher</span>
              </button>
              <button onClick={() => setActiveTab('alerts')} className={`flex flex-col items-center justify-center w-12 h-full gap-1 transition-colors ${activeTab === 'alerts' ? 'text-[#003366] dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
                <Bell className={`w-5 h-5 ${activeTab === 'alerts' ? 'fill-current' : ''}`} />
                <span className={`text-[9px] ${activeTab === 'alerts' ? 'font-extrabold' : 'font-bold'}`}>Alerts</span>
              </button>
              <button onClick={() => setActiveTab('info')} className={`flex flex-col items-center justify-center w-12 h-full gap-1 transition-colors ${activeTab === 'info' ? 'text-[#003366] dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>
                <Info className={`w-5 h-5 ${activeTab === 'info' ? 'fill-current' : ''}`} />
                <span className={`text-[9px] ${activeTab === 'info' ? 'font-extrabold' : 'font-bold'}`}>Info</span>
              </button>
            </div>
          </nav>

        </div>
        <AnimatePresence>
          {toast.show && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 50 }}
              className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[110] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
                toast.type === 'success' 
                ? 'bg-emerald-600 border-emerald-500 text-white' 
                : 'bg-red-600 border-red-500 text-white'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <p className="text-sm font-black tracking-tight">{toast.message}</p>
            </motion.div>
          )}
          {confirmModal.show && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border border-slate-100 dark:border-slate-800"
              >
                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 mx-auto mb-6">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 text-center mb-2">{confirmModal.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center font-bold mb-8 leading-relaxed">
                  {confirmModal.message}
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                    className="flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmModal.onConfirm}
                    className="flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20 transition-colors"
                  >
                    Confirm
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
