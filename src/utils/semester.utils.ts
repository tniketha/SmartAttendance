export interface AcademicTerm {
  academicYear: string;
  semester: number;
}

export const ALL_SEMESTERS = 'all';
export const semesterKey = (term: AcademicTerm) => `${term.academicYear}:${term.semester}`;
export const semesterLabel = (term: AcademicTerm) => `${term.academicYear} · Semester ${term.semester}`;

export function filterSemester<T extends AcademicTerm>(items: T[], selected: string): T[] {
  return selected === ALL_SEMESTERS ? items : items.filter(item => semesterKey(item) === selected);
}

export function semesterOptions(items: AcademicTerm[]): AcademicTerm[] {
  return [...new Map(items.map(item => [semesterKey(item), item])).values()]
    .sort((a, b) => a.academicYear.localeCompare(b.academicYear, undefined, { numeric: true }) || a.semester - b.semester);
}
