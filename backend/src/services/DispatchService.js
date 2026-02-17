import { Courier } from '../entities/Courier.js';
import { Order, OrderStatus } from '../entities/Order.js';
import { calculateDistance } from '../utils/geometry.js';

export class DispatchService {
    constructor() {
        this.couriers = [];
        this.orders = [];
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
            console.log(`Order ${orderId} is already ${order.status}`);
            return null;
        }

        const availableCouriers = this.couriers.filter(c => !c.isBusy);
        if (availableCouriers.length === 0) {
            console.log('No couriers available');
            return null;
        }

        let bestCourier = null;
        let minScore = Infinity;

        for (const courier of availableCouriers) {
            const distanceToPickup = calculateDistance(courier.x, courier.y, order.pickupX, order.pickupY);
            const distancePickupToDrop = calculateDistance(order.pickupX, order.pickupY, order.dropX, order.dropY);

            // Score = distance(courier, pickup) + distance(pickup, drop)
            const score = distanceToPickup + distancePickupToDrop;

            if (score < minScore) {
                minScore = score;
                bestCourier = courier;
            }
        }

        if (bestCourier) {
            bestCourier.assignOrder(order.id);
            order.assignTo(bestCourier.id);
            console.log(`Assigned Order ${order.id} to Courier ${bestCourier.id} (Score: ${minScore.toFixed(2)})`);
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
}
