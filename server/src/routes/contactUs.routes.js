import express from 'express';
import {
  requestContactOtp,
  submitContactMessage,
} from '../controllers/contact.controller.js';

const contactRouter = express.Router();

contactRouter.post('/contactUs/request-otp', requestContactOtp);
contactRouter.post('/contactUs', submitContactMessage);

contactRouter.get('/contactUs', async (req, res) => {
  res.send('<h1>Contact us page hai bhai</h1>');
});

export default contactRouter;
