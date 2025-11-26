import Layout from "./Layout.jsx";

import Home from "./Home";
import Login from "./Login";
import Signup from "./Signup";
import UploadResume from "./UploadResume";
import BuildWizard from "./BuildWizard";
import ResumeReview from "./ResumeReview";
import MyResumes from "./MyResumes";
import Pricing from "./Pricing";
import Help from "./Help";
import AccountSettings from "./AccountSettings.jsx";
import SubscriptionManagement from "./SubscriptionManagement";
import SettingsProviders from "./SettingsProviders";
import SettingsPrompts from "./SettingsPrompts";
import SettingsPlans from "./SettingsPlans";
import SettingsCodes from "./SettingsCodes";
import SettingsCampaigns from "./SettingsCampaigns";
import SettingsHelp from "./SettingsHelp";
import SettingsInterface from "./SettingsInterface";
import SettingsUsers from "./SettingsUsers";
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
    SettingsProviders: SettingsProviders,
    SettingsPrompts: SettingsPrompts,
    SettingsPlans: SettingsPlans,
    SettingsCodes: SettingsCodes,
    SettingsCampaigns: SettingsCampaigns,
    SettingsHelp: SettingsHelp,
    SettingsInterface: SettingsInterface,
    SettingsUsers: SettingsUsers,
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
    
    // Auth pages don't use Layout
    if (location.pathname === '/login' || location.pathname === '/signup') {
        return (
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
            </Routes>
        );
    }
    
    return (
        <Layout currentPageName={currentPage} isPublicPage={isPublicPage}>
            <Routes>            
                <Route path="/" element={<Home />} />
                <Route path="/Home" element={<Home />} />
                <Route path="/UploadResume" element={<UploadResume />} />
                <Route path="/BuildWizard" element={<BuildWizard />} />
                <Route path="/ResumeReview" element={<ResumeReview />} />
                <Route path="/MyResumes" element={<MyResumes />} />
                <Route path="/Pricing" element={<Pricing />} />
                <Route path="/Help" element={<Help />} />
                <Route path="/AccountSettings" element={<AccountSettings />} />
                <Route path="/SubscriptionManagement" element={<SubscriptionManagement />} />
                <Route path="/SettingsProviders" element={<SettingsProviders />} />
                <Route path="/SettingsPrompts" element={<SettingsPrompts />} />
                <Route path="/SettingsPlans" element={<SettingsPlans />} />
                <Route path="/SettingsCodes" element={<SettingsCodes />} />
                <Route path="/SettingsCampaigns" element={<SettingsCampaigns />} />
                <Route path="/SettingsHelp" element={<SettingsHelp />} />
                <Route path="/SettingsInterface" element={<SettingsInterface />} />
                <Route path="/SettingsUsers" element={<SettingsUsers />} />
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
