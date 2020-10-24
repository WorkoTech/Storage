import express = require('express');
import * as config from '../../config';

import { FileStorage } from '../../models/FileStorage.model';
import { HttpError } from '../../errors';

const router = express.Router();


router.get('/', (req, res, next) => {
    FileStorage.findAll()
        .then(() => res.send({
                name: config.APP_NAME,
                version: config.APP_VERSION,
                date: new Date().toString()
            })
        ).catch(err => {
            console.error('Error occured on /ping : ', JSON.stringify(err))
            next(new HttpError(500, 'Internal Server Error'))
        })
});

export default router;
