import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  count: number;
  icon: LucideIcon;
  loading?: boolean;
  bgColor?: string;
  iconColor?: string;
}

const StatsCard = ({ 
  title, 
  count, 
  icon: Icon, 
  loading = false,
  bgColor = "bg-white",
  iconColor = "text-blue-600"
}: StatsCardProps) => {
  return (
    <div className={`${bgColor} rounded-lg shadow-md p-6 border border-gray-200`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
          ) : (
            <p className="text-3xl font-bold text-gray-900">{count.toLocaleString()}</p>
          )}
        </div>
        <div className={`p-3 rounded-full bg-gray-50`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
};

export default StatsCard;