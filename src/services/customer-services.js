import api from "./api";

const customerServices = {
    async getCustomerById(id) {
        const response = await api.get(`/customers/${id}`);
        return response.data;
    },
    async updateCustomer(id, updates) {
        const response = await api.patch(`/customers/${id}`, updates);
        return response.data;
    }
}

export default customerServices;
