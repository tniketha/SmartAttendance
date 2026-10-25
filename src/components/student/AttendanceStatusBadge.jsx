import React from "react";
import { Badge } from "../common/Badge";
export const AttendanceStatusBadge = ({ status }) => {
  switch (status) {
    case "PRESENT":
      return <Badge label="Present" variant="present" />;
    case "ABSENT":
      return <Badge label="Absent" variant="absent" />;
    case "LATE":
      return <Badge label="Late" variant="late" />;
    default:
      return <Badge label={status} variant="default" />;
  }
};
