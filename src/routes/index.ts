import express = require('express');
import ping from './ping';
import filestorage from './filestorage';

const router = express.Router();

router.use('/ping', ping);
router.use('/', filestorage);

export default router;
