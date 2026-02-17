export const CourierType = {
    WALKER: 'Walker',
    BICYCLE: 'Bicycle',
    CAR: 'Car'
};

export const CourierCapacity = {
    [CourierType.WALKER]: 5,
    [CourierType.BICYCLE]: 15,
    [CourierType.CAR]: 50
};

export class Courier {
    constructor(id, x, y, transportType = CourierType.WALKER) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.transportType = transportType;
        this.isBusy = false;
        this.currentOrderId = null;
    }

    get capacity() {
        return CourierCapacity[this.transportType];
    }

    updatePosition(x, y) {
        this.x = x;
        this.y = y;
    }

    assignOrder(orderId) {
        this.isBusy = true;
        this.currentOrderId = orderId;
    }

    completeOrder() {
        this.isBusy = false;
        this.currentOrderId = null;
    }
}
