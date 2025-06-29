import React, { useEffect, useState } from "react";
import { duelsApiService } from "../services/duelService";

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  elo_rating: number;
  total_matches: number;
  wins: number;
  win_rate: number;
  current_streak: number;
}

const LeaderboardsPage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await duelsApiService.getLeaderboard(20);
        setLeaderboard(data || []);
      } catch (err: any) {
        setError(err?.response?.data?.detail || err.message || "Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Leaderboard</h1>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-900 rounded-lg shadow">
            <thead>
              <tr className="text-gray-400 text-left">
                <th className="py-2 px-4">#</th>
                <th className="py-2 px-4">Username</th>
                <th className="py-2 px-4">ELO</th>
                <th className="py-2 px-4">Wins</th>
                <th className="py-2 px-4">Win Rate</th>
                <th className="py-2 px-4">Streak</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr key={entry.user_id} className="border-b border-gray-800 hover:bg-gray-800 transition">
                  <td className="py-2 px-4 font-mono">{entry.rank}</td>
                  <td className="py-2 px-4 font-mono">{entry.username}</td>
                  <td className="py-2 px-4 font-mono">{entry.elo_rating}</td>
                  <td className="py-2 px-4 font-mono">{entry.wins}</td>
                  <td className="py-2 px-4 font-mono">{(entry.win_rate * 100).toFixed(1)}%</td>
                  <td className="py-2 px-4 font-mono">{entry.current_streak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LeaderboardsPage; 