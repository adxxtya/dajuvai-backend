import { Request, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { Router } from 'express';
import { Order, OrderStatus, PaymentStatus } from '../entities/order.entity';
import AppDataSource from '../config/db.config';
import { APIError } from '../utils/ApiError.utils';
import { CartService } from '../service/cart.service';
import { asyncHandler } from '../utils/asyncHandler.utils';
import logger, { logError, logInfo } from '../config/logger.config';


const paymentRouter = Router();
const orderDb = AppDataSource.getRepository(Order);


// NPX (Nepal Payment Gateway) Configuration from environment variables
const CONFIG = {
    MERCHANT_ID: process.env.NPX_MERCHANT_ID || '545',
    MERCHANT_NAME: process.env.NPX_MERCHANT_NAME || 'dajuvaiapi',
    API_USERNAME: process.env.NPX_API_USERNAME || 'dajuvaiapi',
    API_PASSWORD: process.env.NPX_API_PASSWORD || '',
    SECRET_KEY: process.env.NPX_SECRET_KEY || '',
    BASE_URL: process.env.NPX_BASE_URL || 'https://apigateway.nepalpayment.com',
    GATEWAY_URL: process.env.NPX_GATEWAY_URL || 'https://gateway.nepalpayment.com/',
};


// Generate HMAC SHA512 Signature
function generateSignature(data: Record<string, string>, secretKey: string): string {
    const sortedKeys = Object.keys(data).sort();
    const concatenatedValues = sortedKeys.map(key => data[key]).join('');
    const hmac = crypto.createHmac('sha512', secretKey);
    hmac.update(concatenatedValues, 'utf8');
    return hmac.digest('hex');
}

// Generate Basic Auth Header
function getAuthHeader(): string {
    const credentials = Buffer.from(`${CONFIG.API_USERNAME}:${CONFIG.API_PASSWORD}`).toString('base64');
    return `Basic ${credentials}`;
}

/**
 * @swagger
 * /api/payments/payment-instruments:
 *   get:
 *     summary: Get available payment instruments
 *     description: Retrieves list of available payment methods from Nepal Payment Gateway
 *     tags:
 *       - Payments
 *     responses:
 *       200:
 *         description: Payment instruments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "0"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       instrumentCode:
 *                         type: string
 *                         example: "WALLET"
 *                       instrumentName:
 *                         type: string
 *                         example: "E-Wallet"
 *       500:
 *         description: Failed to get payment instruments
 */
// 1. Get Payment Instruments
paymentRouter.get('/payment-instruments', asyncHandler(async (_req: Request, res: Response) => {
    try {
        const requestData: Record<string, string> = {
            MerchantId: CONFIG.MERCHANT_ID,
            MerchantName: CONFIG.MERCHANT_NAME,
        };

        requestData.Signature = generateSignature(requestData, CONFIG.SECRET_KEY);

        const response = await axios.post(`${CONFIG.BASE_URL}/GetPaymentInstrumentDetails`, requestData, {
            headers: {
                Authorization: getAuthHeader(),
                'Content-Type': 'application/json'
            },
        });

        res.json(response.data);
    } catch (error: any) {
        logError('Error getting payment instruments', error);
        throw new APIError(500, 'Failed to get payment instruments');
    }
}));

/**
 * @swagger
 * /api/payments/service-charge:
 *   post:
 *     summary: Calculate service charge for payment
 *     description: Gets the service charge amount for a specific payment instrument
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - instrumentCode
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 1000
 *               instrumentCode:
 *                 type: string
 *                 example: "WALLET"
 *     responses:
 *       200:
 *         description: Service charge calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "0"
 *                 data:
 *                   type: object
 *                   properties:
 *                     serviceCharge:
 *                       type: number
 *                       example: 20
 *       500:
 *         description: Failed to calculate service charge
 */
// 2. Get Service Charge
paymentRouter.post('/service-charge', asyncHandler(async (req: Request, res: Response) => {
    try {
        const { amount, instrumentCode } = req.body;

        const requestData: Record<string, string> = {
            MerchantId: CONFIG.MERCHANT_ID,
            MerchantName: CONFIG.MERCHANT_NAME,
            Amount: amount.toString(),
            InstrumentCode: instrumentCode,
        };

        requestData.Signature = generateSignature(requestData, CONFIG.SECRET_KEY);

        const response = await axios.post(`${CONFIG.BASE_URL}/GetServiceCharge`, requestData, {
            headers: {
                Authorization: getAuthHeader(),
                'Content-Type': 'application/json',
            },
        });

        res.json(response.data);
    } catch (error: any) {
        logError('Error getting service charge', error);
        throw new APIError(500, 'Failed to get service charge');
    }
}));

/**
 * @swagger
 * /api/payments/process-id:
 *   post:
 *     summary: Get process ID for payment
 *     description: Generates a process ID required for payment initiation
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - merchantTxnId
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 1000
 *               merchantTxnId:
 *                 type: string
 *                 example: "TXN_1234567890"
 *     responses:
 *       200:
 *         description: Process ID generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "0"
 *                 data:
 *                   type: object
 *                   properties:
 *                     ProcessId:
 *                       type: string
 *                       example: "PROC_ABC123"
 *       500:
 *         description: Failed to get process ID
 */
// 3. Get Process ID
paymentRouter.post('/process-id', asyncHandler(async (req: Request, res: Response) => {
    try {
        const { amount, merchantTxnId } = req.body;

        const requestData: Record<string, string> = {
            MerchantId: CONFIG.MERCHANT_ID,
            MerchantName: CONFIG.MERCHANT_NAME,
            Amount: amount.toString(),
            MerchantTxnId: merchantTxnId,
        };

        requestData.Signature = generateSignature(requestData, CONFIG.SECRET_KEY);

        const response = await axios.post(`${CONFIG.BASE_URL}/GetProcessId`, requestData, {
            headers: {
                Authorization: getAuthHeader(),
                'Content-Type': 'application/json',
            },
        });

        res.json(response.data);
    } catch (error: any) {
        logError('Error getting process ID', error);
        throw new APIError(500, 'Failed to get process ID');
    }
}));

/**
 * @swagger
 * /api/payments/initiate-payment:
 *   post:
 *     summary: Initiate payment transaction
 *     description: Initiates a payment transaction and returns payment gateway URL with form data
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - orderId
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 1000
 *               instrumentCode:
 *                 type: string
 *                 example: "WALLET"
 *               transactionRemarks:
 *                 type: string
 *                 example: "Payment for Order #123"
 *               orderId:
 *                 type: integer
 *                 example: 123
 *     responses:
 *       200:
 *         description: Payment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 paymentUrl:
 *                   type: string
 *                   example: "https://gateway.nepalpayment.com/Payment/Index"
 *                 formData:
 *                   type: object
 *                   properties:
 *                     MerchantId:
 *                       type: string
 *                     Amount:
 *                       type: string
 *                     MerchantTxnId:
 *                       type: string
 *                     ProcessId:
 *                       type: string
 *                     Signature:
 *                       type: string
 *                 merchantTxnId:
 *                   type: string
 *                   example: "TXN_1234567890_abc123"
 *       400:
 *         description: Failed to get process ID
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
// 4. Initiate Payment (Complete Flow)
paymentRouter.post('/initiate-payment', asyncHandler(async (req: Request, res: Response) => {
    const { amount, instrumentCode, transactionRemarks, orderId } = req.body;
    logInfo('Initiating payment', { orderId, amount });

    const merchantTxnId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    logInfo('Generated merchantTxnId', { merchantTxnId });

    const processData: Record<string, string> = {
        MerchantId: CONFIG.MERCHANT_ID,
        MerchantName: CONFIG.MERCHANT_NAME,
        Amount: amount.toString(),
        MerchantTxnId: merchantTxnId,
    };

    processData.Signature = generateSignature(processData, CONFIG.SECRET_KEY);
    logInfo('ProcessData prepared', { merchantTxnId });

    const processResponse = await axios.post(`${CONFIG.BASE_URL}/GetProcessId`, processData, {
        headers: {
            Authorization: getAuthHeader(),
            'Content-Type': 'application/json',
        },
    });

    logInfo('Process response from NPX', { code: processResponse.data.code });

    if (processResponse.data.code !== '0') {
        logError('Failed to get process ID from NPX', processResponse.data);
        throw new APIError(400, 'Failed to get process ID');
    }

    const processId = processResponse.data.data.ProcessId;
    logInfo('Received processId', { processId });

    const paymentData: Record<string, string> = {
        MerchantId: CONFIG.MERCHANT_ID,
        MerchantName: CONFIG.MERCHANT_NAME,
        Amount: amount.toString(),
        MerchantTxnId: merchantTxnId,
        ProcessId: processId,
        InstrumentCode: instrumentCode || '',
        TransactionRemarks: transactionRemarks || 'Payment via API',
        ResponseUrl: `https://dajuvai.com/order/payment-response`,
    };

    paymentData.Signature = generateSignature(paymentData, CONFIG.SECRET_KEY);
    logInfo('PaymentData prepared for frontend', { merchantTxnId });

    const order = await orderDb.findOne({ where: { id: orderId } });
    if (!order) {
        throw new APIError(404, "Order not found");
    }

    // Update order with merchant transaction info
    order.mTransactionId = merchantTxnId;
    order.instrumentName = instrumentCode;

    await orderDb.save(order);
    logInfo('Order updated with merchantTxnId', { orderId: order.id, merchantTxnId });

    res.json({
        success: true,
        paymentUrl: `${CONFIG.GATEWAY_URL}/Payment/Index`,
        formData: paymentData,
        merchantTxnId,
    });
}));


/**
 * @swagger
 * /api/payments/check-status:
 *   post:
 *     summary: Check transaction status
 *     description: Checks the current status of a payment transaction
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - merchantTxnId
 *             properties:
 *               merchantTxnId:
 *                 type: string
 *                 example: "TXN_1234567890_abc123"
 *     responses:
 *       200:
 *         description: Transaction status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "0"
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "SUCCESS"
 *                     gatewayTxnId:
 *                       type: string
 *                       example: "GTW_123456"
 *       500:
 *         description: Failed to check transaction status
 */
// 5. Check Transaction Status
paymentRouter.post('/check-status', asyncHandler(async (req: Request, res: Response) => {
    try {
        const { merchantTxnId } = req.body;

        const requestData: Record<string, string> = {
            MerchantId: CONFIG.MERCHANT_ID,
            MerchantName: CONFIG.MERCHANT_NAME,
            MerchantTxnId: merchantTxnId,
        };

        requestData.Signature = generateSignature(requestData, CONFIG.SECRET_KEY);

        const response = await axios.post(`${CONFIG.BASE_URL}/CheckTransactionStatus`, requestData, {
            headers: {
                Authorization: getAuthHeader(),
                'Content-Type': 'application/json',
            },
        });

        res.json(response.data);
    } catch (error: any) {
        logError('Error checking transaction status', error);
        throw new APIError(500, 'Failed to check transaction status');
    }
}));


/**
 * @swagger
 * /api/payments/response:
 *   get:
 *     summary: Payment response handler
 *     description: Handles payment gateway response and redirects to frontend
 *     tags:
 *       - Payments
 *     parameters:
 *       - name: MerchantTxnId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: GatewayTxnId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirects to frontend with transaction details
 */
// Response URL handler
paymentRouter.get('/response', (req: Request, res: Response) => {
    const { MerchantTxnId, GatewayTxnId } = req.query;

    res.redirect(`http://localhost:5174/?MerchantTxnId=${MerchantTxnId}&GatewayTxnId=${GatewayTxnId}`);
});

/**
 * @swagger
 * /api/payments/notification:
 *   get:
 *     summary: Payment notification webhook
 *     description: Webhook endpoint for Nepal Payment Gateway to notify payment status
 *     tags:
 *       - Payments
 *     parameters:
 *       - name: MerchantTxnId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: GatewayTxnId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: Status
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           enum: [SUCCESS, FAILED, CANCELLED]
 *     responses:
 *       200:
 *         description: Notification received and processed
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "received"
 *       400:
 *         description: Invalid or missing MerchantTxnId
 *       404:
 *         description: Order not found
 */
// Notification URL (Webhook)
// https://api.dajuvai.com/api/payments/notification
paymentRouter.get('/notification', asyncHandler(async (req: Request, res: Response) => {
    const { MerchantTxnId, GatewayTxnId, Status } = req.query;

    logInfo('NPX Payment notification received', { 
        MerchantTxnId, 
        GatewayTxnId, 
        Status,
        timestamp: new Date().toISOString() 
    });

    if (!MerchantTxnId || typeof MerchantTxnId !== 'string') {
        throw new APIError(400, "Invalid or missing MerchantTxnId");
    }

    const order = await orderDb.findOne({
        where: { mTransactionId: MerchantTxnId }
    });

    if (!order) {
        throw new APIError(404, "Order not found");
    }

    const userId = order.orderedById;
    const cartService = new CartService();

    // Handle payment status
    switch ((Status as string).toUpperCase()) {
        case 'SUCCESS':
            order.paymentStatus = PaymentStatus.PAID;
            order.status = OrderStatus.CONFIRMED;
            await cartService.clearCart(userId); // Clear cart after successful payment
            logInfo('Order marked as PAID', { orderId: order.id });
            break;

        case 'FAILED':
        case 'CANCELLED':
            order.paymentStatus = PaymentStatus.UNPAID;
            order.status = OrderStatus.CANCELLED; 
            logInfo('Order marked as UNPAID', { orderId: order.id, status: Status });
            break;

        default:
            logInfo('Order received unknown status', { orderId: order.id, status: Status });
            break;
    }

    await orderDb.save(order);

    res.send('received');
}));



export default paymentRouter;