import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface ChecklistStatusIconProps {
  status: boolean;
}

const ChecklistStatusIcon: React.FC<ChecklistStatusIconProps> = ({ status }) => {
  return status ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />;
};

export default ChecklistStatusIcon;