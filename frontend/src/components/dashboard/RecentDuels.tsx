import React from 'react';
import { Swords, XCircle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';

interface Duel {
    opponent: string;
    result: 'Won' | 'Lost';
    score: string;
}

const duels: Duel[] = [
    { opponent: 'CodeNinja', result: 'Lost', score: '1-2' },
    { opponent: 'DevSniper', result: 'Won', score: '2-0' },
    { opponent: 'Bot Omega', result: 'Won', score: '1-0' },
];

const DuelResult = ({ result }: { result: 'Won' | 'Lost' }) => {
    if (result === 'Won') {
        return <CheckCircle className="text-green-500" />;
    }
    return <XCircle className="text-red-500" />;
};

const RecentDuels: React.FC = () => {
    return (
        <Card className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold mb-4 flex items-center">
                <Swords className="mr-2 text-purple-400" />
                Recent Duels
            </h3>
            <div className="space-y-3">
                {duels.map((duel, index) => (
                    <div key={index} className="flex justify-between items-center bg-gray-700/50 p-3 rounded-md">
                        <div className="flex items-center">
                            <DuelResult result={duel.result} />
                            <span className="ml-3">
                                vs <span className="font-semibold">{duel.opponent}</span>
                            </span>
                        </div>
                        <div className="font-mono text-sm">
                            <span className={`font-bold ${duel.result === 'Won' ? 'text-green-400' : 'text-red-400'}`}>
                                {duel.result}
                            </span>
                            <span className="text-gray-400"> ({duel.score})</span>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-4 text-center">
                <Link to="/match-history" className="text-sm text-blue-400 hover:underline">
                    View Full Match History
                </Link>
            </div>
        </Card>
    );
};

export default RecentDuels; 