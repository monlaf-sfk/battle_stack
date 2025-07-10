import React, { useState } from 'react';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Loader2, Lock, Plus, Users, X } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { duelsApiService } from '../../services/api';
import { useTranslation } from 'react-i18next';
import { Label } from '../ui/label';

interface PrivateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivateRoomModal: React.FC<PrivateRoomModalProps> = ({ isOpen, onClose }) => {
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
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

  const handleCreateRoom = async () => {
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
    try {
      const duel = await duelsApiService.createPrivateRoom(user.id, 'medium', 'algorithms');

      if (duel.room_code) {
        await navigator.clipboard.writeText(duel.room_code);
        addToast({
          type: 'success',
          title: t('joinPrivateRoom.roomCreatedTitle'),
          message: t('joinPrivateRoom.roomCodeCopiedMessage', { roomCode: duel.room_code }),
        });
      }
      
      navigate(`/duel/${duel.id}`);
      onClose();
    } catch (error: any) {
      console.error('Failed to create private room:', error);
      addToast({
        type: 'error',
        title: t('joinPrivateRoom.failedToCreateRoomTitle'),
        message: error?.response?.data?.detail || t('joinPrivateRoom.tryAgainMessage'),
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isJoining && !isCreating) {
      setRoomCode('');
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-gray-700 text-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Lock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{t('joinPrivateRoom.title')}</h2>
              <p className="text-sm text-slate-400">{t('joinPrivateRoom.subtitle')}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isJoining}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleJoinRoom} className="space-y-6">
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
                <span className="bg-slate-900 px-2 text-slate-400">{t('common.or')}</span>
              </div>
            </div>
            
            <Button
              type="button"
              variant="ghost"
              onClick={handleCreateRoom}
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