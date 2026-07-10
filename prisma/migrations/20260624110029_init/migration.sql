-- CreateTable
CREATE TABLE "WorkshopProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workshopName" TEXT NOT NULL,
    "brandName" TEXT,
    "logoUrl" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "mobile" TEXT,
    "email" TEXT,
    "website" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "workshopTimings" TEXT,
    "invoiceFooterText" TEXT,
    "termsConditionsText" TEXT,
    "whatsappTemplateText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TaxSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workshopProfileId" TEXT NOT NULL,
    "defaultTaxMode" TEXT NOT NULL DEFAULT 'exclusive',
    "intrastateCgstRate" REAL NOT NULL DEFAULT 9.00,
    "intrastateSgstRate" REAL NOT NULL DEFAULT 9.00,
    "interstateIgstRate" REAL NOT NULL DEFAULT 18.00,
    "defaultDiscountMode" TEXT NOT NULL DEFAULT 'line_item',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaxSettings_workshopProfileId_fkey" FOREIGN KEY ("workshopProfileId") REFERENCES "WorkshopProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NumberingSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workshopProfileId" TEXT NOT NULL,
    "estimateNumberFormat" TEXT NOT NULL DEFAULT 'EST-{YYYY}-{####}',
    "jobcardNumberFormat" TEXT NOT NULL DEFAULT 'JC-{YYYY}-{####}',
    "partsOrderNumberFormat" TEXT NOT NULL DEFAULT 'PO-{YYYY}-{####}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NumberingSettings_workshopProfileId_fkey" FOREIGN KEY ("workshopProfileId") REFERENCES "WorkshopProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FeatureFlags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "featureKey" TEXT NOT NULL,
    "featureName" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "configJson" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkflowSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mandatoryOdometer" BOOLEAN NOT NULL DEFAULT true,
    "mandatorySignature" BOOLEAN NOT NULL DEFAULT true,
    "mandatoryPhotos" BOOLEAN NOT NULL DEFAULT true,
    "minimumIntakePhotoCount" INTEGER NOT NULL DEFAULT 4,
    "managerApprovalBeforePrint" BOOLEAN NOT NULL DEFAULT false,
    "lockAfterClose" BOOLEAN NOT NULL DEFAULT true,
    "allowReopenClosedJob" BOOLEAN NOT NULL DEFAULT true,
    "duplicateVehicleAction" TEXT NOT NULL DEFAULT 'warn',
    "duplicateCustomerAction" TEXT NOT NULL DEFAULT 'warn',
    "importedJobsReadOnly" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PrintSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workshopProfileId" TEXT NOT NULL,
    "showTaxByDefault" BOOLEAN NOT NULL DEFAULT true,
    "showDiscountByDefault" BOOLEAN NOT NULL DEFAULT true,
    "includeSignature" BOOLEAN NOT NULL DEFAULT true,
    "includeIntakePhotos" BOOLEAN NOT NULL DEFAULT true,
    "showPartsLabourSeparately" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PrintSettings_workshopProfileId_fkey" FOREIGN KEY ("workshopProfileId") REFERENCES "WorkshopProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "mobile" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "quickPinHash" TEXT,
    "profilePhotoUrl" TEXT,
    "skillCategory" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleKey" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerCode" TEXT,
    "customerType" TEXT NOT NULL DEFAULT 'retail',
    "displayName" TEXT NOT NULL,
    "billingName" TEXT,
    "primaryMobile" TEXT,
    "alternateMobile" TEXT,
    "email" TEXT,
    "gstNumber" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'IN',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sourceSystem" TEXT,
    "sourceRecordId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleCode" TEXT,
    "registrationNumberRaw" TEXT NOT NULL,
    "registrationNumberNormalized" TEXT NOT NULL,
    "vin" TEXT,
    "engineNumber" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "variant" TEXT,
    "fuelType" TEXT,
    "color" TEXT,
    "manufactureYear" INTEGER,
    "batteryDetails" TEXT,
    "currentOdometer" INTEGER,
    "insurerName" TEXT,
    "insuranceExpiryDate" DATETIME,
    "nextServiceDate" DATETIME,
    "nextPucDate" DATETIME,
    "nextOilChangeDate" DATETIME,
    "nextOilChangeDistance" INTEGER,
    "nextTimingBeltChangeDate" DATETIME,
    "notes" TEXT,
    "currentCustomerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sourceSystem" TEXT,
    "sourceRecordId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vehicle_currentCustomerId_fkey" FOREIGN KEY ("currentCustomerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VehicleOwnershipHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "fromDate" DATETIME,
    "toDate" DATETIME,
    "transferNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VehicleOwnershipHistory_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VehicleOwnershipHistory_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PartsMaster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partName" TEXT NOT NULL,
    "itemCode" TEXT,
    "sku" TEXT,
    "partNumber" TEXT,
    "barcode" TEXT,
    "brand" TEXT,
    "unit" TEXT,
    "defaultTaxRate" REAL,
    "defaultSellingPrice" REAL,
    "stockQuantity" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sourceSystem" TEXT,
    "sourceRecordId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LabourMaster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "labourName" TEXT NOT NULL,
    "labourCode" TEXT,
    "unitType" TEXT,
    "defaultTaxRate" REAL,
    "defaultSellingPrice" REAL,
    "standardDescription" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sourceSystem" TEXT,
    "sourceRecordId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ComplaintIconMaster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "iconKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" TEXT,
    "sortOrder" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "JobCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobcardNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "advisorId" TEXT,
    "primaryMechanicId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "dateIn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDeliveryAt" DATETIME,
    "closedAt" DATETIME,
    "intakeOdometer" INTEGER,
    "fuelLevel" TEXT,
    "externalNotes" TEXT,
    "internalNotes" TEXT,
    "customerSignatureRequired" BOOLEAN NOT NULL DEFAULT true,
    "intakePhotosRequired" BOOLEAN NOT NULL DEFAULT true,
    "legacyImportFlag" BOOLEAN NOT NULL DEFAULT false,
    "readOnlyFlag" BOOLEAN NOT NULL DEFAULT false,
    "overallDiscountType" TEXT,
    "overallDiscountValue" REAL,
    "subtotalAmount" REAL DEFAULT 0,
    "taxAmount" REAL DEFAULT 0,
    "totalAmount" REAL DEFAULT 0,
    "placeOfSupplyState" TEXT,
    "paymentStatus" TEXT DEFAULT 'unpaid',
    "zohoSyncStatus" TEXT,
    "sourceSystem" TEXT,
    "sourceRecordId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JobCard_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "JobCard_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobCardSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobcardId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerMobile" TEXT,
    "customerAddress" TEXT,
    "customerGstNumber" TEXT,
    "vehicleRegistrationNumber" TEXT NOT NULL,
    "vehicleManufacturer" TEXT,
    "vehicleModel" TEXT,
    "vehicleColor" TEXT,
    "vehicleVin" TEXT,
    "intakeOdometerSnapshot" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobCardSnapshot_jobcardId_fkey" FOREIGN KEY ("jobcardId") REFERENCES "JobCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobCardMechanic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobcardId" TEXT NOT NULL,
    "mechanicUserId" TEXT NOT NULL,
    "assignmentRole" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "JobCardMechanic_jobcardId_fkey" FOREIGN KEY ("jobcardId") REFERENCES "JobCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobCardComplaint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobcardId" TEXT NOT NULL,
    "customerComplaintText" TEXT,
    "advisorObservationText" TEXT,
    "internalTechnicalNote" TEXT,
    "hasIconInput" BOOLEAN NOT NULL DEFAULT false,
    "hasTextInput" BOOLEAN NOT NULL DEFAULT false,
    "hasAudioInput" BOOLEAN NOT NULL DEFAULT false,
    "hasVideoInput" BOOLEAN NOT NULL DEFAULT false,
    "hasPhotoInput" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JobCardComplaint_jobcardId_fkey" FOREIGN KEY ("jobcardId") REFERENCES "JobCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobCardComplaintIcon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobcardComplaintId" TEXT NOT NULL,
    "complaintIconId" TEXT NOT NULL,
    CONSTRAINT "JobCardComplaintIcon_jobcardComplaintId_fkey" FOREIGN KEY ("jobcardComplaintId") REFERENCES "JobCardComplaint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobCardLabour" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobcardId" TEXT NOT NULL,
    "labourMasterId" TEXT,
    "labourName" TEXT NOT NULL,
    "addedByUserId" TEXT,
    "assignedMechanicUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "mechanicNote" TEXT,
    "sellingPrice" REAL,
    "taxRate" REAL,
    "discountType" TEXT,
    "discountValue" REAL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JobCardLabour_jobcardId_fkey" FOREIGN KEY ("jobcardId") REFERENCES "JobCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobCardPart" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobcardId" TEXT NOT NULL,
    "partMasterId" TEXT,
    "partName" TEXT NOT NULL,
    "itemCode" TEXT,
    "partNumber" TEXT,
    "brand" TEXT,
    "requestedByUserId" TEXT,
    "approvedByUserId" TEXT,
    "partsManagerUserId" TEXT,
    "quantityRequested" REAL NOT NULL DEFAULT 1,
    "quantityReceived" REAL,
    "quantityDispatched" REAL,
    "quantityUsed" REAL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "mechanicNote" TEXT,
    "dispatchNote" TEXT,
    "sellingPrice" REAL,
    "taxRate" REAL,
    "discountType" TEXT,
    "discountValue" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JobCardPart_jobcardId_fkey" FOREIGN KEY ("jobcardId") REFERENCES "JobCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobCardMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobcardId" TEXT NOT NULL,
    "complaintId" TEXT,
    "labourId" TEXT,
    "partId" TEXT,
    "mediaType" TEXT NOT NULL,
    "phase" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileSizeBytes" BIGINT,
    "captureLabel" TEXT,
    "capturedByUserId" TEXT,
    "capturedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobCardMedia_jobcardId_fkey" FOREIGN KEY ("jobcardId") REFERENCES "JobCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DiagnosticsReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobcardId" TEXT,
    "vehicleId" TEXT NOT NULL,
    "mediaId" TEXT,
    "sourceType" TEXT,
    "sourceReference" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiagnosticsReport_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiagnosticsReport_jobcardId_fkey" FOREIGN KEY ("jobcardId") REFERENCES "JobCard" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReminderEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT NOT NULL,
    "reminderType" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "dueOdometer" INTEGER,
    "sourceType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReminderEvent_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "moduleName" TEXT NOT NULL,
    "actionKey" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValuesJson" TEXT,
    "newValuesJson" TEXT,
    "actionNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlags_featureKey_key" ON "FeatureFlags"("featureKey");

-- CreateIndex
CREATE UNIQUE INDEX "Role_roleKey_key" ON "Role"("roleKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_registrationNumberNormalized_key" ON "Vehicle"("registrationNumberNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "ComplaintIconMaster_iconKey_key" ON "ComplaintIconMaster"("iconKey");

-- CreateIndex
CREATE UNIQUE INDEX "JobCard_jobcardNumber_key" ON "JobCard"("jobcardNumber");

-- CreateIndex
CREATE UNIQUE INDEX "JobCardSnapshot_jobcardId_key" ON "JobCardSnapshot"("jobcardId");
