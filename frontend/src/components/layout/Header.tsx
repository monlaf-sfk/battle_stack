import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useTranslation } from 'react-i18next';

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '#features', label: t('header.features') },
    { href: '#how-it-works', label: t('header.howItWorks') },
    { href: '#live-battle', label: t('header.liveDemo') },
  ];

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-black/90 backdrop-blur-sm border-b border-green-500/20' 
          : 'bg-transparent'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <motion.div 
            className="flex-shrink-0"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Link to="/" className="flex items-center space-x-3 group">
              <motion.div
                className="relative"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <img src="/logo.svg" alt="BattleStack Logo" className="h-10 w-10" />
                <div className="absolute inset-0 bg-green-500/20 blur-xl group-hover:bg-green-500/40 transition-colors duration-300" />
              </motion.div>
              <span className="text-2xl font-bold text-white font-mono tracking-wider">
                {t('header.title')}
              </span>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex items-center space-x-6">
              {navLinks.map((link, index) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  className="text-white/70 hover:text-green-400 transition-colors duration-300 font-mono font-medium tracking-wide"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ y: -2, scale: 1.05 }}
                >
                  {link.label}
                </motion.a>
              ))}
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/login">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-white/70 hover:text-white font-mono px-4 py-2 rounded-lg border border-white/20 hover:border-green-400/50 transition-all duration-300"
                >
                  {t('common.login')}
                </motion.button>
              </Link>
              <Link to="/register">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-mono px-6 py-2 rounded-lg shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-300"
                >
                  {t('common.signUp')}
                </motion.button>
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            className="md:hidden text-white p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            whileTap={{ scale: 0.95 }}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </motion.button>
        </div>

        {/* Mobile Navigation */}
        <motion.div
          className={`md:hidden overflow-hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}
          initial={{ opacity: 0, height: 0 }}
          animate={{ 
            opacity: isMobileMenuOpen ? 1 : 0, 
            height: isMobileMenuOpen ? 'auto' : 0 
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="px-2 pt-2 pb-3 space-y-1 bg-black/90 backdrop-blur-sm rounded-lg mt-4 border border-green-500/20">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block px-3 py-2 rounded-md text-base font-mono text-white/70 hover:text-green-400 hover:bg-white/10 transition-all duration-300"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-4 space-y-2">
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <button className="w-full text-white/70 hover:text-white font-mono px-4 py-2 rounded-lg border border-white/20 hover:border-green-400/50 transition-all duration-300">
                  {t('common.login')}
                </button>
              </Link>
              <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
                <button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-mono px-6 py-2 rounded-lg shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-300">
                  {t('common.signUp')}
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      </nav>
    </motion.header>
  );
} 