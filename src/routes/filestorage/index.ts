const express = require('express');
const router = express.Router();

import create from './create';
import get from './get';
import del from './delete';
import download from './download';

router.use('/file', create);
router.use('/file', get);
router.use('/file', del);
router.use('/file', download);

export default router;
