const bitget = new BitgetAPI(
    'bg_ffcbb26a743c6f3617a03e4edb87aa3f', 
    'e397e3420dbb6a1b48dfef734e6ef8d6aaf29ee44a044d51dd1742a8143c0693',
    '02703242'
);

    // DOM Elements
    const startBtn = document.getElementById('start-bot');
    const stopBtn = document.getElementById('stop-bot');
    const statusText = document.getElementById('status-text');
    const tradeLog = document.querySelector('#trade-log tbody');
    
    // Trading variables
    let botInterval;
    let currentPrice = 0;
    let gridLevels = [];
    let activeTrades = [];

    // Initialize grid visualization
    function initGridVisualization() {
        const upperPrice = parseFloat(document.getElementById('upper-price').value);
        const lowerPrice = parseFloat(document.getElementById('lower-price').value);
        const gridCount = parseInt(document.getElementById('grid-levels').value);
        
        const gridContainer = document.getElementById('grid-lines');
        gridContainer.innerHTML = '';
        
        const priceRange = upperPrice - lowerPrice;
        const step = priceRange / gridCount;
        
        for (let i = 0; i <= gridCount; i++) {
            const levelPrice = lowerPrice + (i * step);
            const levelElement = document.createElement('div');
            levelElement.className = 'grid-line';
            levelElement.style.bottom = `${(i/gridCount)*100}%`;
            levelElement.innerHTML = `<span>$${levelPrice.toFixed(2)}</span>`;
            gridContainer.appendChild(levelElement);
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

    // Start trading bot
    startBtn.addEventListener('click', async () => {
        const pair = document.getElementById('trading-pair').value;
        
        calculateGridLevels();
        initGridVisualization();
        
        statusText.textContent = 'Running';
        statusText.style.color = '#2ecc71';
        startBtn.disabled = true;
        stopBtn.disabled = false;
        
        // Start price polling
        botInterval = setInterval(async () => {
            try {
                currentPrice = await bitget.getCurrentPrice(pair);
                checkGridLevels(pair);
                updatePriceChart(currentPrice);
            } catch (error) {
                console.error('Error:', error);
            }
        }, 5000); // Check every 5 seconds
    });

    // Stop trading bot
    stopBtn.addEventListener('click', () => {
        clearInterval(botInterval);
        statusText.textContent = 'Stopped';
        statusText.style.color = '#e74c3c';
        startBtn.disabled = false;
        stopBtn.disabled = true;
    });

    // Check grid levels for trading opportunities
    async function checkGridLevels(pair) {
        for (const level of gridLevels) {
            // Check if price is within 0.5% of the grid level
            if (Math.abs(currentPrice - level.price) < (level.price * 0.005)) {
                const existingTrade = activeTrades.find(t => t.levelPrice === level.price);
                
                if (!existingTrade) {
                    try {
                        const side = level.buy ? 'buy' : 'sell';
                        const order = await bitget.placeOrder(
                            pair,
                            side,
                            level.price,
                            level.quantity
                        );
                        
                        // Record the trade
                        const trade = {
                            id: order.orderId,
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
            <td>${trade.price.toFixed(4)}</td>
            <td>${trade.quantity.toFixed(4)}</td>
            <td class="${profit >= 0 ? 'profit' : 'loss'}">
                ${profit !== null ? profit.toFixed(2) : '--'}
            </td>
        `;
        
        tradeLog.prepend(row);
    }

    // Simple price chart update
    function updatePriceChart(price) {
        const chart = document.getElementById('price-chart');
        chart.innerHTML += `<div class="price-point" style="bottom: ${(price / 50000) * 100}%"></div>`;
        
        // Keep only the last 50 points
        const points = chart.querySelectorAll('.price-point');
        if (points.length > 50) {
            points[0].remove();
        }
    }

    // Initialize form inputs
    document.querySelectorAll('.form-group input').forEach(input => {
        input.addEventListener('change', initGridVisualization);
    });
});
