import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Loader2, Lock, Plus, Users, ClipboardCopy, Check } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { duelsApiService } from '../../services/api';
import { useTranslation } from 'react-i18next';
import { Label } from '../ui/label';
import DuelSetupForm, { type DuelSettings } from './DuelSetupForm';

interface PrivateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivateRoomModal: React.FC<PrivateRoomModalProps> = ({ isOpen, onClose }) => {
  const [view, setView] = useState<'join_create' | 'setup_duel' | 'room_created'>('join_create');
  const [roomCode, setRoomCode] = useState('');
  const [createdDuelId, setCreatedDuelId] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomCode.trim()) {
      addToast({
        type: 'error',
        title: t('joinPrivateRoom.invalidRoomCodeTitle'),
        message: t('joinPrivateRoom.enterRoomCodeMessage'),
      });
      return;
    }

    if (roomCode.length !== 6) {
      addToast({
        type: 'error',
        title: t('joinPrivateRoom.invalidRoomCodeTitle'),
        message: t('joinPrivateRoom.roomCodeLengthMessage'),
      });
      return;
    }

    if (!user?.id) {
        addToast({
            type: 'error',
            title: t('common.error'),
            message: t('common.loginToContinue'),
        });
        navigate('/login');
        return;
    }

    setIsJoining(true);
    try {
      const duel = await duelsApiService.joinRoom(roomCode.toUpperCase(), user.id);
      
      addToast({
        type: 'success',
        title: t('joinPrivateRoom.joinedRoomTitle'),
        message: t('joinPrivateRoom.joinedRoomMessage'),
      });

      onClose();
      navigate(`/duel/${duel.id}`);
      
    } catch (error: any) {
      console.error('Failed to join private room:', error);
      
      if (error.response?.status === 404) {
        addToast({
          type: 'error',
          title: t('joinPrivateRoom.roomNotFoundTitle'),
          message: t('joinPrivateRoom.roomNotFoundMessage'),
        });
      } else if (error.response?.data?.detail) {
        addToast({
          type: 'error',
          title: t('joinPrivateRoom.failedToJoinRoomTitle'),
          message: error.response.data.detail,
        });
      } else {
        addToast({
          type: 'error',
          title: t('joinPrivateRoom.connectionErrorTitle'),
          message: t('joinPrivateRoom.connectionErrorMessage'),
        });
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateRoomSubmit = async (settings: DuelSettings) => {
    if (!user?.id) {
        addToast({
            type: 'error',
            title: t('common.error'),
            message: t('common.loginToContinue'),
        });
        navigate('/login');
        return;
    }

    setIsCreating(true);
    const { difficulty, category, theme, language } = settings;

    try {
      const duel = await duelsApiService.createPrivateRoom({
        user_id: user.id,
        difficulty,
        category,
        theme,
        language_id: language.id,
      });

      if (duel.room_code && duel.id) {
        setRoomCode(duel.room_code);
        setCreatedDuelId(duel.id);
        setView('room_created');
      } else {
        throw new Error('Room code or Duel ID was not returned from the server.');
      }

    } catch (error: any) {
      console.error('Failed to create private room:', error);
      addToast({
        type: 'error',
        title: t('joinPrivateRoom.failedToCreateRoomTitle'),
        message: error?.response?.data?.detail || t('joinPrivateRoom.tryAgainMessage'),
      });
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      addToast({ type: 'success', title: 'Copied!', message: 'Room code copied to clipboard.' });
      setTimeout(() => setCopied(false), 2000); // Reset icon after 2s
    } catch (err) {
      addToast({ type: 'error', title: 'Copy Failed', message: 'Could not copy room code.' });
    }
  };

  const handleStartDuel = () => {
    if (createdDuelId) {
      navigate(`/duel/${createdDuelId}`);
      onClose();
    }
  };
  
  const handleClose = () => {
    if (!isJoining && !isCreating) {
      setRoomCode('');
      setCreatedDuelId(null);
      setView('join_create');
      onClose();
    }
  };

  const formatRoomCode = (value: string) => {
    const formatted = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return formatted.slice(0, 6);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRoomCode(e.target.value);
    setRoomCode(formatted);
  };

  if (!isOpen) return null;

  if (view === 'setup_duel') {
    return (
      <DuelSetupForm
        isOpen={isOpen}
        onClose={handleClose}
        onSubmit={handleCreateRoomSubmit}
        title={t('privateRoom.setupTitle')}
        description={t('privateRoom.setupDescription')}
      />
    );
  }

  if (view === 'room_created') {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="bg-gray-900 border border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <span>{t('joinPrivateRoom.roomCreatedTitle')}</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-400 pt-2">
              {t('joinPrivateRoom.shareCodeMessage')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 text-center py-4">
            <Label className="text-slate-300">{t('joinPrivateRoom.yourRoomCode')}</Label>
            <div className="relative">
              <Input
                readOnly
                value={roomCode}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-center text-3xl font-mono tracking-widest"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyToClipboard}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {copied ? <Check className="w-5 h-5 text-green-400" /> : <ClipboardCopy className="w-5 h-5" />}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              {t('joinPrivateRoom.waitingForOpponent')}
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
            <Button
              onClick={handleStartDuel}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {t('joinPrivateRoom.startDuelButton')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              className="w-full text-slate-400 hover:text-white border border-slate-700"
            >
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Lock className="w-5 h-5 text-blue-400" />
            </div>
            <span>{t('joinPrivateRoom.title')}</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-400 pt-2">
            {t('joinPrivateRoom.subtitle')}
          </DialogDescription>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleJoinRoom} className="space-y-6 pt-4">
          <div>
            <Label htmlFor="roomCode" className="block text-sm font-medium text-slate-300 mb-2">
              {t('joinPrivateRoom.roomCodeLabel')}
            </Label>
            <Input
              id="roomCode"
              type="text"
              value={roomCode}
              onChange={handleInputChange}
              placeholder={t('joinPrivateRoom.roomCodePlaceholder')}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-wider"
              maxLength={6}
              disabled={isJoining}
              autoFocus
            />
            <p className="text-xs text-slate-500 mt-1 text-center">
              {t('joinPrivateRoom.roomCodeCharCount', { count: roomCode.length })}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              type="submit"
              disabled={!roomCode || roomCode.length !== 6 || isJoining || isCreating}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('joinPrivateRoom.joiningButton')}
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  {t('joinPrivateRoom.joinRoomButton')}
                </>
              )}
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-900 px-2 text-slate-400">{t('common.or')}</span>
              </div>
            </div>
            
            <Button
              type="button"
              variant="ghost"
              onClick={() => setView('setup_duel')}
              disabled={isJoining || isCreating}
              className="w-full border-green-500/30 hover:border-green-400 bg-green-500/10 hover:bg-green-500/20 text-green-400 hover:text-green-300"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('joinPrivateRoom.creatingButton')}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('joinPrivateRoom.createNewRoomButton')}
                </>
              )}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isJoining || isCreating}
              className="w-full text-slate-400 hover:text-white border border-slate-700"
            >
              {t('common.cancel')}
            </Button>
          </div>
        </form>

        {/* Info */}
        <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-slate-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-1">Private Room</h4>
              <p className="text-xs text-slate-500">
                Only players with the room code can join this duel. The room will start automatically when a second player joins.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrivateRoomModal; 