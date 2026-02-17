export const OrderStatus = {
    PENDING: 'PENDING',
    ASSIGNED: 'ASSIGNED',
    DELIVERED: 'DELIVERED'
};

export class Order {
    constructor(id, pickupX, pickupY, dropX, dropY, weight = 1) {
        this.id = id;
        this.pickupX = pickupX;
        this.pickupY = pickupY;
        this.dropX = dropX;
        this.dropY = dropY;
        this.weight = weight;
        this.status = OrderStatus.PENDING;
        this.assignedCourierId = null;
    }

    assignTo(courierId) {
        this.status = OrderStatus.ASSIGNED;
        this.assignedCourierId = courierId;
    }

    complete() {
        this.status = OrderStatus.DELIVERED;
    }
}
