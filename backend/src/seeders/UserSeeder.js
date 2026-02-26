import { logger } from "../utils/logger.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { User } from "../models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourceImagesRoot = path.resolve(__dirname, "../../../images");

export class UserSeeder {
  constructor() {
    this.userCount = 0;
    this.batchSize = 500;
    this.userImages = [];
  }

  async run(totalUsers = 1000) {
    logger.info(
      `ðŸ‘¥ Starting User Seeding (${totalUsers.toLocaleString()} users)...\n`,
    );

    try {
      await this.loadUserImages();

      await this.clearExistingUsers();

      await this.createAdminUser();

      await this.createDemoUser();

      await this.createUsersBatch(totalUsers - 2);

      logger.info("\nâœ… User Seeding completed!");
      logger.info(
        `ðŸ“Š Summary: ${this.userCount.toLocaleString()} users created\n`,
      );
    } catch (error) {
      logger.error("User seeding failed", { error: error.message });
      throw error;
    }
  }

  async clearExistingUsers() {
    logger.info("ðŸ§¹ Clearing existing users...");
    await User.deleteMany({});
    logger.info("âœ… Existing users cleared");
  }

  async loadUserImages() {
    try {
      const files = await fs.readdir(sourceImagesRoot);
      this.userImages = files.filter((name) =>
        /\.(png|jpe?g|webp|gif|svg)$/i.test(name),
      );
      logger.info(
        `Loaded ${this.userImages.length} user seed images from /images`,
      );
    } catch (error) {
      this.userImages = [];
      logger.warn(
        `Could not read user image seed directory: ${sourceImagesRoot}`,
      );
    }
  }

  pickUserPhoto(index = 0) {
    if (!this.userImages.length) return null;
    const fileName = this.userImages[index % this.userImages.length];
    return `/images/${fileName}`;
  }

  async createAdminUser() {
    logger.info("ðŸ‘‘ Creating admin user...");

    const adminUser = new User({
      name: "Admin User",
      email: "admin@admin.com",
      password: "password123",
      role: "admin",
      status: "active",
      photo: this.pickUserPhoto(0),
      emailVerifiedAt: new Date(),
      profile: {
        avatar: "https://ui-avatars.com/api/?name=Admin+User&background=random",
        bio: "System Administrator",
        dateOfBirth: new Date("1985-01-01"),
        gender: "other",
      },
      addresses: [
        {
          label: "Home",
          firstName: "Admin",
          lastName: "User",
          address1: "123 Admin Street",
          city: "Admin City",
          state: "AC",
          postCode: "12345",
          country: "US",
          phone: "+1-555-0100",
          isDefault: true,
        },
      ],
      preferences: {
        newsletter: true,
        smsNotifications: false,
        emailNotifications: true,
        language: "en",
        currency: "USD",
      },
    });

    await adminUser.save();
    this.userCount++;

    logger.info("âœ… Admin user created (admin@admin.com / password123)");
  }

  async createDemoUser() {
    logger.info("ðŸ‘¤ Creating demo user...");

    const demoUser = new User({
      name: "Demo User",
      email: "user@admin.com",
      password: "password123",
      role: "user",
      status: "active",
      photo: this.pickUserPhoto(1),
      emailVerifiedAt: new Date(),
      profile: {
        avatar: "https://ui-avatars.com/api/?name=Demo+User&background=random",
        bio: "Regular customer account",
        dateOfBirth: new Date("1990-01-01"),
        gender: "other",
      },
      addresses: [
        {
          label: "Home",
          firstName: "Demo",
          lastName: "User",
          address1: "456 User Street",
          city: "User City",
          state: "UC",
          postCode: "54321",
          country: "US",
          phone: "+1-555-0200",
          isDefault: true,
        },
      ],
      preferences: {
        newsletter: true,
        smsNotifications: false,
        emailNotifications: true,
        language: "en",
        currency: "USD",
      },
    });

    await demoUser.save();
    this.userCount++;

    logger.info("âœ… Demo user created (user@admin.com / password123)");
  }

  async createUsersBatch(totalUsers) {
    const batches = Math.ceil(totalUsers / this.batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const startIndex = batch * this.batchSize;
      const endIndex = Math.min(startIndex + this.batchSize, totalUsers);
      const batchSize = endIndex - startIndex;

      logger.info(
        `ðŸ‘¥ Creating batch ${batch + 1}/${batches} (${batchSize} users)...`,
      );

      const users = [];

      for (let i = startIndex; i < endIndex; i++) {
        const user = await this.generateUser(i);
        users.push(user);
      }

      await User.insertMany(users);
      this.userCount += batchSize;

      logger.info(
        `âœ… Batch ${batch + 1} completed (${this.userCount.toLocaleString()}/${(totalUsers + 1).toLocaleString()} total)`,
      );
    }
  }

