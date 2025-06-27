import React from 'react';
import { Card } from '../ui/Card';
import { SkeletonChart } from '../ui/Skeleton';

const PerformanceChart: React.FC = () => (
  <Card className="glass p-6">
    <h3 className="text-lg font-bold mb-4">Performance Chart</h3>
    <SkeletonChart />
  </Card>
);

export default PerformanceChart; 