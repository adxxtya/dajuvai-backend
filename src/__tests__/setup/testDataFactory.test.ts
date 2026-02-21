import { TestDataFactory } from './testDataFactory';
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
  BannerStatus 
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

describe('TestDataFactory', () => {
  let factory: TestDataFactory;

  beforeEach(() => {
    factory = new TestDataFactory();
  });

  describe('createUser', () => {
    it('should generate valid user data', () => {
      const user = factory.createUser();

      expect(user).toBeDefined();
      expect(user.fullName).toBeTruthy();
      expect(user.username).toBeTruthy();
      expect(user.email).toContain('@');
      expect(user.phoneNumber).toMatch(/^98\d{8}$/);
      expect(user.role).toBe(UserRole.USER);
      expect(user.provider).toBe(AuthProvider.LOCAL);
      expect(user.isVerified).toBe(true);
      expect(user.password).toBe('Test@1234');
    });

    it('should accept overrides', () => {
      const overrides = {
        fullName: 'John Doe',
        email: 'john@test.com',
        role: UserRole.ADMIN,
      };

      const user = factory.createUser(overrides);

      expect(user.fullName).toBe('John Doe');
      expect(user.email).toBe('john@test.com');
      expect(user.role).toBe(UserRole.ADMIN);
      expect(user.username).toBeTruthy(); // Other fields still generated
    });
  });

  describe('createAdmin', () => {
    it('should generate admin user data', () => {
      const admin = factory.createAdmin();

      expect(admin.role).toBe(UserRole.ADMIN);
      expect(admin.email).toContain('@');
      expect(admin.username).toBeTruthy();
    });

    it('should accept overrides', () => {
      const admin = factory.createAdmin({ email: 'admin@test.com' });

      expect(admin.role).toBe(UserRole.ADMIN);
      expect(admin.email).toBe('admin@test.com');
    });
  });

  describe('createStaff', () => {
    it('should generate staff user data', () => {
      const staff = factory.createStaff();

      expect(staff.role).toBe(UserRole.STAFF);
      expect(staff.email).toContain('@');
      expect(staff.username).toBeTruthy();
    });
  });

  describe('createVendor', () => {
    it('should generate valid vendor data', () => {
      const vendor = factory.createVendor();

      expect(vendor).toBeDefined();
      expect(vendor.businessName).toBeTruthy();
      expect(vendor.email).toContain('@');
      expect(vendor.password).toBe('Test@1234');
      expect(vendor.phoneNumber).toMatch(/^98\d{8}$/);
      expect(vendor.districtId).toBeGreaterThan(0);
      expect(vendor.districtId).toBeLessThanOrEqual(77);
      expect(vendor.isVerified).toBe(true);
      expect(vendor.isApproved).toBe(true);
      expect(vendor.bankName).toBeTruthy();
      expect(vendor.accountNumber).toBeTruthy();
    });

    it('should accept overrides', () => {
      const overrides = {
        businessName: 'Test Business',
        email: 'business@test.com',
        isApproved: false,
      };

      const vendor = factory.createVendor(overrides);

      expect(vendor.businessName).toBe('Test Business');
      expect(vendor.email).toBe('business@test.com');
      expect(vendor.isApproved).toBe(false);
    });
  });

  describe('createProduct', () => {
    it('should generate valid product data', () => {
      const product = factory.createProduct();

      expect(product).toBeDefined();
      expect(product.name).toBeTruthy();
      expect(product.description).toBeTruthy();
      expect(product.basePrice).toBeGreaterThan(0);
      expect(product.finalPrice).toBeLessThanOrEqual(product.basePrice!);
      expect(product.discount).toBeGreaterThanOrEqual(0);
      expect(product.discountType).toBe(DiscountType.PERCENTAGE);
      expect(product.status).toBe(InventoryStatus.AVAILABLE);
      expect(product.stock).toBeGreaterThanOrEqual(0);
      expect(product.hasVariants).toBe(false);
      expect(product.productImages).toHaveLength(2);
    });

    it('should accept overrides', () => {
      const overrides = {
        name: 'Test Product',
        basePrice: 1000,
        vendorId: 5,
        subcategoryId: 3,
      };

      const product = factory.createProduct(overrides);

      expect(product.name).toBe('Test Product');
      expect(product.basePrice).toBe(1000);
      expect(product.vendorId).toBe(5);
      expect(product.subcategoryId).toBe(3);
    });
  });

  describe('createProductWithVariants', () => {
    it('should generate product configured for variants', () => {
      const product = factory.createProductWithVariants();

      expect(product.hasVariants).toBe(true);
      expect(product.basePrice).toBeUndefined();
      expect(product.finalPrice).toBeUndefined();
      expect(product.stock).toBeUndefined();
    });
  });

  describe('createVariant', () => {
    it('should generate valid variant data', () => {
      const variant = factory.createVariant();

      expect(variant).toBeDefined();
      expect(variant.sku).toBeTruthy();
      expect(variant.basePrice).toBeGreaterThan(0);
      expect(variant.finalPrice).toBeLessThanOrEqual(variant.basePrice);
      expect(variant.attributes).toBeDefined();
      expect(variant.attributes.size).toBeTruthy();
      expect(variant.attributes.color).toBeTruthy();
      expect(variant.variantImages).toHaveLength(1);
      expect(variant.stock).toBeGreaterThanOrEqual(0);
      expect(variant.status).toBe(InventoryStatus.AVAILABLE);
    });

    it('should accept overrides', () => {
      const overrides = {
        sku: 'TEST-SKU-001',
        basePrice: 500,
        productId: '123',
      };

      const variant = factory.createVariant(overrides);

      expect(variant.sku).toBe('TEST-SKU-001');
      expect(variant.basePrice).toBe(500);
      expect(variant.productId).toBe('123');
    });
  });

  describe('createCategory', () => {
    it('should generate valid category data', () => {
      const category = factory.createCategory();

      expect(category).toBeDefined();
      expect(category.name).toBeTruthy();
      expect(category.image).toBeTruthy();
    });

    it('should accept overrides', () => {
      const category = factory.createCategory({ name: 'Electronics' });

      expect(category.name).toBe('Electronics');
    });
  });

  describe('createSubcategory', () => {
    it('should generate valid subcategory data', () => {
      const subcategory = factory.createSubcategory();

      expect(subcategory).toBeDefined();
      expect(subcategory.name).toBeTruthy();
      expect(subcategory.image).toBeTruthy();
    });

    it('should accept overrides', () => {
      const subcategory = factory.createSubcategory({ 
        name: 'Smartphones',
        categoryId: 5,
      });

      expect(subcategory.name).toBe('Smartphones');
      expect(subcategory.categoryId).toBe(5);
    });
  });

  describe('createOrder', () => {
    it('should generate valid order data', () => {
      const order = factory.createOrder();

      expect(order).toBeDefined();
      expect(order.totalPrice).toBeGreaterThan(0);
      expect(order.shippingFee).toBeGreaterThan(0);
      expect(order.serviceCharge).toBeGreaterThan(0);
      expect(order.paymentStatus).toBe(PaymentStatus.UNPAID);
      expect([
        PaymentMethod.CASH_ON_DELIVERY,
        PaymentMethod.ESEWA,
        PaymentMethod.KHALIT,
      ]).toContain(order.paymentMethod);
      expect(order.status).toBe(OrderStatus.CONFIRMED);
      expect(order.phoneNumber).toMatch(/^98\d{8}$/);
    });

    it('should accept overrides', () => {
      const overrides = {
        orderedById: 10,
        totalPrice: 5000,
        paymentStatus: PaymentStatus.PAID,
      };

      const order = factory.createOrder(overrides);

      expect(order.orderedById).toBe(10);
      expect(order.totalPrice).toBe(5000);
      expect(order.paymentStatus).toBe(PaymentStatus.PAID);
    });
  });

  describe('createCart', () => {
    it('should generate valid cart data', () => {
      const cart = factory.createCart();

      expect(cart).toBeDefined();
      expect(cart.userId).toBe(1);
      expect(cart.total).toBe(0);
    });

    it('should accept overrides', () => {
      const cart = factory.createCart({ userId: 5, total: 1000 });

      expect(cart.userId).toBe(5);
      expect(cart.total).toBe(1000);
    });
  });

  describe('createCartItem', () => {
    it('should generate valid cart item data', () => {
      const cartItem = factory.createCartItem();

      expect(cartItem).toBeDefined();
      expect(cartItem.quantity).toBeGreaterThan(0);
      expect(cartItem.price).toBeGreaterThan(0);
      expect(cartItem.cartId).toBe(1);
      expect(cartItem.productId).toBe(1);
    });

    it('should accept overrides', () => {
      const cartItem = factory.createCartItem({
        cartId: 5,
        productId: 10,
        quantity: 3,
      });

      expect(cartItem.cartId).toBe(5);
      expect(cartItem.productId).toBe(10);
      expect(cartItem.quantity).toBe(3);
    });
  });

  describe('createWishlist', () => {
    it('should generate valid wishlist data', () => {
      const wishlist = factory.createWishlist();

      expect(wishlist).toBeDefined();
      expect(wishlist.userId).toBe(1);
    });

    it('should accept overrides', () => {
      const wishlist = factory.createWishlist({ userId: 5 });

      expect(wishlist.userId).toBe(5);
    });
  });

  describe('createWishlistItem', () => {
    it('should generate valid wishlist item data', () => {
      const wishlistItem = factory.createWishlistItem();

      expect(wishlistItem).toBeDefined();
      expect(wishlistItem.wishlistId).toBe(1);
      expect(wishlistItem.productId).toBe(1);
    });

    it('should accept overrides', () => {
      const wishlistItem = factory.createWishlistItem({
        wishlistId: 5,
        productId: 10,
      });

      expect(wishlistItem.wishlistId).toBe(5);
      expect(wishlistItem.productId).toBe(10);
    });
  });

  describe('createBanner', () => {
    it('should generate valid banner data', () => {
      const banner = factory.createBanner();

      expect(banner).toBeDefined();
      expect(banner.name).toBeTruthy();
      expect(banner.desktopImage).toBeTruthy();
      expect(banner.mobileImage).toBeTruthy();
      expect([
        BannerType.HERO,
        BannerType.SIDEBAR,
        BannerType.PRODUCT,
        BannerType.SPECIAL_DEALS,
      ]).toContain(banner.type);
      expect(banner.status).toBe(BannerStatus.SCHEDULED);
      expect(banner.startDate).toBeInstanceOf(Date);
      expect(banner.endDate).toBeInstanceOf(Date);
      expect(banner.endDate.getTime()).toBeGreaterThan(banner.startDate.getTime());
    });

    it('should accept overrides', () => {
      const startDate = new Date('2024-01-01');
      const banner = factory.createBanner({
        name: 'Test Banner',
        type: BannerType.HERO,
        startDate,
      });

      expect(banner.name).toBe('Test Banner');
      expect(banner.type).toBe(BannerType.HERO);
      expect(banner.startDate).toBe(startDate);
    });
  });

  describe('createDeal', () => {
    it('should generate valid deal data', () => {
      const deal = factory.createDeal();

      expect(deal).toBeDefined();
      expect(deal.name).toBeTruthy();
      expect(deal.discountPercentage).toBeGreaterThan(0);
      expect(deal.discountPercentage).toBeLessThanOrEqual(70);
      expect(deal.status).toBe(DealStatus.ENABLED);
      expect(deal.createdById).toBe(1);
    });

    it('should accept overrides', () => {
      const deal = factory.createDeal({
        name: 'Flash Sale',
        discountPercentage: 50,
        status: DealStatus.DISABLED,
      });

      expect(deal.name).toBe('Flash Sale');
      expect(deal.discountPercentage).toBe(50);
      expect(deal.status).toBe(DealStatus.DISABLED);
    });
  });

  describe('createPromo', () => {
    it('should generate valid promo data', () => {
      const promo = factory.createPromo();

      expect(promo).toBeDefined();
      expect(promo.promoCode).toBeTruthy();
      expect(promo.promoCode.length).toBe(8);
      expect(promo.discountPercentage).toBeGreaterThanOrEqual(5);
      expect(promo.discountPercentage).toBeLessThanOrEqual(50);
      expect([PromoType.LINE_TOTAL, PromoType.SHIPPING]).toContain(promo.applyOn);
      expect(promo.isValid).toBe(true);
    });

    it('should accept overrides', () => {
      const promo = factory.createPromo({
        promoCode: 'SAVE20',
        discountPercentage: 20,
        isValid: false,
      });

      expect(promo.promoCode).toBe('SAVE20');
      expect(promo.discountPercentage).toBe(20);
      expect(promo.isValid).toBe(false);
    });
  });

  describe('createDistrict', () => {
    it('should generate valid district data', () => {
      const district = factory.createDistrict();

      expect(district).toBeDefined();
      expect(district.name).toBeTruthy();
      expect(district.name).toContain('District');
    });

    it('should accept overrides', () => {
      const district = factory.createDistrict({ name: 'Kathmandu' });

      expect(district.name).toBe('Kathmandu');
    });
  });

  describe('createAddress', () => {
    it('should generate valid address data', () => {
      const address = factory.createAddress();

      expect(address).toBeDefined();
      expect([
        Province.PROVINCE_1,
        Province.MADHESH,
        Province.BAGMATI,
        Province.GANDAKI,
        Province.LUMBINI,
        Province.KARNALI,
        Province.SUDURPASHCHIM,
      ]).toContain(address.province);
      expect(address.district).toBeTruthy();
      expect(address.city).toBeTruthy();
      expect(address.localAddress).toBeTruthy();
      expect(address.userId).toBe(1);
    });

    it('should accept overrides', () => {
      const address = factory.createAddress({
        province: Province.BAGMATI,
        city: 'Kathmandu',
        userId: 5,
      });

      expect(address.province).toBe(Province.BAGMATI);
      expect(address.city).toBe('Kathmandu');
      expect(address.userId).toBe(5);
    });
  });

  describe('createBrand', () => {
    it('should generate valid brand data', () => {
      const brand = factory.createBrand();

      expect(brand).toBeDefined();
      expect(brand.name).toBeTruthy();
    });

    it('should accept overrides', () => {
      const brand = factory.createBrand({ name: 'Nike' });

      expect(brand.name).toBe('Nike');
    });
  });

  describe('generateUniqueEmail', () => {
    it('should generate unique emails', () => {
      const email1 = factory.generateUniqueEmail();
      const email2 = factory.generateUniqueEmail();

      expect(email1).toContain('@test.com');
      expect(email2).toContain('@test.com');
      expect(email1).not.toBe(email2);
    });

    it('should accept custom prefix', () => {
      const email = factory.generateUniqueEmail('admin');

      expect(email).toContain('admin_');
      expect(email).toContain('@test.com');
    });
  });

  describe('generateUniqueUsername', () => {
    it('should generate unique usernames', () => {
      const username1 = factory.generateUniqueUsername();
      const username2 = factory.generateUniqueUsername();

      expect(username1).toBeTruthy();
      expect(username2).toBeTruthy();
      expect(username1).not.toBe(username2);
    });

    it('should accept custom prefix', () => {
      const username = factory.generateUniqueUsername('vendor');

      expect(username).toContain('vendor_');
    });
  });
});