  async generateUser(index) {
    const firstName = this.getRandomFirstName();
    const lastName = this.getRandomLastName();
    const fullName = `${firstName} ${lastName}`;
    const email = this.generateEmail(firstName, lastName, index);

    return {
      name: fullName,
      email,
      password: "password123",
      role: this.getRandomRole(),
      status: this.getRandomStatus(),
      photo: this.pickUserPhoto(index + 2),
      profile: {
        avatar: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`,
        bio: this.generateBio(firstName, lastName),
        phone: this.generatePhoneNumber(),
        dateOfBirth: this.generateDateOfBirth(),
        gender: this.getRandomGender(),
      },
      addresses: this.generateAddresses(firstName, lastName),
      preferences: this.generatePreferences(),
      metadata: {
        lastLogin: this.generateRandomRecentDate(),
        loginCount: Math.floor(Math.random() * 100),
        source: this.getRandomSource(),
      },
      createdAt: this.generateRandomDate(),
    };
  }

  generateUsername(firstName, lastName, index) {
    const base = `${firstName.toLowerCase()}${lastName.toLowerCase()}`;
    const variations = [
      base,
      `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
      `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
      `${firstName.toLowerCase()}${index}`,
      `${firstName.substring(0, 1).toLowerCase()}${lastName.toLowerCase()}`,
      `${firstName.toLowerCase()}${lastName.substring(0, 1).toLowerCase()}`,
    ];

    const variation = variations[Math.floor(Math.random() * variations.length)];
    return variation + Math.floor(Math.random() * 9999);
  }

  generateEmail(firstName, lastName, index) {
    const domains = [
      "gmail.com",
      "yahoo.com",
      "outlook.com",
      "hotmail.com",
      "icloud.com",
      "protonmail.com",
      "example.com",
    ];

    const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}`;
    const domain = domains[Math.floor(Math.random() * domains.length)];

    return `${username}@${domain}`;
  }

  generateBio(firstName, lastName) {
    const bios = [
      `Hi, I'm ${firstName}! Love shopping and discovering new products.`,
      `${firstName} ${lastName} - Fashion enthusiast and tech lover.`,
      `Shopping is my therapy. Always looking for the best deals!`,
      `Product reviewer and bargain hunter. Follow me for great finds!`,
      `${firstName} here! Passionate about quality products and great service.`,
      `Lifestyle blogger and shopping expert. Always happy to help!`,
      `Technology enthusiast and early adopter of new products.`,
      `Fashion-forward and eco-conscious shopper.`,
    ];

    return Math.random() > 0.3
      ? bios[Math.floor(Math.random() * bios.length)]
      : null;
  }

  generatePhoneNumber() {
    if (Math.random() > 0.7) return null;

    const areaCode = Math.floor(Math.random() * 800) + 200;
    const exchange = Math.floor(Math.random() * 800) + 200;
    const number = Math.floor(Math.random() * 9000) + 1000;

    return `+1-${areaCode}-${exchange}-${number}`;
  }

  generateDateOfBirth() {
    if (Math.random() > 0.6) return null;

    const start = new Date(1950, 0, 1);
    const end = new Date(2005, 11, 31);

    return new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime()),
    );
  }

