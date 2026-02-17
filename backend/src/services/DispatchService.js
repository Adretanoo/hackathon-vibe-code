import { Courier } from '../entities/Courier.js';
import { Order, OrderStatus } from '../entities/Order.js';
import { findPath } from '../utils/pathfinding.js';

export class DispatchService {
    constructor() {
        this.couriers = [];
        this.orders = [];
        this.obstacles = new Set();

        // Initialize some sample obstacles (e.g., a wall)
        this.initObstacles();
    }

    initObstacles() {
        // A wall from x=20,y=20 to x=20,y=80
        for (let y = 20; y <= 80; y++) {
            this.obstacles.add(`20,${y}`);
        }

        // Another block
        for (let x = 60; x <= 70; x++) {
            for (let y = 60; y <= 70; y++) {
                this.obstacles.add(`${x},${y}`);
            }
        }
    }

    createCourier(id, x, y) {
        const courier = new Courier(id, x, y);
        this.couriers.push(courier);
        return courier;
    }

    createOrder(id, pickupX, pickupY, dropX, dropY) {
        const order = new Order(id, pickupX, pickupY, dropX, dropY);
        this.orders.push(order);
        return order;
    }

    findOrder(orderId) {
        return this.orders.find(o => o.id === orderId);
    }

    findCourier(courierId) {
        return this.couriers.find(c => c.id === courierId);
    }

    assignOrder(orderId) {
        const order = this.findOrder(orderId);
        if (!order) {
            throw new Error(`Order ${orderId} not found`);
        }

        if (order.status !== OrderStatus.PENDING) {
            return null;
        }

        const availableCouriers = this.couriers.filter(c => !c.isBusy);
        if (availableCouriers.length === 0) {
            console.log('No couriers available');
            return null; // Controller should handle this
        }

        let bestCourier = null;
        let minScore = Infinity;

        // Note: For simplicity, checking pathfinding for ALL couriers might be slow if there are many.
        // In production, we'd prune the search space first.
        for (const courier of availableCouriers) {
            const pathToPickup = findPath({ x: courier.x, y: courier.y }, { x: order.pickupX, y: order.pickupY }, this.obstacles);
            const pathPickupToDrop = findPath({ x: order.pickupX, y: order.pickupY }, { x: order.dropX, y: order.dropY }, this.obstacles);

            if (pathToPickup.distance === Infinity || pathPickupToDrop.distance === Infinity) {
                // Cannot reach
                continue;
            }

            const score = pathToPickup.distance + pathPickupToDrop.distance;

            if (score < minScore) {
                minScore = score;
                bestCourier = courier;
            }
        }

        if (bestCourier) {
            bestCourier.assignOrder(order.id);
            order.assignTo(bestCourier.id);
            console.log(`Assigned Order ${order.id} to Courier ${bestCourier.id} (Score: ${minScore})`);
            return bestCourier;
        }

        return null;
    }

    completeOrder(orderId) {
        const order = this.findOrder(orderId);
        if (!order) {
            throw new Error(`Order ${orderId} not found`);
        }

        if (order.status !== OrderStatus.ASSIGNED) {
            throw new Error(`Order ${orderId} is not in ASSIGNED status (current: ${order.status})`);
        }

        const courier = this.findCourier(order.assignedCourierId);
        if (!courier) {
            throw new Error(`Assigned courier ${order.assignedCourierId} not found`);
        }

        // Update courier position and status
        courier.updatePosition(order.dropX, order.dropY);
        courier.completeOrder();

        // Update order status
        order.complete();

        console.log(`Order ${orderId} completed by Courier ${courier.id}`);
        return true;
    }

    findNearestCourier(targetX, targetY) {
        const freeCouriers = this.couriers.filter(c => !c.isBusy);

        if (freeCouriers.length === 0) {
            return { error: "No couriers available" };
        }

        let bestCourier = null;
        let minDistance = Infinity;

        for (const courier of freeCouriers) {
            const pathResult = findPath(
                { x: courier.x, y: courier.y },
                { x: targetX, y: targetY },
                this.obstacles
            );

            if (pathResult.distance < minDistance) {
                minDistance = pathResult.distance;
                bestCourier = courier;
            }
        }

        if (bestCourier && minDistance !== Infinity) {
            bestCourier.assignOrder(`mvp_${Date.now()}`);
            return {
                assignedCourier: {
                    id: bestCourier.id,
                    x: bestCourier.x,
                    y: bestCourier.y,
                    distance: minDistance
                }
            };
        }

        return { error: "No couriers available" };
    }
}
