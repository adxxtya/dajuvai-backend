import express, { Request, Response } from "express";
import { config } from "dotenv";

// Load environment variables FIRST before any other imports
config();
console.log("✓ Environment variables loaded");

// Validate environment variables at startup - will exit if validation fails
import { validateEnv } from "./config/env.validation";
validateEnv();
console.log("✓ Environment validation complete");

// Initialize Sentry for error tracking (must be done early)
import { initializeSentry, addSentryMiddleware, addSentryErrorHandler } from "./config/sentry.config";
initializeSentry();
console.log("✓ Sentry initialized");

import passport from "passport";
import cookieParser from "cookie-parser";
import compression from "compression";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.config"; // Your Swagger API specification JSON
import AppDataSource from "./config/db.config";
console.log("✓ AppDataSource imported");
import "./config/passport.config"; // Passport strategies initialization
console.log("✓ Passport config loaded");
import { join } from "path";
import { mkdirSync } from "fs";
import cors, { CorsOptions } from "cors";
console.log("✓ Core dependencies imported");

// Route imports - Legacy routes
console.log("→ Starting route imports...");
import userRouter from "./routes/user.routes";
console.log("  ✓ user.routes");
import categoryRoutes from "./routes/category.routes";
console.log("  ✓ category.routes");
import cartRouter from "./routes/cart.routes";
console.log("  ✓ cart.routes");
import vendorRoutes from "./routes/vendor.routes";
console.log("  ✓ vendor.routes");
import wishlistRoutes from './routes/wishlist.routes';
console.log("  ✓ wishlist.routes");
import contactRoutes from "./routes/contact.routes";
console.log("  ✓ contact.routes");
import dealRoutes from "./routes/deal.routes";
console.log("  ✓ deal.routes");
import reviewRoutes from "./routes/review.routes";
console.log("  ✓ review.routes");
import bannerRoutes from "./routes/banner.routes";
console.log("  ✓ banner.routes");
import orderRoutes from "./routes/order.routes";
console.log("  ✓ order.routes");
import districtRoutes from "./routes/district.routes";
console.log("  ✓ district.routes");
import homepageRoutes from "./routes/homepage.routes";
console.log("  ✓ homepage.routes");
import productRouter from "./routes/product.routes";
console.log("  ✓ product.routes");
import adminDashboardRouter from "./routes/admin.dashboard.routes";
console.log("  ✓ admin.dashboard.routes");
import vendorDashBoardRouter from "./routes/vendor.dashboard.routes";
console.log("  ✓ vendor.dashboard.routes");
import paymentRouter from "./routes/payment.routes";
console.log("  ✓ payment.routes");
import promoRouter from "./routes/promo.routes";
console.log("  ✓ promo.routes");
import imageRouter from "./routes/image.routes";
console.log("  ✓ image.routes");
import homecategoryRoutes from "./routes/home.category.routes";
console.log("  ✓ home.category.routes");
import notificationRoutes from "./routes/notification.routes";
console.log("  ✓ notification.routes");
console.log("✓ All legacy routes imported");

// V1 API routes
console.log("→ Importing V1 routes...");
// TEMPORARILY COMMENTED OUT TO DEBUG
// import { createV1Router } from "./routes/v1/index";
console.log("✓ V1 routes import SKIPPED for debugging");

// Utils for scheduled background tasks
console.log("→ Importing cronjob utils...");
import { orderCleanUp, removeUnverifiedVendors, startOrderCleanupJob, tokenCleanUp } from "./utils/cronjob.utils";
console.log("✓ Cronjob utils imported");
import { errorHandler, notFoundHandler } from "./middlewares/error/errorHandler.middleware";

// Create uploads folder if it doesn't exist to store uploaded files
const uploadDir = join(__dirname, 'uploads');
mkdirSync(uploadDir, { recursive: true }); // recursive:true ensures parent dirs are created if needed

// Import security middleware
import { initializeSecurityHeaders } from "./middlewares/security/securityHeaders.middleware";
import { initializeRequestLogging } from "./middlewares/logging/requestLogger.middleware";
import { sanitizeInput } from "./middlewares/security/sanitize.middleware";
import { apiRateLimiterMiddleware, initializeRateLimiters } from "./middlewares/auth/rateLimiter.middleware";
import { requireAdmin } from "./middlewares/auth/authorize.middleware";
import { authenticateUser } from "./middlewares/auth/authenticate.middleware";
import logger from "./config/logger.config";

// Initialize Express app
const app = express();

// Add Sentry request handlers (must be first middleware)
addSentryMiddleware(app);

// Apply security headers (Helmet and custom headers)
const securityHeaders = initializeSecurityHeaders();
securityHeaders.forEach(middleware => app.use(middleware));

// CORS configuration - Allow all origins
app.use(cors({
    origin: true, // Accept requests from any origin
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    maxAge: 86400 // 24 hours
}));

// Compression middleware
app.use(compression());

// Apply request logging middleware
app.use(initializeRequestLogging());

// Middleware to parse JSON request bodies
app.use(express.json());

// Middleware to parse URL-encoded request bodies (form submissions)
app.use(express.urlencoded({ extended: true }));

// Input sanitization middleware
app.use(sanitizeInput);

// Middleware to parse cookies
app.use(cookieParser());

// Initialize Passport for authentication middleware
app.use(passport.initialize());

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: "Server is healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
    });
});

// Metrics endpoint (protected by admin auth)
app.get("/metrics", authenticateUser(AppDataSource), requireAdmin(), (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        data: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            timestamp: new Date().toISOString(),
        },
    });
});

// Setup Swagger UI for API documentation at /docs route
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount V1 API routes with rate limiting
// TEMPORARILY COMMENTED OUT TO DEBUG
// app.use("/api/v1", apiRateLimiterMiddleware, createV1Router(AppDataSource));
console.log("✓ V1 routes mounting SKIPPED for debugging");

// Legacy routes (maintain backward compatibility)

app.use("/api/auth", userRouter);
app.use("/api/categories", categoryRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/cart", cartRouter);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/deal", dealRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/district", districtRoutes);
app.use("/api/homepage", homepageRoutes);
app.use("/api/product", productRouter);
app.use("/api/admin/dashboard", adminDashboardRouter);
app.use("/api/vendor/dashboard", vendorDashBoardRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/promo", promoRouter);
app.use("/api/image", imageRouter);
app.use("/api/home/category/section", homecategoryRoutes);
app.use("/api/notification", notificationRoutes);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Add Sentry error handler (must be after routes but before other error handlers)
addSentryErrorHandler(app);

// Centralized error handler (must be last)
app.use(errorHandler);


const port = process.env.PORT || 4000;

// Initialize database connection
AppDataSource.initialize()
    .then(() => {
        logger.info("✅ Database connected successfully");

        // Initialize rate limiters after database connection
        initializeRateLimiters();

        // Start background cron jobs for token and order cleanup
        tokenCleanUp();
        orderCleanUp();
        startOrderCleanupJob();
        removeUnverifiedVendors();

        // Start Express server
        app.listen(port, () => {
            logger.info(`🚀 Server running at http://localhost:${port}`);
            logger.info(`📚 API Documentation available at http://localhost:${port}/docs`);
            logger.info(`🏥 Health check available at http://localhost:${port}/health`);
            logger.info(`📊 Metrics available at http://localhost:${port}/metrics (admin only)`);
            logger.info(`🔗 V1 API available at http://localhost:${port}/api/v1`);
        });
    })
    .catch((error) => {
        // Log any errors during DB connection setup
        logger.error("❌ Error during Data Source initialization", error);
        process.exit(1);
    });