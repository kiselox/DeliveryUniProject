// backend/config/corsOptions.js

const corsOptions = {
  origin: '*', // Allow all origins for dev simulation
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

export default corsOptions;
