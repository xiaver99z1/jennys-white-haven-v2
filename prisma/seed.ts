import { PrismaClient } from '@prisma/client'
import { auth } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Resetting and seeding database using Better Auth API...')

  const seedUser = async (data: {
    name: string
    email: string
    role: string
    emailVerified: boolean
    createdAt?: Date
  }) => {
    let user = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (!user) {
      try {
        // Use Better Auth's server API to properly create the user and credential account with correct hashing
        const res = await auth.api.signUpEmail({
          body: {
            email: data.email,
            password: 'Password!123',
            name: data.name,
          },
        })
        user = res.user as any
        console.log(`Created user: ${data.email}`)
      } catch (err) {
        console.log(`User ${data.email} already exists or was skipped.`)
      }
    }

    // Update role, verification status, and staggered creation date
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          role: data.role,
          emailVerified: data.emailVerified,
          ...(data.createdAt ? { createdAt: data.createdAt } : {}),
        },
      })
    }
  }

  // 1. Core Administrative Accounts
  await seedUser({
    name: 'Jenny Owner',
    email: 'owner@jennyswhitehaven.com',
    role: 'owner',
    emailVerified: true,
  })

  await seedUser({
    name: 'Mark Manager',
    email: 'manager@jennyswhitehaven.com',
    role: 'manager',
    emailVerified: true,
  })

  await seedUser({
    name: 'Rachel Receptionist',
    email: 'receptionist@jennyswhitehaven.com',
    role: 'receptionist',
    emailVerified: false,
  })

  console.log('✅ Core admin accounts verified.')

  // 2. Generate 47 Test Users
  const firstNames = [
    'Charlotte',
    'Liam',
    'Amelia',
    'Oliver',
    'Isabella',
    'Elijah',
    'Sophia',
    'Lucas',
    'Mia',
    'Mason',
    'Harper',
    'Ethan',
    'Evelyn',
    'Aiden',
    'Abigail',
    'Logan',
    'Emily',
    'Benjamin',
    'Ella',
    'Jackson',
    'Aria',
    'Sebastian',
    'Scarlett',
    'Mateo',
    'Victoria',
    'Jack',
    'Luna',
    'Owen',
    'Grace',
    'Theodore',
    'Chloe',
    'Henry',
    'Penelope',
    'Layla',
    'Caleb',
    'Zoey',
    'Nathan',
    'Stella',
    'Ryan',
    'Hazel',
    'Asher',
    'Ellie',
    'Leo',
    'Aurora',
    'Isaac',
    'Nora',
    'Cynthia',
  ]

  const lastNames = [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
    'Rodriguez',
    'Martinez',
    'Hernandez',
    'Lopez',
    'Gonzalez',
    'Wilson',
    'Anderson',
    'Thomas',
    'Taylor',
    'Moore',
    'Jackson',
    'Martin',
    'Lee',
    'Perez',
    'Thompson',
    'White',
    'Harris',
    'Sanchez',
    'Clark',
    'Ramirez',
    'Lewis',
    'Robinson',
    'Walker',
    'Young',
    'Allen',
    'King',
    'Wright',
    'Scott',
    'Torres',
    'Nguyen',
    'Hill',
    'Flores',
    'Green',
    'Adams',
    'Nelson',
    'Baker',
    'Hall',
    'Rivera',
    'Campbell',
  ]

  for (let i = 1; i <= 47; i++) {
    const firstName = firstNames[(i - 1) % firstNames.length]
    const lastName = lastNames[(i - 1) % lastNames.length]
    const name = `${firstName} ${lastName}`
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@jennyswhitehaven.com`

    const role = i <= 5 ? 'manager' : 'receptionist'
    const emailVerified = i % 2 === 0
    const daysAgo = (50 - i) * 2
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)

    await seedUser({
      name,
      email,
      role,
      emailVerified,
      createdAt,
    })
  }

  console.log(
    '🎉 Successfully seeded 50 users with valid Better Auth credentials!',
  )
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
