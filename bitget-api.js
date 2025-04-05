class BitgetAPI {
    constructor(apiKey, apiSecret, passphrase) {
        this.apiKey = apiKey || '';
        this.apiSecret = apiSecret || '';
        this.passphrase = passphrase || '';
        this.baseUrl = 'https://api.bitget.com';
        this.simulationMode = !apiKey || !apiSecret || !passphrase;
    }

    async getCurrentPrice(symbol) {
        if (this.simulationMode) {
            // Simulated price between lower and upper bounds
            const lower = parseFloat(document.getElementById('lower-price').value) || 40000;
            const upper = parseFloat(document.getElementById('upper-price').value) || 50000;
            return lower + Math.random() * (upper - lower);
        }

        try {
            const endpoint = `/api/spot/v1/market/ticker?symbol=${symbol}`;
            const response = await this._publicRequest(endpoint);
            return parseFloat(response.data.close);
        } catch (error) {
            console.error('Error fetching price:', error);
            return 0;
        }
    }

    async placeOrder(symbol, side, price, quantity) {
        if (this.simulationMode) {
            // Simulate order placement
            return {
                code: '00000',
                data: {
                    orderId: `sim-${Date.now()}`,
                    price: price.toString(),
                    quantity: quantity.toString()
                }
            };
        }

        try {
            const endpoint = '/api/spot/v1/trade/orders';
            const params = {
                symbol,
                side: side.toLowerCase(),
                orderType: 'limit',
                price: price.toString(),
                size: quantity.toString(),
                timeInForce: 'GTC'
            };
            return await this._privateRequest('POST', endpoint, params);
        } catch (error) {
            console.error('Error placing order:', error);
            throw error;
        }
    }

    async _publicRequest(endpoint) {
        const response = await fetch(this.baseUrl + endpoint);
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        return await response.json();
    }

    async _privateRequest(method, endpoint, body = {}) {
        const timestamp = Date.now().toString();
        const headers = {
            'Content-Type': 'application/json',
            'ACCESS-KEY': this.apiKey,
            'ACCESS-TIMESTAMP': timestamp,
            'ACCESS-PASSPHRASE': this.passphrase
        };

        const bodyString = JSON.stringify(body);
        const signature = this._generateSignature(timestamp, method, endpoint, bodyString);
        headers['ACCESS-SIGN'] = signature;

        const response = await fetch(this.baseUrl + endpoint, {
            method,
            headers,
            body: bodyString
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.msg || `API request failed: ${response.status}`);
        }

        return await response.json();
    }

    _generateSignature(timestamp, method, endpoint, body) {
        const message = timestamp + method.toUpperCase() + endpoint + (body || '');
        return CryptoJS.HmacSHA256(message, this.apiSecret).toString(CryptoJS.enc.Base64);
    }
                }
