import { faker } from '@faker-js/faker';
import { 
  UserRole, 
  AuthProvider 
} from '../../entities/user.entity';
import { 
  OrderStatus, 
  PaymentStatus, 
  PaymentMethod 
} from '../../entities/order.entity';
import { 
  BannerType, 
  BannerStatus, 
  ProductSource 
} from '../../entities/banner.entity';
import { 
  DealStatus 
} from '../../entities/deal.entity';
import { 
  PromoType 
} from '../../entities/promo.entity';
import { 
  DiscountType, 
  InventoryStatus 
} from '../../entities/product.enum';
import { Province } from '../../entities/address.entity';

/**
 * Test data interfaces matching entity structures
 */
export interface TestUser {
  fullName: string;
  username: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  provider: AuthProvider;
  isVerified: boolean;
  password: string;
}

export interface TestVendor {
  businessName: string;
  email: string;
  password: string;
  phoneNumber: string;
  telePhone?: string;
  districtId: number;
  businessRegNumber?: string;
  taxNumber?: string;
  accountName?: string;
  bankName?: string;
  accountNumber?: string;
  bankBranch?: string;
  isVerified: boolean;
  isApproved: boolean;
}

export interface TestProduct {
  name: string;
  description: string;
  basePrice?: number;
  finalPrice?: number;
  discount: number;
  discountType: DiscountType;
  status: InventoryStatus;
  stock?: number;
  vendorId: number;
  subcategoryId: number;
  hasVariants: boolean;
  productImages?: string[];
  brandId?: number;
}

export interface TestVariant {
  sku: string;
  basePrice: number;
  finalPrice: number;
  discount: number;
  discountType: DiscountType;
  attributes: { [key: string]: string };
  variantImages: string[];
  stock: number;
  status: InventoryStatus;
  productId: string;
}

export interface TestCategory {
  name: string;
  image?: string;
}

export interface TestSubcategory {
  name: string;
  image?: string;
  categoryId?: number;
}

export interface TestOrder {
  orderedById: number;
  totalPrice: number;
  shippingFee: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  serviceCharge: number;
  phoneNumber: string;
  appliedPromoCode?: string;
}

export interface TestCart {
  userId: number;
  total: number;
}

export interface TestCartItem {
  cartId: number;
  productId: number;
  quantity: number;
  price: number;
  variantId?: string;
}

export interface TestWishlist {
  userId: number;
}

export interface TestWishlistItem {
  wishlistId: number;
  productId: number;
  variantId?: string;
}

export interface TestBanner {
  name: string;
  desktopImage: string;
  mobileImage: string;
  type: BannerType;
  status: BannerStatus;
  startDate: Date;
  endDate: Date;
  productSource?: ProductSource;
  externalLink?: string;
  createdById: number;
}

export interface TestDeal {
  name: string;
  discountPercentage: number;
  status: DealStatus;
  createdById: number;
}

export interface TestPromo {
  promoCode: string;
  discountPercentage: number;
  applyOn: PromoType;
  isValid: boolean;
}

export interface TestDistrict {
  name: string;
}

export interface TestAddress {
  province: Province;
  district: string;
  city: string;
  localAddress: string;
  landmark?: string;
  userId: number;
}

export interface TestBrand {
  name: string;
}

/**
 * TestDataFactory class for generating realistic test data
 * 
 * Uses Faker.js to generate valid, realistic data for all entity types.
 * All factory methods accept optional overrides to customize generated data.
 * 
 * Requirements: 1.4
 */
export class TestDataFactory {
  /**
   * Create a test user with realistic data
   * 
   * @param overrides - Optional partial user data to override defaults
   * @returns TestUser object with valid user data
   */
  createUser(overrides?: Partial<TestUser>): TestUser {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    return {
      fullName: `${firstName} ${lastName}`,
      username: faker.internet.username({ firstName, lastName }).toLowerCase(),
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      phoneNumber: this.generateNepalPhoneNumber(),
      role: UserRole.USER,
      provider: AuthProvider.LOCAL,
      isVerified: true,
      password: 'TestPassword@1234', // Standard test password (12+ chars)
      ...overrides,
    };
  }

