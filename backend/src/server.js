import express from 'express';
import cors from 'cors';
import { DispatchService } from './services/DispatchService.js';
import { findPath } from './utils/pathfinding.js';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const service = new DispatchService();

// GET /api/state: Returns current couriers, orders, and obstacles
app.get('/api/state', (req, res) => {
    res.json({
        couriers: service.couriers,
        orders: service.orders,
        obstacles: Array.from(service.obstacles)
    });
});

// POST /api/couriers: Creates a courier
app.post('/api/couriers', (req, res) => {
    // Generate random ID if not provided, or simple sequential
    const id = `c${Date.now()}`;
    const x = Math.floor(Math.random() * 101);
    const y = Math.floor(Math.random() * 101);

    // Ensure not spawning on obstacle
    if (service.obstacles.has(`${x},${y}`)) {
        // Simple retry - just move to 0,0 for fallback
        return res.json(service.createCourier(id, 0, 0));
    }

    // Random Transport Type
    const types = ['Walker', 'Bicycle', 'Car'];
    const type = types[Math.floor(Math.random() * types.length)];

    const courier = service.createCourier(id, x, y, type);
    res.json(courier);
});

// POST /api/orders: Creates an order
app.post('/api/orders', (req, res) => {
    const id = `o${Date.now()}`;
    const pickupX = Math.floor(Math.random() * 101);
    const pickupY = Math.floor(Math.random() * 101);
    const dropX = Math.floor(Math.random() * 101);
    const dropY = Math.floor(Math.random() * 101);
    const weight = req.body.weight ? parseInt(req.body.weight) : 1;

    const order = service.createOrder(id, pickupX, pickupY, dropX, dropY, weight);
    res.json(order);
});

// POST /api/assign/:orderId: Trigger assignment for all pending orders
app.post('/api/assign/:orderId', (req, res) => {
    const { orderId } = req.params;
    try {
        const courier = service.assignOrder(orderId);
        if (courier) {
            res.json({ success: true, courier });
        } else {
            // Check availability reason
            const order = service.findOrder(orderId);
            const anyCapable = service.couriers.some(c => c.capacity >= order.weight);
            if (!anyCapable) {
                return res.json({ success: false, status: "No suitable couriers available for this weight" });
            }
            res.json({ success: false, message: 'Could not assign order (possibly no path)' });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// POST /api/complete/:orderId: Complete delivery
app.post('/api/complete/:orderId', (req, res) => {
    const { orderId } = req.params;
    try {
        const success = service.completeOrder(orderId);
        res.json({ success });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// POST /api/stage1: MVP Stage 1 Logic (Find nearest free courier)
app.post('/api/stage1', (req, res) => {
    const { x, y, weight } = req.body;
    const orderWeight = weight ? parseInt(weight) : 1;
    const result = service.findNearestCourier(parseInt(x), parseInt(y), orderWeight);

    if (result.error) {
        return res.json({ status: result.error }); // Frontend expects "status": "No couriers..."
    }

    res.json({
        orderId: `order_${Date.now()}`,
        assignedCourier: result.assignedCourier
    });
});

app.listen(port, () => {
    console.log(`Dispatch API running at http://localhost:${port}`);
});
