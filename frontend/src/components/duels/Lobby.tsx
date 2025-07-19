import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader2, Check, User, Shield } from 'lucide-react';
import type { DuelResponse, DuelPlayer } from '../../types/duel';
import { useAuth } from '../../contexts/AuthContext';

interface LobbyProps {
  duel: DuelResponse;
  onReady: () => void;
  onStart: () => void;
  isPlayerReady: boolean;
}

const Lobby: React.FC<LobbyProps> = ({ duel, onReady, onStart, isPlayerReady }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const playerOne = duel.players[0];
  const playerTwo = duel.players.length > 1 ? duel.players[1] : null;

  const isHost = user?.id === playerOne.id;

  const renderPlayer = (player: DuelPlayer, isHostPlayer: boolean) => {
    const ready = isHostPlayer ? duel.player_one_ready : duel.player_two_ready;

    return (
      <div key={player.id} className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
        <div className="flex items-center gap-4">
          <User className="w-8 h-8 text-slate-400" />
          <div>
            <p className="font-semibold text-white">{player.username}</p>
            {isHostPlayer && <p className="text-xs text-yellow-400 flex items-center gap-1"><Shield size={12} /> {t('duels.host')}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {ready ? (
            <span className="text-green-400 font-bold flex items-center gap-1">
              <Check size={16} /> {t('duels.ready')}
            </span>
          ) : (
            <span className="text-slate-400 font-bold flex items-center gap-1">
              <Loader2 size={16} className="animate-spin" /> {t('duels.waiting')}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">{t('duels.privateLobbyTitle')}</CardTitle>
          <CardDescription className="text-center">
            {t('duels.waitingForPlayers')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderPlayer(playerOne, true)}
          {playerTwo ? renderPlayer(playerTwo, false) : (
            <div className="flex items-center justify-center p-4 bg-slate-800 rounded-lg h-20">
              <p className="text-slate-400">{t('duels.waitingForOpponent')}</p>
            </div>
          )}

          <div className="pt-6 flex flex-col gap-4">
            {!isPlayerReady && (
              <Button onClick={onReady} size="lg" className="w-full">
                {t('duels.readyButton')}
              </Button>
            )}
            {isHost && (
              <Button
                onClick={onStart}
                size="lg"
                className="w-full"
                disabled={!duel.player_one_ready || !duel.player_two_ready}
              >
                {t('duels.startDuelButton')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Lobby; 