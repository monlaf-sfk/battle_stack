import React from 'react';
import { Map, Milestone, Trophy, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../ui/Card';

interface RoadmapEvent {
    title: string;
    description: string;
    icon: React.ReactNode;
}

const events: RoadmapEvent[] = [
    { title: 'Rookie League', description: "The journey begins!", icon: <ShieldCheck size={24} className="text-white" /> },
    { title: 'Algorithms', description: "Honing core skills.", icon: <Zap size={24} className="text-white" /> },
    { title: 'AI Boss', description: "First major victory.", icon: <Trophy size={24} className="text-white" /> },
    { title: '100 Problems', description: "Milestone of persistence.", icon: <Milestone size={24} className="text-white" /> },
    { title: 'Pro League', description: "Climbing the ranks.", icon: <ShieldCheck size={24} className="text-white" /> },
];

const Roadmap: React.FC = () => {
    return (
        <Card className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold mb-6 flex items-center">
                <Map className="mr-2 text-teal-400" />
                Your Roadmap
            </h3>
            <div className="flex overflow-x-auto space-x-8 pb-4">
                {events.map((event, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 * index }}
                        className="flex-shrink-0 w-48 text-center"
                    >
                        <div className="relative mb-2">
                            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                                {event.icon}
                            </div>
                            {index < events.length - 1 && (
                                <div className="absolute top-1/2 left-full w-12 h-1 bg-gray-700 -translate-y-1/2"></div>
                            )}
                        </div>
                        <h4 className="font-semibold text-lg">{event.title}</h4>
                        <p className="text-gray-400 text-sm">{event.description}</p>
                    </motion.div>
                ))}
            </div>
        </Card>
    );
};

export default Roadmap; 