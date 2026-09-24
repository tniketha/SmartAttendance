import React from 'react';
import { Badge } from '../common/Badge';
import { AttendanceStatus } from '../../types/attendance.types';

interface Props {
  status: AttendanceStatus;
}

export const AttendanceStatusBadge: React.FC<Props> = ({ status }) => {
  switch (status) {
    case 'PRESENT':
      return <Badge label="Present" variant="present" />;
    case 'ABSENT':
      return <Badge label="Absent" variant="absent" />;
    case 'LATE':
      return <Badge label="Late" variant="late" />;
    case 'EXCUSED':
      return <Badge label="Excused" variant="excused" />;
    default:
      return <Badge label={status} variant="default" />;
  }
};
