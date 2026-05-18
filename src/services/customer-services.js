import api from "./api";

const customerServices = {
    async getCustomerById(id) {
        const response = await api.get(`/customers/${id}`);
        return response.data;
    }
}

export default customerServices;
