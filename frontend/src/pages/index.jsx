import Layout from "./Layout.jsx";

import Landing from "./Landing";
import Home from "./Home";
import Login from "./Login";
import Signup from "./Signup";
import AuthCallback from "./AuthCallback";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import UploadResume from "./UploadResume";
import BuildWizard from "./BuildWizard";
import ResumeReview from "./ResumeReview";
import MyResumes from "./MyResumes";
import Pricing from "./Pricing";
import Help from "./Help";
import AccountSettings from "./AccountSettings.jsx";
import SubscriptionManagement from "./SubscriptionManagement";
import SubscriptionSuccess from "./SubscriptionSuccess";
import Documentation from "./Documentation";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    Home: Home,
    UploadResume: UploadResume,
    BuildWizard: BuildWizard,
    ResumeReview: ResumeReview,
    MyResumes: MyResumes,
    Pricing: Pricing,
    Help: Help,
    SubscriptionManagement: SubscriptionManagement,
    Documentation: Documentation,
}

// Public pages that don't require authentication
const PUBLIC_PAGES = ['Home', 'Pricing', 'Help', 'Login', 'Signup'];

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    const isPublicPage = PUBLIC_PAGES.includes(currentPage) || location.pathname === '/login' || location.pathname === '/signup';
    
    // Landing page and auth pages don't use Layout (they have their own navigation)
    if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/auth/callback' || location.pathname === '/forgot-password' || location.pathname === '/reset-password') {
        return (
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
            </Routes>
        );
    }
    
    return (
        <Layout currentPageName={currentPage} isPublicPage={isPublicPage}>
            <Routes>
                <Route path="/Home" element={<Home />} />
                <Route path="/UploadResume" element={<UploadResume />} />
                <Route path="/BuildWizard" element={<BuildWizard />} />
                <Route path="/ResumeReview" element={<ResumeReview />} />
                <Route path="/MyResumes" element={<MyResumes />} />
                <Route path="/Pricing" element={<Pricing />} />
                <Route path="/Help" element={<Help />} />
                <Route path="/AccountSettings" element={<AccountSettings />} />
                <Route path="/SubscriptionManagement" element={<SubscriptionManagement />} />
                <Route path="/subscription-success" element={<SubscriptionSuccess />} />
                <Route path="/Documentation" element={<Documentation />} />
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}
