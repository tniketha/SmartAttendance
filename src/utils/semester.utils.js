export const ALL_SEMESTERS = "all";
export const semesterKey = (term) => `${term.academicYear}:${term.semester}`;
export const semesterLabel = (term) =>
  `${term.academicYear} · Semester ${term.semester}`;
export function filterSemester(items, selected) {
  return selected === ALL_SEMESTERS
    ? items
    : items.filter((item) => semesterKey(item) === selected);
}
export function semesterOptions(items) {
  return [
    ...new Map(items.map((item) => [semesterKey(item), item])).values(),
  ].sort(
    (a, b) =>
      a.academicYear.localeCompare(b.academicYear, undefined, {
        numeric: true,
      }) || a.semester - b.semester,
  );
}