  generateAddresses(firstName, lastName) {
    const addressCount =
      Math.random() > 0.7
        ? Math.random() > 0.5
          ? 2
          : 1
        : Math.random() > 0.8
          ? 1
          : 0;

    if (addressCount === 0) return [];

    const addresses = [];
    const streets = [
      "Main Street",
      "Oak Avenue",
      "Pine Road",
      "Elm Drive",
      "Maple Lane",
      "Cedar Way",
      "Park Boulevard",
      "First Street",
      "Second Avenue",
      "Third Street",
    ];

    const cities = [
      "New York",
      "Los Angeles",
      "Chicago",
      "Houston",
      "Phoenix",
      "Philadelphia",
      "San Antonio",
      "San Diego",
      "Dallas",
      "San Jose",
    ];

    const states = ["NY", "CA", "IL", "TX", "AZ", "PA", "TX", "CA", "TX", "CA"];

    for (let i = 0; i < addressCount; i++) {
      const street = streets[Math.floor(Math.random() * streets.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];
      const state = states[Math.floor(Math.random() * states.length)];

      const area = Math.floor(Math.random() * 800) + 200;
      const exch = Math.floor(Math.random() * 800) + 200;
      const num = Math.floor(Math.random() * 9000) + 1000;

      addresses.push({
        label: i === 0 ? "Home" : Math.random() > 0.5 ? "Work" : "Other",
        firstName,
        lastName,
        address1: `${Math.floor(Math.random() * 9999) + 1} ${street}`,
        address2:
          Math.random() > 0.9
            ? `Apt ${Math.floor(Math.random() * 50) + 1}`
            : undefined,
        city,
        state,
        postCode: String(Math.floor(Math.random() * 90000) + 10000),
        country: "US",
        phone: `+1-${area}-${exch}-${num}`,
        isDefault: i === 0,
      });
    }

    return addresses;
  }

  generateCompanyName() {
    const prefixes = [
      "Tech",
      "Global",
      "Digital",
      "Smart",
      "Pro",
      "Elite",
      "Prime",
    ];
    const suffixes = [
      "Solutions",
      "Systems",
      "Corp",
      "Inc",
      "LLC",
      "Group",
      "Enterprises",
    ];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

    return `${prefix} ${suffix}`;
  }

  generatePreferences() {
    return {
      newsletter: Math.random() > 0.4,
      smsNotifications: Math.random() > 0.8,
      emailNotifications: Math.random() > 0.3,
      language:
        Math.random() > 0.9
          ? ["es", "fr", "de", "it"][Math.floor(Math.random() * 4)]
          : "en",
      currency:
        Math.random() > 0.9
          ? ["EUR", "GBP", "CAD", "AUD"][Math.floor(Math.random() * 4)]
          : "USD",
      theme: Math.random() > 0.8 ? "dark" : "light",
    };
  }

  generateRandomDate() {
    const start = new Date(2022, 0, 1);
    const end = new Date();
    return new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime()),
    );
  }

  generateRandomRecentDate() {
    if (Math.random() > 0.7) return null;

    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = new Date();
    return new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime()),
    );
  }

  getRandomFirstName() {
    const names = [
      "James",
      "Mary",
      "John",
      "Patricia",
      "Robert",
      "Jennifer",
      "Michael",
      "Linda",
      "William",
      "Elizabeth",
      "David",
      "Barbara",
      "Richard",
      "Susan",
      "Joseph",
      "Jessica",
      "Thomas",
      "Sarah",
      "Christopher",
      "Karen",
      "Charles",
      "Nancy",
      "Daniel",
      "Lisa",
      "Matthew",
      "Betty",
      "Anthony",
      "Helen",
      "Mark",
      "Sandra",
      "Donald",
      "Donna",
      "Steven",
      "Carol",
      "Paul",
      "Ruth",
      "Andrew",
      "Sharon",
      "Joshua",
      "Michelle",
      "Kenneth",
      "Laura",
      "Kevin",
      "Sarah",
      "Brian",
      "Kimberly",
      "George",
      "Deborah",
      "Edward",
      "Dorothy",
      "Ronald",
      "Lisa",
      "Timothy",
      "Nancy",
      "Jason",
      "Karen",
    ];

    return names[Math.floor(Math.random() * names.length)];
  }

  getRandomLastName() {
    const names = [
      "Smith",
      "Johnson",
      "Williams",
      "Brown",
      "Jones",
      "Garcia",
      "Miller",
      "Davis",
      "Rodriguez",
      "Martinez",
      "Hernandez",
      "Lopez",
      "Gonzalez",
      "Wilson",
      "Anderson",
      "Thomas",
      "Taylor",
      "Moore",
      "Jackson",
      "Martin",
      "Lee",
      "Perez",
      "Thompson",
      "White",
      "Harris",
      "Sanchez",
      "Clark",
      "Ramirez",
      "Lewis",
      "Robinson",
      "Walker",
      "Young",
      "Allen",
      "King",
      "Wright",
      "Scott",
      "Torres",
      "Nguyen",
      "Hill",
      "Flores",
      "Green",
      "Adams",
      "Nelson",
      "Baker",
      "Hall",
      "Rivera",
      "Campbell",
      "Mitchell",
    ];

    return names[Math.floor(Math.random() * names.length)];
  }

  getRandomRole() {
    const roles = ["user", "admin"];
    const weights = [0.95, 0.05];

    const random = Math.random();
    let sum = 0;

    for (let i = 0; i < roles.length; i++) {
      sum += weights[i];
      if (random <= sum) {
        return roles[i];
      }
    }

    return "customer";
  }

  getRandomStatus() {
    return Math.random() > 0.05 ? "active" : "inactive";
  }

  getRandomGender() {
    const genders = ["male", "female", "other"];
    const weights = [0.48, 0.48, 0.04];

    const random = Math.random();
    let sum = 0;

    for (let i = 0; i < genders.length; i++) {
      sum += weights[i];
      if (random <= sum) {
        return genders[i];
      }
    }

    return "other";
  }

  getRandomSource() {
    const sources = [
      "organic",
      "google",
      "facebook",
      "email",
      "referral",
      "direct",
    ];
    return sources[Math.floor(Math.random() * sources.length)];
  }
}

export const userSeeder = new UserSeeder();
