export class Courier {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.isBusy = false;
        this.currentOrderId = null;
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
