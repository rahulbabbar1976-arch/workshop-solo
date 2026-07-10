const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// 1. Add Tenant and TenantInvite models at the top
const newModels = `
model Tenant {
  id              String   @id @default(uuid())
  name            String
  status          String   @default("ACTIVE") // PENDING, ACTIVE, SUSPENDED
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  users           User[]
  customers       Customer[]
  vehicles        Vehicle[]
  jobCards        JobCard[]
  parts           PartMaster[]
  labour          LabourMaster[]
  complaints      JobcardComplaint[]
  workflowSettings WorkflowSettings[]
}

model TenantInvite {
  id              String   @id @default(uuid())
  identifier      String   @unique // email or mobile
  isClaimed       Boolean  @default(false)
  claimedAt       DateTime?
  createdAt       DateTime @default(now())
}
`;

// Insert after the generator block
schema = schema.replace(/generator client {[\s\S]*?}/, (match) => match + '\n\n' + newModels);

// Helper function to add tenantId to a model
function addTenantToModel(modelName, schemaStr) {
    const regex = new RegExp(`(model ${modelName} {[\\s\\S]*?)(})`);
    return schemaStr.replace(regex, (match, p1, p2) => {
        if (p1.includes('tenantId String')) return match; // Already added
        // Add tenantId and relation before the closing brace
        return p1 + `  tenantId String?\n  tenant Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)\n` + p2;
    });
}

const modelsToUpdate = [
    'User', 'Customer', 'Vehicle', 'JobCard', 'PartMaster', 'LabourMaster', 'JobcardComplaint', 'WorkflowSettings'
];

for (const model of modelsToUpdate) {
    schema = addTenantToModel(model, schema);
}

fs.writeFileSync(schemaPath, schema);
console.log('Successfully updated schema.prisma with Tenant architecture!');
