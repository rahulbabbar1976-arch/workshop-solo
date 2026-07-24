const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// 1. Enums
const enums = `
enum EstimateType {
  BASIC
  STANDARD
  PREMIUM
}

enum EstimateStatus {
  DRAFT
  SENT
  APPROVED
  REJECTED
  REVISED
  APPLIED
  CANCELLED
  EXPIRED
}

enum ApprovalMethod {
  WHATSAPP
  EMAIL
  IN_PERSON
  PHONE
  SYSTEM
}

enum EstimateItemType {
  PART
  LABOR
  CHARGE
}

enum PartStockStatus {
  IN_STOCK
  LOW_STOCK
  OUT_OF_STOCK
  LEAD_TIME
}

enum ServiceComplexity {
  EASY
  MEDIUM
  HARD
  VERY_HARD
}

enum RejectionReason {
  PRICE_TOO_HIGH
  TIMELINE_NOT_ACCEPTABLE
  PARTS_QUALITY_CONCERN
  LABOR_HOURS_EXCESSIVE
  CUSTOMER_CHANGED_MIND
  GOING_TO_COMPETITOR
  OTHER
}

enum VarianceStatus {
  WITHIN_TOLERANCE
  EXCEEDS_TOLERANCE
  EXCEEDED_APPROVED
  CUSTOMER_NOTIFIED
  AWAITING_CUSTOMER_APPROVAL
}
`;

if (!schema.includes('enum EstimateType')) {
    schema = schema.replace('generator client {', enums + '\ngenerator client {');
}

// 2. Replace Estimate
const oldEstimateRegex = /model Estimate \{[\s\S]*?^\}/m;
const newEstimate = `model Estimate {
  id              String         @id @default(uuid())
  estimateNumber  String         @unique
  customerId      String?
  vehicleId       String?
  advisorId       String?
  status          EstimateStatus @default(DRAFT)
  customerName    String
  customerMobile  String?
  vehicleRegNo    String?
  vehicleMake     String?
  vehicleModel    String?
  customerNotes   String?
  internalNotes   String?
  photos          String?
  subtotalAmount  Float          @default(0)
  taxAmount       Float          @default(0)
  discountAmount  Float          @default(0)
  totalAmount     Float          @default(0)
  validityDays    Int            @default(7)
  convertedJobId  String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  jobCardId       String?
  grandTotal      Float          @default(0)
  laborSnapshot   String?
  partsSnapshot   String?
  tenantId        String?
  estimatedTime   String?
  flexibleCost    String?
  approvalMethod  ApprovalMethod?
  approvedAt      DateTime?
  approvedByName  String?
  isLocked        Boolean        @default(false)
  rejectedAt      DateTime?
  rejectionReason String?
  sentAt          DateTime?
  
  // New Fields
  estimateType          EstimateType @default(STANDARD)
  version               Int @default(1)
  title                 String? 
  description           String?
  approvedCustomerEmail String?
  estimatedCompletionHours Int?
  estimatedDeliveryDate DateTime?
  warranty              String? 
  partsCost             Float @default(0)
  partsGST              Float @default(0)
  labourCost            Float @default(0)
  labourGST             Float @default(0)
  additionalCharges     Float @default(0)
  discountPercent       Float @default(0)
  totalGST              Float @default(0)
  parentEstimateId      String?
  isLockedForEditing    Boolean @default(false)
  lockedAt              DateTime?
  lockedBy              String?
  createdById           String?

  parentEstimate        Estimate? @relation("EstimateRevisions", fields: [parentEstimateId], references: [id])
  revisedEstimates      Estimate[] @relation("EstimateRevisions")
  jobCard               JobCard?       @relation(fields: [jobCardId], references: [id])
  tenant                Tenant?        @relation(fields: [tenantId], references: [id])
  lines                 EstimateLine[]
  approvals             EstimateApproval[]
  variance              EstimateVariance?
}`;
schema = schema.replace(oldEstimateRegex, newEstimate);