  /**
   * Create a test admin user
   * 
   * @param overrides - Optional partial user data to override defaults
   * @returns TestUser object with admin role
   */
  createAdmin(overrides?: Partial<TestUser>): TestUser {
    return this.createUser({
      role: UserRole.ADMIN,
      ...overrides,
    });
  }

  /**
   * Create a test staff user
   * 
   * @param overrides - Optional partial user data to override defaults
   * @returns TestUser object with staff role
   */
  createStaff(overrides?: Partial<TestUser>): TestUser {
    return this.createUser({
      role: UserRole.STAFF,
      ...overrides,
    });
  }

  /**
   * Create a test vendor with realistic business data
   * 
   * @param overrides - Optional partial vendor data to override defaults
   * @returns TestVendor object with valid vendor data
   */
  createVendor(overrides?: Partial<TestVendor>): TestVendor {
    const businessName = faker.company.name();
    
    return {
      businessName,
      email: faker.internet.email({ firstName: businessName.split(' ')[0] }).toLowerCase(),
      password: 'TestPassword@1234', // Standard test password (12+ chars)
      phoneNumber: this.generateNepalPhoneNumber(),
      telePhone: this.generateNepalPhoneNumber(),
      districtId: faker.number.int({ min: 1, max: 77 }), // Nepal has 77 districts
      businessRegNumber: faker.string.alphanumeric(10).toUpperCase(),
      taxNumber: faker.string.numeric(9),
      accountName: businessName,
      bankName: faker.helpers.arrayElement([
        'Nepal Bank Limited',
        'Rastriya Banijya Bank',
        'Nabil Bank',
        'Nepal Investment Bank',
        'Standard Chartered Bank Nepal',
        'Himalayan Bank',
        'Nepal SBI Bank',
        'Nepal Bangladesh Bank',
      ]),
      accountNumber: faker.string.numeric(16),
      bankBranch: faker.location.city(),
      isVerified: true,
      isApproved: true,
      ...overrides,
    };
  }

  /**
   * Create a test product with realistic data
   * 
   * @param overrides - Optional partial product data to override defaults
   * @returns TestProduct object with valid product data
   */
  createProduct(overrides?: Partial<TestProduct>): TestProduct {
    const basePrice = faker.number.float({ min: 100, max: 50000, fractionDigits: 2 });
    const discount = faker.number.float({ min: 0, max: 50, fractionDigits: 2 });
    const finalPrice = basePrice - (basePrice * discount / 100);
    
    return {
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      basePrice,
      finalPrice,
      discount,
      discountType: DiscountType.PERCENTAGE,
      status: InventoryStatus.AVAILABLE,
      stock: faker.number.int({ min: 0, max: 1000 }),
      vendorId: 1, // Will be overridden with actual vendor ID
      subcategoryId: 1, // Will be overridden with actual subcategory ID
      hasVariants: false,
      productImages: [
        faker.image.url(),
        faker.image.url(),
      ],
      ...overrides,
    };
  }

  /**
   * Create a test product with variants
   * 
   * @param overrides - Optional partial product data to override defaults
   * @returns TestProduct object configured for variants
   */
  createProductWithVariants(overrides?: Partial<TestProduct>): TestProduct {
    return this.createProduct({
      hasVariants: true,
      basePrice: undefined, // Products with variants don't have base price
      finalPrice: undefined,
      stock: undefined,
      ...overrides,
    });
  }

  /**
   * Create a test product variant
   * 
   * @param overrides - Optional partial variant data to override defaults
   * @returns TestVariant object with valid variant data
   */
  createVariant(overrides?: Partial<TestVariant>): TestVariant {
    const basePrice = faker.number.float({ min: 100, max: 50000, fractionDigits: 2 });
    const discount = faker.number.float({ min: 0, max: 50, fractionDigits: 2 });
    const finalPrice = basePrice - (basePrice * discount / 100);
    
    return {
      sku: faker.string.alphanumeric(10).toUpperCase(),
      basePrice,
      finalPrice,
      discount,
      discountType: DiscountType.PERCENTAGE,
      attributes: {
        size: faker.helpers.arrayElement(['S', 'M', 'L', 'XL']),
        color: faker.color.human(),
      },
      variantImages: [faker.image.url()],
      stock: faker.number.int({ min: 0, max: 100 }),
      status: InventoryStatus.AVAILABLE,
      productId: '1', // Will be overridden with actual product ID
      ...overrides,
    };
  }

