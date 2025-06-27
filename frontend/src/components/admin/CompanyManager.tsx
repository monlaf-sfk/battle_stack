import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Building, Star, Sparkles, Check } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  logo_url?: string;
}

interface CompanyManagerProps {
  companies: Company[];
  onCreateCompany: (company: { name: string; logo_url?: string }) => Promise<void>;
  onDeleteCompany: (companyId: string) => Promise<void>;
  onRefresh: () => void;
}

export const CompanyManager: React.FC<CompanyManagerProps> = ({
  companies,
  onCreateCompany,
  onDeleteCompany,
  onRefresh
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', logo_url: '' });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newCompany.name.trim()) return;

    setCreating(true);
    try {
      await onCreateCompany({
        name: newCompany.name.trim(),
        logo_url: newCompany.logo_url.trim() || undefined
      });
      setNewCompany({ name: '', logo_url: '' });
      setShowCreateForm(false);
      onRefresh();
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (companyId: string) => {
    if (!confirm('Are you sure you want to delete this company?')) return;
    
    await onDeleteCompany(companyId);
    onRefresh();
  };

  const popularCompanies = [
    { name: 'Google', logo: 'https://logo.clearbit.com/google.com' },
    { name: 'Meta', logo: 'https://logo.clearbit.com/meta.com' },
    { name: 'Apple', logo: 'https://logo.clearbit.com/apple.com' },
    { name: 'Amazon', logo: 'https://logo.clearbit.com/amazon.com' },
    { name: 'Microsoft', logo: 'https://logo.clearbit.com/microsoft.com' },
    { name: 'Netflix', logo: 'https://logo.clearbit.com/netflix.com' },
    { name: 'Tesla', logo: 'https://logo.clearbit.com/tesla.com' },
    { name: 'Uber', logo: 'https://logo.clearbit.com/uber.com' },
    { name: 'Airbnb', logo: 'https://logo.clearbit.com/airbnb.com' },
    { name: 'Spotify', logo: 'https://logo.clearbit.com/spotify.com' },
    { name: 'LinkedIn', logo: 'https://logo.clearbit.com/linkedin.com' },
    { name: 'Twitter', logo: 'https://logo.clearbit.com/twitter.com' },
    { name: 'Adobe', logo: 'https://logo.clearbit.com/adobe.com' },
    { name: 'Salesforce', logo: 'https://logo.clearbit.com/salesforce.com' },
    { name: 'ByteDance', logo: 'https://logo.clearbit.com/bytedance.com' },
  ];

  const quickAddCompany = async (company: { name: string; logo: string }) => {
    await onCreateCompany({ name: company.name, logo_url: company.logo });
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h3 className="text-2xl font-bold gradient-text flex items-center gap-3">
            <Building size={28} className="text-arena-accent" />
            Company Management
          </h3>
          <p className="text-arena-text-muted mt-2">Manage companies for problem categorization</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          variant="gradient"
          className="font-semibold"
        >
          <Plus size={16} className="mr-2" />
          Add Company
        </Button>
      </motion.div>

      {/* Quick Add Popular Companies */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card variant="glass" hover="glow" className="border-arena-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles size={20} className="text-arena-accent" />
              Quick Add Popular Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <AnimatePresence>
                {popularCompanies
                  .filter(company => !companies.some(c => c.name === company.name))
                  .map((company, index) => (
                    <motion.button
                      key={company.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => quickAddCompany(company)}
                      className="flex items-center gap-3 p-4 bg-arena-surface/50 border border-arena-border rounded-lg hover:border-arena-accent/40 hover:bg-arena-light/30 hover:shadow-lg transition-all duration-300 group"
                    >
                      <img
                        src={company.logo}
                        alt={company.name}
                        className="w-8 h-8 rounded-md group-hover:scale-110 transition-transform duration-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>';
                        }}
                      />
                      <span className="text-sm font-medium text-arena-text group-hover:text-arena-accent transition-colors">
                        {company.name}
                      </span>
                      <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus size={14} className="text-arena-accent" />
                      </div>
                    </motion.button>
                  ))}
              </AnimatePresence>
            </div>
            {popularCompanies.filter(company => !companies.some(c => c.name === company.name)).length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="w-16 h-16 bg-arena-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-arena-accent" />
                </div>
                <h4 className="text-lg font-semibold text-arena-text mb-2">All Set!</h4>
                <p className="text-arena-text-muted">All popular companies have been added to your collection.</p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <Card variant="glass" className="border-arena-accent/30 shadow-arena-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus size={20} className="text-arena-accent" />
                  Create New Company
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Input
                      placeholder="Company name (e.g., Google, Apple)"
                      value={newCompany.name}
                      onChange={(e) => setNewCompany(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-arena-surface/50 border-arena-border focus:border-arena-accent"
                    />
                    <Input
                      placeholder="Logo URL (optional)"
                      value={newCompany.logo_url}
                      onChange={(e) => setNewCompany(prev => ({ ...prev, logo_url: e.target.value }))}
                      className="bg-arena-surface/50 border-arena-border focus:border-arena-accent"
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={handleCreate}
                      disabled={creating || !newCompany.name.trim()}
                      variant="gradient"
                      className="flex-1 font-semibold"
                      loading={creating}
                    >
                      {creating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-arena-dark border-t-transparent mr-2"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus size={16} className="mr-2" />
                          Create Company
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewCompany({ name: '', logo_url: '' });
                      }}
                      className="border border-arena-border hover:bg-arena-surface/50 hover:border-arena-accent/40"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing Companies */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card variant="glass" hover="glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building size={20} className="text-arena-accent" />
              Existing Companies ({companies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {companies.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-arena-surface rounded-full flex items-center justify-center mx-auto mb-6">
                  <Building className="w-10 h-10 text-arena-text-muted" />
                </div>
                <h3 className="text-xl font-semibold text-arena-text mb-2">No companies yet</h3>
                <p className="text-arena-text-muted mb-6">Add your first company to get started</p>
                <Button 
                  onClick={() => setShowCreateForm(true)}
                  variant="gradient"
                >
                  <Plus size={16} className="mr-2" />
                  Add Company
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {companies.map((company, index) => (
                    <motion.div
                      key={company.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -2 }}
                    >
                      <Card variant="glass" hover="lift" className="group">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {company.logo_url ? (
                                <img
                                  src={company.logo_url}
                                  alt={company.name}
                                  className="w-10 h-10 rounded-lg object-cover group-hover:scale-110 transition-transform duration-200"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>';
                                  }}
                                />
                              ) : (
                                <div className="w-10 h-10 bg-arena-accent/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                  <Building className="w-5 h-5 text-arena-accent" />
                                </div>
                              )}
                              <div>
                                <h4 className="font-semibold text-arena-text group-hover:text-arena-accent transition-colors">
                                  {company.name}
                                </h4>
                                <p className="text-xs text-arena-text-muted">
                                  ID: {company.id.slice(0, 8)}...
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(company.id)}
                              className="opacity-0 group-hover:opacity-100 text-arena-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}; 