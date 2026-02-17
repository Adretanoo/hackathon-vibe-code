import { DispatchService } from './services/DispatchService.js';

console.log('--- Delivery System Core Demo (Stateful) ---');

const service = new DispatchService();

// 1. Create Couriers
console.log('\n1. Creating Couriers...');
service.createCourier('c1', 10, 10);
service.createCourier('c2', 50, 50);
service.createCourier('c3', 90, 90);
service.couriers.forEach(c => console.log(`   Courier ${c.id}: (${c.x}, ${c.y})`));

// 2. Create Order
console.log('\n2. Creating Order...');
const order = service.createOrder('o1', 40, 40, 60, 60);
console.log(`   Order ${order.id}: Pickup(${order.pickupX}, ${order.pickupY}) -> Drop(${order.dropX}, ${order.dropY})`);

// 3. Assign Order
console.log('\n3. Assigning Order...');
const assignedCourier = service.assignOrder('o1');

if (assignedCourier) {
    console.log(`   [State Check] Courier ${assignedCourier.id}: isBusy=${assignedCourier.isBusy}`);
    console.log(`   [State Check] Order ${order.id}: Status=${order.status}, AssignedTo=${order.assignedCourierId}`);

    // 4. Complete Delivery
    console.log('\n4. Completing Delivery...');
    service.completeOrder('o1');

    const courierAfter = service.findCourier(assignedCourier.id);
    console.log(`   [State Check] Courier ${courierAfter.id}: isBusy=${courierAfter.isBusy}, Pos=(${courierAfter.x}, ${courierAfter.y})`);
    console.log(`   [State Check] Order ${order.id}: Status=${order.status}`);
} else {
    console.log('   FAILED to assign order.');
}
