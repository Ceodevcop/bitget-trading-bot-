document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const statusEl = document.getElementById('status');
    const currentPriceEl = document.getElementById('current-price');
    const tradeLog = document.querySelector('#trade-log tbody');
    
    // Trading variables
    let bitgetApi;
    let botInterval;
    let currentPrice = 0;
    let gridLevels = [];
    let activeTrades = [];
    
    // Initialize grid visualization
    function initGridVisualization() {
        const gridLines = document.getElementById('grid-lines');
        gridLines.innerHTML = '';
        
        const upperPrice = parseFloat(document.getElementById('upper-price').value);
        const lowerPrice = parseFloat(document.getElementById('lower-price').value);
        const gridCount = parseInt(document.getElementById('grid-levels').value);
        
        const priceRange = upperPrice - lowerPrice;
        const step = priceRange / gridCount;
        
        for (let i = 0; i <= gridCount; i++) {
            const levelPrice = lowerPrice + (i * step);
            const levelElement = document.createElement('div');
            levelElement.className = 'grid-line';
            levelElement.style.bottom = `${(i/gridCount)*100}%`;
            levelElement.innerHTML = `<span>$${levelPrice.toFixed(2)}</span>`;
            gridLines.appendChild(levelElement);
        }
    }
    
    // Calculate grid levels
    function calculateGridLevels() {
        const upperPrice = parseFloat(document.getElementById('upper-price').value);
        const lowerPrice = parseFloat(document.getElementById('lower-price').value);
        const gridCount = parseInt(document.getElementById('grid-levels').value);
        const investment = parseFloat(document.getElementById('investment').value);
        
        gridLevels = [];
        const priceStep = (upperPrice - lowerPrice) / gridCount;
        const investmentPerLevel = investment / gridCount;
        
        for (let i = 0; i <= gridCount; i++) {
            const levelPrice = lowerPrice + (i * priceStep);
            gridLevels.push({
                price: levelPrice,
                buy: i % 2 === 0, // Alternate buy/sell
                quantity: investmentPerLevel / levelPrice
            });
        }
    }
    
    // Update price chart
    function updatePriceChart(price) {
        const chart = document.getElementById('price-chart');
        const chartHeight = chart.offsetHeight;
        
        // Calculate position (inverted because chart bottom is 0)
        const upper = parseFloat(document.getElementById('upper-price').value);
        const lower = parseFloat(document.getElementById('lower-price').value);
        const priceRange = upper - lower;
        const position = ((price - lower) / priceRange) * 100;
        
        const point = document.createElement('div');
        point.className = 'price-point';
        point.style.left = `${(Date.now() % 100)}%`;
        point.style.bottom = `${position}%`;
        
        chart.appendChild(point);
        
        // Keep only the last 100 points
        const points = chart.querySelectorAll('.price-point');
        if (points.length > 100) {
            points[0].remove();
        }
    }
    
    // Add trade to history log
    function addTradeToLog(trade) {
        const row = document.createElement('tr');
        
        // Calculate profit for sell orders
        let profit = null;
        if (trade.type === 'SELL') {
            const buyTrade = activeTrades.find(
                t => t.type === 'BUY' && t.levelPrice < trade.levelPrice
            );
            if (buyTrade) {
                profit = (trade.price - buyTrade.price) * trade.quantity;
            }
        }
        
        row.innerHTML = `
            <td>${trade.timestamp.toLocaleTimeString()}</td>
            <td class="${trade.type.toLowerCase()}">${trade.type}</td>
            <td>${trade.price.toFixed(2)}</td>
            <td>${trade.quantity.toFixed(4)}</td>
            <td class="${profit >= 0 ? 'profit' : 'loss'}">
                ${profit !== null ? '$' + profit.toFixed(2) : '--'}
            </td>
        `;
        
        tradeLog.prepend(row);
    }
    
    // Start trading bot
    startBtn.addEventListener('click', async function() {
        const apiKey = document.getElementById('api-key').value;
        const apiSecret = document.getElementById('api-secret').value;
        const passphrase = document.getElementById('api-passphrase').value;
        const pair = document.getElementById('trading-pair').value;
        
        // Initialize API
        bitgetApi = new BitgetAPI(apiKey, apiSecret, passphrase);
        
        // Calculate grid levels
        calculateGridLevels();
        initGridVisualization();
        
        // Update UI
        statusEl.textContent = 'Status: Running';
        startBtn.disabled = true;
        stopBtn.disabled = false;
        
        // Start price polling
        botInterval = setInterval(async function() {
            try {
                currentPrice = await bitgetApi.getCurrentPrice(pair);
                currentPriceEl.textContent = `Current Price: $${currentPrice.toFixed(2)}`;
                updatePriceChart(currentPrice);
                
                // Check grid levels
                for (const level of gridLevels) {
                    // Check if price is within 1% of the grid level
                    if (Math.abs(currentPrice - level.price) < (level.price * 0.01)) {
                        const existingTrade = activeTrades.find(t => t.levelPrice === level.price);
                        
                        if (!existingTrade) {
                            try {
                                const side = level.buy ? 'buy' : 'sell';
                                const order = await bitgetApi.placeOrder(
                                    pair,
                                    side,
                                    level.price,
                                    level.quantity
                                );
                                
                                // Record the trade
                                const trade = {
                                    id: order.data.orderId,
                                    timestamp: new Date(),
                                    type: side.toUpperCase(),
                                    price: level.price,
                                    quantity: level.quantity,
                                    levelPrice: level.price
                                };
                                
                                activeTrades.push(trade);
                                addTradeToLog(trade);
                                
                            } catch (error) {
                                console.error('Trade failed:', error);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error in bot loop:', error);
            }
        }, 3000); // Check every 3 seconds
    });
    
    // Stop trading bot
    stopBtn.addEventListener('click', function() {
        clearInterval(botInterval);
        statusEl.textContent = 'Status: Stopped';
        startBtn.disabled = false;
        stopBtn.disabled = true;
    });
    
    // Initialize grid visualization when inputs change
    document.querySelectorAll('#upper-price, #lower-price, #grid-levels').forEach(input => {
        input.addEventListener('change', initGridVisualization);
    });
});
