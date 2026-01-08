import type {
    PesapalAuthResponse,
    PesapalIPNRegistration,
    PesapalIPNResponse,
    PesapalOrderRequest,
    PesapalOrderResponse,
    PesapalTransactionStatus,
} from '@/types/payment-types';

/**
 * Pesapal API v3.0 Service
 * Handles authentication, IPN registration, order submission, and transaction status queries
 */
class PesapalService {
    private baseUrl: string;
    private consumerKey: string;
    private consumerSecret: string;
    private accessToken: string | null = null;
    private tokenExpiry: Date | null = null;

    constructor() {
        this.baseUrl = import.meta.env.VITE_PESAPAL_API_URL || 'https://cybqa.pesapal.com/pesapalv3';
        this.consumerKey = import.meta.env.VITE_PESAPAL_CONSUMER_KEY || '';
        this.consumerSecret = import.meta.env.VITE_PESAPAL_CONSUMER_SECRET || '';
    }

    /**
     * Get OAuth access token from Pesapal
     * Caches token until expiry
     */
    async getAccessToken(): Promise<string> {
        // Return cached token if still valid
        if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return this.accessToken;
        }

        if (!this.consumerKey || !this.consumerSecret) {
            throw new Error('Pesapal credentials not configured. Please set VITE_PESAPAL_CONSUMER_KEY and VITE_PESAPAL_CONSUMER_SECRET in .env file.');
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/Auth/RequestToken`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    consumer_key: this.consumerKey,
                    consumer_secret: this.consumerSecret,
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to get access token: ${response.statusText}`);
            }

            const data: PesapalAuthResponse = await response.json();

            if (data.error) {
                throw new Error(`Pesapal auth error: ${data.error}`);
            }

            if (!data.token) {
                throw new Error('No access token received from Pesapal');
            }

            this.accessToken = data.token;
            this.tokenExpiry = new Date(data.expiryDate);

            return this.accessToken;
        } catch (error) {
            console.error('Pesapal authentication error:', error);
            throw error;
        }
    }

    /**
     * Register IPN (Instant Payment Notification) URL
     * This should be done once per IPN URL
     */
    async registerIPN(ipnUrl: string, notificationType: 'GET' | 'POST' = 'POST'): Promise<string> {
        const token = await this.getAccessToken();

        const ipnData: PesapalIPNRegistration = {
            url: ipnUrl,
            ipn_notification_type: notificationType,
        };

        try {
            const response = await fetch(`${this.baseUrl}/api/URLSetup/RegisterIPN`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(ipnData),
            });

            if (!response.ok) {
                throw new Error(`Failed to register IPN: ${response.statusText}`);
            }

            const data: PesapalIPNResponse = await response.json();

            if (data.error) {
                throw new Error(`IPN registration error: ${data.error}`);
            }

            return data.ipn_id;
        } catch (error) {
            console.error('IPN registration error:', error);
            throw error;
        }
    }

    /**
     * Submit order request to Pesapal
     * Returns redirect URL for payment
     */
    async submitOrderRequest(orderData: PesapalOrderRequest): Promise<PesapalOrderResponse> {
        const token = await this.getAccessToken();

        try {
            const response = await fetch(`${this.baseUrl}/api/Transactions/SubmitOrderRequest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(orderData),
            });

            if (!response.ok) {
                throw new Error(`Failed to submit order: ${response.statusText}`);
            }

            const data: PesapalOrderResponse = await response.json();

            if (data.error) {
                throw new Error(`Order submission error: ${data.error}`);
            }

            return data;
        } catch (error) {
            console.error('Order submission error:', error);
            throw error;
        }
    }

    /**
     * Get transaction status by order tracking ID
     */
    async getTransactionStatus(orderTrackingId: string): Promise<PesapalTransactionStatus> {
        const token = await this.getAccessToken();

        try {
            const response = await fetch(
                `${this.baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
                {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to get transaction status: ${response.statusText}`);
            }

            const data: PesapalTransactionStatus = await response.json();

            if (data.error) {
                throw new Error(`Transaction status error: ${data.error}`);
            }

            return data;
        } catch (error) {
            console.error('Transaction status error:', error);
            throw error;
        }
    }

    /**
     * Convert Pesapal status code to our internal payment status
     */
    getPaymentStatus(statusCode: number): 'pending' | 'completed' | 'failed' | 'reversed' {
        switch (statusCode) {
            case 1:
                return 'completed';
            case 2:
                return 'failed';
            case 3:
                return 'reversed';
            default:
                return 'pending';
        }
    }
}

// Export singleton instance
export const pesapalService = new PesapalService();
