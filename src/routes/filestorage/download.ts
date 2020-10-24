const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

import {
    getMinioFile,
    validate,
    fetchUserWorkspacePermission,
    haveReadAccess,
    notifyUsers
} from '../../utils';
import { HttpError } from '../../errors';
import * as mime from 'mime';

import { FileStorage } from '../../models/FileStorage.model';

// ROUTE GET /file/{id}
router.get(
    '/:fileId',
    [],
    (req, res, next) => {
        // EXTRACT JWT
        const rawToken = req.header('Authorization') || '';
        const splitedToken = rawToken.split(' ').map(x => x.trim())
        if (splitedToken.length < 2) {
            next(new HttpError(403, 'Forbidden'));
            return;
        }
        const token = jwt.decode(splitedToken[1]);

        // VALIDATE REQUEST
        if (!validate(req)) {
            next(new HttpError(400, 'Invalid request'));
            return;
        }

        const fileId = req.param('fileId');
        FileStorage.findByPk(fileId).then(
            filestorage =>
                fetchUserWorkspacePermission(
                    rawToken,
                    filestorage.workspaceId
                ).then(
                    permission => {
                        console.log('In then permission');
                        if (!haveReadAccess(permission)) {
                            throw new HttpError(403, 'Forbidden');
                        }
                    }
                ).then(
                    () => filestorage
                )
        ).then(
            filestorage => {
                const minioClient = req.app.get('minioClient');

                return getMinioFile(
                    minioClient,
                    filestorage.bucket,
                    filestorage.objectHash
                ).then(file => {
                    console.log('file : ', file);
                    return { file, filestorage }
                });
            }
        ).then(
            ({ file, filestorage }) => {
                const ext = filestorage.title.split('.').pop();

                res.contentType(mime.getType(ext));
                res.end(file);
            }
        ).catch(err => {
            if (err instanceof HttpError) {
                next(err);
            } else {
                // UNEXPECTED ERROR
                console.error('Unexpected error : ', err);
                next(new HttpError(500, 'Internal Server Error'));
            }
        });
});

export default router;
