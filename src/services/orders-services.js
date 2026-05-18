import api from "./api";

const orderServices = {
    async createOrder(newOrder) {
        const response = await api.post("/orders", newOrder);
        return response.data;
    }
}

export default orderServices;