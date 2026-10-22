
const express = require("express");
const path = require("path");
const mysql = require("mysql2");
require("dotenv").config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "college_placement_db",
    port: Number(process.env.DB_PORT) || 3306
});

db.connect((err) => {
    if (err) {
        console.error("MySQL connection failed:", err.message);
        return;
    }

    console.log("MySQL connected successfully!");
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/test", (req, res) => {
    res.json({ message: "API is working!" });
});

// CREATE: Add a student
app.post("/api/students", (req, res) => {
    const { name, roll_no, branch, cgpa, email } = req.body;

    if (!name || !roll_no || !branch || !email ||
        cgpa === undefined || cgpa === "") {
        return res.status(400).json({
            message: "Please fill in all student details."
        });
    }

    const score = Number(cgpa);

    if (!Number.isFinite(score) || score < 0 || score > 10) {
        return res.status(400).json({
            message: "CGPA must be between 0 and 10."
        });
    }

    const sql = `INSERT INTO students
        (name, roll_no, branch, cgpa, email)
        VALUES (?, ?, ?, ?, ?)`;

    db.query(sql, [name, roll_no, branch, score, email],
        (err, result) => {
            if (err) {
                return res.status(400).json({
                    message: err.code === "ER_DUP_ENTRY"
                        ? "Roll number or email already exists."
                        : "Unable to add student."
                });
            }

            res.status(201).json({
                message: "Student added successfully!",
                student_id: result.insertId
            });
        }
    );
});

// READ: View all students
app.get("/api/students", (req, res) => {
    db.query("SELECT * FROM students ORDER BY student_id DESC",
        (err, results) => {
            if (err) {
                return res.status(500).json({
                    message: "Unable to fetch students."
                });
            }

            res.json(results);
        }
    );
});

// UPDATE: Edit a student
app.put("/api/students/:id", (req, res) => {
    const { name, roll_no, branch, cgpa, email } = req.body;
    const score = Number(cgpa);
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1 ||
        !name || !roll_no || !branch || !email ||
        cgpa === undefined || cgpa === "" ||
        !Number.isFinite(score) || score < 0 || score > 10) {
        return res.status(400).json({
            message: "Please provide valid student details."
        });
    }

    const sql = `UPDATE students
        SET name = ?, roll_no = ?, branch = ?, cgpa = ?, email = ?
        WHERE student_id = ?`;

    db.query(sql, [name, roll_no, branch, score, email, id],
        (err, result) => {
            if (err) {
                return res.status(400).json({
                    message: "Unable to update student. Check duplicate values."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Student not found."
                });
            }

            res.json({ message: "Student updated successfully!" });
        }
    );
});

// DELETE: Remove a student
app.delete("/api/students/:id", (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
            message: "Invalid student ID."
        });
    }

    db.query("DELETE FROM students WHERE student_id = ?",
        [id], (err, result) => {
            if (err) {
                return res.status(400).json({
                    message: err.code === "ER_ROW_IS_REFERENCED_2"
                        ? "Cannot delete this student because applications reference them."
                        : "Unable to delete student."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Student not found."
                });
            }

            res.json({ message: "Student deleted successfully!" });
        }
    );
});

/* ===============================
   COMPANIES CRUD OPERATIONS
================================ */