  /**
   * Create a test category
   * 
   * @param overrides - Optional partial category data to override defaults
   * @returns TestCategory object with valid category data
   */
  createCategory(overrides?: Partial<TestCategory>): TestCategory {
    return {
      name: faker.commerce.department(),
      image: faker.image.url(),
      ...overrides,
    };
  }

  /**
   * Create a test subcategory
   * 
   * @param overrides - Optional partial subcategory data to override defaults
   * @returns TestSubcategory object with valid subcategory data
   */
  createSubcategory(overrides?: Partial<TestSubcategory>): TestSubcategory {
    return {
      name: faker.commerce.productAdjective() + ' ' + faker.commerce.product(),
      image: faker.image.url(),
      ...overrides,
    };
  }

  /**
   * Create a test order
   * 
   * @param overrides - Optional partial order data to override defaults
   * @returns TestOrder object with valid order data
   */
  createOrder(overrides?: Partial<TestOrder>): TestOrder {
    const totalPrice = faker.number.float({ min: 500, max: 50000, fractionDigits: 2 });
    const shippingFee = faker.number.float({ min: 50, max: 500, fractionDigits: 2 });
    const serviceCharge = totalPrice * 0.02; // 2% service charge
    
    return {
      orderedById: 1, // Will be overridden with actual user ID
      totalPrice,
      shippingFee,
      paymentStatus: PaymentStatus.UNPAID,
      paymentMethod: faker.helpers.arrayElement([
        PaymentMethod.CASH_ON_DELIVERY,
        PaymentMethod.ESEWA,
        PaymentMethod.KHALIT,
      ]),
      status: OrderStatus.CONFIRMED,
      serviceCharge,
      phoneNumber: this.generateNepalPhoneNumber(),
      ...overrides,
    };
  }

  /**
   * Create a test cart
   * 
   * @param overrides - Optional partial cart data to override defaults
   * @returns TestCart object with valid cart data
   */
  createCart(overrides?: Partial<TestCart>): TestCart {
    return {
      userId: 1, // Will be overridden with actual user ID
      total: 0, // Will be calculated based on items
      ...overrides,
    };
  }

  /**
   * Create a test cart item
   * 
   * @param overrides - Optional partial cart item data to override defaults
   * @returns TestCartItem object with valid cart item data
   */
  createCartItem(overrides?: Partial<TestCartItem>): TestCartItem {
    const quantity = faker.number.int({ min: 1, max: 10 });
    const price = faker.number.float({ min: 100, max: 5000, fractionDigits: 2 });
    
    return {
      cartId: 1, // Will be overridden with actual cart ID
      productId: 1, // Will be overridden with actual product ID
      quantity,
      price,
      ...overrides,
    };
  }

  /**
   * Create a test wishlist
   * 
   * @param overrides - Optional partial wishlist data to override defaults
   * @returns TestWishlist object with valid wishlist data
   */
  createWishlist(overrides?: Partial<TestWishlist>): TestWishlist {
    return {
      userId: 1, // Will be overridden with actual user ID
      ...overrides,
    };
  }

  /**
   * Create a test wishlist item
   * 
   * @param overrides - Optional partial wishlist item data to override defaults
   * @returns TestWishlistItem object with valid wishlist item data
   */
  createWishlistItem(overrides?: Partial<TestWishlistItem>): TestWishlistItem {
    return {
      wishlistId: 1, // Will be overridden with actual wishlist ID
      productId: 1, // Will be overridden with actual product ID
      ...overrides,
    };
  }

