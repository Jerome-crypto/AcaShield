import { PrismaClient, Role, UserStatus, ProjectStatus, RiskLevel, ReviewDecision, SimilarityReportStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seeding database...");

  // Clean database
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.similarityMatch.deleteMany({});
  await prisma.similarityReport.deleteMany({});
  await prisma.projectDocument.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.programme.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.studentProfile.deleteMany({});
  await prisma.supervisorProfile.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.systemSetting.deleteMany({});

  console.log("Database cleared.");

  // Password hashes
  const adminPasswordHash = await bcrypt.hash("Admin@12345", 10);
  const supervisorPasswordHash = await bcrypt.hash("Supervisor@12345", 10);
  const studentPasswordHash = await bcrypt.hash("Student@12345", 10);

  // 1. Create System Settings
  const settings = [
    { key: "similarityThresholdLow", value: "20", description: "Low similarity limit (0-20%)" },
    { key: "similarityThresholdMedium", value: "40", description: "Medium similarity limit (21-40%)" },
    { key: "similarityThresholdHigh", value: "60", description: "High similarity limit (41-60%)" },
    { key: "institutionName", value: "University of Lagos", description: "Name of the academic institution" },
    { key: "institutionEmail", value: "info@unilag.edu.ng", description: "Institutional support email" },
    { key: "allowStudentReportView", value: "true", description: "Whether students can view similarity reports directly" },
    { key: "maxUploadSize", value: "20971520", description: "Maximum allowed file size in bytes (20MB)" },
    { key: "allowedFileTypes", value: "pdf,docx", description: "Comma-separated allowed file extensions" },
  ];

  for (const s of settings) {
    await prisma.systemSetting.create({ data: s });
  }
  console.log("System settings seeded.");

  // 2. Create Departments
  const csDept = await prisma.department.create({
    data: { name: "Computer Science", code: "CS", description: "Department of Computer Sciences" },
  });
  const engDept = await prisma.department.create({
    data: { name: "Engineering", code: "ENG", description: "Faculty of Engineering" },
  });
  const medDept = await prisma.department.create({
    data: { name: "Medicine", code: "MED", description: "College of Medicine" },
  });
  const busDept = await prisma.department.create({
    data: { name: "Business Administration", code: "BUS", description: "Department of Business Administration" },
  });
  const artDept = await prisma.department.create({
    data: { name: "Arts & Humanities", code: "ART", description: "Faculty of Arts" },
  });
  console.log("Departments seeded.");

  // 3. Create Programmes
  const bscCs = await prisma.programme.create({
    data: { name: "BSc Computer Science", code: "BSC-CS", departmentId: csDept.id },
  });
  const bengEe = await prisma.programme.create({
    data: { name: "BEng Electronic Engineering", code: "BENG-EE", departmentId: engDept.id },
  });
  const mbbsMed = await prisma.programme.create({
    data: { name: "MBBS Medicine", code: "MBBS", departmentId: medDept.id },
  });
  const bscBus = await prisma.programme.create({
    data: { name: "BSc Business Administration", code: "BSC-BUS", departmentId: busDept.id },
  });
  console.log("Programmes seeded.");

  // 4. Create Users
  // Admin
  const adminUser = await prisma.user.create({
    data: {
      firstName: "Admin",
      lastName: "User",
      email: "admin@acashield.local",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  // Supervisors
  const supervisor1 = await prisma.user.create({
    data: {
      firstName: "Sarah",
      lastName: "Okonkwo",
      email: "supervisor@acashield.local",
      passwordHash: supervisorPasswordHash,
      role: Role.SUPERVISOR,
      status: UserStatus.ACTIVE,
      phone: "+2348011122233",
      supervisorProfile: {
        create: {
          staffNumber: "SN001",
          department: "Computer Science",
          title: "Dr.",
          specialization: "Machine Learning / NLP",
        },
      },
    },
  });

  const supervisor2 = await prisma.user.create({
    data: {
      firstName: "Emeka",
      lastName: "Nwachukwu",
      email: "emeka.nwachukwu@acashield.local",
      passwordHash: supervisorPasswordHash,
      role: Role.SUPERVISOR,
      status: UserStatus.ACTIVE,
      supervisorProfile: {
        create: {
          staffNumber: "SN002",
          department: "Engineering",
          title: "Prof.",
          specialization: "IoT / Embedded Systems",
        },
      },
    },
  });

  // Students
  const student1 = await prisma.user.create({
    data: {
      firstName: "Adaeze",
      lastName: "Obi",
      email: "student@acashield.local",
      passwordHash: studentPasswordHash,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      studentProfile: {
        create: {
          studentNumber: "ST001",
          registrationNumber: "REG001",
          department: "Computer Science",
          programme: "BSc Computer Science",
          academicYear: "2024/2025",
        },
      },
    },
  });

  const student2 = await prisma.user.create({
    data: {
      firstName: "Chukwuemeka",
      lastName: "Eze",
      email: "c.eze@acashield.local",
      passwordHash: studentPasswordHash,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      studentProfile: {
        create: {
          studentNumber: "ST002",
          registrationNumber: "REG002",
          department: "Engineering",
          programme: "BEng Electronic Engineering",
          academicYear: "2024/2025",
        },
      },
    },
  });

  const student3 = await prisma.user.create({
    data: {
      firstName: "Ngozi",
      lastName: "Adeleke",
      email: "n.adeleke@acashield.local",
      passwordHash: studentPasswordHash,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      studentProfile: {
        create: {
          studentNumber: "ST003",
          registrationNumber: "REG003",
          department: "Medicine",
          programme: "MBBS Medicine",
          academicYear: "2024/2025",
        },
      },
    },
  });

  const student4 = await prisma.user.create({
    data: {
      firstName: "Olumide",
      lastName: "Fashola",
      email: "o.fashola@acashield.local",
      passwordHash: studentPasswordHash,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      studentProfile: {
        create: {
          studentNumber: "ST004",
          registrationNumber: "REG004",
          department: "Computer Science",
          programme: "BSc Computer Science",
          academicYear: "2024/2025",
        },
      },
    },
  });

  const student5 = await prisma.user.create({
    data: {
      firstName: "Chisom",
      lastName: "Okafor",
      email: "c.okafor@acashield.local",
      passwordHash: studentPasswordHash,
      role: Role.STUDENT,
      status: UserStatus.ACTIVE,
      studentProfile: {
        create: {
          studentNumber: "ST005",
          registrationNumber: "REG005",
          department: "Business Administration",
          programme: "BSc Business Administration",
          academicYear: "2024/2025",
        },
      },
    },
  });

  console.log("Users and profiles seeded.");

  // 5. Seed Projects and Similarity Reports
  // Project 1: Approved
  const project1 = await prisma.project.create({
    data: {
      title: "Machine Learning in Healthcare Diagnostics",
      abstract: "This project explores the applications of convolutional neural networks and transformer architectures to medical images, focusing specifically on malaria detection in blood smears. We achieve an accuracy of 98.4% and show that local execution is feasible on mid-range hardware.",
      keywords: "machine learning, malaria, computer vision, diagnostics",
      category: "Healthcare",
      academicYear: "2024/2025",
      departmentId: csDept.id,
      programmeId: bscCs.id,
      studentId: student1.id,
      supervisorId: supervisor1.id,
      status: ProjectStatus.APPROVED,
      currentVersion: 1,
      similarityScore: 4,
      riskLevel: RiskLevel.LOW,
      submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 30 days ago
      approvedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 28),  // 28 days ago
    },
  });

  const doc1 = await prisma.projectDocument.create({
    data: {
      projectId: project1.id,
      version: 1,
      fileName: "ML_Healthcare_Diagnostics_Final.pdf",
      fileType: "pdf",
      mimeType: "application/pdf",
      fileSize: 1024 * 500, // 500KB
      fileData: Buffer.from("PDF file data placeholder"),
      extractedText: "This project explores the applications of convolutional neural networks and transformer architectures to medical images, focusing specifically on malaria detection in blood smears. We achieve an accuracy of 98.4% and show that local execution is feasible on mid-range hardware. In developing nations, malaria diagnostics can be improved using low cost mobile devices equipped with neural network vision models.",
    },
  });

  await prisma.similarityReport.create({
    data: {
      projectId: project1.id,
      documentId: doc1.id,
      overallScore: 4,
      riskLevel: RiskLevel.LOW,
      summary: "Low similarity detected. The paper is highly original and shows standard citations.",
      status: SimilarityReportStatus.COMPLETED,
    },
  });

  // Project 2: Submitted / Pending review
  const project2 = await prisma.project.create({
    data: {
      title: "Blockchain-Based Land Registry System",
      abstract: "Land ownership disputes are common in urban Nigeria. This paper proposes a decentralized registry using Ethereum smart contracts to record deeds and transactions, ensuring cryptographic proofs of ownership and preventing double-allocations.",
      keywords: "blockchain, smart contracts, land registry, deeds",
      category: "Information Systems",
      academicYear: "2024/2025",
      departmentId: csDept.id,
      programmeId: bscCs.id,
      studentId: student1.id,
      supervisorId: supervisor1.id,
      status: ProjectStatus.SUBMITTED,
      currentVersion: 1,
      similarityScore: 12,
      riskLevel: RiskLevel.LOW,
      submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    },
  });

  const doc2 = await prisma.projectDocument.create({
    data: {
      projectId: project2.id,
      version: 1,
      fileName: "Blockchain_Land_Registry.pdf",
      fileType: "pdf",
      mimeType: "application/pdf",
      fileSize: 1024 * 800, // 800KB
      fileData: Buffer.from("Blockchain land registry PDF file data"),
      extractedText: "Land ownership disputes are common in urban Nigeria. This paper proposes a decentralized registry using Ethereum smart contracts to record deeds and transactions, ensuring cryptographic proofs of ownership and preventing double-allocations. We develop a React-based frontend and deploy solidity smart contracts to local testnet.",
    },
  });

  const report2 = await prisma.similarityReport.create({
    data: {
      projectId: project2.id,
      documentId: doc2.id,
      overallScore: 12,
      riskLevel: RiskLevel.LOW,
      summary: "Acceptable similarity score of 12%. Matches are primarily found in standard terminology definitions.",
      status: SimilarityReportStatus.COMPLETED,
    },
  });

  // Match for report 2
  await prisma.similarityMatch.create({
    data: {
      reportId: report2.id,
      matchedProjectId: project1.id,
      matchedDocumentId: doc1.id,
      similarityScore: 8,
      matchedText: "a decentralized registry using Ethereum smart contracts to record deeds and transactions",
      sourceText: "a decentralized registry based on blockchain smart contracts to manage transactional records",
      pageNumber: 2,
      section: "Introduction",
    },
  });

  // Project 3: Under Review / Revision Requested
  const project3 = await prisma.project.create({
    data: {
      title: "IoT Smart Agriculture Monitoring Platform",
      abstract: "Agriculture requires precise irrigation. We design an IoT-based platform using ESP32 nodes and soil moisture sensors that automatically triggers micro-sprinklers when threshold humidity falls. Relays are controlled via MQTT protocols.",
      keywords: "IoT, agriculture, ESP32, soil moisture, MQTT",
      category: "Engineering",
      academicYear: "2023/2024",
      departmentId: engDept.id,
      programmeId: bengEe.id,
      studentId: student2.id,
      supervisorId: supervisor2.id,
      status: ProjectStatus.REVISION_REQUESTED,
      currentVersion: 1,
      similarityScore: 28,
      riskLevel: RiskLevel.MEDIUM,
      submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15), // 15 days ago
    },
  });

  const doc3 = await prisma.projectDocument.create({
    data: {
      projectId: project3.id,
      version: 1,
      fileName: "IoT_Smart_Agriculture_v1.docx",
      fileType: "docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileSize: 1024 * 350,
      fileData: Buffer.from("DOCX file placeholder data"),
      extractedText: "Agriculture requires precise irrigation. We design an IoT-based platform using ESP32 nodes and soil moisture sensors that automatically triggers micro-sprinklers when threshold humidity falls. Relays are controlled via MQTT protocols.",
    },
  });

  await prisma.similarityReport.create({
    data: {
      projectId: project3.id,
      documentId: doc3.id,
      overallScore: 28,
      riskLevel: RiskLevel.MEDIUM,
      summary: "Medium similarity (28%) detected. Multiple matching blocks found in the Methodology section regarding ESP32 hardware configurations.",
      status: SimilarityReportStatus.COMPLETED,
    },
  });

  await prisma.review.create({
    data: {
      projectId: project3.id,
      supervisorId: supervisor2.id,
      decision: ReviewDecision.REVISION_REQUESTED,
      comments: "The methodology has substantial similarity with previous work. Please rewrite section 3.2 to detail your specific hardware choices and cite the original ESP32 datasheets.",
    },
  });

  // 6. Create Notifications
  const notificationsData = [
    {
      userId: student1.id,
      title: "Project Approved",
      message: "Your project 'Machine Learning in Healthcare Diagnostics' has been approved by Dr. Sarah Okonkwo.",
      type: "success",
      isRead: true,
    },
    {
      userId: student1.id,
      title: "Similarity Report Ready",
      message: "Originality analysis for 'Blockchain-Based Land Registry System' is complete. Similarity score: 12%.",
      type: "info",
      isRead: false,
    },
    {
      userId: student2.id,
      title: "Revision Requested",
      message: "Prof. Emeka Nwachukwu has requested revisions on your project 'IoT Smart Agriculture Monitoring Platform'.",
      type: "warning",
      isRead: false,
    },
    {
      userId: student1.id,
      title: "New Supervisor Assigned",
      message: "Dr. Sarah Okonkwo has been assigned as your supervisor for this academic year.",
      type: "info",
      isRead: true,
    },
  ];

  for (const n of notificationsData) {
    await prisma.notification.create({ data: n });
  }

  // 7. Seed Audit Logs
  await prisma.auditLog.create({
    data: {
      userId: student1.id,
      action: "PROJECT_SUBMIT",
      entityType: "PROJECT",
      entityId: project2.id,
      metadata: { title: project2.title, version: 1 },
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: supervisor1.id,
      action: "PROJECT_APPROVE",
      entityType: "PROJECT",
      entityId: project1.id,
      metadata: { title: project1.title },
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    },
  });

  console.log("Notifications and Audit Logs seeded.");
  console.log("Seeding complete successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
