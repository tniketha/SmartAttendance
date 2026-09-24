export type RootStackParamList = {
  Auth: undefined;
  StudentApp: undefined;
  LecturerApp: undefined;
  AdminApp: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
};

export type StudentTabParamList = {
  StudentHome: undefined;
  StudentModules: undefined;
  QRScanner: undefined;
  AttendanceHistory: undefined;
  StudentProfile: undefined;
};

export type LecturerTabParamList = {
  LecturerHome: undefined;
  StartSession: undefined;
  ActiveQR: { sessionId: string; moduleCode: string; moduleName: string };
  LecturerReports: undefined;
  LecturerProfile: undefined;
};

export type AdminTabParamList = {
  AdminDashboard: undefined;
};
