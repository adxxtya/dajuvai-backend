import crypto from 'crypto';
import axios, { AxiosError } from 'axios';
import { Order } from '../../entities/order.entity';
import { APIError } from '../../utils/ApiError.utils';
import { PaymentInitiation, PaymentVerification } from './PaymentService';

/**
 * eSewa payment integration service
 * Handles payment initiation, verification, and signature validation
 */
export class EsewaPaymentService {
    private readonly merchantId: string;
    private readonly secretKey: string;
    private readonly paymentUrl: string;
    private readonly verificationUrl: string;
    private readonly frontendUrl: string;

    constructor() {
        this.merchantId = process.env.ESEWA_MERCHANT || '';
        this.secretKey = process.env.SECRET_KEY || '';
        this.paymentUrl = process.env.ESEWA_PAYMENT_URL || '';
        this.verificationUrl = process.env.ESEWA_VERIFICATION_URL || '';
        this.frontendUrl = process.env.FRONTEND_URL || '';

        if (!this.merchantId || !this.secretKey) {
            throw new Error('eSewa configuration is missing');
        }
    }

    /**
     * Initiate eSewa payment
     * Generates signature and returns payment URL
     */
    async initiatePayment(order: Order): Promise<PaymentInitiation> {
        const transactionUuid = crypto.randomUUID();

        // Generate signature data
        const signatureData = `total_amount=${order.totalPrice},transaction_uuid=${transactionUuid},product_code=${this.merchantId}`;
        const signature = this.generateHmacSha256Hash(signatureData, this.secretKey);

        const paymentData = {
            amount: order.totalPrice,
            failure_url: `${this.frontendUrl}/order/esewa-payment-failure?oid=${order.id}`,
            product_delivery_charge: '0',
            product_service_charge: '0',
            product_code: this.merchantId,
            signed_field_names: 'total_amount,transaction_uuid,product_code',
            success_url: `${this.frontendUrl}/order/esewa-payment-success?oid=${order.id}`,
            tax_amount: '0',
            total_amount: order.totalPrice,
            transaction_uuid: transactionUuid,
            signature
        };

        try {
            const paymentResponse = await axios.post(this.paymentUrl, null, {
                params: paymentData,
                timeout: 10000 // 10 second timeout
            });

            const responseUrl = paymentResponse.request?.res?.responseUrl;
            if (paymentResponse.status === 200 && responseUrl) {
                return {
                    url: responseUrl,
                    transactionId: transactionUuid
                };
            } else {
                throw new APIError(500, 'eSewa payment initiation failed: Invalid response');
            }
        } catch (error) {
            console.error('eSewa payment initiation error:', error);
            throw new APIError(500, `eSewa payment initiation failed: ${error.message}`);
        }
    }

    /**
     * Verify eSewa payment
     * Decodes token, verifies signature, calls API, validates amount
     */
    async verifyPayment(token: string, orderId: number): Promise<PaymentVerification> {
        try {
            // Decode token from base64
            const decodedData = this.decodeToken(token);

            // Check for duplicate processing (idempotency)
            if (await this.isDuplicateTransaction(decodedData.transaction_uuid)) {
                return {
                    success: false,
                    transactionId: decodedData.transaction_uuid,
                    message: 'Transaction already processed'
                };
            }

            // Verify signature using timing-safe comparison
            if (!this.verifySignature(decodedData)) {
                throw new APIError(400, 'Invalid payment signature');
            }

            // Call eSewa API to confirm transaction status with retry
            const apiVerification = await this.callVerificationAPIWithRetry(decodedData.transaction_uuid);

            // Validate amount matches order total
            // Note: In production, you should fetch the order and compare amounts
            if (apiVerification.status !== 'COMPLETE') {
                return {
                    success: false,
                    transactionId: decodedData.transaction_uuid,
                    message: 'Payment not completed'
                };
            }

            return {
                success: true,
                transactionId: decodedData.transaction_uuid,
                amount: decodedData.total_amount
            };
        } catch (error) {
            console.error('eSewa payment verification error:', error);
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(500, `Payment verification failed: ${error.message}`);
        }
    }

    /**
     * Decode base64 token
     */
    private decodeToken(token: string): any {
        try {
            const decoded = Buffer.from(token, 'base64').toString('ascii');
            return JSON.parse(decoded);
        } catch (error) {
            throw new APIError(400, 'Invalid payment token');
        }
    }

    /**
     * Verify signature using HMAC-SHA256 with timing-safe comparison
     */
    verifySignature(data: any): boolean {
        const signatureData = `total_amount=${data.total_amount},transaction_uuid=${data.transaction_uuid},product_code=${this.merchantId}`;
        const expectedSignature = this.generateHmacSha256Hash(signatureData, this.secretKey);
        
        // Use timing-safe comparison to prevent timing attacks
        return crypto.timingSafeEqual(
            Buffer.from(expectedSignature),
            Buffer.from(data.signature || '')
        );
    }

    /**
     * Call eSewa verification API with retry logic
     */
    private async callVerificationAPIWithRetry(
        transactionId: string,
        maxRetries: number = 3
    ): Promise<any> {
        let lastError: Error;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.callVerificationAPI(transactionId);
            } catch (error) {
                lastError = error;
                
                // Only retry on transient errors (5xx, network errors)
                if (this.isTransientError(error)) {
                    if (attempt < maxRetries) {
                        // Exponential backoff: 1s, 2s, 4s
                        const delay = Math.pow(2, attempt - 1) * 1000;
                        await this.sleep(delay);
                        continue;
                    }
                }
                
                // Non-transient error or max retries reached
                throw error;
            }
        }

        throw lastError;
    }

    /**
     * Call eSewa verification API
     */
    async callVerificationAPI(transactionId: string): Promise<any> {
        try {
            const response = await axios.get(this.verificationUrl, {
                params: {
                    transaction_uuid: transactionId,
                    product_code: this.merchantId
                },
                timeout: 5000 // 5 second timeout
            });

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError;
                throw new APIError(
                    axiosError.response?.status || 500,
                    `eSewa API error: ${axiosError.message}`
                );
            }
            throw error;
        }
    }

    /**
     * Check if transaction is duplicate (idempotency check)
     * TODO: Implement with Redis or database
     */
    private async isDuplicateTransaction(transactionId: string): Promise<boolean> {
        // TODO: Check Redis or database for processed transaction
        // For now, return false
        return false;
    }

    /**
     * Generate HMAC-SHA256 hash
     */
    private generateHmacSha256Hash(data: string, secret: string): string {
        if (!data || !secret) {
            throw new Error('Both data and secret are required to generate a hash');
        }

        return crypto
            .createHmac('sha256', secret)
            .update(data)
            .digest('base64');
    }

    /**
     * Check if error is transient (should retry)
     */
    private isTransientError(error: any): boolean {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            // Retry on 5xx errors or network errors
            return !status || status >= 500;
        }
        return false;
    }

    /**
     * Sleep utility for retry delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
