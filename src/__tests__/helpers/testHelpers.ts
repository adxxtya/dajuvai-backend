import { User, UserRole } from '../../entities/user.entity';
import { Product } from '../../entities/product.entity';
import { Order, OrderStatus, PaymentStatus, PaymentMethod } from '../../entities/order.entity';
import { Vendor } from '../../entities/vendor.entity';
import { Category } from '../../entities/category.entity';
import { Subcategory } from '../../entities/subcategory.entity';
import { Address, Province } from '../../entities/address.entity';
import { District } from '../../entities/district.entity';
import TestDataSource from '../../config/db.test.config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { InventoryStatus } from '../../entities/product.enum';

/**
 * Create a test user in the database
 */
export async function createTestUser(overrides: Partial<User> = {}): Promise<User> {
  const userRepository = TestDataSource.getRepository(User);
  
  const hashedPassword = await bcrypt.hash('Test@1234', 10);
  
  const user = userRepository.create({
    fullName: 'Test User',
    email: `test${Date.now()}@example.com`,
    phoneNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: hashedPassword,
    role: UserRole.USER,
    isVerified: true,
    ...overrides,
  });

  return await userRepository.save(user);
}

/**
 * Create a test vendor in the database
 */
export async function createTestVendor(overrides: Partial<Vendor> = {}): Promise<Vendor> {
  const vendorRepository = TestDataSource.getRepository(Vendor);
  const districtRepository = TestDataSource.getRepository(District);
  
  // Create or get a test district
  let district = await districtRepository.findOne({ where: { name: 'Kathmandu' } });
  if (!district) {
    district = districtRepository.create({
      name: 'Kathmandu',
    });
    district = await districtRepository.save(district);
  }

  const hashedPassword = await bcrypt.hash('Vendor@1234', 10);
  
  const vendor = vendorRepository.create({
    businessName: 'Test Vendor',
    email: `vendor${Date.now()}@example.com`,
    phoneNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
    password: hashedPassword,
    isVerified: true,
    isApproved: true,
    district,
    ...overrides,
  });

  return await vendorRepository.save(vendor);
}

/**
 * Create a test category in the database
 */
export async function createTestCategory(overrides: Partial<Category> = {}): Promise<Category> {
  const categoryRepository = TestDataSource.getRepository(Category);
  
  const category = categoryRepository.create({
    name: `Test Category ${Date.now()}`,
    ...overrides,
  });

  return await categoryRepository.save(category);
}

/**
 * Create a test subcategory in the database
 */
export async function createTestSubcategory(
  category: Category,
  overrides: Partial<Subcategory> = {}
): Promise<Subcategory> {
  const subcategoryRepository = TestDataSource.getRepository(Subcategory);
  
  const subcategory = subcategoryRepository.create({
    name: `Test Subcategory ${Date.now()}`,
    category,
    ...overrides,
  });

  return await subcategoryRepository.save(subcategory);
}

/**
 * Create a test product in the database
 */
export async function createTestProduct(
  vendor: Vendor,
  subcategory: Subcategory,
  overrides: Partial<Product> = {}
): Promise<Product> {
  const productRepository = TestDataSource.getRepository(Product);
  
  const product = productRepository.create({
    name: `Test Product ${Date.now()}`,
    description: 'Test product description',
    basePrice: 1000,
    finalPrice: 1000,
    discount: 0,
    discountType: 'PERCENTAGE' as any,
    stock: 100,
    status: InventoryStatus.AVAILABLE,
    hasVariants: false,
    productImages: ['https://example.com/image.jpg'],
    vendor,
    subcategory,
    ...overrides,
  });

  return await productRepository.save(product);
}

/**
 * Create a test address in the database
 */
export async function createTestAddress(
  user: User,
  overrides: Partial<Address> = {}
): Promise<Address> {
  const addressRepository = TestDataSource.getRepository(Address);
  
  const address = addressRepository.create({
    province: Province.BAGMATI,
    district: 'Kathmandu',
    city: 'Kathmandu',
    localAddress: 'Test Street',
    landmark: 'Test Landmark',
    userId: user.id,
    ...overrides,
  });

  return await addressRepository.save(address);
}

/**
 * Create a test order in the database
 */
export async function createTestOrder(
  user: User,
  address: Address,
  overrides: Partial<Order> = {}
): Promise<Order> {
  const orderRepository = TestDataSource.getRepository(Order);
  
  const order = orderRepository.create({
    orderedById: user.id,
    orderedBy: user,
    shippingAddress: address,
    totalPrice: 1000,
    shippingFee: 100,
    paymentStatus: PaymentStatus.UNPAID,
    paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
    status: OrderStatus.PENDING,
    phoneNumber: user.phoneNumber,
    orderItems: [],
    ...overrides,
  });

  return await orderRepository.save(order);
}

/**
 * Generate a test JWT token for authentication
 */
export function generateTestToken(user: User | Vendor, expiresIn: string = '1h'): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: 'role' in user ? user.role : 'vendor',
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', { expiresIn } as jwt.SignOptions);
}

/**
 * Generate an expired test JWT token
 */
export function generateExpiredTestToken(user: User | Vendor): string {
  return generateTestToken(user, '-1h'); // Expired 1 hour ago
}

/**
 * Create a complete test setup with user, vendor, category, subcategory, and product
 */
export async function createCompleteTestSetup() {
  const user = await createTestUser();
  const vendor = await createTestVendor();
  const category = await createTestCategory();
  const subcategory = await createTestSubcategory(category);
  const product = await createTestProduct(vendor, subcategory);
  const address = await createTestAddress(user);

  return {
    user,
    vendor,
    category,
    subcategory,
    product,
    address,
  };
}
