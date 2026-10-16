const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getQueue, submitAnswer, getStats } = require('../controllers/revisionController');

router.use(protect);

router.get('/queue', getQueue);
router.post('/answer', submitAnswer);
router.get('/stats', getStats);

module.exports = router;
