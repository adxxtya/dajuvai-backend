import { OrderService } from '../OrderService';
import { OrderRepository } from '../../../repositories/OrderRepository';
import { ProductRepository } from '../../../repositories/ProductRepository';
import { Order, OrderStatus, PaymentStatus, PaymentMethod } from '../../../entities/order.entity';
import { Product } from '../../../entities/product.entity';
import { Cart } from '../../../entities/cart.entity';
import { User } from '../../../entities/user.entity';
import { Address, Province } from '../../../entities/address.entity';
import { Variant } from '../../../entities/variant.entity';
import { OrderItem } from '../../../entities/orderItems.entity';
import { APIError } from '../../../utils/ApiError.utils';
import AppDataSource from '../../../config/db.config';
import { InventoryStatus } from '../../../entities/product.enum';

// Mock dependencies
jest.mock('../../../repositories/OrderRepository');
jest.mock('../../../repositories/ProductRepository');
jest.mock('../../../config/db.config', () => ({
  __esModule: true,
  default: {
    transaction: jest.fn(),
    getRepository: jest.fn(),
  },
}));
jest.mock('../../../service/promo.service');

describe('OrderService', () => {
  let orderService: OrderService;
  let mockOrderRepository: jest.Mocked<OrderRepository>;
  let mockProductRepository: jest.Mocked<ProductRepository>;
  let mockTransactionManager: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock transaction manager
    mockTransactionManager = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((entity, data) => data),
      delete: jest.fn(),
    };

    // Mock AppDataSource.transaction to execute callback with mock manager
    (AppDataSource.transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback(mockTransactionManager);
    });

    // Create mock repositories with all required methods
    mockOrderRepository = {
      findById: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      findAndCount: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    mockProductRepository = {
      findById: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      findAndCount: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    // Mock the repository constructors
    (OrderRepository as jest.MockedClass<typeof OrderRepository>).mockImplementation(() => mockOrderRepository);
    (ProductRepository as jest.MockedClass<typeof ProductRepository>).mockImplementation(() => mockProductRepository);

    // Mock AppDataSource.getRepository
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      return {
        findOne: jest.fn(),
        find: jest.fn(),
        save: jest.fn(),
        create: jest.fn((entity, data) => data),
      };
    });

    orderService = new OrderService();
  });

  describe('createOrder', () => {
    it('should create order successfully with cart items', async () => {
      const userId = 1;
      const orderData = {
        shippingAddress: {
          province: Province.BAGMATI,
          district: 'Kathmandu',
          city: 'Kathmandu',
          streetAddress: 'Test Street',
          landmark: 'Test Landmark',
        },
        paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
        isBuyNow: false,
        phoneNumber: '9841234567',
      };

      const mockUser = { id: userId, email: 'test@test.com' } as User;
      const mockProduct = {
        id: 1,
        name: 'Test Product',
        basePrice: 1000,
        stock: 10,
        vendorId: 1,
        vendor: {
          id: 1,
          district: { name: 'Kathmandu' },
        },
      } as any;

      const mockCart = {
        userId,
        items: [
          {
            product: mockProduct,
            variant: null,
            quantity: 2,
          },
        ],
      } as any;

      const mockAddress = {
        id: 1,
        userId,
        district: 'Kathmandu',
      } as Address;

      const mockOrder = {
        id: 1,
        orderedById: userId,
        totalPrice: 2100,
        status: OrderStatus.CONFIRMED,
        orderItems: [],
      } as Partial<Order>;

      // Setup mocks - need to match the exact sequence of calls
      mockTransactionManager.findOne
        .mockResolvedValueOnce(mockUser) // Find user
        .mockResolvedValueOnce(mockCart) // Find cart
        .mockResolvedValueOnce(mockProduct) // Validate stock - product
        .mockResolvedValueOnce(mockAddress) // Find address
        .mockResolvedValueOnce({ ...mockOrder, orderItems: [] }); // Find full order for stock update

      mockTransactionManager.find.mockResolvedValue([]); // No past promo usage
      mockTransactionManager.save
        .mockResolvedValueOnce(mockOrder) // Save order
        .mockResolvedValueOnce(mockProduct); // Save product after stock update
      mockTransactionManager.create.mockImplementation((entity, data) => data);
      mockTransactionManager.delete.mockResolvedValue({});

      // Execute
      const result = await orderService.createOrder(userId, orderData);

      // Verify
      expect(result.order).toBeDefined();
      expect(AppDataSource.transaction).toHaveBeenCalled();
      expect(mockTransactionManager.save).toHaveBeenCalled();
    });

    it('should throw error for insufficient stock', async () => {
      const userId = 1;
      const orderData = {
        shippingAddress: {
          province: Province.BAGMATI,
          district: 'Kathmandu',
          city: 'Kathmandu',
          streetAddress: 'Test Street',
          landmark: 'Test Landmark',
        },
        paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
        isBuyNow: false,
        phoneNumber: '9841234567',
      };

      const mockUser = { id: userId, email: 'test@test.com' } as User;
      const mockProduct = {
        id: 1,
        name: 'Test Product',
        basePrice: 1000,
        stock: 1, // Insufficient stock
        vendorId: 1,
      } as any;

      const mockCart = {
        userId,
        items: [
          {
            product: mockProduct,
            variant: null,
            quantity: 5, // Requesting more than available
          },
        ],
      } as any;

      // Setup mocks - match the sequence
      mockTransactionManager.findOne
        .mockResolvedValueOnce(mockUser) // Find user
        .mockResolvedValueOnce(mockCart) // Find cart
        .mockResolvedValueOnce(mockProduct); // Validate stock - insufficient

      mockTransactionManager.find.mockResolvedValue([]);

      // Execute & Verify
      await expect(orderService.createOrder(userId, orderData)).rejects.toThrow('Insufficient stock');
    });

    it('should throw error for empty cart', async () => {
      const userId = 1;
      const orderData = {
        shippingAddress: {
          province: Province.BAGMATI,
          district: 'Kathmandu',
          city: 'Kathmandu',
          streetAddress: 'Test Street',
          landmark: 'Test Landmark',
        },
        paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
        isBuyNow: false,
        phoneNumber: '9841234567',
      };

      const mockUser = { id: userId, email: 'test@test.com' } as User;
      const mockCart = {
        userId,
        items: [], // Empty cart
      } as any;

      // Setup mocks - match the sequence
      mockTransactionManager.findOne
        .mockResolvedValueOnce(mockUser) // Find user
        .mockResolvedValueOnce(mockCart); // Find empty cart

      // Execute & Verify
      await expect(orderService.createOrder(userId, orderData)).rejects.toThrow('Cart is empty');
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order and restore stock successfully', async () => {
      const orderId = 1;
      const userId = 1;

      const mockProduct = {
        id: 1,
        stock: 5,
        status: InventoryStatus.AVAILABLE,
      } as Product;

      const mockOrderItem = {
        id: 1,
        productId: 1,
        quantity: 2,
        variantId: null,
      } as OrderItem;

      const mockOrder = {
        id: orderId,
        orderedById: userId,
        status: OrderStatus.CONFIRMED,
        orderItems: [mockOrderItem],
      } as Partial<Order>;

      // Setup mocks
      mockTransactionManager.findOne
        .mockResolvedValueOnce(mockOrder) // Find order
        .mockResolvedValueOnce(mockProduct); // Find product for stock restore

      mockTransactionManager.save.mockResolvedValue({ ...mockOrder, status: OrderStatus.CANCELLED });

      // Execute
      const result = await orderService.cancelOrder(orderId, userId);

      // Verify
      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(mockTransactionManager.save).toHaveBeenCalledWith(Order, expect.objectContaining({
        status: OrderStatus.CANCELLED,
      }));
      expect(mockTransactionManager.save).toHaveBeenCalledWith(Product, expect.objectContaining({
        stock: 7, // 5 + 2 restored
      }));
    });

    it('should throw error when cancelling already delivered order', async () => {
      const orderId = 1;
      const userId = 1;

      const mockOrder = {
        id: orderId,
        orderedById: userId,
        status: OrderStatus.DELIVERED, // Already delivered
        orderItems: [],
      } as Partial<Order>;

      // Setup mocks - match the sequence
      mockTransactionManager.findOne.mockResolvedValueOnce(mockOrder);

      // Execute & Verify
      await expect(orderService.cancelOrder(orderId, userId)).rejects.toThrow('Cannot cancel order');
    });

    it('should throw error when order not found', async () => {
      const orderId = 999;
      const userId = 1;

      // Setup mocks
      mockTransactionManager.findOne.mockResolvedValueOnce(null); // Order not found

      // Execute & Verify
      await expect(orderService.cancelOrder(orderId, userId)).rejects.toThrow(APIError);
      await expect(orderService.cancelOrder(orderId, userId)).rejects.toThrow('Order not found');
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status successfully', async () => {
      const orderId = 1;
      const newStatus = OrderStatus.SHIPPED;

      const mockOrder = {
        id: orderId,
        status: OrderStatus.CONFIRMED,
      } as Order;

      // Setup mocks - need to reset and configure properly
      mockOrderRepository.findById = jest.fn().mockResolvedValue(mockOrder);
      mockOrderRepository.save = jest.fn().mockResolvedValue({ ...mockOrder, status: newStatus });

      // Execute
      const result = await orderService.updateOrderStatus(orderId, newStatus);

      // Verify
      expect(result.status).toBe(newStatus);
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(mockOrderRepository.save).toHaveBeenCalled();
    });

    it('should throw error when order not found', async () => {
      const orderId = 999;
      const newStatus = OrderStatus.SHIPPED;

      // Setup mocks
      mockOrderRepository.findById = jest.fn().mockResolvedValue(null);

      // Execute & Verify
      await expect(orderService.updateOrderStatus(orderId, newStatus)).rejects.toThrow(APIError);
      await expect(orderService.updateOrderStatus(orderId, newStatus)).rejects.toThrow('Order not found');
    });
  });

  describe('getOrderById', () => {
    it('should return order with full relations', async () => {
      const orderId = 1;

      const mockOrder = {
        id: orderId,
        totalPrice: 2000,
        orderedBy: { id: 1, email: 'test@test.com' },
        orderItems: [],
      } as Partial<Order>;

      // Setup mocks - need to reset and configure properly
      mockOrderRepository.findOne = jest.fn().mockResolvedValue(mockOrder);

      // Execute
      const result = await orderService.getOrderById(orderId);

      // Verify
      expect(result).toEqual(mockOrder);
      expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: orderId },
        relations: expect.arrayContaining([
          'orderedBy',
          'shippingAddress',
          'orderItems',
        ]),
      });
    });

    it('should throw error when order not found', async () => {
      const orderId = 999;

      // Setup mocks
      mockOrderRepository.findOne = jest.fn().mockResolvedValue(null);

      // Execute & Verify
      await expect(orderService.getOrderById(orderId)).rejects.toThrow(APIError);
      await expect(orderService.getOrderById(orderId)).rejects.toThrow('Order not found');
    });
  });

  describe('getUserOrders', () => {
    it('should return paginated user orders', async () => {
      const userId = 1;
      const page = 1;
      const limit = 20;

      const mockOrders = [
        { id: 1, orderedById: userId, totalPrice: 1000 },
        { id: 2, orderedById: userId, totalPrice: 2000 },
      ] as Order[];

      // Setup mocks - need to reset and configure properly
      mockOrderRepository.findAndCount = jest.fn().mockResolvedValue([mockOrders, 2]);

      // Execute
      const result = await orderService.getUserOrders(userId, page, limit);

      // Verify
      expect(result.orders).toEqual(mockOrders);
      expect(result.total).toBe(2);
      expect(mockOrderRepository.findAndCount).toHaveBeenCalledWith({
        where: { orderedById: userId },
        relations: expect.any(Array),
        order: { createdAt: 'DESC' },
        skip: 0,
        take: limit,
      });
    });
  });
});
