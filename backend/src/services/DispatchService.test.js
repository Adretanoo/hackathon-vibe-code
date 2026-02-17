import { DispatchService } from './DispatchService.js';
import { CourierType } from '../entities/Courier.js';
import { OrderStatus } from '../entities/Order.js';

describe('DispatchService', () => {
    let service;

    beforeEach(() => {
        service = new DispatchService();
    });

    describe('Stage 1: Basic Distance Calculation and Assignment', () => {
        test('should assign order to nearest courier', () => {
            // Create couriers at different distances
            const c1 = service.createCourier('c1', 10, 10, CourierType.CAR);
            const c2 = service.createCourier('c2', 50, 50, CourierType.CAR);

            // Create order near c1
            const order = service.createOrder('o1', 12, 12, 20, 20, 5);

            // Assign order
            const result = service.assignOrder('o1');

            expect(result).not.toBeNull();
            expect(result.id).toBe('c1');
            expect(c1.isBusy).toBe(true);
            expect(order.status).toBe(OrderStatus.ASSIGNED);
        });

        test('should not assign if no couriers available', () => {
            const order = service.createOrder('o1', 10, 10, 20, 20, 5);

            const result = service.assignOrder('o1');

            expect(result.queued).toBe(true);
            expect(service.orderQueue.length).toBe(1);
        });
    });

    describe('Stage 2: Weight Limits', () => {
        test('should reject heavy order for Walker (5kg limit)', () => {
            service.createCourier('c1', 10, 10, CourierType.WALKER);
            const order = service.createOrder('o1', 12, 12, 20, 20, 20); // 20kg order

            const result = service.assignOrder('o1');

            expect(result.queued).toBe(true);
            expect(service.orderQueue.length).toBe(1);
        });

        test('should accept medium order for Bicycle (15kg limit)', () => {
            const courier = service.createCourier('c1', 10, 10, CourierType.BICYCLE);
            const order = service.createOrder('o1', 12, 12, 20, 20, 10); // 10kg order

            const result = service.assignOrder('o1');

            expect(result).not.toBeNull();
            expect(result.id).toBe('c1');
            expect(courier.isBusy).toBe(true);
        });

        test('should accept heavy order for Car (50kg limit)', () => {
            const courier = service.createCourier('c1', 10, 10, CourierType.CAR);
            const order = service.createOrder('o1', 12, 12, 20, 20, 40); // 40kg order

            const result = service.assignOrder('o1');

            expect(result).not.toBeNull();
            expect(result.id).toBe('c1');
            expect(courier.isBusy).toBe(true);
        });

        test('should not assign to Walker if order exceeds capacity', () => {
            service.createCourier('c1', 10, 10, CourierType.WALKER);
            const order = service.createOrder('o1', 12, 12, 20, 20, 6); // 6kg > 5kg

            const result = service.assignOrder('o1');

            expect(result.queued).toBe(true);
        });
    });

    describe('Stage 3: Tie-breaker Logic (Load Balancing)', () => {
        test('should prioritize courier with fewer completed orders when distances are similar', () => {
            // Create two couriers at similar distances
            const c1 = service.createCourier('c1', 10, 10, CourierType.CAR);
            const c2 = service.createCourier('c2', 10, 11, CourierType.CAR);

            // Give c1 more completed orders
            c1.completedOrdersToday = 5;
            c2.completedOrdersToday = 2;

            // Create order equidistant from both
            const order = service.createOrder('o1', 12, 10, 20, 20, 5);

            const result = service.assignOrder('o1');

            // Should assign to c2 (fewer completed orders)
            expect(result.id).toBe('c2');
            expect(c2.isBusy).toBe(true);
            expect(c1.isBusy).toBe(false);
        });

        test('should ignore load balancing when distances differ significantly', () => {
            const c1 = service.createCourier('c1', 10, 10, CourierType.CAR);
            const c2 = service.createCourier('c2', 50, 50, CourierType.CAR);

            // c2 has fewer completed orders but is much farther
            c1.completedOrdersToday = 10;
            c2.completedOrdersToday = 0;

            const order = service.createOrder('o1', 12, 12, 20, 20, 5);

            const result = service.assignOrder('o1');

            // Should still assign to c1 (much closer)
            expect(result.id).toBe('c1');
        });
    });

    describe('Stage 3: Queue System and Auto-assignment', () => {
        test('should queue order when no suitable courier available', () => {
            // Only Walker available, but order too heavy
            service.createCourier('c1', 10, 10, CourierType.WALKER);
            const order = service.createOrder('o1', 12, 12, 20, 20, 20);

            const result = service.assignOrder('o1');

            expect(result.queued).toBe(true);
            expect(service.orderQueue).toContainEqual(order);
            expect(service.orderQueue.length).toBe(1);
        });

        test('should auto-assign from queue when courier becomes free', () => {
            const courier = service.createCourier('c1', 10, 10, CourierType.CAR);

            // Create and assign first order
            const order1 = service.createOrder('o1', 12, 12, 20, 20, 10);
            service.assignOrder('o1');

            // Create second order (should queue because courier is busy)
            const order2 = service.createOrder('o2', 15, 15, 25, 25, 10);
            const result = service.assignOrder('o2');

            expect(result.queued).toBe(true);
            expect(service.orderQueue.length).toBe(1);

            // Complete first order - should auto-assign second
            const completeResult = service.completeCourierOrder('c1');

            expect(completeResult.success).toBe(true);
            expect(completeResult.autoAssigned).toBe('o2');
            expect(service.orderQueue.length).toBe(0);
            expect(courier.isBusy).toBe(true);
            expect(courier.currentOrderId).toBe('o2');
        });

        test('should increment completedOrdersToday counter', () => {
            const courier = service.createCourier('c1', 10, 10, CourierType.CAR);
            const order = service.createOrder('o1', 12, 12, 20, 20, 10);

            service.assignOrder('o1');
            expect(courier.completedOrdersToday).toBe(0);

            service.completeCourierOrder('c1');
            expect(courier.completedOrdersToday).toBe(1);

            // Complete another order
            const order2 = service.createOrder('o2', 15, 15, 25, 25, 10);
            service.assignOrder('o2');
            service.completeCourierOrder('c1');

            expect(courier.completedOrdersToday).toBe(2);
        });

        test('should only auto-assign orders that courier can carry', () => {
            const walker = service.createCourier('c1', 10, 10, CourierType.WALKER);

            // Assign light order to walker
            const order1 = service.createOrder('o1', 12, 12, 20, 20, 3);
            service.assignOrder('o1');

            // Queue heavy order
            const order2 = service.createOrder('o2', 15, 15, 25, 25, 20);
            service.assignOrder('o2');

            expect(service.orderQueue.length).toBe(1);

            // Complete walker's order - should NOT auto-assign heavy order
            const result = service.completeCourierOrder('c1');

            expect(result.autoAssigned).toBeNull();
            expect(service.orderQueue.length).toBe(1);
            expect(walker.isBusy).toBe(false);
        });

        test('should remove assigned order from queue', () => {
            const car = service.createCourier('c1', 10, 10, CourierType.CAR);

            // Assign first order
            const order1 = service.createOrder('o1', 12, 12, 20, 20, 10);
            service.assignOrder('o1');

            // Queue two more orders
            const order2 = service.createOrder('o2', 15, 15, 25, 25, 10);
            const order3 = service.createOrder('o3', 18, 18, 28, 28, 10);
            service.assignOrder('o2');
            service.assignOrder('o3');

            expect(service.orderQueue.length).toBe(2);

            // Complete - should assign first queued order
            service.completeCourierOrder('c1');

            expect(service.orderQueue.length).toBe(1);
            expect(service.orderQueue[0].id).toBe('o3');
        });
    });

    describe('Edge Cases', () => {
        test('should handle completing order when courier is not busy', () => {
            service.createCourier('c1', 10, 10, CourierType.CAR);

            expect(() => {
                service.completeCourierOrder('c1');
            }).toThrow('not currently busy');
        });

        test('should handle non-existent courier', () => {
            expect(() => {
                service.completeCourierOrder('non-existent');
            }).toThrow('not found');
        });

        test('should handle assigning non-existent order', () => {
            expect(() => {
                service.assignOrder('non-existent');
            }).toThrow('not found');
        });
    });
});
