# University of Vavuniya demo context

The portfolio demonstration uses **University of Vavuniya**, **Faculty of Applied Science**, **Department of Physical Science**, and the **BSc Honours in Computer Science** programme. Nikky, Ms. Niketha, Tharshini and the other demo identities are fictional. Demo addresses use `example.com`; they are not university accounts.

Course titles, codes and semester placement follow the university's published [Department of Physical Science curriculum](https://fas.vau.ac.lk/dps/amc/), checked on 22 October 2026. This demo selects the twelve Computer Science course units from Level 3; it does not include the programme's mathematics or auxiliary course units and does not claim to represent current student enrollment or a complete academic timetable.

## Year 3 · Semester 1

| Code | Computer Science course |
| --- | --- |
| CSC3112 | Computer Graphics |
| CSC3123 | Operating Systems |
| CSC3132 | Web Application Development |
| CSH3143 | Knowledge Representation and Programming in Logic |
| CSH3153 | Human Computer Interaction |
| CSH3163 | Advanced Database System |

## Year 3 · Semester 2

| Code | Computer Science course |
| --- | --- |
| CSC3213 | Computer Architecture |
| CSC3222 | Graph Theory |
| CSH3242 | Theory of Computation |
| CSH3254 | Parallel Computing |
| CSH3263 | Advanced Computer Networks |
| CSH3273 | Artificial Intelligence |

## Semester behavior

- Modules, attendance insights, lecturer reports and class setup have an academic-semester selector. Course cards, history entries and live sessions show their year and semester.
- Selecting a semester in attendance insights recalculates the percentage and totals using only that semester's completed records. The all-semesters view combines both semesters; active sessions remain excluded.
- Reports and class setup keep the selected course inside the chosen semester and switch to its first available course when needed.
- Portfolio fixtures contain six completed classes per selected course: 36 per semester and 72 overall. Semester 1 records are older than Semester 2 records, and demo enrollment predates them. A temporary live Computer Architecture class belongs to Semester 2.
- Both seed implementations read `server/prisma/demo-data.json`, so names, codes and semesters stay consistent. The portfolio script adds synthetic attendance and an audited correction to its dedicated local database only.

See the [screenshot gallery](screenshots/README.md) for captures using this dataset.