  /**
   * Create a test banner
   * 
   * @param overrides - Optional partial banner data to override defaults
   * @returns TestBanner object with valid banner data
   */
  createBanner(overrides?: Partial<TestBanner>): TestBanner {
    const startDate = faker.date.future();
    const endDate = faker.date.future({ refDate: startDate });
    
    return {
      name: faker.commerce.productName() + ' Banner',
      desktopImage: faker.image.url(),
      mobileImage: faker.image.url(),
      type: faker.helpers.arrayElement([
        BannerType.HERO,
        BannerType.SIDEBAR,
        BannerType.PRODUCT,
        BannerType.SPECIAL_DEALS,
      ]),
      status: BannerStatus.SCHEDULED,
      startDate,
      endDate,
      createdById: 1, // Will be overridden with actual admin ID
      ...overrides,
    };
  }

  /**
   * Create a test deal
   * 
   * @param overrides - Optional partial deal data to override defaults
   * @returns TestDeal object with valid deal data
   */
  createDeal(overrides?: Partial<TestDeal>): TestDeal {
    return {
      name: faker.commerce.productName() + ' Deal',
      discountPercentage: faker.number.float({ min: 5, max: 70, fractionDigits: 2 }),
      status: DealStatus.ENABLED,
      createdById: 1, // Will be overridden with actual admin ID
      ...overrides,
    };
  }

  /**
   * Create a test promo code
   * 
   * @param overrides - Optional partial promo data to override defaults
   * @returns TestPromo object with valid promo data
   */
  createPromo(overrides?: Partial<TestPromo>): TestPromo {
    return {
      promoCode: faker.string.alphanumeric(8).toUpperCase(),
      discountPercentage: faker.number.int({ min: 5, max: 50 }),
      applyOn: faker.helpers.arrayElement([
        PromoType.LINE_TOTAL,
        PromoType.SHIPPING,
      ]),
      isValid: true,
      ...overrides,
    };
  }

  /**
   * Create a test district
   * 
   * @param overrides - Optional partial district data to override defaults
   * @returns TestDistrict object with valid district data
   */
  createDistrict(overrides?: Partial<TestDistrict>): TestDistrict {
    return {
      name: faker.location.city() + ' District',
      ...overrides,
    };
  }

  /**
   * Create a test address
   * 
   * @param overrides - Optional partial address data to override defaults
   * @returns TestAddress object with valid address data
   */
  createAddress(overrides?: Partial<TestAddress>): TestAddress {
    return {
      province: faker.helpers.arrayElement([
        Province.PROVINCE_1,
        Province.MADHESH,
        Province.BAGMATI,
        Province.GANDAKI,
        Province.LUMBINI,
        Province.KARNALI,
        Province.SUDURPASHCHIM,
      ]),
      district: faker.location.city(),
      city: faker.location.city(),
      localAddress: faker.location.streetAddress(),
      landmark: faker.location.secondaryAddress(),
      userId: 1, // Will be overridden with actual user ID
      ...overrides,
    };
  }

  /**
   * Create a test brand
   * 
   * @param overrides - Optional partial brand data to override defaults
   * @returns TestBrand object with valid brand data
   */
  createBrand(overrides?: Partial<TestBrand>): TestBrand {
    return {
      name: faker.company.name(),
      ...overrides,
    };
  }

  /**
   * Generate a realistic Nepal phone number
   * Format: 98XXXXXXXX (10 digits starting with 98)
   * 
   * @returns String representing a Nepal mobile number
   */
  private generateNepalPhoneNumber(): string {
    return '98' + faker.string.numeric(8);
  }

  /**
   * Generate a unique email with timestamp to avoid conflicts
   * 
   * @param prefix - Optional prefix for the email
   * @returns Unique email address
   */
  generateUniqueEmail(prefix: string = 'test'): string {
    const timestamp = Date.now();
    return `${prefix}_${timestamp}_${faker.string.alphanumeric(5)}@test.com`.toLowerCase();
  }

  /**
   * Generate a unique username with timestamp to avoid conflicts
   * 
   * @param prefix - Optional prefix for the username
   * @returns Unique username
   */
  generateUniqueUsername(prefix: string = 'test'): string {
    const timestamp = Date.now();
    return `${prefix}_${timestamp}_${faker.string.alphanumeric(5)}`.toLowerCase();
  }
}