// CREATE company
app.post("/api/companies", (req, res) => {
    const {
        company_name,
        job_role,
        package: salaryPackage,
        eligibility_cgpa,
        drive_date
    } = req.body;

    if (
        !company_name?.trim() ||
        !job_role?.trim() ||
        salaryPackage === "" ||
        salaryPackage === undefined ||
        eligibility_cgpa === "" ||
        eligibility_cgpa === undefined ||
        !drive_date
    ) {
        return res.status(400).json({
            message: "Please fill in all company details."
        });
    }

    const salary = Number(salaryPackage);
    const cgpa = Number(eligibility_cgpa);

    if (!Number.isFinite(salary) || salary < 0 ||
        !Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10) {
        return res.status(400).json({
            message: "Enter a valid package and CGPA between 0 and 10."
        });
    }

    const sql = `
        INSERT INTO companies
        (company_name, job_role, package, eligibility_cgpa, drive_date)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [company_name.trim(), job_role.trim(), salary, cgpa, drive_date],
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    message: "Could not add company. Check the database table."
                });
            }

            res.status(201).json({
                message: "Company added successfully!",
                company_id: result.insertId
            });
        }
    );
});

// READ all companies
// READ all companies
app.get("/api/companies", (req, res) => {
    console.log("Companies API requested");

    const sql = "SELECT * FROM companies ORDER BY company_id DESC";

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Companies query error:", err);
            return res.status(500).json({
                message: "Could not load companies."
            });
        }

        console.log("Companies found:", results.length);
        res.json(results);
    });
});
 
// UPDATE company
app.put("/api/companies/:id", (req, res) => {
    const id = Number(req.params.id);
    const {
        company_name,
        job_role,
        package: salaryPackage,
        eligibility_cgpa,
        drive_date
    } = req.body;

    if (
        !Number.isInteger(id) || id <= 0 ||
        !company_name?.trim() ||
        !job_role?.trim() ||
        salaryPackage === "" ||
        salaryPackage === undefined ||
        eligibility_cgpa === "" ||
        eligibility_cgpa === undefined ||
        !drive_date
    ) {
        return res.status(400).json({
            message: "Please provide valid company details."
        });
    }

    const salary = Number(salaryPackage);
    const cgpa = Number(eligibility_cgpa);

    if (!Number.isFinite(salary) || salary < 0 ||
        !Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10) {
        return res.status(400).json({
            message: "Enter a valid package and CGPA between 0 and 10."
        });
    }

    const sql = `
        UPDATE companies
        SET company_name = ?, job_role = ?, package = ?,
            eligibility_cgpa = ?, drive_date = ?
        WHERE company_id = ?
    `;

    db.query(
        sql,
        [company_name.trim(), job_role.trim(), salary, cgpa, drive_date, id],
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    message: "Could not update company."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Company not found."
                });
            }

            res.json({ message: "Company updated successfully!" });
        }
    );
});

// DELETE company
app.delete("/api/companies/:id", (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            message: "Invalid company ID."
        });
    }

    db.query(
        "DELETE FROM companies WHERE company_id = ?",
        [id],
        (err, result) => {
            if (err) {
                console.error(err);

                if (err.code === "ER_ROW_IS_REFERENCED_2") {
                    return res.status(409).json({
                        message: "This company has applications linked to it, so it cannot be deleted."
                    });
                }

                return res.status(500).json({
                    message: "Could not delete company."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Company not found."
                });
            }

            res.json({ message: "Company deleted successfully!" });
        }
    );
});

/* =================================
   STUDENT APPLICATIONS CRUD
================================= */

// CREATE application
app.post("/api/applications", (req, res) => {
    const {
        student_id,
        company_id,
        applied_date,
        round,
        status
    } = req.body;

    if (
        !student_id || !company_id || !applied_date ||
        !round || !status
    ) {
        return res.status(400).json({
            message: "Please fill in all application details."
        });
    }

    const sql = `
        INSERT INTO applications
        (student_id, company_id, applied_date, \`round\`, status)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [student_id, company_id, applied_date, round, status],
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    message: "Could not add application. Check the student, company, and database table."
                });
            }

            res.status(201).json({
                message: "Application added successfully!",
                application_id: result.insertId
            });
        }
    );
});

// READ applications with student and company names
app.get("/api/applications", (req, res) => {
    const sql = `
        SELECT
            a.application_id,
            a.student_id,
            s.name AS student_name,
            s.roll_no,
            a.company_id,
            c.company_name,
            c.job_role,
            a.applied_date,
            a.\`round\`,
            a.status
        FROM applications a
        INNER JOIN students s
            ON a.student_id = s.student_id
        INNER JOIN companies c
            ON a.company_id = c.company_id
        ORDER BY a.application_id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({
                message: "Could not load applications."
            });
        }

        res.json(results);
    });
});

// UPDATE application
app.put("/api/applications/:id", (req, res) => {
    const id = Number(req.params.id);
    const {
        student_id,
        company_id,
        applied_date,
        round,
        status
    } = req.body;

    if (
        !Number.isInteger(id) || id <= 0 ||
        !student_id || !company_id || !applied_date ||
        !round || !status
    ) {
        return res.status(400).json({
            message: "Please provide valid application details."
        });
    }

    const sql = `
        UPDATE applications
        SET student_id = ?, company_id = ?, applied_date = ?,
            \`round\` = ?, status = ?
        WHERE application_id = ?
    `;

    db.query(
        sql,
        [student_id, company_id, applied_date, round, status, id],
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    message: "Could not update application."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Application not found."
                });
            }

            res.json({
                message: "Application updated successfully!"
            });
        }
    );
});

// DELETE application
app.delete("/api/applications/:id", (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            message: "Invalid application ID."
        });
    }

    db.query(
        "DELETE FROM applications WHERE application_id = ?",
        [id],
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    message: "Could not delete application."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Application not found."
                });
            }

            res.json({
                message: "Application deleted successfully!"
            });
        }
    );
});

/* =================================
   PLACEMENTS RECORDS
================================= */

app.get("/api/placements", (req, res) => {
    const sql = `
        SELECT
            s.student_id,
            s.name AS student_name,
            s.roll_no,
            s.branch,
            c.company_name,
            c.job_role,
            c.package,
            c.drive_date
        FROM applications a
        INNER JOIN students s
            ON a.student_id = s.student_id
        INNER JOIN companies c
            ON a.company_id = c.company_id
        WHERE a.status = 'Selected'
        ORDER BY c.drive_date DESC, s.name ASC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Placements error:", err);

            return res.status(500).json({
                message: "Could not load placement records."
            });
        }

        res.json(results);
    });
});

app.listen(PORT, () => {
    console.log(`Website running at http://localhost:${PORT}`);
});
