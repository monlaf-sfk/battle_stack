import { useEffect, useState } from "react";
import { duelsApiService } from "../services/api"; // Corrected import path
import type { LeaderboardEntry } from "../services/api"; // Corrected import path
import { useTranslation } from 'react-i18next';
import { FaCrown } from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";

// Removed local interface definition for LeaderboardEntry as it's now imported from api.ts
// interface LeaderboardEntry {
//   rank: number;
//   user_id: string;
//   username: string;
//   elo_rating: number;
//   total_matches: number;
//   wins: number;
//   win_rate: number;
//   current_streak: number;
// }

const LeaderboardsPage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const { user } = useAuth();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await duelsApiService.getLeaderboard(20);
        setLeaderboard(response.data || []); // Access .data property
      } catch (err: any) {
        setError(err?.response?.data?.detail || err.message || t('leaderboardsPage.failedToLoadLeaderboard'));
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [t]);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-yellow-400";
      case 2:
        return "text-gray-400";
      case 3:
        return "text-yellow-600";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 text-white">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500">
          {t('leaderboardsPage.title')}
        </h1>
        <p className="text-gray-400 text-lg">{t('leaderboardsPage.subtitle', 'See who is dominating the arena')}</p>
      </div>

      {loading && <div className="text-center text-xl">{t('common.loading')}...</div>}
      {error && <div className="text-center text-red-500 text-xl mb-4">{t('common.error')}: {error}</div>}
      
      {!loading && !error && (
        <div className="max-w-4xl mx-auto">
          <div className="space-y-2">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.user_id}
                className={`flex items-center p-4 rounded-lg transition-all duration-300 ${
                  user?.id === entry.user_id ? 'bg-blue-900/50 ring-2 ring-blue-500' : 'bg-gray-800/50 hover:bg-gray-700/50'
                } ${index < 3 ? 'border-l-4' : ''} ${
                  index === 0 ? 'border-yellow-400' : index === 1 ? 'border-gray-400' : index === 2 ? 'border-yellow-600' : 'border-transparent'
                }`}
              >
                <div className={`w-16 flex-shrink-0 text-center text-2xl font-bold ${getRankColor(entry.rank)}`}>
                  <div className="flex flex-col items-center justify-center h-full">
                    {entry.rank === 1 && <FaCrown className="mb-1" />}
                    <span>{entry.rank}</span>
                  </div>
                </div>

                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-700 mx-4 flex items-center justify-center">
                  <span className="text-xl font-bold">{entry.username.charAt(0).toUpperCase()}</span>
                </div>

                <div className="flex-grow grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                  <div className="font-semibold text-lg truncate" title={entry.full_name || entry.username}>
                    {entry.full_name || entry.username}
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400">{t('leaderboardsPage.elo')}</div>
                    <div className="text-lg font-mono">{entry.elo_rating}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400">{t('leaderboardsPage.wins')}</div>
                    <div className="text-lg font-mono">{entry.wins}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400">{t('leaderboardsPage.winRate')}</div>
                    <div className="text-lg font-mono">{(entry.win_rate).toFixed(1)}%</div>
                  </div>
                </div>
                <div className="w-16 text-center">
                  <div className="text-sm text-gray-400">{t('leaderboardsPage.streak')}</div>
                  <div className="text-lg font-mono">{entry.current_streak} 🔥</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderboardsPage;