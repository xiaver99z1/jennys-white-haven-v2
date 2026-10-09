// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { auth } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@jennyswhitehaven.com'
  const password = 'Admin123!' // ← change this later
  const name = 'Jenny Admin'

  // Check if admin already exists
  const existing = await prisma.user.findUnique({
    where: { email },
  })

  if (existing) {
    console.log('Admin user already exists:', email)
    return
  }

  // Create user using Better Auth (so password is hashed correctly)
  const result = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
    },
  })

  if (result.error) {
    console.error('Failed to create admin:', result.error)
    return
  }

  // Optional: set role to "owner"
  await prisma.user.update({
    where: { email },
    data: {
      role: 'owner',
    },
  })

  console.log('✅ Admin user created successfully!')
  console.log('Email:', email)
  console.log('Password:', password)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
