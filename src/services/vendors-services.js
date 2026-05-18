import api from "./api"

const vendorsServices = {
    async getAllVendors(){
        const response = await api.get('/vendors');
        return response.data;
    },
    async getVendorById(id){
        const response = await api.get(`/vendors/${id}`);
        return response.data;
    }
}

export default vendorsServices;