import { Courier, CourierType } from '../entities/Courier.js';
import { Order, OrderStatus } from '../entities/Order.js';
import { findPath } from '../utils/pathfinding.js';

export class DispatchService {
    constructor() {
        this.couriers = [];
        this.orders = [];
        this.orderQueue = [];
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

    createCourier(id, x, y, transportType = CourierType.WALKER) {
        const courier = new Courier(id, x, y, transportType);
        this.couriers.push(courier);
        return courier;
    }

    createOrder(id, pickupX, pickupY, dropX, dropY, weight = 1) {
        const order = new Order(id, pickupX, pickupY, dropX, dropY, weight);
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

        // Filter: Not busy AND has enough capacity
        const availableCouriers = this.couriers.filter(c => !c.isBusy && c.capacity >= order.weight);

        if (availableCouriers.length === 0) {
            console.log(`No suitable couriers available for Order ${orderId} (Weight: ${order.weight}kg) - Adding to queue`);
            this.orderQueue.push(order);
            return { queued: true };
        }

        let bestCourier = null;
        let minScore = Infinity;
        let scores = []; // Store all courier scores for tie-breaker

        for (const courier of availableCouriers) {
            const pathToPickup = findPath({ x: courier.x, y: courier.y }, { x: order.pickupX, y: order.pickupY }, this.obstacles);
            const pathPickupToDrop = findPath({ x: order.pickupX, y: order.pickupY }, { x: order.dropX, y: order.dropY }, this.obstacles);

            if (pathToPickup.distance === Infinity || pathPickupToDrop.distance === Infinity) {
                continue;
            }

            const score = pathToPickup.distance + pathPickupToDrop.distance;
            scores.push({ courier, score });

            if (score < minScore) {
                minScore = score;
                bestCourier = courier;
            }
        }

        // Tie-breaker: if multiple couriers have similar distances (within 1 unit), choose the one with fewer completedOrdersToday
        const similarCouriers = scores.filter(s => Math.abs(s.score - minScore) < 1);
        if (similarCouriers.length > 1) {
            similarCouriers.sort((a, b) => a.courier.completedOrdersToday - b.courier.completedOrdersToday);
            bestCourier = similarCouriers[0].courier;
            console.log(`Tie-breaker applied: Selected courier ${bestCourier.id} with ${bestCourier.completedOrdersToday} completed orders`);
        }

        if (bestCourier) {
            bestCourier.assignOrder(order.id);
            order.assignTo(bestCourier.id);
            console.log(`Assigned Order ${order.id} to Courier ${bestCourier.id} [${bestCourier.transportType}] (Score: ${minScore.toFixed(2)})`);
            return bestCourier;
        }

        // If we get here, queue the order
        console.log(`Could not assign Order ${orderId} - Adding to queue`);
        this.orderQueue.push(order);
        return { queued: true };
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

    // New method: Complete courier's current order and auto-assign from queue
    completeCourierOrder(courierId) {
        const courier = this.findCourier(courierId);
        if (!courier) {
            throw new Error(`Courier ${courierId} not found`);
        }

        if (!courier.isBusy || !courier.currentOrderId) {
            throw new Error(`Courier ${courierId} is not currently busy`);
        }

        // Find and complete the order
        const order = this.findOrder(courier.currentOrderId);
        if (order) {
            courier.updatePosition(order.dropX, order.dropY);
            order.complete();
        }

        // Free up courier and increment counter
        courier.completeOrder();
        courier.incrementCompletedOrders();

        console.log(`Courier ${courierId} completed order. Total today: ${courier.completedOrdersToday}`);

        // Try to auto-assign from queue
        const assignedOrder = this.tryAutoAssignFromQueue(courier);

        return {
            success: true,
            completedOrdersToday: courier.completedOrdersToday,
            autoAssigned: assignedOrder ? assignedOrder.id : null
        };
    }

    // Try to assign a queued order to the given courier
    tryAutoAssignFromQueue(courier) {
        if (this.orderQueue.length === 0) {
            return null;
        }

        // Find first order in queue that this courier can carry
        for (let i = 0; i < this.orderQueue.length; i++) {
            const order = this.orderQueue[i];
            if (courier.capacity >= order.weight) {
                // Remove from queue
                this.orderQueue.splice(i, 1);

                // Assign to courier
                courier.assignOrder(order.id);
                order.assignTo(courier.id);

                console.log(`Auto-assigned queued Order ${order.id} to Courier ${courier.id}`);
                return order;
            }
        }

        return null;
    }

    findNearestCourier(targetX, targetY, weight = 1) {
        // Filter by Status AND Capacity
        const freeCouriers = this.couriers.filter(c => !c.isBusy && c.capacity >= weight);

        if (freeCouriers.length === 0) {
            return { error: "No suitable couriers available for this weight" };
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
                    transportType: bestCourier.transportType,
                    distance: minDistance
                }
            };
        }

        return { error: "No suitable couriers available for this weight" };
    }
}
