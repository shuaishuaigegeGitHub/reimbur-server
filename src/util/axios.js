import axios from "axios";

const instance = axios.create({
    timeout: 5000,
});

instance.interceptors.response.use((response) => {
    if (response.status !== 200) {
        return Promise.reject(response);
    }
    return Promise.resolve(response.data);
});

export default instance;
