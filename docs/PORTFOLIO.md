# Smart Attendance portfolio notes

**Author:** [tniketha](https://github.com/tniketha)

## Problem and solution

Smart Attendance replaces a manual university class register with a QR check-in workflow. It connects a React Native interface to an Express API and a MongoDB database using the official MongoDB driver.

## Skills to demonstrate

1. Build screens and reusable components with React Native and JavaScript.
2. Send API requests and handle loading, success and error states.
3. Model users, courses, enrollment, classes and attendance records.
4. Validate sign-in, roles, enrollment and duplicate check-ins on the server.
5. Calculate semester attendance percentages and export CSV reports.
6. Test sign-in, check-in, class closure and reporting.

## Five-minute demonstration

Sign in as Ms. Niketha, choose a semester/module and start a class. Sign in as Nikky on another device and scan the displayed code. Use Refresh attendance to see the result, then end the class. Open My Attendance to show its semester summary and filtered history, then export a module CSV report.

## Read the code in this order

- `src/screens/student/QRScannerScreen.jsx`: gets the camera result and submits it.
- `src/api/student.api.js`: sends the request.
- `server/src/routes/attendance.routes.js`: protects and validates the endpoint.
- `server/src/controllers/attendance.controller.js`: checks the class and enrollment, then saves the record.
- `server/src/config/database.js`: connects to MongoDB and creates unique attendance indexes.

## University demo and semesters

University of Vavuniya · Faculty of Applied Science · Department of Physical Science. The programme is BSc Honours in Computer Science. All people and attendance records in the screenshots are fictional.

The selected course codes follow the university's [published curriculum](https://fas.vau.ac.lk/dps/amc/). The demonstration includes the Year 3 Computer Science units; it is not a complete university timetable.

### Year 3 · Semester 1

| Code    | Course                                            |
| ------- | ------------------------------------------------- |
| CSC3112 | Computer Graphics                                 |
| CSC3123 | Operating Systems                                 |
| CSC3132 | Web Application Development                       |
| CSH3143 | Knowledge Representation and Programming in Logic |
| CSH3153 | Human Computer Interaction                        |
| CSH3163 | Advanced Database System                          |

### Year 3 · Semester 2

| Code    | Course                     |
| ------- | -------------------------- |
| CSC3213 | Computer Architecture      |
| CSC3222 | Graph Theory               |
| CSH3242 | Theory of Computation      |
| CSH3254 | Parallel Computing         |
| CSH3263 | Advanced Computer Networks |
| CSH3273 | Artificial Intelligence    |

[Screenshot gallery](screenshots/README.md)