// 3. Replace EstimateLine
const oldEstimateLineRegex = /model EstimateLine \{[\s\S]*?^\}/m;
const newEstimateLine = `model EstimateLine {
  id            String   @id @default(uuid())
  estimateId    String
  lineType      String
  name          String
  partNumber    String?
  brand         String?
  quantity      Float    @default(1)
  unitPrice     Float    @default(0)
  taxRate       Float    @default(18)
  discountType  String?
  discountValue Float?
  lineTotal     Float    @default(0)
  createdAt     DateTime @default(now())
  
  // New Fields
  itemType              EstimateItemType @default(PART)
  lineItemNumber        Int @default(1)
  partDescription       String?
  serviceName           String?
  serviceCategory       String?
  chargeDescription     String?
  discountPercent       Float @default(0)
  discountAmountItem    Float @default(0)
  gstPercent            Float @default(18)
  gstAmount             Float @default(0)
  reason                String? 
  isRecommended         Boolean @default(false) 
  alternatives          String? // JSON
  partStockStatus       PartStockStatus? 
  supplierLeadDays      Int? 
  estimatedHours        Float? 
  hourlyRate            Float? 
  complexity            ServiceComplexity? 
  
  estimate      Estimate @relation(fields: [estimateId], references: [id], onDelete: Cascade)
}`;
schema = schema.replace(oldEstimateLineRegex, newEstimateLine);

// 4. Add new models at bottom
const newModels = `
model EstimateApproval {
  id                    String @id @default(uuid())
  estimateId            String
  estimate              Estimate @relation(fields: [estimateId], references: [id], onDelete: Cascade)
  
  approvalStatus        EstimateStatus
  approvedBy            String?
  approvedByCustomer    Boolean @default(false)
  customerEmail         String?
  customerPhone         String?
  
  approvalTimestamp     DateTime @default(now())
  approvalMethod        ApprovalMethod
  
  rejectionReason       String?
  rejectionCategory     RejectionReason?
  
  revisedEstimateId     String?
  revisionReason        String?
  
  ipAddress             String?
  userAgent             String?
  createdAt             DateTime @default(now())
}

model EstimateVariance {
  id                    String @id @default(uuid())
  estimateId            String @unique
  estimate              Estimate @relation(fields: [estimateId], references: [id], onDelete: Cascade)
  
  jobCardId             String
  jobCard               JobCard @relation("EstimateVariances", fields: [jobCardId], references: [id], onDelete: Cascade)
  
  estimatedPartsCost    Float
  estimatedLabourCost   Float
  estimatedTotalCost    Float
  estimatedLabourHours  Float
  
  actualPartsCost       Float? 
  actualLabourCost      Float?
  actualTotalCost       Float?
  actualLabourHours     Float?
  
  partsVariancePercent  Float? 
  labourVariancePercent Float?
  totalVariancePercent  Float?
  
  varianceStatus        VarianceStatus @default(WITHIN_TOLERANCE)
  
  varianceExplanation   String?
  varianceApprovedBy    String?
  varianceApprovedAt    DateTime?
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model EstimateTemplate {
  id                    String @id @default(uuid())
  tenantId              String
  tenant                Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  templateName          String 
  description           String?
  
  templateItems         EstimateTemplateItem[]
  
  isActive              Boolean @default(true)
  usageCount            Int @default(0)
  
  createdAt             DateTime @default(now())
  
  @@unique([tenantId, templateName])
}

model EstimateTemplateItem {
  id                    String @id @default(uuid())
  templateId            String
  template              EstimateTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  
  itemType              EstimateItemType
  partNumber            String?
  description           String
  
  quantity              Float
  unitPrice             Float
  gstPercent            Float
  
  orderIndex            Int 
}
`;

if (!schema.includes('model EstimateApproval')) {
    schema += newModels;
}

// 5. Inject into JobCard and Tenant
if (!schema.includes('varianceTracking       EstimateVariance[]')) {
    const jobCardRegex = /(model JobCard \{[\s\S]*?)(^\})/m;
    schema = schema.replace(jobCardRegex, '$1  varianceTracking       EstimateVariance[] @relation("EstimateVariances")\n$2');
}

if (!schema.includes('estimateTemplates         EstimateTemplate[]')) {
    const tenantRegex = /(model Tenant \{[\s\S]*?)(^\})/m;
    schema = schema.replace(tenantRegex, '$1  estimateTemplates         EstimateTemplate[]\n$2');
}

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Schema updated successfully');
