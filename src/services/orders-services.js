import api from "./api";

const orderServices = {
    async createOrder(newOrder) {
        const response = await api.post("/orders", newOrder);
        return response.data;
    },
    async getOrders() {
        const response = await api.get("/orders");
        return response.data;
    },
    async updateOrder(orderId, updates) {
        const response = await api.patch(`/orders/${orderId}`, updates);
        return response.data;
    }
}

export default orderServices;