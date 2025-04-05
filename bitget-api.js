class BitgetAPI {
    constructor(apiKey, apiSecret, passphrase) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.passphrase = passphrase;
        this.baseUrl = 'https://api.bitget.com';
    }

    async getCurrentPrice(symbol) {
        const endpoint = `/api/spot/v1/market/ticker?symbol=${symbol}`;
        const response = await this._request('GET', endpoint);
        return parseFloat(response.data.close);
    }

    async placeOrder(symbol, side, price, quantity) {
        const endpoint = '/api/spot/v1/trade/orders';
        const params = {
            symbol,
            side,
            order_type: 'limit',
            price: price.toString(),
            quantity: quantity.toString(),
            time_in_force: 'GTC'
        };
        return await this._request('POST', endpoint, params);
    }

    async _request(method, endpoint, body = null) {
        const timestamp = Date.now().toString();
        const headers = {
            'Content-Type': 'application/json',
            'ACCESS-KEY': this.apiKey,
            'ACCESS-TIMESTAMP': timestamp,
            'ACCESS-PASSPHRASE': this.passphrase
        };

        if (body) {
            body = JSON.stringify(body);
            const signature = this._generateSignature(timestamp, method, endpoint, body);
            headers['ACCESS-SIGN'] = signature;
        }

        const response = await fetch(this.baseUrl + endpoint, {
            method,
            headers,
            body
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        return await response.json();
    }

    _generateSignature(timestamp, method, endpoint, body) {
        const message = timestamp + method + endpoint + (body || '');
        const hmac = CryptoJS.HmacSHA256(message, this.apiSecret);
        return hmac.toString(CryptoJS.enc.Base64);
    }
}
